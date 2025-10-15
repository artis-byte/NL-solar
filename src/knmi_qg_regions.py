#!/usr/bin/env python3
"""KNMI -> GeoJSON publisher with rolling history for Windy timelines.

This script ingests the latest 10-minute KNMI station metrics, aggregates
them over user-provided regions, stores the current snapshot as GeoJSON,
and keeps a rolling history (default: 12 observations ~ 2 hours) for use
in timeline visualisations such as the KNMI Windy plug-in.

Features
--------
* Aggregates radiation (qg) and wind metrics (ff, dd) per region.
* Writes the immediate snapshot (default: qg_regions.geojson).
* Maintains a history GeoJSON with one feature per region containing the
  most recent N observations (timeline ready).
* Optional uploads to S3 or GitHub for both snapshot and history files.
"""
from __future__ import annotations

import argparse
import base64
import json
import math
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple

import geopandas as gpd
import numpy as np
import pandas as pd
import requests
from shapely.geometry import mapping

from knmi_station_data.fetch_station_metrics import (
    API_KEY as DEFAULT_STATION_API_KEY,
    fetch_station_metrics,
)

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:  # pragma: no cover - optional dependency
    boto3 = None  # type: ignore

DEFAULT_API_KEY = DEFAULT_STATION_API_KEY
DEFAULT_HISTORY_OUT = "qg_regions_history.geojson"
MAX_HISTORY_POINTS = 12


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _ensure_iso(value) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, pd.Timestamp):
        ts = value.tz_convert("UTC") if value.tzinfo else value.tz_localize("UTC")
        return ts.isoformat().replace("+00:00", "Z")
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        else:
            value = value.astimezone(timezone.utc)
        return value.isoformat().replace("+00:00", "Z")
    return _now_iso()


def _maybe_float(value):
    if value is None or pd.isna(value):
        return None
    return float(value)


def _safe_int(value) -> int:
    if value is None or pd.isna(value):
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _circular_mean(series: pd.Series) -> Optional[float]:
    values = series.dropna().to_numpy(dtype=float)
    if values.size == 0:
        return None
    radians = np.deg2rad(values)
    sin_mean = np.sin(radians).mean()
    cos_mean = np.cos(radians).mean()
    angle = math.degrees(math.atan2(sin_mean, cos_mean))
    if angle < 0:
        angle += 360.0
    return angle


# ---------------------------------------------------------------------------
# Aggregation and history
# ---------------------------------------------------------------------------

def aggregate_regions(df: pd.DataFrame, regions_path: str) -> gpd.GeoDataFrame:
    """Aggregate station metrics over polygons defined in regions_path."""
    working = df.copy()
    working["lon"] = pd.to_numeric(working["longitude"], errors="coerce")
    working["lat"] = pd.to_numeric(working["latitude"], errors="coerce")
    working = working.dropna(subset=["lon", "lat"])

    if working.empty:
        raise ValueError("No station rows with valid coordinates were found.")

    stations = gpd.GeoDataFrame(
        working,
        geometry=gpd.points_from_xy(working["lon"], working["lat"]),
        crs="EPSG:4326",
    )

    regions = gpd.read_file(regions_path)
    if regions.crs:
        regions = regions.to_crs(epsg=4326)
    else:
        regions = regions.set_crs(epsg=4326, allow_override=True)

    joined = gpd.sjoin(stations, regions, predicate="within", how="left")
    grouped = joined.groupby("name", dropna=False)

    agg = pd.DataFrame(index=grouped.size().index)
    agg["qg_mean"] = grouped["qg"].mean()
    if "ff" in joined.columns:
        agg["wind_speed_mean"] = grouped["ff"].mean()
    else:
        agg["wind_speed_mean"] = np.nan
    if "dd" in joined.columns:
        agg["wind_direction_mean"] = grouped["dd"].apply(_circular_mean)
    else:
        agg["wind_direction_mean"] = np.nan
    agg["stations_count"] = grouped["station"].nunique()
    agg.reset_index(inplace=True)

    out = regions.merge(agg, on="name", how="left")
    out["qg_mean"] = out["qg_mean"].fillna(0.0)
    out["wind_speed_mean"] = out["wind_speed_mean"].fillna(0.0)
    out["stations_count"] = out["stations_count"].fillna(0).astype(int)
    if "solar_capacity_mw" in out.columns:
        out["estimated_output_mw"] = (
            out["solar_capacity_mw"].fillna(0.0) * out["qg_mean"] / 1000.0
        )
    if "wind_direction_mean" in out.columns:
        out["wind_direction_mean"] = out["wind_direction_mean"].where(
            pd.notna(out["wind_direction_mean"]), None
        )
    return out


