export default async (request: Request) => {
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
    // 1. Resolve redirect location on server
    const headRes = await fetch(GITHUB_RELEASE_URL, {
      method: "GET",
      redirect: "manual",
    });

    const targetUrl = headRes.headers.get("location") || GITHUB_RELEASE_URL;

    // 2. Prepare upstream request with client headers (Range is critical)
    const upstreamHeaders = new Headers();
    const range = request.headers.get("range");
    if (range) {
      upstreamHeaders.set("range", range);
    }

    // 3. Fetch specific byte range or chunk
    const upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers: upstreamHeaders,
    });

    // 4. Build response headers with permissive CORS & Expose-Headers
    const responseHeaders = new Headers();
    const forwardedHeaders = [
      "content-range",
      "content-length",
      "content-type",
      "accept-ranges",
      "etag",
      "last-modified",
    ];

    for (const h of forwardedHeaders) {
      const val = upstreamRes.headers.get(h);
      if (val) responseHeaders.set(h, val);
    }

    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.set(
      "Access-Control-Expose-Headers",
      "Content-Range, Content-Length, Accept-Ranges, ETag, Content-Type"
    );
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

    return new Response(request.method === "HEAD" ? null : upstreamRes.body, {
      status: upstreamRes.status, // Returns 206 when Range is requested
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
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
