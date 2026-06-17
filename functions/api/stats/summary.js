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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dayOffset(offset) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const password = url.searchParams.get("password") || "";
  const expected = context.env.AUTHOR_PASSWORD || "zhuifan2026";

  if (password !== expected) {
    return Response.json({ error: "密码错误" }, { status: 401 });
  }

  const stats = await readStats(context.env);
  const now = Date.now() / 1000;
  const today = todayKey();
  const sessions = stats.sessions || {};
  const onlineNow = Object.values(sessions).filter(
    (lastSeen) => now - Number(lastSeen) <= ACTIVE_WINDOW_SECONDS
  ).length;

  const dailyHistory = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const key = dayOffset(offset);
    dailyHistory.push({
      date: key,
      count: (stats.daily?.[key] || []).length,
    });
  }

  return Response.json({
    todayVisitors: (stats.daily?.[today] || []).length,
    onlineNow,
    totalViews: Number(stats.totalViews || 0),
    dailyHistory,
  });
}
