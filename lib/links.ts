import type { AnimeItem } from "./season";

export function getSearchKeyword(item: Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>): string {
  return (
    item.titleChinese ||
    item.titleEnglish?.split(":")[0]?.trim() ||
    item.titleEnglish ||
    item.titleNative ||
    item.title ||
    "anime"
  );
}

export function getBilibiliSearchUrl(item: Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>): string {
  return `https://search.bilibili.com/all?keyword=${encodeURIComponent(getSearchKeyword(item))}`;
}

export function getCrunchyrollSearchUrl(item: Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>): string {
  return `https://www.crunchyroll.com/search?q=${encodeURIComponent(getSearchKeyword(item))}`;
}

export function getTubiSearchUrl(item: Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>): string {
  return `https://tubitv.com/search/${encodeURIComponent(getSearchKeyword(item))}`;
}

export function getYouTubeSearchUrl(item: Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(getSearchKeyword(item) + " anime")}`;
}

export function getPlutoTvSearchUrl(item: Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>): string {
  return `https://pluto.tv/en/search?query=${encodeURIComponent(getSearchKeyword(item))}`;
}

export function getNetflixSearchUrl(item: Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>): string {
  return `https://www.netflix.com/search?q=${encodeURIComponent(getSearchKeyword(item))}`;
}

export function getHuluSearchUrl(item: Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>): string {
  return `https://www.hulu.com/search?q=${encodeURIComponent(getSearchKeyword(item))}`;
}

export function getPrimeVideoSearchUrl(item: Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>): string {
  return `https://www.primevideo.com/search?phrase=${encodeURIComponent(getSearchKeyword(item))}`;
}

export function getDisneyPlusSearchUrl(item: Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>): string {
  return `https://www.disneyplus.com/search?q=${encodeURIComponent(getSearchKeyword(item))}`;
}

export function getHidiveSearchUrl(item: Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>): string {
  return `https://www.hidive.com/search?q=${encodeURIComponent(getSearchKeyword(item))}`;
}

export function getMalAnimeUrl(malId: number): string {
  return `https://myanimelist.net/anime/${malId}`;
}

type WatchLinkItem = Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>;

export function getInternationalWatchLinks(
  item: WatchLinkItem,
  malId: number
): { label: string; href: string }[] {
  return [
    { label: "免费 · Crunchyroll", href: getCrunchyrollSearchUrl(item) },
    { label: "免费 · Tubi", href: getTubiSearchUrl(item) },
    { label: "免费 · YouTube", href: getYouTubeSearchUrl(item) },
    { label: "免费 · Pluto TV", href: getPlutoTvSearchUrl(item) },
    { label: "Netflix", href: getNetflixSearchUrl(item) },
    { label: "Hulu", href: getHuluSearchUrl(item) },
    { label: "Prime Video", href: getPrimeVideoSearchUrl(item) },
    { label: "Disney+", href: getDisneyPlusSearchUrl(item) },
    { label: "HiDIVE", href: getHidiveSearchUrl(item) },
    { label: "详情 · MAL", href: getMalAnimeUrl(malId) },
  ];
}

export function getBangumiSubjectUrl(bangumiId: number | null | undefined): string | null {
  if (!bangumiId) return null;
  return `https://bgm.tv/subject/${bangumiId}`;
}

export function getAniListUrl(anilistId: number): string {
  return `https://anilist.co/anime/${anilistId}`;
}

export function isInternationalDeployment(): boolean {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_REGION === "international";
  }
  const hostname = window.location.hostname;
  return hostname !== "localhost" && hostname !== "127.0.0.1";
}
