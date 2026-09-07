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

  try {
    // Follow the redirect on the server to retrieve the direct Azure Blob URL with its signature tokens
    const res = await fetch(GITHUB_RELEASE_URL, {
      method: "HEAD",
      redirect: "manual",
    });

    const location = res.headers.get("location");
    if (!location) {
      // If no redirect header, fallback to redirect follow
      const followRes = await fetch(GITHUB_RELEASE_URL, {
        method: "HEAD",
        redirect: "follow",
      });
      return new Response(null, {
        status: 307,
        headers: {
          "Location": followRes.url,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "Location",
        },
      });
    }

    return new Response(null, {
      status: 307,
      headers: {
        "Location": location,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Location",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
};

export const config = { path: "/models/yuli.gguf" };
