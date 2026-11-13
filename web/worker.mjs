export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    // Static Assets also applies SPA fallback through the binding. Locale
    // requests must expose a missing file instead of returning the app shell.
    if (
      new URL(request.url).pathname.startsWith("/locales/") &&
      response.headers.get("content-type")?.split(";")[0].trim() === "text/html"
    ) {
      return new Response(request.method === "HEAD" ? null : "Not Found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return response;
  },
};
