#!/usr/bin/env python3
"""
Fetch 10‑minute global irradiance (QG) from KNMI Open Data and export per‑station and
per‑region GeoJSON files.

Changes in this revision (v0.2)
--------------------------------
* **Fixed KeyError** – lat/lon were not part of the DataFrame; now they are
  explicitly selected (`ds[[qg_var, lat_name, lon_name]]`).
* **Deduplicate by time** – if the dataset contains multiple time steps we keep
  only the latest record per station.
* **Clearer error messages** – include the filename that failed.
"""
from __future__ import annotations

import argparse
import io
import sys
import time
from datetime import datetime
from typing import Any

import geopandas as gpd
import pandas as pd
import requests
import xarray as xr
from shapely.geometry import Point  # noqa: F401 – used implicitly by GeoPandas

# -----------------------------------------------------------------------------
# CONFIGURATION CONSTANTS
# -----------------------------------------------------------------------------
BASE_URL = "https://api.dataplatform.knmi.nl/open-data/v1"
DATASET = "Actuele10mindataKNMIstations"  # deprecated Sep‑2025 → switch soon
VERSION = "2"
# -----------------------------------------------------------------------------


def latest_file(api_key: str) -> str:
    """Return the most recently created NetCDF filename in the dataset."""
    headers = {"Authorization": api_key}
    params = {"maxKeys": 1, "orderBy": "created", "sorting": "desc"}
    r = requests.get(
        f"{BASE_URL}/datasets/{DATASET}/versions/{VERSION}/files",
        headers=headers,
        params=params,
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["files"][0]["filename"]


def download_file(api_key: str, filename: str) -> bytes:
    """Download *filename* from KNMI and return raw bytes."""
    headers = {"Authorization": api_key}
    # Step 1 – obtain a temporary download URL
    r = requests.get(
        f"{BASE_URL}/datasets/{DATASET}/versions/{VERSION}/files/{filename}/url",
        headers=headers,
        timeout=30,
    )
    r.raise_for_status()
    url = r.json()["temporaryDownloadUrl"]
    # Step 2 – fetch the file itself
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.content


# -----------------------------------------------------------------------------
# DATA PARSING
# -----------------------------------------------------------------------------

def _find(ds: xr.Dataset, substr: str) -> str | None:
    """Return first name that contains *substr* (case‑insensitive).

    Searches coordinates first, then all variables.
    """
    substr_l = substr.lower()
    for name in ds.coords:
        if substr_l in name.lower():
            return name
    for name in ds.variables:
        if substr_l in name.lower():
            return name
    return None


def parse_qg(data: bytes) -> pd.DataFrame:
    """Extract (station, lat, lon, qg) from raw NetCDF bytes."""
    with xr.open_dataset(io.BytesIO(data)) as ds:
        lat_name = _find(ds, "lat")
        lon_name = _find(ds, "lon")
        station_dim = next(
            (d for d in ds.dims if "station" in d.lower() or d.lower() == "stn"),
            None,
        )
        qg_var = next((v for v in ds.data_vars if v.lower().startswith("qg")), None)

        if not (lat_name and lon_name and station_dim and qg_var):
            raise ValueError(
                "Required names not found → "
                f"lat:{lat_name}, lon:{lon_name}, station_dim:{station_dim}, qg:{qg_var}"
            )

        subset = ds[[qg_var, lat_name, lon_name]]
        df: pd.DataFrame = subset.to_dataframe().reset_index()

        # If multiple time steps exist, keep the most recent per station
        if "time" in df.columns:
            df = (
                df.sort_values("time")
                .drop_duplicates(subset=station_dim, keep="last")
                .drop(columns="time")
            )

        df = df[[station_dim, lat_name, lon_name, qg_var]].dropna()
        df.columns = ["station", "lat", "lon", "qg"]
    return df


# -----------------------------------------------------------------------------
# GEO SPATIAL HELPERS
# -----------------------------------------------------------------------------

def station_geojson(df: pd.DataFrame, path: str) -> gpd.GeoDataFrame:
    """Write point GeoJSON for stations and return GeoDataFrame."""
    gdf = gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df["lon"], df["lat"]),
        crs="EPSG:4326",
    )
    gdf.to_file(path, driver="GeoJSON")
    return gdf


def aggregate_regions(gdf: gpd.GeoDataFrame, regions_path: str) -> gpd.GeoDataFrame:
    """Spatial join → mean QG per region; optional PV output estimate."""
    regions = gpd.read_file(regions_path)

    # Harmonise CRS
    if regions.crs is None:
        regions = regions.set_crs(epsg=4326, allow_override=True)
    elif regions.crs.to_epsg() != 4326:
        regions = regions.to_crs(epsg=4326)

    joined = gpd.sjoin(gdf, regions, how="left", predicate="within")
    agg = joined.groupby("name")["qg"].mean().reset_index(name="qg_mean")
    out = regions.merge(agg, on="name", how="left")
    out["qg_mean"].fillna(0.0, inplace=True)

    if "solar_capacity_mw" in out.columns:
        out["estimated_output_mw"] = out["solar_capacity_mw"] * out["qg_mean"] / 1000.0

    return out


# -----------------------------------------------------------------------------
# RUNTIME WRAPPER
# -----------------------------------------------------------------------------

def run_once(api_key: str, regions_path: str, stations_out: str, regions_out: str) -> None:
    """Fetch newest file, regenerate GeoJSONs, print timestamp."""
    fname = latest_file(api_key)
    raw = download_file(api_key, fname)

    try:
        df = parse_qg(raw)
    except Exception as exc:
        raise RuntimeError(f"Failed parsing {fname}: {exc}") from exc

    gdf = station_geojson(df, stations_out)
    agg = aggregate_regions(gdf, regions_path)
    agg.to_file(regions_out, driver="GeoJSON")
    ts = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    print(f"Updated {stations_out} and {regions_out} at {ts}")


# -----------------------------------------------------------------------------
# CLI ENTRYPOINT
# -----------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Fetch KNMI QG data and update GeoJSON files",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--api-key", required=True, help="KNMI API key")
    parser.add_argument("--regions", default="data/regions_with_capacity.geojson")
    parser.add_argument("--stations-out", default="data/qg_stations.geojson")
    parser.add_argument("--regions-out", default="data/qg_regions.geojson")
    parser.add_argument("--loop", action="store_true", help="Run every 10 minutes")
    args = parser.parse_args(argv)

    while True:
        try:
            run_once(args.api_key, args.regions, args.stations_out, args.regions_out)
        except Exception as exc:
            print(f"Error: {exc}", file=sys.stderr)
        if not args.loop:
            break
        time.sleep(600)  # 10 minutes


if __name__ == "__main__":
    main()
