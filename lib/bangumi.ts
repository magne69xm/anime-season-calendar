import type { MediaSeason } from "./season";
import type { AnimeItem } from "./season";
import { getBangumiSeasonKeyword, normalizeTitle } from "./titles";
import { pickSimplifiedChineseName } from "./zh";

const BANGUMI_USER_AGENT = "anime-season-calendar/0.1 (personal project)";

export interface BangumiSubjectMatch {
  id: number;
  name: string;
  name_cn?: string | null;
}

export interface BangumiResolvedInfo {
  titleChinese: string | null;
  bangumiId: number | null;
}

interface BangumiSearchResponse {
  data?: BangumiSubjectMatch[];
}

interface BangumiCalendarDay {
  items?: BangumiSubjectMatch[];
}

function pickChineseName(subject: { name: string; name_cn?: string | null }): string | null {
  return pickSimplifiedChineseName(subject);
}

function addMapping(
  map: Map<string, BangumiResolvedInfo>,
  chineseTitle: string,
  bangumiId: number,
  aliases: Array<string | null | undefined>,
) {
  const info: BangumiResolvedInfo = {
    titleChinese: chineseTitle,
    bangumiId,
  };

  map.set(normalizeTitle(chineseTitle), info);

  for (const alias of aliases) {
    if (!alias) continue;
    map.set(normalizeTitle(alias), info);
  }
}

async function bangumiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": BANGUMI_USER_AGENT,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    throw new Error(`Bangumi 请求失败: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function searchBangumiSubjects(
  keyword: string,
  limit = 8,
): Promise<BangumiSubjectMatch[]> {
  const result = await bangumiRequest<BangumiSearchResponse>(
    "https://api.bgm.tv/v0/search/subjects?limit=50",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyword,
        filter: {
          type: ["2"],
        },
        limit,
        offset: 0,
      }),
    },
  );

  return result.data ?? [];
}

function scoreSubjectMatch(query: string, subject: BangumiSubjectMatch): number {
  const normalizedQuery = normalizeTitle(query);
  if (!normalizedQuery) return 0;

  const candidates = [subject.name_cn, subject.name].filter(Boolean) as string[];
  let best = 0;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeTitle(candidate);
    if (!normalizedCandidate) continue;
    if (normalizedQuery === normalizedCandidate) return 100;
    if (
      normalizedCandidate.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedCandidate)
    ) {
      best = Math.max(best, 80);
      continue;
    }

    const queryWords = normalizedQuery.slice(0, 12);
    const candidateWords = normalizedCandidate.slice(0, 12);
    if (queryWords && candidateWords && queryWords === candidateWords) {
      best = Math.max(best, 70);
    }
  }

  return best;
}

export function pickBestBangumiSubject(
  keyword: string,
  subjects: BangumiSubjectMatch[],
): BangumiSubjectMatch | null {
  if (!subjects.length) return null;

  const ranked = subjects
    .map((subject) => ({
      subject,
      score: scoreSubjectMatch(keyword, subject),
    }))
    .sort((a, b) => b.score - a.score);

  if (ranked[0].score >= 60) return ranked[0].subject;
  if (subjects.length === 1) return subjects[0];
  return ranked[0].score >= 40 ? ranked[0].subject : null;
}

export function buildBangumiKeywords(item: Pick<
  AnimeItem,
  "titleNative" | "titleRomaji" | "titleEnglish"
>): string[] {
  const keywords = new Set<string>();

  if (item.titleNative) keywords.add(item.titleNative.trim());
  if (item.titleRomaji) keywords.add(item.titleRomaji.trim());

  if (item.titleEnglish) {
    const english = item.titleEnglish.trim();
    keywords.add(english);
    keywords.add(english.split(":")[0]?.trim() ?? "");
    keywords.add(english.split(" - ")[0]?.trim() ?? "");
  }

  return Array.from(keywords).filter(Boolean);
}

