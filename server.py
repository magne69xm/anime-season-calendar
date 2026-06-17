#!/usr/bin/env python3
"""本地网站服务器：静态页面、API 代理、作者访问统计。"""

from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.request
from datetime import date, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent / "standalone"
JIKAN_BASE = "https://api.jikan.moe/v4"
BGM_BASE = "https://api.bgm.tv"
USER_AGENT = "anime-season-calendar/0.1 (personal project; local proxy)"
STATS_FILE = ROOT / "data" / "site-stats.json"
AUTHOR_CONFIG_FILE = ROOT / "data" / "author-config.json"
ACTIVE_WINDOW_SECONDS = 90
STATS_LOCK = threading.Lock()


def load_author_password() -> str:
    try:
        payload = json.loads(AUTHOR_CONFIG_FILE.read_text(encoding="utf-8"))
        return str(payload.get("password") or "zhuifan2026")
    except OSError:
        return "zhuifan2026"


def load_stats() -> dict:
    try:
        payload = json.loads(STATS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        payload = {}
    payload.setdefault("daily", {})
    payload.setdefault("sessions", {})
    payload.setdefault("totalViews", 0)
    return payload


def save_stats(payload: dict) -> None:
    STATS_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATS_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def prune_old_days(payload: dict, keep_days: int = 30) -> None:
    cutoff = date.today() - timedelta(days=keep_days)
    daily = payload.get("daily", {})
    for day_key in list(daily.keys()):
        try:
            day_value = date.fromisoformat(day_key)
        except ValueError:
            daily.pop(day_key, None)
            continue
        if day_value < cutoff:
            daily.pop(day_key, None)


def record_visit(session_id: str) -> None:
    if not session_id:
        return
    today = date.today().isoformat()
    now = time.time()
    with STATS_LOCK:
        payload = load_stats()
        daily = payload["daily"]
        visitors = daily.setdefault(today, [])
        if session_id not in visitors:
            visitors.append(session_id)
        payload["sessions"][session_id] = now
        payload["totalViews"] = int(payload.get("totalViews") or 0) + 1
        prune_old_days(payload)
        save_stats(payload)


def record_heartbeat(session_id: str) -> None:
    if not session_id:
        return
    now = time.time()
    with STATS_LOCK:
        payload = load_stats()
        payload["sessions"][session_id] = now
        save_stats(payload)


def build_summary() -> dict:
    now = time.time()
    today = date.today().isoformat()
    with STATS_LOCK:
        payload = load_stats()
        daily = payload.get("daily", {})
        sessions = payload.get("sessions", {})
        online_now = sum(
            1 for last_seen in sessions.values()
            if now - float(last_seen) <= ACTIVE_WINDOW_SECONDS
        )
        history = []
        for offset in range(13, -1, -1):
            day_key = (date.today() - timedelta(days=offset)).isoformat()
            history.append({
                "date": day_key,
                "count": len(daily.get(day_key, [])),
            })
        return {
            "todayVisitors": len(daily.get(today, [])),
            "onlineNow": online_now,
            "totalViews": int(payload.get("totalViews") or 0),
            "dailyHistory": history,
        }


class AnimeCalendarHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format: str, *args) -> None:
        if self.path.startswith("/api/"):
            return
        super().log_message(format, *args)

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path.startswith("/api/jikan/"):
            self.proxy_jikan()
            return
        if self.path.startswith("/api/bgm/"):
            self.proxy_bgm()
            return
        if self.path.startswith("/api/stats/summary"):
            self.handle_stats_summary()
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path.startswith("/api/bgm/"):
            self.proxy_bgm()
            return
        if self.path.startswith("/api/stats/visit"):
            self.handle_stats_visit()
            return
        if self.path.startswith("/api/stats/heartbeat"):
            self.handle_stats_heartbeat()
            return
        self.send_error(501, "Unsupported method ('POST')")

    def read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if length <= 0:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def write_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(body)

    def handle_stats_visit(self) -> None:
        body = self.read_json_body()
        record_visit(str(body.get("sessionId") or "").strip())
        self.write_json(200, {"ok": True})

    def handle_stats_heartbeat(self) -> None:
        body = self.read_json_body()
        record_heartbeat(str(body.get("sessionId") or "").strip())
        self.write_json(200, {"ok": True})

    def handle_stats_summary(self) -> None:
        query = parse_qs(urlparse(self.path).query)
        password = (query.get("password") or [""])[0]
        if password != load_author_password():
            self.write_json(401, {"error": "密码错误"})
            return
        self.write_json(200, build_summary())

    def proxy_bgm(self) -> None:
        suffix = self.path[len("/api/bgm") :]
        url = f"{BGM_BASE}{suffix}"
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        request = urllib.request.Request(
            url,
            data=body,
            method="POST" if body else "GET",
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
                "Content-Type": self.headers.get("Content-Type", "application/json"),
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                payload = response.read()
            self.send_response(response.status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(payload)
        except urllib.error.HTTPError as error:
            payload = error.read()
            self.send_response(error.code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(payload or json.dumps({"error": str(error)}).encode("utf-8"))
        except Exception as error:
            self.send_response(502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(error)}, ensure_ascii=False).encode("utf-8"))

    def proxy_jikan(self) -> None:
        suffix = self.path[len("/api/jikan") :]
        url = f"{JIKAN_BASE}{suffix}"

        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                body = response.read()
            self.send_response(response.status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(body)
        except urllib.error.HTTPError as error:
            payload = error.read()
            self.send_response(error.code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(payload or json.dumps({"error": str(error)}).encode("utf-8"))
        except Exception as error:
            self.send_response(502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(error)}, ensure_ascii=False).encode("utf-8"))


def main() -> None:
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", 8080), AnimeCalendarHandler)
    print("追番日历已启动：http://127.0.0.1:8080")
    print("作者统计：http://127.0.0.1:8080/author.html")
    print("关闭此窗口即可停止网站。")
    server.serve_forever()


if __name__ == "__main__":
    main()
