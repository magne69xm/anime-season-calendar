import type { AnimeItem, MediaSeason, SeasonInfo } from "./season";
import { enrichAnimeMetadata } from "./bangumi";

export function normalizeTitle(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[·・:：!！?？\-—_]/g, "")
    .replace(/season\d+/gi, "")
    .replace(/第[一二三四五六七八九十\d]+期/g, "");
}

export function getPrimaryTitle(item: Pick<
  AnimeItem,
  "titleChinese" | "titleEnglish" | "titleNative" | "titleRomaji" | "title"
>): string {
  return (
    item.titleChinese ||
    item.titleEnglish ||
    item.titleNative ||
    item.title ||
    "未知番剧"
  );
}

export function getJapaneseTitle(item: Pick<
  AnimeItem,
  "titleNative" | "titleChinese" | "titleEnglish"
>): string | null {
  if (!item.titleNative?.trim()) return null;

  const primary = getPrimaryTitle(item);
  if (item.titleNative.trim() === primary.trim()) return null;

  return item.titleNative.trim();
}

export function getDisplayTitle(item: Pick<
  AnimeItem,
  "titleChinese" | "titleEnglish" | "titleRomaji" | "titleNative" | "title"
>): string {
  const primary = getPrimaryTitle(item);
  const japanese = getJapaneseTitle(item);
  return japanese ? `${primary} / ${japanese}` : primary;
}

export function getBangumiSeasonKeyword(season: MediaSeason, year: number): string {
  switch (season) {
    case "WINTER":
      return `${year}年1月`;
    case "SPRING":
      return `${year}年4月`;
    case "SUMMER":
      return `${year}年7月`;
    case "FALL":
      return `${year}年10月`;
  }
}

export async function enrichSeasonAnime(
  items: AnimeItem[],
  seasonInfo: SeasonInfo,
  options?: { deepSearch?: boolean; maxDeepSearch?: number },
): Promise<AnimeItem[]> {
  try {
    const enriched = await enrichAnimeMetadata(
      items,
      seasonInfo.season,
      seasonInfo.year,
      options,
    );

    return enriched.map((item) => ({
      ...item,
      title: getDisplayTitle(item),
    }));
  } catch {
    return items.map((item) => ({
      ...item,
      title: getDisplayTitle(item),
    }));
  }
}
