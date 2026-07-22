import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  PhbReviewError,
  type PhbReviewDecisionRequest,
  type PhbReviewItemDetail,
  type PhbReviewListItem,
  type PhbReviewQueue,
  type PhbReviewQueueSummary,
  type PhbReviewService,
} from "data-tools/phb-review";

import { createReviewConsoleApi } from "./app.js";
import { startReviewConsole } from "./launcher.js";

const token = "review-token";
const fingerprint = "a".repeat(64);
const temporaryPaths: string[] = [];
const activeServers: http.Server[] = [];

afterEach(async () => {
  await Promise.all(
    activeServers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  );
  for (const temporaryPath of temporaryPaths.splice(0)) {
    fs.rmSync(temporaryPath, { force: true, recursive: true });
  }
});

describe("PHB review localhost API", () => {
  it("resolves the public data-tools review runtime during launcher startup", async () => {
    const started = await startReviewConsole({ port: 0, preview: true, token });
    activeServers.push(started.server);
    expect(started.server.address()).toMatchObject({ address: "127.0.0.1" });
    const response = await fetch(`http://127.0.0.1:${started.port}/`);
    expect(await response.text()).toContain(
      `<meta name="phb-review-token" content="${token}">`,
    );
  });

  it("binds API tests to literal loopback and rejects Host, Origin, and token failures before writes", async () => {
    const fixture = await startFixture({ launcher: true });
    expect(fixture.server.address()).toMatchObject({ address: "127.0.0.1" });

    const base = `http://127.0.0.1:${fixture.port}`;
    const rejectedToken = await fetch(`${base}/api/queues`, {
      headers: { Host: `127.0.0.1:${fixture.port}` },
    });
    expect(rejectedToken.status).toBe(401);

    const rejectedHost = await requestWithHeaders(base, "/api/queues", {
      "x-phb-review-token": token,
      Host: "localhost:4174",
    });
    expect(rejectedHost.status).toBe(403);

    const rejectedOrigin = await postDecision(base, fixture.port, {
      Origin: "http://127.0.0.1:9999",
    });
    expect(rejectedOrigin.status).toBe(403);
    expect(fixture.service.writeCount).toBe(0);

    const accepted = await postDecision(base, fixture.port);
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get("access-control-allow-origin")).toBeNull();
    expect(fixture.service.writeCount).toBe(1);
  });

  it("maps unknown queue and item errors without exposing filesystem paths", async () => {
    const fixture = await startFixture();
    const base = `http://127.0.0.1:${fixture.port}`;
    const headers = apiHeaders(fixture.port);

    const queue = await fetch(`${base}/api/queues/not-a-queue`, { headers });
    expect(queue.status).toBe(400);
    expect((await queue.json()).error.code).toBe("invalid-queue");

    const item = await fetch(`${base}/api/queues/mineru-layout/items/missing`, {
      headers,
    });
    expect(item.status).toBe(404);

    const source = await fetch(
      `${base}/api/sources/C:%5Cprivate%5Cphb.pdf/pdf`,
      { headers },
    );
    const sourceBody = await source.text();
    expect(source.status).toBe(404);
    expect(sourceBody).not.toContain(fixture.pdfPath);
    expect(sourceBody).not.toContain(path.dirname(fixture.pdfPath));
  });

  it("serves only verified source PDF bytes with PDF range semantics", async () => {
    const fixture = await startFixture();
    const base = `http://127.0.0.1:${fixture.port}`;

    const full = await fetch(`${base}/api/sources/phb35-core/pdf`, {
      headers: apiHeaders(fixture.port),
    });
    expect(full.status).toBe(200);
    expect(full.headers.get("accept-ranges")).toBe("bytes");
    expect(new Uint8Array(await full.arrayBuffer())).toEqual(
      new Uint8Array(fixture.pdfBytes),
    );

    const ranged = await fetch(`${base}/api/sources/phb35-core/pdf`, {
      headers: { ...apiHeaders(fixture.port), Range: "bytes=2-5" },
    });
    expect(ranged.status).toBe(206);
    expect(ranged.headers.get("content-range")).toBe(
      `bytes 2-5/${fixture.pdfBytes.length}`,
    );
    expect(new Uint8Array(await ranged.arrayBuffer())).toEqual(
      new Uint8Array(fixture.pdfBytes.slice(2, 6)),
    );

    const head = await fetch(`${base}/api/sources/phb35-core/pdf`, {
      method: "HEAD",
      headers: apiHeaders(fixture.port),
    });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe(
      String(fixture.pdfBytes.length),
    );

    const invalid = await fetch(`${base}/api/sources/phb35-core/pdf`, {
      headers: { ...apiHeaders(fixture.port), Range: "bytes=999-1000" },
    });
    expect(invalid.status).toBe(416);
  });

  it("returns structured current and availability details for stale service errors", async () => {
    const fixture = await startFixture({
      staleDecision: true,
      staleQueue: true,
    });
    const base = `http://127.0.0.1:${fixture.port}`;

    const decision = await postDecision(base, fixture.port);
    expect(decision.status).toBe(409);
    expect((await decision.json()).error.details.current.item.itemId).toBe(
      "layout-1",
    );

    const queue = await fetch(`${base}/api/queues/english-residual`, {
      headers: apiHeaders(fixture.port),
    });
    expect(queue.status).toBe(409);
    const queueBody = await queue.json();
    expect(queueBody.error.code).toBe("stale-queue");
    expect(queueBody.error.details.availability.requiredRerunFrom).toBe(
      "phb:source:extract",
    );
  });
});

