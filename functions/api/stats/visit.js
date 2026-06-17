const ACTIVE_WINDOW_SECONDS = 90;

async function readStats(env) {
  if (!env.STATS) {
    return { daily: {}, sessions: {}, totalViews: 0 };
  }
  const raw = await env.STATS.get("site-stats");
  if (!raw) {
    return { daily: {}, sessions: {}, totalViews: 0 };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { daily: {}, sessions: {}, totalViews: 0 };
  }
}

async function writeStats(env, payload) {
  if (!env.STATS) return;
  await env.STATS.put("site-stats", JSON.stringify(payload));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const stats = await readStats(context.env);
  const today = todayKey();
  stats.daily[today] = stats.daily[today] || [];
  if (!stats.daily[today].includes(sessionId)) {
    stats.daily[today].push(sessionId);
  }
  stats.sessions[sessionId] = Date.now() / 1000;
  stats.totalViews = Number(stats.totalViews || 0) + 1;
  await writeStats(context.env, stats);

  return Response.json({ ok: true });
}
