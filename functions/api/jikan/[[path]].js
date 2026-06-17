const JIKAN_BASE = "https://api.jikan.moe/v4";
const UA = "anime-season-calendar/0.1 (cloudflare pages)";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const suffix = url.pathname.replace(/^\/api\/jikan/, "") || "/";
  const target = `${JIKAN_BASE}${suffix}${url.search}`;

  const response = await fetch(target, {
    method: context.request.method,
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
    },
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
