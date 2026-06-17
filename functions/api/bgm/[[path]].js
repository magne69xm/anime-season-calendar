const BGM_BASE = "https://api.bgm.tv";
const UA = "anime-season-calendar/0.1 (cloudflare pages)";

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, User-Agent, Accept",
      },
    });
  }

  const url = new URL(context.request.url);
  const suffix = url.pathname.replace(/^\/api\/bgm/, "") || "/";
  const target = `${BGM_BASE}${suffix}${url.search}`;
  const headers = {
    "User-Agent": UA,
    Accept: "application/json",
    "Content-Type": context.request.headers.get("Content-Type") || "application/json",
  };

  const init = {
    method: context.request.method,
    headers,
  };

  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    init.body = await context.request.text();
  }

  const response = await fetch(target, init);

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
