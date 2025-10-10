#!/usr/bin/env python3
"""Expose live KNMI station metrics as JSON for Grafana's JSON API plugin."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from threading import Lock, Timer
from typing import Optional

import pandas as pd
from flask import Flask, jsonify
from flask_cors import CORS

from knmi_station_data.fetch_station_metrics import (
    API_KEY as DEFAULT_API_KEY,
    fetch_station_metrics,
)

REFRESH_SECONDS = int(os.getenv("KNMI_REFRESH_SECONDS", "600"))
PORT = int(os.getenv("PORT", "5000"))
HOST = os.getenv("HOST", "0.0.0.0")

app = Flask(__name__)
CORS(app)

_data_lock = Lock()
_latest_df: pd.DataFrame = pd.DataFrame()
_last_refresh: Optional[datetime] = None


def _current_api_key() -> str:
    key = os.getenv("KNMI_API_KEY")
    if key:
        return key
    app.logger.warning(
        "KNMI_API_KEY env var not set, falling back to fetch_station_metrics.API_KEY"
    )
    return DEFAULT_API_KEY


def _refresh_once() -> None:
    global _latest_df, _last_refresh
    api_key = _current_api_key()

    try:
        df = fetch_station_metrics(api_key=api_key)
    except Exception:  # pragma: no cover - surfaced via logging
        app.logger.exception("Failed to refresh KNMI station metrics")
        return

    df = df.rename(columns={"latitude": "lat", "longitude": "lon"})

    with _data_lock:
        _latest_df = df
        _last_refresh = datetime.now(timezone.utc)

    app.logger.info("Fetched %s station rows", len(df))


def _schedule_next_refresh() -> None:
    if REFRESH_SECONDS <= 0:
        app.logger.info("Automatic refresh disabled (REFRESH_SECONDS=%s)", REFRESH_SECONDS)
        return

    def _refresh_periodically():
        _refresh_once()
        _schedule_next_refresh()

    timer = Timer(REFRESH_SECONDS, _refresh_periodically)
    timer.daemon = True
    timer.start()


@app.route("/")
def root():
    message = (
        "OK" if not _latest_df.empty else "Waiting for first KNMI refresh. "
        "Check server logs for details."
    )
    refreshed_at = _last_refresh.isoformat() if _last_refresh else None
    return jsonify({"status": message, "refreshed_at": refreshed_at}), 200


@app.route("/data")
def serve_data():
    with _data_lock:
        df = _latest_df.copy()
        refreshed_at = _last_refresh.isoformat() if _last_refresh else None

    if df.empty:
        return jsonify([])

    if refreshed_at:
        df["refreshed_at"] = refreshed_at

    return jsonify(df.to_dict(orient="records"))


def _bootstrap() -> None:
    _refresh_once()
    _schedule_next_refresh()


def main() -> None:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    app.logger.setLevel(logging.getLogger().level)
    _bootstrap()
    app.run(host=HOST, port=PORT)


if __name__ == "__main__":
    main()