export async function resolveBangumiForItem(
  item: Pick<AnimeItem, "titleNative" | "titleRomaji" | "titleEnglish">,
): Promise<BangumiResolvedInfo | null> {
  const keywords = buildBangumiKeywords(item);

  for (const keyword of keywords) {
    try {
      const subjects = await searchBangumiSubjects(keyword);
      const best = pickBestBangumiSubject(keyword, subjects);
      if (!best) continue;

      return {
        titleChinese: pickChineseName(best),
        bangumiId: best.id,
      };
    } catch {
      continue;
    }
  }

  return null;
}

async function searchSeasonSubjectsByTag(tag: string): Promise<BangumiSubjectMatch[]> {
  const result = await bangumiRequest<BangumiSearchResponse>(
    "https://api.bgm.tv/v0/search/subjects?limit=50",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyword: tag,
        filter: {
          type: ["2"],
        },
        limit: 50,
        offset: 0,
      }),
    },
  );

  return result.data ?? [];
}

export async function fetchBangumiTitleMap(
  season: MediaSeason,
  year: number,
): Promise<Map<string, BangumiResolvedInfo>> {
  const map = new Map<string, BangumiResolvedInfo>();

  try {
    const calendar = await bangumiRequest<BangumiCalendarDay[]>("https://api.bgm.tv/calendar");

    for (const day of calendar) {
      for (const item of day.items ?? []) {
        const chineseTitle = pickChineseName(item);
        if (!chineseTitle) continue;
        addMapping(map, chineseTitle, item.id, [item.name, item.name_cn]);
      }
    }
  } catch {
    // 忽略，继续季度搜索
  }

  const keywords = [
    getBangumiSeasonKeyword(season, year),
    `${getBangumiSeasonKeyword(season, year)}新番`,
    `${year}年${season === "WINTER" ? "1" : season === "SPRING" ? "4" : season === "SUMMER" ? "7" : "10"}月`,
  ];

  for (const keyword of keywords) {
    try {
      const subjects = await searchSeasonSubjectsByTag(keyword);
      for (const subject of subjects) {
        const chineseTitle = pickChineseName(subject);
        if (!chineseTitle) continue;
        addMapping(map, chineseTitle, subject.id, [subject.name, subject.name_cn]);
      }
    } catch {
      continue;
    }
  }

  return map;
}

export function lookupBangumiInfo(
  item: Pick<AnimeItem, "titleNative" | "titleRomaji" | "titleEnglish">,
  titleMap: Map<string, BangumiResolvedInfo>,
): BangumiResolvedInfo | null {
  const candidates = [item.titleNative, item.titleRomaji, item.titleEnglish].filter(
    Boolean,
  ) as string[];

  for (const candidate of candidates) {
    const direct = titleMap.get(normalizeTitle(candidate));
    if (direct) return direct;
  }

  for (const candidate of candidates) {
    const normalized = normalizeTitle(candidate);
    if (normalized.length < 4) continue;

    for (const [key, value] of titleMap.entries()) {
      if (key.length < 4) continue;
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
  }

  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function enrichAnimeMetadata(
  items: AnimeItem[],
  season: MediaSeason,
  year: number,
  options?: { deepSearch?: boolean; maxDeepSearch?: number },
): Promise<AnimeItem[]> {
  const titleMap = await fetchBangumiTitleMap(season, year);
  const enriched = items.map((item) => {
    const matched = lookupBangumiInfo(item, titleMap);
    return {
      ...item,
      titleChinese: matched?.titleChinese ?? item.titleChinese,
      bangumiId: matched?.bangumiId ?? item.bangumiId ?? null,
    };
  });

  if (!options?.deepSearch) {
    return enriched;
  }

  const maxDeepSearch = options.maxDeepSearch ?? 60;
  const missing = enriched.filter((item) => !item.titleChinese || !item.bangumiId).slice(0, maxDeepSearch);

  for (const item of missing) {
    try {
      const resolved = await resolveBangumiForItem(item);
      if (!resolved) continue;

      if (resolved.titleChinese) item.titleChinese = resolved.titleChinese;
      if (resolved.bangumiId) item.bangumiId = resolved.bangumiId;
    } catch {
      continue;
    }

    await sleep(220);
  }

  return enriched;
}
