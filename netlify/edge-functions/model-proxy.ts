export default async (request: Request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const GITHUB_RELEASE_URL =
    "https://github.com/hoytnix/Yuli-Game/releases/download/v0.1.0/yuli-0.1.0-e2b.Q4_K_M.gguf";

  try {
    // 1. Resolve the GitHub 302 redirect manually to get the direct storage location.
    // redirect: "manual" prevents fetch from following cross-origin and stripping the Range header.
    const redirectRes = await fetch(GITHUB_RELEASE_URL, {
      method: "GET",
      redirect: "manual",
    });

    const targetUrl = redirectRes.headers.get("location") || GITHUB_RELEASE_URL;

    // 2. Forward client request headers (especially Range) directly to the target URL
    const upstreamHeaders = new Headers();
    const range = request.headers.get("range");
    if (range) {
      upstreamHeaders.set("range", range);
    }

    const upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers: upstreamHeaders,
    });

    // 3. Forward streaming and range headers back to the browser
    const responseHeaders = new Headers();
    const headersToForward = [
      "content-range",
      "content-length",
      "content-type",
      "accept-ranges",
      "etag",
      "last-modified",
    ];

    for (const name of headersToForward) {
      const val = upstreamRes.headers.get(name);
      if (val) responseHeaders.set(name, val);
    }

    // 4. Expose CORS and byte-range headers to WebAssembly
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.set(
      "Access-Control-Expose-Headers",
      "Content-Range, Content-Length, Accept-Ranges, ETag, Content-Type"
    );
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

    return new Response(
      request.method === "HEAD" ? null : upstreamRes.body,
      {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: responseHeaders,
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
};

export const config = { path: "/models/yuli.gguf" };
