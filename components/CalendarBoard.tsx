"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnimeItem } from "@/lib/season";
import { formatBeijingTime } from "@/lib/season";
import type { YearBlock } from "@/lib/schedule";
import { getFormatLabel, getStatusLabel } from "@/lib/anilist";
import { getDisplayTitle, getJapaneseTitle, getPrimaryTitle } from "@/lib/titles";
import {
  getBilibiliSearchUrl,
  getBangumiSubjectUrl,
  getInternationalWatchLinks,
  isInternationalDeployment,
} from "@/lib/links";

const STORAGE_KEY = "tracked-anime-ids";

interface AnimeCardProps {
  item: AnimeItem;
}

export function AnimeCard({ item }: AnimeCardProps) {
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const ids = JSON.parse(raw) as number[];
      setTracked(ids.includes(item.id));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [item.id]);

  function toggleTrack() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ids = raw ? ((JSON.parse(raw) as number[]) ?? []) : [];
    const nextTracked = !tracked;
    const nextIds = nextTracked
      ? Array.from(new Set([...ids, item.id]))
      : ids.filter((id) => id !== item.id);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
    setTracked(nextTracked);
  }

  const displayTitle = getDisplayTitle(item);
  const primaryTitle = getPrimaryTitle(item);
  const japaneseTitle = getJapaneseTitle(item);
  const international = isInternationalDeployment();
  const bilibiliUrl = getBilibiliSearchUrl(item);
  const bangumiUrl = getBangumiSubjectUrl(item.bangumiId);
  const internationalLinks = getInternationalWatchLinks(item, item.id);

  return (
    <article className="anime-card">
      {item.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="anime-cover" src={item.coverImage} alt={displayTitle} />
      ) : (
        <div className="anime-cover placeholder">暂无封面</div>
      )}

      <div className="anime-content">
        <div className="anime-title-group">
          <h3 className="anime-title">{primaryTitle}</h3>
          {japaneseTitle ? <p className="anime-title-jp">{japaneseTitle}</p> : null}
        </div>

        <div className="anime-meta">
          <span className="tag accent">{getFormatLabel(item.format)}</span>
          <span className="tag">{getStatusLabel(item.status)}</span>
          {item.nextEpisode ? (
            <span className="tag">第 {item.nextEpisode} 集</span>
          ) : null}
        </div>

        {item.nextAiringAt ? (
          <p className="anime-time">
            下次更新：{formatBeijingTime(item.nextAiringAt)}（北京时间）
          </p>
        ) : (
          <p className="anime-time">更新时间待定</p>
        )}

        <button
          type="button"
          className={`track-button${tracked ? " is-tracked" : ""}`}
          onClick={toggleTrack}
        >
          {tracked ? "已加入追番" : "加入追番"}
        </button>

        <div className="watch-links">
          {international ? (
            internationalLinks.map(function (link, index) {
              return (
                <a
                  key={link.label}
                  className={index === 0 ? "link-button" : "link-button secondary"}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              );
            })
          ) : (
            <>
              <a
                className="link-button"
                href={bilibiliUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                B站看番
              </a>
              {bangumiUrl ? (
                <a
                  className="link-button secondary"
                  href={bangumiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  番组详情
                </a>
              ) : null}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

interface CalendarBoardProps {
  yearBlocks: YearBlock[];
  totalCount: number;
}

export function CalendarBoard({ yearBlocks, totalCount }: CalendarBoardProps) {
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);
  const [trackedIds, setTrackedIds] = useState<number[]>([]);

  useEffect(() => {
    const syncTracked = () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setTrackedIds([]);
        return;
      }
      try {
        setTrackedIds(JSON.parse(raw) as number[]);
      } catch {
        setTrackedIds([]);
      }
    };

    syncTracked();
    window.addEventListener("storage", syncTracked);
    const interval = window.setInterval(syncTracked, 800);

    return () => {
      window.removeEventListener("storage", syncTracked);
      window.clearInterval(interval);
    };
  }, []);

  const visibleYearBlocks = useMemo(() => {
    if (!showTrackedOnly) return yearBlocks;

    return yearBlocks
      .map((yearBlock) => ({
        ...yearBlock,
        months: yearBlock.months
          .map((month) => ({
            ...month,
            dayGroups: month.dayGroups
              .map((group) => ({
                ...group,
                items: group.items.filter((item) => trackedIds.includes(item.id)),
              }))
              .filter((group) => group.items.length > 0),
            itemCount: month.dayGroups.reduce(
              (count, group) =>
                count + group.items.filter((item) => trackedIds.includes(item.id)).length,
              0,
            ),
          }))
          .filter((month) => month.dayGroups.length > 0),
      }))
      .filter((yearBlock) => yearBlock.months.length > 0);
  }, [yearBlocks, showTrackedOnly, trackedIds]);

  return (
    <>
      <div className="stats-row">
        <div className="stat-card">
          <strong>{totalCount}</strong>
          <span>番剧总数</span>
        </div>
        <div className="stat-card">
          <strong>{trackedIds.length}</strong>
          <span>我的追番</span>
        </div>
        <button
          type="button"
          className={`track-button${showTrackedOnly ? " is-tracked" : ""}`}
          onClick={() => setShowTrackedOnly((value) => !value)}
        >
          {showTrackedOnly ? "查看全部番剧" : "只看我的追番"}
        </button>
      </div>

      <div className="calendar-grid">
        {visibleYearBlocks.map((yearBlock) => (
          <div key={yearBlock.year}>
            <div className="year-divider">{yearBlock.year}年</div>
            {yearBlock.months.map((month) => (
              <section className="month-section" key={month.key}>
                <div className="month-header">
                  {month.label} · {month.itemCount} 部
                </div>
                {month.dayGroups.map((group) => (
                  <section className="day-section" key={`${month.key}-${group.key}`}>
                    <div className="day-header">
                      <h2>{group.label}</h2>
                      <span className="day-year-tag">{month.year}年</span>
                      <span className="day-count">{group.items.length} 部</span>
                    </div>
                    <div className="anime-grid">
                      {group.items.map((item) => (
                        <AnimeCard key={item.id} item={item} />
                      ))}
                    </div>
                  </section>
                ))}
              </section>
            ))}
          </div>
        ))}

        {visibleYearBlocks.length === 0 ? (
          <section className="day-section">
            <div className="day-header">
              <h2>还没有内容</h2>
              <span className="day-count">先加载或加入追番吧</span>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
