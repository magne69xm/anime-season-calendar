import type { AnimeItem, DayGroup, MediaSeason, SeasonInfo } from "./season";
import { getCurrentSeason, groupAnimeByWeekday } from "./season";

export interface CatalogAnimeItem extends AnimeItem {
  season: MediaSeason;
  seasonYear: number;
}

export interface MonthGroup {
  key: string;
  label: string;
  year: number;
  season: MediaSeason;
  seasonYear: number;
  itemCount: number;
  dayGroups: DayGroup[];
}

export interface YearBlock {
  year: number;
  months: MonthGroup[];
}

const SEASON_ORDER: MediaSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];

export function getSeasonMonthLabel(season: MediaSeason, year: number): string {
  const month = season === "WINTER" ? 1 : season === "SPRING" ? 4 : season === "SUMMER" ? 7 : 10;
  return `${year}年${month}月`;
}

export function seasonSortIndex(season: MediaSeason, year: number): number {
  const seasonIndex = SEASON_ORDER.indexOf(season);
  return year * 4 + seasonIndex;
}

export function getAllSeasonsSince(startYear = 2020, date = new Date()): SeasonInfo[] {
  const current = getCurrentSeason(date);
  const endIndex = seasonSortIndex(current.season, current.year);
  const seasons: SeasonInfo[] = [];

  for (let year = startYear; year <= current.year + 1; year += 1) {
    for (const season of SEASON_ORDER) {
      if (seasonSortIndex(season, year) > endIndex) {
        continue;
      }

      seasons.push({
        season,
        year,
        label: getSeasonMonthLabel(season, year),
      });
    }
  }

  return seasons.sort(
    (a, b) => seasonSortIndex(b.season, b.year) - seasonSortIndex(a.season, a.year),
  );
}

export function groupAnimeByYearMonth(items: CatalogAnimeItem[]): YearBlock[] {
  const monthMap = new Map<string, CatalogAnimeItem[]>();

  for (const item of items) {
    const key = `${item.seasonYear}-${item.season}`;
    const bucket = monthMap.get(key) ?? [];
    bucket.push(item);
    monthMap.set(key, bucket);
  }

  const months: MonthGroup[] = Array.from(monthMap.entries())
    .map(([key, bucket]) => {
      const sample = bucket[0];
      return {
        key,
        label: getSeasonMonthLabel(sample.season, sample.seasonYear),
        year: sample.seasonYear,
        season: sample.season,
        seasonYear: sample.seasonYear,
        itemCount: bucket.length,
        dayGroups: groupAnimeByWeekday(bucket),
      };
    })
    .sort((a, b) => seasonSortIndex(b.season, b.seasonYear) - seasonSortIndex(a.season, a.seasonYear));

  const yearBlocks: YearBlock[] = [];

  for (const month of months) {
    const last = yearBlocks[yearBlocks.length - 1];
    if (!last || last.year !== month.year) {
      yearBlocks.push({ year: month.year, months: [month] });
    } else {
      last.months.push(month);
    }
  }

  return yearBlocks;
}
