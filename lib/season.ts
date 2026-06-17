export type MediaSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export interface SeasonInfo {
  season: MediaSeason;
  year: number;
  label: string;
}

export interface AnimeItem {
  id: number;
  title: string;
  titleChinese: string | null;
  titleNative: string | null;
  titleRomaji: string | null;
  titleEnglish: string | null;
  coverImage: string | null;
  coverColor: string | null;
  episodes: number | null;
  format: string | null;
  genres: string[];
  status: string;
  nextEpisode: number | null;
  nextAiringAt: number | null;
  bangumiId: number | null;
  season?: MediaSeason;
  seasonYear?: number;
}

export interface DayGroup {
  key: string;
  label: string;
  shortLabel: string;
  items: AnimeItem[];
}

const SEASON_LABELS: Record<MediaSeason, string> = {
  WINTER: "冬季",
  SPRING: "春季",
  SUMMER: "夏季",
  FALL: "秋季",
};

export function getCurrentSeason(date = new Date()): SeasonInfo {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  if (month === 12) {
    return { season: "WINTER", year: year + 1, label: `${year + 1} 冬季` };
  }

  if (month >= 1 && month <= 2) {
    return { season: "WINTER", year, label: `${year} 冬季` };
  }

  if (month >= 3 && month <= 5) {
    return { season: "SPRING", year, label: `${year} 春季` };
  }

  if (month >= 6 && month <= 8) {
    return { season: "SUMMER", year, label: `${year} 夏季` };
  }

  return { season: "FALL", year, label: `${year} 秋季` };
}

export function getSeasonLabel(season: MediaSeason, year: number): string {
  return `${year} ${SEASON_LABELS[season]}`;
}

export function formatBeijingTime(unixSeconds: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(unixSeconds * 1000));
}

export function getWeekdayInfo(unixSeconds: number): {
  key: string;
  label: string;
  shortLabel: string;
} {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "long",
  });
  const label = formatter.format(new Date(unixSeconds * 1000));
  const shortFormatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  });
  const shortLabel = shortFormatter.format(new Date(unixSeconds * 1000));

  return {
    key: `weekday-${label}`,
    label,
    shortLabel,
  };
}

export function groupAnimeByWeekday(items: AnimeItem[]): DayGroup[] {
  const weekdayOrder = [
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
    "星期日",
  ];

  const groups = new Map<string, DayGroup>();
  const unscheduled: AnimeItem[] = [];

  for (const item of items) {
    if (!item.nextAiringAt) {
      unscheduled.push(item);
      continue;
    }

    const weekday = getWeekdayInfo(item.nextAiringAt);
    const existing = groups.get(weekday.label);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(weekday.label, {
        key: weekday.key,
        label: weekday.label,
        shortLabel: weekday.shortLabel,
        items: [item],
      });
    }
  }

  const scheduled = weekdayOrder
    .map((label) => groups.get(label))
    .filter((group): group is DayGroup => Boolean(group));

  for (const group of scheduled) {
    group.items.sort((a, b) => (a.nextAiringAt ?? 0) - (b.nextAiringAt ?? 0));
  }

  if (unscheduled.length > 0) {
    scheduled.push({
      key: "unscheduled",
      label: "待定 / 已完结",
      shortLabel: "待定",
      items: unscheduled.sort((a, b) =>
        (a.titleChinese || a.titleEnglish || a.titleNative || a.title).localeCompare(
          b.titleChinese || b.titleEnglish || b.titleNative || b.title,
          "zh-CN",
        ),
      ),
    });
  }

  return scheduled;
}
