#!/usr/bin/env python3
"""Fetch 10-minute KNMI station metrics and export them to CSV.

The script pulls the most recent NetCDF file from the
``Actuele10mindataKNMIstations`` dataset. It extracts the global solar
radiation metric (`qg`) and the wind direction/speed aggregates for
every reporting station and stores the result in a CSV file.

Usage
-----
python fetch_station_metrics.py

The default API key and output location are embedded in the script, so
you can simply run it from a terminal. Adjust `API_KEY` or `DEFAULT_OUTPUT`
below if you need different credentials or a custom path.
"""
from __future__ import annotations

import io
from pathlib import Path
from typing import Dict, Iterable, Optional

import pandas as pd
import requests
import xarray as xr

BASE_URL = "https://api.dataplatform.knmi.nl/open-data/v1"
# KNMI retired the legacy Actuele10mindataKNMIstations feed; this is its successor.
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

API_KEY = "eyJvcmciOiI1ZTU1NGUxOTI3NGE5NjAwMDEyYTNlYjEiLCJpZCI6IjlmNmJjOTM1NTNiZjQwMTdiNTU2MTAxYjkwY2RkYWJlIiwiaCI6Im11cm11cjEyOCJ9"
DEFAULT_OUTPUT = "knmi_station_data/station_metrics.csv"


def _auth_headers(api_key: str) -> Dict[str, str]:
    token = (api_key or "").strip()
    if not token:
        raise ValueError("API key is empty.")
    if not token.lower().startswith("bearer "):
        token = f"Bearer {token}"
    return {"Authorization": token}


def _latest_file(api_key: str) -> str:
    headers = _auth_headers(api_key)
    params = {"maxKeys": 1, "orderBy": "created", "sorting": "desc"}
    response = requests.get(
        f"{BASE_URL}/datasets/{DATASET}/versions/{VERSION}/files",
        headers=headers,
        params=params,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["files"][0]["filename"]


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


def _parse_dataset(raw: bytes) -> pd.DataFrame:
    with xr.open_dataset(io.BytesIO(raw)) as ds:
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
            raise ValueError(f"Dataset missing expected variables: {', '.join(missing)}")

        frame = ds.to_dataframe().reset_index()

        if "time" in frame.columns:
            frame = (
                frame.sort_values("time")
                .drop_duplicates(subset=station_dim, keep="last")
                .drop(columns="time")
            )

        required_cols = [station_dim, lat_name, lon_name] + list(var_names.values())
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

        ordered_cols = ["station", "latitude", "longitude"] + list(TARGET_VARIABLES.keys())
        return result[ordered_cols]


def fetch_station_metrics(api_key: str) -> pd.DataFrame:
    filename = _latest_file(api_key)
    raw = _download_file(api_key, filename)
    df = _parse_dataset(raw)
    df.insert(1, "source_filename", filename)
    return df


def main(output: str = DEFAULT_OUTPUT, api_key: str = API_KEY) -> None:
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    df = fetch_station_metrics(api_key=api_key)
    df.to_csv(output_path, index=False)
    print(f"Wrote {len(df)} station rows to {output_path}")


if __name__ == "__main__":
    main()
