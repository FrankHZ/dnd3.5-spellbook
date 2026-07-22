import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createServer as createViteServer } from "vite";
import type { PhbReviewService } from "data-tools/phb-review";

import { createReviewConsoleApi } from "./app.js";
import { createReviewToken } from "./security.js";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export type StartReviewConsoleOptions = {
  port?: number;
  token?: string;
  service?: PhbReviewService;
  preview?: boolean;
};

export async function startReviewConsole(
  options: StartReviewConsoleOptions = {},
) {
  const port = options.port ?? parsePort(process.env.PHB_REVIEW_PORT);
  const token = options.token ?? createReviewToken();
  const service = options.service ?? (await createLocalService());
  const api = createReviewConsoleApi({ service, token });
  const shell = options.preview
    ? createStaticShell(token)
    : await createDevelopmentShell(token);
  const server = http.createServer((request, response) => {
    void api(request, response)
      .then((handled) => {
        if (!handled) shell(request, response);
      })
      .catch(() => {
        if (!response.headersSent) {
          response.writeHead(500, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          response.end("Review console request failed.");
        } else {
          response.destroy();
        }
      });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  return { server, token, port: (server.address() as { port: number }).port };
}

async function createLocalService() {
  const runtime = await import("data-tools/phb-review");
  return runtime.createPhbReviewService();
}

async function createDevelopmentShell(token: string) {
  const vite = await createViteServer({
    root: workspaceRoot,
    appType: "spa",
    server: { host: "127.0.0.1", middlewareMode: true },
    plugins: [reviewTokenHtmlPlugin(token)],
  });
  return (request: http.IncomingMessage, response: http.ServerResponse) => {
    vite.middlewares(request, response, () => {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    });
  };
}

function createStaticShell(token: string) {
  const distRoot = path.join(workspaceRoot, "dist");
  return (request: http.IncomingMessage, response: http.ServerResponse) => {
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const requested = pathname === "/" ? "index.html" : pathname.slice(1);
    const candidate = path.resolve(distRoot, requested);
    const fallback = path.join(distRoot, "index.html");
    const filePath =
      candidate.startsWith(`${distRoot}${path.sep}`) && fs.existsSync(candidate)
        ? candidate
        : fallback;
    if (!fs.existsSync(filePath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Run npm run build before npm run start.");
      return;
    }
    if (filePath.endsWith(".html")) {
      const html = injectReviewToken(fs.readFileSync(filePath, "utf8"), token);
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Length": String(Buffer.byteLength(html)),
      });
      response.end(html);
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store",
    });
    fs.createReadStream(filePath).pipe(response);
  };
}

function reviewTokenHtmlPlugin(token: string) {
  return {
    name: "phb-review-token",
    transformIndexHtml: {
      order: "pre" as const,
      handler: (html: string) => injectReviewToken(html, token),
    },
  };
}

function injectReviewToken(html: string, token: string) {
  const meta = `<meta name="phb-review-token" content="${token}">`;
  return html.includes("</head>")
    ? html.replace("</head>", `  ${meta}\n  </head>`)
    : `${meta}\n${html}`;
}

function contentType(filePath: string) {
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

function parsePort(value: string | undefined) {
  if (!value) return 4174;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PHB_REVIEW_PORT must be a numeric TCP port.");
  }
  return port;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const preview = process.argv.includes("--preview");
  void startReviewConsole({ preview }).then(({ port }) => {
    process.stdout.write(
      `PHB review console listening on http://127.0.0.1:${port}\n`,
    );
  });
}
