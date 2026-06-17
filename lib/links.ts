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

export function getNetflixSearchUrl(item: Pick<
  AnimeItem,
  "titleChinese" | "titleNative" | "titleEnglish" | "title"
>): string {
  return `https://www.netflix.com/search?q=${encodeURIComponent(getSearchKeyword(item))}`;
}

export function getMalAnimeUrl(malId: number): string {
  return `https://myanimelist.net/anime/${malId}`;
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