async function startFixture(
  options: {
    staleDecision?: boolean;
    staleQueue?: boolean;
    launcher?: boolean;
  } = {},
) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "phb-review-console-"),
  );
  temporaryPaths.push(directory);
  const pdfPath = path.join(directory, "private-source.pdf");
  const pdfBytes = Buffer.from("%PDF-FAKE%");
  fs.writeFileSync(pdfPath, pdfBytes);
  const service = new FakePhbReviewService(pdfPath, pdfBytes.length, options);
  const api = createReviewConsoleApi({ service, token });
  const server = options.launcher
    ? (await startReviewConsole({ port: 0, preview: true, service, token }))
        .server
    : http.createServer((request, response) => {
        void api(request, response).then((handled) => {
          if (!handled) response.end();
        });
      });
  if (!options.launcher) {
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
  }
  activeServers.push(server);
  const port = (server.address() as { port: number }).port;
  return { server, port, service, pdfPath, pdfBytes };
}

function apiHeaders(port: number) {
  return { "x-phb-review-token": token, Host: `127.0.0.1:${port}` };
}

function postDecision(
  base: string,
  port: number,
  extraHeaders: Record<string, string> = {},
) {
  return fetch(`${base}/api/decisions`, {
    method: "POST",
    headers: {
      ...apiHeaders(port),
      Origin: `http://127.0.0.1:${port}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify({
      queueId: "mineru-layout",
      itemId: "layout-1",
      reviewFingerprintSha256: fingerprint,
      status: "accepted",
      reviewer: "tester",
      decisionNote: "checked",
    }),
  });
}

function requestWithHeaders(
  base: string,
  requestPath: string,
  headers: Record<string, string>,
) {
  const url = new URL(base);
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = http.request(
      {
        host: "127.0.0.1",
        port: Number(url.port),
        path: requestPath,
        method: "GET",
        headers,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
}

class FakePhbReviewService implements PhbReviewService {
  writeCount = 0;
  private readonly item: PhbReviewListItem = {
    queueId: "mineru-layout",
    itemId: "layout-1",
    label: "Layout row",
    status: "proposed",
    kind: "image-adjacent-exclusion",
    category: null,
    sourceId: "phb35-core",
    sourcePageIndex: 1,
    printedPageNumber: 2,
    evidenceFingerprintSha256: fingerprint,
    reviewFingerprintSha256: fingerprint,
    reviewer: null,
    decisionNote: null,
    allowedActions: ["accepted", "rejected"],
  };

  constructor(
    private readonly pdfPath: string,
    private readonly pdfBytes: number,
    private readonly options: { staleDecision?: boolean; staleQueue?: boolean },
  ) {}

  listQueues(): PhbReviewQueueSummary[] {
    return [this.getQueue("mineru-layout").summary];
  }

  getQueue(queueId: "mineru-layout" | "english-residual"): PhbReviewQueue {
    if (queueId === "english-residual" && this.options.staleQueue) {
      throw new PhbReviewError(
        "stale-queue",
        "English queue needs a canonical rerun.",
        {
          availability: {
            available: false,
            code: "stale-queue",
            message: "English queue needs a canonical rerun.",
            requiredRerunFrom: "phb:source:extract",
          },
        },
      );
    }
    if (queueId !== "mineru-layout" && queueId !== "english-residual") {
      throw new PhbReviewError("invalid-queue", "Unknown review queue.");
    }
    return {
      summary: {
        queueId,
        availability: { available: true },
        canonicalRerunRequired: null,
        total: 1,
        countsByStatus: { proposed: 1, accepted: 0, rejected: 0 },
        facets: { kind: { "image-adjacent-exclusion": 1 }, category: {} },
      },
      items: [this.item],
    };
  }

  getItem(
    queueId: "mineru-layout" | "english-residual",
    itemId: string,
  ): PhbReviewItemDetail {
    if (queueId !== "mineru-layout" && queueId !== "english-residual") {
      throw new PhbReviewError("invalid-queue", "Unknown review queue.");
    }
    if (itemId !== this.item.itemId) {
      throw new PhbReviewError("not-found", "Unknown review item.");
    }
    return {
      queueId: "mineru-layout",
      item: this.item,
      candidate: {} as never,
      page: {
        sourceId: "phb35-core",
        sourcePageIndex: 1,
        printedPageNumber: 2,
        width: 100,
        height: 100,
        mineruBlocks: [],
        pdfItems: [],
      },
    };
  }

  getSourcePdf(sourceId: string) {
    if (sourceId !== "phb35-core") {
      throw new PhbReviewError("not-found", "Unknown PHB PDF source.");
    }
    return {
      sourceId,
      bytes: this.pdfBytes,
      sha256: fingerprint,
      mediaType: "application/pdf" as const,
      createReadStream: (range?: { start: number; end: number }) =>
        fs.createReadStream(this.pdfPath, range),
    };
  }

  async submitDecision(_request: PhbReviewDecisionRequest) {
    if (this.options.staleDecision) {
      throw new PhbReviewError("stale-decision", "Layout row is stale.", {
        current: this.getItem("mineru-layout", this.item.itemId),
      });
    }
    this.writeCount += 1;
    return {
      item: this.item,
      changed: true,
      canonicalRerunRequired: { from: "phb:source:extract" as const },
    };
  }
}
