import assert from "node:assert/strict";

import type { PhbReviewQueueSummary } from "data-tools/phb-review";

import { startReviewConsole } from "./launcher.js";

async function main() {
  const started = await startReviewConsole({ port: 0, preview: true });
  const baseUrl = `http://127.0.0.1:${started.port}`;
  const headers = { "x-phb-review-token": started.token };
  try {
    const shell = await fetch(baseUrl);
    assert.equal(shell.status, 200);
    assert.match(
      await shell.text(),
      new RegExp(
        `<meta name="phb-review-token" content="${started.token}">`,
        "u",
      ),
    );

    const queuesResponse = await fetch(`${baseUrl}/api/queues`, { headers });
    assert.equal(queuesResponse.status, 200);
    const queuesBody = (await queuesResponse.json()) as {
      queues: PhbReviewQueueSummary[];
    };
    const layout = queuesBody.queues.find(
      (queue) => queue.queueId === "mineru-layout",
    );
    const english = queuesBody.queues.find(
      (queue) => queue.queueId === "english-residual",
    );
    assert.ok(layout && layout.total > 0);
    assert.ok(english && english.availability.available && english.total > 0);

    for (const queue of [layout, english]) {
      const response = await fetch(`${baseUrl}/api/queues/${queue.queueId}`, {
        headers,
      });
      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        items: Array<{ itemId: string }>;
      };
      assert.ok(body.items[0]);
      const detail = await fetch(
        `${baseUrl}/api/queues/${queue.queueId}/items/${encodeURIComponent(body.items[0]!.itemId)}`,
        { headers },
      );
      assert.equal(detail.status, 200);
      assert.doesNotMatch(await detail.text(), /[A-Z]:\\/u);
    }

    const pdf = await fetch(`${baseUrl}/api/sources/phb35-core/pdf`, {
      headers: { ...headers, Range: "bytes=0-7" },
    });
    assert.equal(pdf.status, 206);
    assert.equal(
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 4)
        .toString(),
      "%PDF",
    );

    process.stdout.write(
      `PHB review console local smoke passed: ${layout.total} layout, ${english.total} English residual.\n`,
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      started.server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
