import { spawnSync } from "node:child_process";
import path from "node:path";

const serverRoot = path.resolve(__dirname, "..");

function runIsolated(script: string, production = false) {
  const result = spawnSync(
    process.execPath,
    ["--conditions=source", "--import", "tsx", "--eval", script],
    {
      cwd: serverRoot,
      env: { ...process.env, NODE_ENV: production ? "production" : "test" },
      encoding: "utf8",
      timeout: 10_000,
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  return result.stdout;
}

describe("runtime dependency security regressions", () => {
  it("keeps parsing JSON and survives trailing bytes after a compressed body", () => {
    // Isolate an uncaught decoder error from Vitest. Only loopback is used;
    // this app mirrors app.ts's default express.json() without loading a DB.
    runIsolated(`
      const assert = require('node:assert/strict');
      const http = require('node:http');
      const { once } = require('node:events');
      const { gzipSync } = require('node:zlib');
      const express = require('express');
      const app = express();
      app.use(express.json());
      app.post('/echo', (req, res) => res.json(req.body));
      app.get('/health', (_req, res) => res.json({ ok: true }));
      const server = app.listen(0, '127.0.0.1');
      const payload = Buffer.from(JSON.stringify({ message: 'synthetic JSON', nested: { value: 42 } }));
      async function send(method, url, body, encoding) {
        return new Promise((resolve, reject) => {
          const req = http.request({
            hostname: '127.0.0.1', port: server.address().port,
            path: url, method, agent: false,
            headers: body ? {
              'Content-Type': 'application/json',
              'Content-Length': body.length,
              ...(encoding ? { 'Content-Encoding': encoding } : {}),
            } : {},
          }, res => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { text += chunk; });
            res.on('error', reject);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
          });
          req.on('error', reject);
          req.setTimeout(3000, () => req.destroy(new Error('Local request timed out')));
          req.end(body);
        });
      }
      (async () => {
        await once(server, 'listening');
        try {
          for (const [body, encoding] of [
            [payload, undefined],
            [gzipSync(payload), 'gzip'],
            // The extra data crosses a socket chunk boundary and reaches the
            // decompressor after its JSON frame, reproducing GHSA-27r3-jxmh-p828.
            [Buffer.concat([gzipSync(payload), Buffer.from([0]), Buffer.alloc(100 * 1024, 88)]), 'gzip'],
          ]) {
            const result = await send('POST', '/echo', body, encoding);
            assert.equal(result.status, 200);
            assert.deepEqual(result.body, JSON.parse(payload));
          }
          // Give late decoder errors time to surface, then prove continued service.
          await new Promise(resolve => setTimeout(resolve, 200));
          assert.deepEqual(await send('GET', '/health'), { status: 200, body: { ok: true } });
        } finally {
          await new Promise(resolve => server.close(resolve));
        }
      })().catch(error => { console.error(error); process.exitCode = 1; });
    `);
  });

  it("bounds deep copying through pino-pretty's actual log filter", () => {
    runIsolated(`
      const assert = require('node:assert/strict');
      const filterLog = require('pino-pretty/lib/utils/filter-log');
      const context = { ignoreKeys: new Set(['pid', 'hostname']) };
      const log = { pid: 1, hostname: 'test', nested: { values: [1, 2] } };
      const filtered = filterLog({ log, context });
      assert.deepEqual(filtered, { nested: { values: [1, 2] } });
      filtered.nested.values.push(3);
      assert.deepEqual(log.nested.values, [1, 2]);
      assert.equal(log.pid, 1);
      let deep = {};
      for (let i = 0; i < 5000; i++) deep = { child: deep };
      assert.throws(() => filterLog({ log: deep, context }), error =>
        error.name === 'MaxDepthExceededError' && error.maxDepth === 1000);
      assert.deepEqual(filterLog({ log: { msg: 'still works' }, context }), { msg: 'still works' });
    `);
  });

  it("emits structured logs with the production pretty transport", () => {
    const output = runIsolated(`
      const { logger } = require('./src/logger.ts');
      logger.info({ nested: { value: 42 } }, 'production-logger-smoke');
      logger.flush();
    `, true);
    expect(output).toContain("production-logger-smoke");
    expect(output).toContain('"value": 42');
    expect(output).toContain("INFO");
    expect(output).not.toContain('"pid"');
    expect(output).not.toContain('"hostname"');
  });
});
