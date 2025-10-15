#!/usr/bin/env python3
"""Fetch 10-minute KNMI station metrics, export the latest snapshot, and
maintain a rolling history for time-series visualisations.

The script pulls the most recent NetCDF file from the
``10-minute-in-situ-meteorological-observations`` dataset. Besides
writing the current values to ``station_metrics.csv`` it also appends
the observation to a JSON/GeoJSON history that keeps the last 12
records per station.

Usage (CLI)
-----------

```
python fetch_station_metrics.py \
    --output knmi_station_data/station_metrics.csv \
    --history-json knmi_station_data/station_metrics_history.json \
    --history-geojson knmi_station_data/station_metrics_history.geojson
```

If you import this module and call ``main()`` directly, the defaults
shown above are used.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import pandas as pd
import requests
import xarray as xr

BASE_URL = "https://api.dataplatform.knmi.nl/open-data/v1"
DATASET = "10-minute-in-situ-meteorological-observations"
VERSION = "1.0"

TARGET_VARIABLES: Dict[str, str] = {
    "qg": "Global Solar Radiation Mean (W/m^2)",
    "dd": "Wind Direction 10 Min Average (deg)",
    "dn": "Wind Direction Sensor 10 Min Minimum (deg)",
    "dx": "Wind Direction Sensor 10 Min Maximum (deg)",
    "dsd": "Wind Direction 10 Min Std Dev (deg)",
    "dr": "Precipitation Duration 10 Min Sum (sec)",
    "ff": "Wind Speed at 10m 10 Min Average (m/s)",
    "ffs": "Wind Speed Sensor 10 Min Average (m/s)",
    "fsd": "Wind Speed 10 Min Std Dev (m/s)",
    "fx": "Wind Gust at 10m Maximum last 10 Min (m/s)",
    "fxs": "Wind Gust Sensor Maximum last 10 Min (m/s)",
    "gff": "Wind Gust at 10m 10 Min Maximum (m/s)",
    "gffs": "Wind Gust Sensor 10 Min Maximum (m/s)",
}

HISTORY_METRICS = ("qg", "ff", "dd")
MAX_HISTORY_POINTS = 12

API_KEY = "eyJvcmciOiI1ZTU1NGUxOTI3NGE5NjAwMDEyYTNlYjEiLCJpZCI6IjlmNmJjOTM1NTNiZjQwMTdiNTU2MTAxYjkwY2RkYWJlIiwiaCI6Im11cm11cjEyOCJ9"
DEFAULT_OUTPUT = "knmi_station_data/station_metrics.csv"
DEFAULT_HISTORY_JSON = Path("knmi_station_data/station_metrics_history.json")
DEFAULT_HISTORY_GEOJSON = Path("knmi_station_data/station_metrics_history.geojson")


def _auth_headers(api_key: str) -> Dict[str, str]:
    token = (api_key or "").strip()
    if not token:
        raise ValueError("API key is empty.")
    if not token.lower().startswith("bearer "):
        token = f"Bearer {token}"
    return {"Authorization": token}


def _latest_files(api_key: str, count: int = 1) -> List[str]:
    headers = _auth_headers(api_key)
    limit = max(1, int(count))
    params = {"maxKeys": limit, "orderBy": "created", "sorting": "desc"}
    response = requests.get(
        f"{BASE_URL}/datasets/{DATASET}/versions/{VERSION}/files",
        headers=headers,
        params=params,
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    files = payload.get("files", [])
    return [item["filename"] for item in files[:limit]]


def list_latest_station_files(api_key: str, count: int = 1) -> List[str]:
    """Public helper that returns the newest KNMI station filenames (newest->oldest)."""
    return _latest_files(api_key, count)


def _download_file(api_key: str, filename: str) -> bytes:
    headers = _auth_headers(api_key)
    response = requests.get(
        f"{BASE_URL}/datasets/{DATASET}/versions/{VERSION}/files/{filename}/url",
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    temp_url = response.json()["temporaryDownloadUrl"]
    blob = requests.get(temp_url, timeout=60)
    blob.raise_for_status()
    return blob.content


def _find_name(candidates: Iterable[str], needle: str) -> Optional[str]:
    low = needle.lower()
    for name in candidates:
        if name.lower() == low:
            return name
    for name in candidates:
        if low in name.lower():
            return name
    return None


def _ensure_utc_iso(value) -> Optional[str]:
    if value is None or pd.isna(value):
        return None
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
    return str(value)


def _maybe_float(value):
    if value is None or pd.isna(value):
        return None
    return float(value)


def _parse_dataset(raw: bytes) -> pd.DataFrame:
    tmp = tempfile.NamedTemporaryFile(suffix=".nc", delete=False)
    try:
        tmp.write(raw)
        tmp.flush()
        tmp.close()

        with xr.open_dataset(tmp.name, engine="netcdf4") as ds:
            station_dim = next((d for d in ds.dims if "station" in d.lower()), None)
            if station_dim is None:
                raise ValueError("Could not locate station dimension in dataset.")

            lat_name = _find_name(ds.coords, "lat") or _find_name(ds.data_vars, "lat")
            lon_name = _find_name(ds.coords, "lon") or _find_name(ds.data_vars, "lon")
            if not lat_name or not lon_name:
                raise ValueError("Could not locate latitude/longitude variables.")

            var_names: Dict[str, str] = {}
            missing: list[str] = []
            for code in TARGET_VARIABLES:
                match = _find_name(ds.data_vars, code)
                if match:
                    var_names[code] = match
                else:
                    missing.append(code)
            if missing:
                raise ValueError(
                    f"Dataset missing expected variables: {', '.join(missing)}"
                )

            frame = ds.to_dataframe().reset_index()

            if "time" in frame.columns:
                frame["time"] = pd.to_datetime(frame["time"], utc=True, errors="coerce")
                frame = frame.sort_values("time").drop_duplicates(
                    subset=station_dim, keep="last"
                )
                frame = frame.rename(columns={"time": "observation_time"})

            required_cols = (
                [station_dim, lat_name, lon_name, "observation_time"]
                + list(var_names.values())
            )
            for col in required_cols:
                if col not in frame.columns:
                    raise ValueError(f"Expected column '{col}' missing from dataset.")

            result = frame.rename(
                columns={
                    station_dim: "station",
                    lat_name: "latitude",
                    lon_name: "longitude",
                    **{v: k for k, v in var_names.items()},
                }
            )

            result["observation_time"] = pd.to_datetime(
                result["observation_time"], utc=True, errors="coerce"
            )
            return result
    finally:
        try:
            os.remove(tmp.name)
        except OSError:
            pass


def _load_station_history(path: Path) -> Dict[str, dict]:
    if path.exists():
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            stations = payload.get("stations", {})
            if isinstance(stations, dict):
                return stations
        except json.JSONDecodeError:
            pass
    return {}


def _persist_station_history(path: Path, stations: Dict[str, dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "stations": stations,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _persist_station_history_geojson(
    path: Path, stations: Dict[str, dict], max_points: int
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    features = []
    for station_id, meta in sorted(stations.items()):
        lat = _maybe_float(meta.get("lat"))
        lon = _maybe_float(meta.get("lon"))
        history = meta.get("history", [])
        latest = history[-1] if history else None
        feature = {
            "type": "Feature",
            "geometry": None
            if lat is None or lon is None
            else {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "station": station_id,
                "history": history,
                "latest": latest,
                "max_history": max_points,
            },
        }
        features.append(feature)

    payload = {
        "type": "FeatureCollection",
        "features": features,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "max_history": max_points,
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def update_station_history(
    df: pd.DataFrame,
    history_json: Path = DEFAULT_HISTORY_JSON,
    history_geojson: Path = DEFAULT_HISTORY_GEOJSON,
    max_points: int = MAX_HISTORY_POINTS,
) -> Dict[str, dict]:
    stations = _load_station_history(history_json)
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    for row in df.itertuples(index=False):
        station_id = str(row.station)
        entry_time = getattr(row, "observation_time", None)
        obs_iso = _ensure_utc_iso(entry_time) or now_iso
        entry = {
            "observation_time": obs_iso,
            "source_filename": getattr(row, "source_filename", None),
        }
        for metric in HISTORY_METRICS:
            entry[metric] = _maybe_float(getattr(row, metric, None))

        meta = stations.setdefault(
            station_id,
            {"history": []},
        )
        meta["lat"] = _maybe_float(getattr(row, "latitude", None))
        meta["lon"] = _maybe_float(getattr(row, "longitude", None))

        history = [
            h for h in meta.get("history", []) if h.get("observation_time") != obs_iso
        ]
        history.append(entry)
        history.sort(key=lambda itm: itm.get("observation_time") or "")
        meta["history"] = history[-max_points:]
        stations[station_id] = meta

    _persist_station_history(history_json, stations)
    _persist_station_history_geojson(history_geojson, stations, max_points)
    return stations


def fetch_station_metrics(api_key: str, filename: Optional[str] = None) -> pd.DataFrame:
    if filename is None:
        filenames = _latest_files(api_key, 1)
        if not filenames:
            raise RuntimeError("No KNMI station files were returned.")
        filename = filenames[0]
    raw = _download_file(api_key, filename)
    df = _parse_dataset(raw)
    df.insert(1, "source_filename", filename)
    return df


def _run(
    output: Path,
    api_key: str,
    history_json: Path,
    history_geojson: Path,
    max_history: int,
    bootstrap_files: int,
) -> pd.DataFrame:
    filenames = _latest_files(api_key, bootstrap_files)
    if not filenames:
        raise RuntimeError("No KNMI station files were returned.")
    latest_name = filenames[0]
    latest_df: Optional[pd.DataFrame] = None
    for name in reversed(filenames):
        df = fetch_station_metrics(api_key=api_key, filename=name)
        update_station_history(
            df,
            history_json=history_json,
            history_geojson=history_geojson,
            max_points=max_history,
        )
        if name == latest_name:
            latest_df = df
    if latest_df is None:
        raise RuntimeError("Failed to obtain the latest station dataset.")
    output.parent.mkdir(parents=True, exist_ok=True)
    latest_df.to_csv(output, index=False)
    return latest_df


def main(
    output: str = DEFAULT_OUTPUT,
    api_key: str = API_KEY,
    history_json: str | Path = DEFAULT_HISTORY_JSON,
    history_geojson: str | Path = DEFAULT_HISTORY_GEOJSON,
    max_history: int = MAX_HISTORY_POINTS,
    bootstrap_files: int = 1,
) -> None:
    df = _run(
        output=Path(output),
        api_key=api_key,
        history_json=Path(history_json),
        history_geojson=Path(history_geojson),
        max_history=max(1, int(max_history)),
        bootstrap_files=max(1, int(bootstrap_files)),
    )
    print(f"Wrote {len(df)} station rows to {output}")
    print(
        f"Updated station history at {history_json} "
        f"and GeoJSON at {history_geojson}"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT,
        help="Path to write the latest station metrics CSV.",
    )
    parser.add_argument(
        "--api-key",
        default=API_KEY,
        help="KNMI API key (Bearer token).",
    )
    parser.add_argument(
        "--history-json",
        default=str(DEFAULT_HISTORY_JSON),
        help="Path for the rolling station history JSON.",
    )
    parser.add_argument(
        "--history-geojson",
        default=str(DEFAULT_HISTORY_GEOJSON),
        help="Path for the rolling station history GeoJSON.",
    )
    parser.add_argument(
        "--max-history",
        type=int,
        default=MAX_HISTORY_POINTS,
        help="Number of observations to retain per station.",
    )
    parser.add_argument(
        "--bootstrap-files",
        type=int,
        default=1,
        help=(
            "Fetch and ingest the most recent N KNMI NetCDF files in one run "
            "(helps backfill station history)."
        ),
    )
    args = parser.parse_args()
    main(
        output=args.output,
        api_key=args.api_key,
        history_json=Path(args.history_json),
        history_geojson=Path(args.history_geojson),
        max_history=args.max_history,
        bootstrap_files=args.bootstrap_files,
    )
