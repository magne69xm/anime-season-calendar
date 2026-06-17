import { getAllSeasonsSince, type CatalogAnimeItem } from "./schedule";
import {
  AnimeItem,
  MediaSeason,
  SeasonInfo,
  getCurrentSeason,
} from "./season";
import { getDisplayTitle } from "./titles";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

interface AniListMedia {
  id: number;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  };
  coverImage: {
    medium: string | null;
    color: string | null;
  } | null;
  episodes: number | null;
  format: string | null;
  genres: string[] | null;
  status: string;
  nextAiringEpisode: {
    airingAt: number;
    episode: number;
  } | null;
}

interface AniListResponse {
  data: {
    Page: {
      pageInfo: {
        hasNextPage: boolean;
        currentPage: number;
      };
      media: AniListMedia[];
    };
  };
}

const SEASON_QUERY = `
  query SeasonAnime($season: MediaSeason, $year: Int, $page: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo {
        hasNextPage
        currentPage
      }
      media(
        season: $season
        seasonYear: $year
        type: ANIME
        sort: POPULARITY_DESC
        isAdult: false
      ) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          medium
          color
        }
        episodes
        format
        genres
        status
        nextAiringEpisode {
          airingAt
          episode
        }
      }
    }
  }
`;

function mapMedia(item: AniListMedia): AnimeItem {
  const titleNative = item.title.native;
  const titleRomaji = item.title.romaji;
  const titleEnglish = item.title.english;
  const fallbackTitle =
    titleEnglish || titleNative || "未知番剧";

  return {
    id: item.id,
    title: fallbackTitle,
    titleChinese: null,
    titleNative,
    titleRomaji,
    titleEnglish,
    bangumiId: null,
    coverImage: item.coverImage?.medium ?? null,
    coverColor: item.coverImage?.color ?? null,
    episodes: item.episodes,
    format: item.format,
    genres: item.genres ?? [],
    status: item.status,
    nextEpisode: item.nextAiringEpisode?.episode ?? null,
    nextAiringAt: item.nextAiringEpisode?.airingAt ?? null,
  };
}

async function fetchSeasonPage(
  season: MediaSeason,
  year: number,
  page: number,
): Promise<{ items: AnimeItem[]; hasNextPage: boolean }> {
  const response = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: SEASON_QUERY,
      variables: { season, year, page },
    }),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`AniList 请求失败: ${response.status}`);
  }

  const json = (await response.json()) as AniListResponse;
  const pageData = json.data.Page;

  return {
    items: pageData.media.map(mapMedia),
    hasNextPage: pageData.pageInfo.hasNextPage,
  };
}

export async function fetchSeasonCatalog(
  seasonInfo: SeasonInfo,
): Promise<CatalogAnimeItem[]> {
  const items = await fetchSeasonAnime(seasonInfo);
  return items.map((item) => ({
    ...item,
    season: seasonInfo.season,
    seasonYear: seasonInfo.year,
  }));
}

export async function fetchCatalogSince(startYear = 2020): Promise<CatalogAnimeItem[]> {
  const seasons = getAllSeasonsSince(startYear);
  const allItems: CatalogAnimeItem[] = [];

  for (const seasonInfo of seasons) {
    const items = await fetchSeasonCatalog(seasonInfo);
    allItems.push(...items);
  }

  const unique = new Map<number, CatalogAnimeItem>();
  for (const item of allItems) {
    unique.set(item.id, item);
  }

  return Array.from(unique.values());
}

export async function fetchSeasonAnime(
  seasonInfo: SeasonInfo = getCurrentSeason(),
): Promise<AnimeItem[]> {
  const allItems: AnimeItem[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && page <= 4) {
    const result = await fetchSeasonPage(seasonInfo.season, seasonInfo.year, page);
    allItems.push(...result.items);
    hasNextPage = result.hasNextPage;
    page += 1;
  }

  const unique = new Map<number, AnimeItem>();
  for (const item of allItems) {
    unique.set(item.id, item);
  }

  return Array.from(unique.values()).map((item) => ({
    ...item,
    title: getDisplayTitle(item),
  }));
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "RELEASING":
      return "连载中";
    case "NOT_YET_RELEASED":
      return "未开播";
    case "FINISHED":
      return "已完结";
    case "CANCELLED":
      return "已取消";
    case "HIATUS":
      return "暂停";
    default:
      return status;
  }
}

export function getFormatLabel(format: string | null): string {
  switch (format) {
    case "TV":
      return "TV";
    case "TV_SHORT":
      return "短篇 TV";
    case "MOVIE":
      return "剧场版";
    case "SPECIAL":
      return "特别篇";
    case "OVA":
      return "OVA";
    case "ONA":
      return "ONA";
    case "MUSIC":
      return "音乐";
    default:
      return format ?? "其他";
  }
}