def update_region_history(
    regions: gpd.GeoDataFrame,
    history_path: Path,
    observation_time: str,
    max_points: int = MAX_HISTORY_POINTS,
) -> dict:
    """Append the current snapshot to the rolling region history file."""
    existing: dict = {}
    if history_path.exists():
        try:
            existing = json.loads(history_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing = {}

    feature_map = {
        feature.get("properties", {}).get("name"): feature
        for feature in existing.get("features", [])
        if feature.get("properties", {}).get("name")
    }

    for _, row in regions.iterrows():
        name = row.get("name")
        if not name:
            continue
        entry = {
            "observation_time": observation_time,
            "qg_mean": _maybe_float(row.get("qg_mean")),
            "wind_speed_mean": _maybe_float(row.get("wind_speed_mean")),
            "wind_direction_mean": _maybe_float(row.get("wind_direction_mean")),
            "estimated_output_mw": _maybe_float(row.get("estimated_output_mw")),
            "stations_count": _safe_int(row.get("stations_count")),
        }
        history = []
        if name in feature_map:
            history = [
                h
                for h in feature_map[name]["properties"].get("history", [])
                if h.get("observation_time") != observation_time
            ]
        history.append(entry)
        history.sort(key=lambda item: item.get("observation_time") or "")
        history = history[-max_points:]

        feature_map[name] = {
            "type": "Feature",
            "geometry": mapping(row.geometry) if row.geometry is not None else None,
            "properties": {
                "name": name,
                "history": history,
                "latest": history[-1],
                "max_history": max_points,
            },
        }

    features = [feature_map[name] for name in sorted(feature_map)]
    payload = {
        "type": "FeatureCollection",
        "features": features,
        "generated_at": observation_time,
        "max_history": max_points,
    }
    history_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


# ---------------------------------------------------------------------------
# Upload helpers
# ---------------------------------------------------------------------------

def upload_s3(local: str, bucket: str, key: str) -> str:
    if boto3 is None:
        raise RuntimeError("boto3 not installed; S3 upload unavailable")
    s3 = boto3.client("s3")
    extra = {
        "ContentType": "application/geo+json",
        "CacheControl": "max-age=30",
        "ACL": "public-read",
    }
    try:
        s3.upload_file(local, bucket, key, ExtraArgs=extra)
    except (BotoCoreError, ClientError) as exc:  # pragma: no cover - network
        raise RuntimeError(f"S3 upload failed: {exc}") from exc
    return f"https://{bucket}.s3.amazonaws.com/{key}"


def upload_github(local: str, repo: str, path: str, branch: str, token: str) -> str:
    api = f"https://api.github.com/repos/{repo}/contents/{path}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
    }

    sha: Optional[str] = None
    response = requests.get(api, headers=headers, params={"ref": branch}, timeout=30)
    if response.status_code == 200:
        sha = response.json()["sha"]
    elif response.status_code not in (404, 422):  # pragma: no cover - network
        response.raise_for_status()

    content_b64 = base64.b64encode(Path(local).read_bytes()).decode()
    payload = {
        "message": f"auto: update {path} ({datetime.utcnow().isoformat(timespec='seconds')}Z)",
        "branch": branch,
        "content": content_b64,
    }
    if sha:
        payload["sha"] = sha

    response = requests.put(api, headers=headers, json=payload, timeout=30)
    if response.status_code not in (200, 201):  # pragma: no cover - network
        raise RuntimeError(f"GitHub upload failed: {response.text[:200]}")

    return f"https://raw.githubusercontent.com/{repo}/{branch}/{path}"


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def _derive_observation_time(df: pd.DataFrame) -> str:
    series = pd.to_datetime(df.get("observation_time"), utc=True, errors="coerce")
    if series.notna().any():
        return _ensure_iso(series.max())
    return _now_iso()


