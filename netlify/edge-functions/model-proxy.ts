export default async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const GITHUB_RELEASE_URL =
    "https://github.com/hoytnix/Yuli-Game/releases/download/v0.1.0/yuli-0.1.0-e2b.Q4_K_M.gguf";

  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) {
    headers.set("range", range);
  }

  // Server-side fetch automatically follows the 302 redirect to Azure storage
  const res = await fetch(GITHUB_RELEASE_URL, {
    headers,
    redirect: "follow",
  });

  const responseHeaders = new Headers(res.headers);
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Access-Control-Allow-Headers", "*");
  responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  responseHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
  responseHeaders.set("Accept-Ranges", "bytes");

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
};

export const config = { path: "/models/yuli.gguf" };
