#!/usr/bin/env python3
"""抓取热门 TV 番剧并写入 standalone/data/fallback-catalog.json。"""

from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "standalone" / "data" / "fallback-catalog.json"
JIKAN = "https://api.jikan.moe/v4"
UA = "anime-season-calendar/0.1 (personal project)"
SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"]
SEASON_SLUG = {"WINTER": "winter", "SPRING": "spring", "SUMMER": "summer", "FALL": "fall"}
MIN_MEMBERS = 5000
STATUS_MAP = {
    "Currently Airing": "RELEASING",
    "Not yet aired": "NOT_YET_RELEASED",
    "Finished Airing": "FINISHED",
}
TYPE_MAP = {"TV": "TV", "Movie": "MOVIE", "OVA": "OVA", "ONA": "ONA", "Special": "SPECIAL"}
DAY_MAP = {
    "Sundays": "星期日",
    "Mondays": "星期一",
    "Tuesdays": "星期二",
    "Wednesdays": "星期三",
    "Thursdays": "星期四",
    "Fridays": "星期五",
    "Saturdays": "星期六",
}


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=35) as response:
        return json.load(response)


def is_adult(entry: dict) -> bool:
    rating = str(entry.get("rating") or "").lower()
    if "rx" in rating or "hentai" in rating:
        return True
    if entry.get("type") in ("OVA", "ONA") and "r+" in rating:
        return True
    names = [
        str(item.get("name", item)).lower()
        for item in (entry.get("genres") or []) + (entry.get("explicit_genres") or [])
    ]
    return any(name in ("hentai", "erotica") for name in names)


def is_popular_tv(entry: dict) -> bool:
    if is_adult(entry):
        return False
    if entry.get("type") != "TV":
        return False
    status = STATUS_MAP.get(entry.get("status"), entry.get("status"))
    if status not in ("RELEASING", "FINISHED"):
        return False
    return (entry.get("members") or 0) >= MIN_MEMBERS


def map_item(entry: dict, season: str, year: int) -> dict:
    return {
        "id": entry["mal_id"],
        "title": entry.get("title_english") or entry.get("title") or "未知番剧",
        "titleChinese": None,
        "titleNative": entry.get("title_japanese") or entry.get("title"),
        "titleRomaji": None,
        "titleEnglish": entry.get("title_english"),
        "bangumiId": None,
        "coverImage": (
            entry.get("images", {}).get("jpg", {}).get("large_image_url")
            or entry.get("images", {}).get("jpg", {}).get("image_url")
        ),
        "format": "TV",
        "status": STATUS_MAP.get(entry.get("status"), entry.get("status")),
        "nextEpisode": entry.get("episodes"),
        "nextAiringAt": None,
        "score": entry.get("score") if isinstance(entry.get("score"), (int, float)) else None,
        "scoredBy": entry.get("scored_by"),
        "rank": entry.get("rank"),
        "members": entry.get("members") or 0,
        "popularity": entry.get("popularity"),
        "malRating": entry.get("rating"),
        "isAdult": False,
        "weekdayLabel": DAY_MAP.get((entry.get("broadcast") or {}).get("day")),
        "weekdaySource": "broadcast" if (entry.get("broadcast") or {}).get("day") else None,
        "season": season,
        "seasonYear": year,
    }


def fetch_season(season: str, year: int) -> list[dict]:
    slug = SEASON_SLUG[season]
    url = f"{JIKAN}/seasons/{year}/{slug}?page=1"
    payload = fetch_json(url)
    items: list[dict] = []
    for entry in payload.get("data") or []:
        if not is_popular_tv(entry):
            continue
        items.append(map_item(entry, season, year))
    return items


def season_sort_index(season: str, year: int) -> int:
    return year * 4 + SEASONS.index(season)


def main() -> None:
    targets = []
    for year in range(2020, 2027):
        for season in SEASONS:
            targets.append((season, year))
    targets.sort(key=lambda item: season_sort_index(item[0], item[1]), reverse=True)

    catalog: list[dict] = []
    for season, year in targets:
        label = f"{year}-{season}"
        print(f"Fetching {label}...")
        try:
            catalog.extend(fetch_season(season, year))
        except Exception as error:
            print(f"  skip {label}: {error}")
        time.sleep(0.6)

    unique = {item["id"]: item for item in catalog}
    output = {
        "savedAt": int(time.time() * 1000),
        "source": "jikan-popular-tv",
        "items": list(unique.values()),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(output, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {len(output['items'])} popular TV items -> {OUT}")


if __name__ == "__main__":
    main()