def run_once(
    api_key: str,
    regions_path: str,
    local_out: str,
    *,
    history_out: Optional[str] = DEFAULT_HISTORY_OUT,
    max_history: int = MAX_HISTORY_POINTS,
    s3_bucket: Optional[str] = None,
    s3_key: Optional[str] = None,
    s3_history_key: Optional[str] = None,
    s3_stations_key: Optional[str] = None,
    gh_repo: Optional[str] = None,
    gh_path: Optional[str] = None,
    gh_history_path: Optional[str] = None,
    gh_branch: str = "main",
    gh_token: Optional[str] = None,
    stations_out: Optional[str] = None,
    gh_stations_path: Optional[str] = None,
) -> Tuple[gpd.GeoDataFrame, Optional[dict]]:
    df = fetch_station_metrics(api_key=api_key)
    observation_iso = _derive_observation_time(df)
    geo = aggregate_regions(df, regions_path)
    geo["observation_time"] = observation_iso

    local_path = Path(local_out)
    local_path.parent.mkdir(parents=True, exist_ok=True)
    geo.to_file(local_path, driver="GeoJSON")

    history_payload: Optional[dict] = None
    history_path: Optional[Path] = None
    if history_out:
        history_path = Path(history_out)
        history_payload = update_region_history(
            geo, history_path, observation_iso, max_history
        )

    if stations_out:
        stations_geo = gpd.GeoDataFrame(
            df,
            geometry=gpd.points_from_xy(df["longitude"], df["latitude"]),
            crs="EPSG:4326",
        )
        stations_geo.to_file(stations_out, driver="GeoJSON")

    if s3_bucket and s3_key:
        url = upload_s3(str(local_path), s3_bucket, s3_key)
        print("S3 ->", url)
    if s3_bucket and s3_history_key and history_path:
        url = upload_s3(str(history_path), s3_bucket, s3_history_key)
        print("S3 history ->", url)
    if s3_bucket and stations_out and s3_stations_key:
        url = upload_s3(stations_out, s3_bucket, s3_stations_key)
        print("S3 stations ->", url)

    upload_token = gh_token or os.getenv("GITHUB_TOKEN")
    if gh_repo and gh_path:
        if not upload_token:
            raise RuntimeError("GitHub token not provided (flag or GITHUB_TOKEN env var)")
        url = upload_github(str(local_path), gh_repo, gh_path, gh_branch, upload_token)
        print("GitHub ->", url)

    if gh_repo and gh_history_path and history_path:
        if not upload_token:
            raise RuntimeError("GitHub token not provided (flag or GITHUB_TOKEN env var)")
        url = upload_github(str(history_path), gh_repo, gh_history_path, gh_branch, upload_token)
        print("GitHub history ->", url)

    if gh_repo and stations_out and gh_stations_path:
        if not upload_token:
            raise RuntimeError("GitHub token not provided (flag or GITHUB_TOKEN env var)")
        url = upload_github(stations_out, gh_repo, gh_stations_path, gh_branch, upload_token)
        print("GitHub stations ->", url)

    print(f"Generated {local_out} at {observation_iso}")
    if history_path:
        print(f"Updated history {history_path} (max {max_history} observations)")
    if stations_out:
        print(f"Wrote station snapshot {stations_out}")
    return geo, history_payload


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="KNMI -> GeoJSON publisher with rolling history",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--api-key", default=DEFAULT_API_KEY, help="KNMI API key")
    parser.add_argument("--regions", default="data/regions_10.geojson")
    parser.add_argument("--out", dest="local_out", default="qg_regions.geojson")
    parser.add_argument(
        "--history-out",
        default=DEFAULT_HISTORY_OUT,
        help="Output path for the rolling history GeoJSON",
    )
    parser.add_argument(
        "--max-history",
        type=int,
        default=MAX_HISTORY_POINTS,
        help="Maximum number of observations to retain in history files",
    )
    parser.add_argument(
        "--stations-out",
        help="Optional path to write the latest station snapshot as GeoJSON",
    )
    parser.add_argument(
        "--gh-stations-path",
        help="Repository path for station snapshots (requires --gh-repo)",
    )

    # S3 options
    parser.add_argument("--s3-bucket")
    parser.add_argument("--s3-key")
    parser.add_argument(
        "--s3-history-key",
        help="S3 object key for the history GeoJSON (requires --s3-bucket)",
    )
    parser.add_argument(
        "--s3-stations-key",
        help="S3 object key for the station snapshot (requires --s3-bucket and --stations-out)",
    )

    # GitHub options
    parser.add_argument("--gh-repo", help="owner/repo")
    parser.add_argument("--gh-path", help="path within repo for the snapshot file")
    parser.add_argument(
        "--gh-history-path",
        help="path within repo for the history GeoJSON (requires --gh-repo)",
    )
    parser.add_argument("--gh-branch", default="main")
    parser.add_argument("--gh-token", help="GitHub PAT (or set GITHUB_TOKEN env var)")

    parser.add_argument("--loop", action="store_true", help="Repeat every 10 min")
    parser.add_argument("--interval", type=int, default=600, help="Loop interval seconds")

    args = parser.parse_args(argv)
    max_history = max(1, args.max_history)

    while True:
        try:
            run_once(
                api_key=args.api_key,
                regions_path=args.regions,
                local_out=args.local_out,
                history_out=args.history_out,
                max_history=max_history,
                s3_bucket=args.s3_bucket,
                s3_key=args.s3_key,
                s3_history_key=args.s3_history_key,
                s3_stations_key=args.s3_stations_key,
                gh_repo=args.gh_repo,
                gh_path=args.gh_path,
                gh_history_path=args.gh_history_path,
                gh_branch=args.gh_branch,
                gh_token=args.gh_token,
                stations_out=args.stations_out,
                gh_stations_path=args.gh_stations_path,
            )
        except Exception as exc:  # pragma: no cover - runtime feedback
            print("Error:", exc, file=sys.stderr)

        if not args.loop:
            break
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
