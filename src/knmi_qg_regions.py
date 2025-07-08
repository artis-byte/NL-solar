#!/usr/bin/env python3
"""
KNMI → GeoJSON publisher (S3 **or** GitHub)
=========================================
Fetch 10-minute KNMI irradiance, aggregate by region, and publish the result as a
public GeoJSON file that a Windy plug-in (or any Leaflet app) can poll.

This revision adds **native GitHub upload** so you don’t have to pay for S3:

```
python knmi_qg_regions.py --api-key $KNMI_KEY \
       --regions data/regions_10.geojson \
       --gh-repo  USER/REPO \
       --gh-path  live/qg_regions.geojson \
       --loop
```

Requirements
------------
* `boto3` only if you use S3 upload.
* `requests` for GitHub upload.
* A GitHub **fine-grained personal access token** with *contents:write* scope.
  Supply it via `GITHUB_TOKEN` env var **or** the `--gh-token` flag.

Windy plug-in fetch URL (GitHub Pages/raw):
```
https://raw.githubusercontent.com/USER/REPO/BRANCH/live/qg_regions.geojson
```
That domain already sends `Access-Control-Allow-Origin: *`, so Leaflet fetches
it without CORS issues.
"""
from __future__ import annotations

import argparse
import base64
import io
import os
import sys
import time
from datetime import datetime
from typing import Optional

import geopandas as gpd
import pandas as pd
import requests
import xarray as xr

# Optional S3 deps -------------------------------------------------------------
try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:  # S3 upload will be disabled automatically
    boto3 = None  # type: ignore

# -----------------------------------------------------------------------------
# CONFIGURATION CONSTANTS
# -----------------------------------------------------------------------------
BASE_URL = "https://api.dataplatform.knmi.nl/open-data/v1"
DATASET = "Actuele10mindataKNMIstations"  # v2 (deprecates Sep-2025)
VERSION = "2"

# -----------------------------------------------------------------------------
# KNMI HELPERS
# -----------------------------------------------------------------------------

def latest_file(api_key: str) -> str:
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
    headers = {"Authorization": api_key}
    r = requests.get(
        f"{BASE_URL}/datasets/{DATASET}/versions/{VERSION}/files/{filename}/url",
        headers=headers,
        timeout=30,
    )
    r.raise_for_status()
    url = r.json()["temporaryDownloadUrl"]
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.content


# -----------------------------------------------------------------------------
# DATA PARSING
# -----------------------------------------------------------------------------

def _find(ds: xr.Dataset, substr: str) -> Optional[str]:
    low = substr.lower()
    for n in ds.coords:
        if low in n.lower():
            return n
    for n in ds.variables:
        if low in n.lower():
            return n
    return None


def parse_qg(raw: bytes) -> pd.DataFrame:
    with xr.open_dataset(io.BytesIO(raw)) as ds:
        lat = _find(ds, "lat")
        lon = _find(ds, "lon")
        stn = next((d for d in ds.dims if "station" in d.lower() or d == "stn"), None)
        qg = next((v for v in ds.data_vars if v.lower().startswith("qg")), None)
        if not (lat and lon and stn and qg):
            raise ValueError("Missing expected variables")

        df = ds[[qg, lat, lon]].to_dataframe().reset_index()
        if "time" in df.columns:
            df = df.sort_values("time").drop_duplicates(subset=stn, keep="last").drop(columns="time")
        df = df[[stn, lat, lon, qg]].dropna()
        df.columns = ["station", "lat", "lon", "qg"]
    return df


# -----------------------------------------------------------------------------
# GEO SPATIAL
# -----------------------------------------------------------------------------

def aggregate_regions(df: pd.DataFrame, regions_path: str) -> gpd.GeoDataFrame:
    stations = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df["lon"], df["lat"]), crs="EPSG:4326")
    regions = gpd.read_file(regions_path)
    regions = regions.to_crs(epsg=4326) if regions.crs else regions.set_crs(epsg=4326, allow_override=True)

    joined = gpd.sjoin(stations, regions, predicate="within", how="left")
    agg = joined.groupby("name")["qg"].mean().reset_index(name="qg_mean")
    out = regions.merge(agg, on="name", how="left")
    out["qg_mean"].fillna(0.0, inplace=True)

    if "solar_capacity_mw" in out.columns:
        out["estimated_output_mw"] = out["solar_capacity_mw"] * out["qg_mean"] / 1000.0
    return out


# -----------------------------------------------------------------------------
# UPLOAD HELPERS
# -----------------------------------------------------------------------------

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
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError(f"S3 upload failed: {exc}") from exc
    return f"https://{bucket}.s3.amazonaws.com/{key}"


def upload_github(local: str, repo: str, path: str, branch: str, token: str) -> str:
    api = f"https://api.github.com/repos/{repo}/contents/{path}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
    }

    # Check if file exists to get its SHA (needed for update)
    sha: Optional[str] = None
    r = requests.get(api, headers=headers, params={"ref": branch})
    if r.status_code == 200:
        sha = r.json()["sha"]
    elif r.status_code not in (404, 422):  # 422 → repo empty
        r.raise_for_status()

    with open(local, "rb") as f:
        content_b64 = base64.b64encode(f.read()).decode()

    payload = {
        "message": f"auto: update {path} ({datetime.utcnow().isoformat(timespec='seconds')}Z)",
        "branch": branch,
        "content": content_b64,
    }
    if sha:
        payload["sha"] = sha

    r = requests.put(api, headers=headers, json=payload)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"GitHub upload failed: {r.text[:200]}")

    raw_url = f"https://raw.githubusercontent.com/{repo}/{branch}/{path}"
    return raw_url


# -----------------------------------------------------------------------------
# ORCHESTRATION
# -----------------------------------------------------------------------------

def run_once(
    api_key: str,
    regions_path: str,
    local_out: str,
    s3_bucket: Optional[str] = None,
    s3_key: Optional[str] = None,
    gh_repo: Optional[str] = None,
    gh_path: Optional[str] = None,
    gh_branch: str = "main",
    gh_token: Optional[str] = None,
) -> None:
    fname = latest_file(api_key)
    raw = download_file(api_key, fname)
    df = parse_qg(raw)
    geo = aggregate_regions(df, regions_path)
    geo.to_file(local_out, driver="GeoJSON")

    if s3_bucket and s3_key:
        url = upload_s3(local_out, s3_bucket, s3_key)
        print("S3 →", url)

    if gh_repo and gh_path:
        gh_token = gh_token or os.getenv("GITHUB_TOKEN")
        if not gh_token:
            raise RuntimeError("GitHub token not provided (flag or GITHUB_TOKEN env var)")
        url = upload_github(local_out, gh_repo, gh_path, gh_branch, gh_token)
        print("GitHub →", url)

    ts = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    print(f"Generated {local_out} at {ts}\n")


# -----------------------------------------------------------------------------
# CLI
# -----------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(
        description="KNMI QG → GeoJSON publisher (S3 or GitHub)",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--api-key", required=True, help="KNMI API key")
    p.add_argument("--regions", default="data/regions_10.geojson")
    p.add_argument("--out", dest="local_out", default="qg_regions.geojson")

    # S3 options
    p.add_argument("--s3-bucket")
    p.add_argument("--s3-key")

    # GitHub options
    p.add_argument("--gh-repo", help="owner/repo")
    p.add_argument("--gh-path", help="path within repo e.g. live/foo.geojson")
    p.add_argument("--gh-branch", default="main")
    p.add_argument("--gh-token", help="GitHub PAT (or set GITHUB_TOKEN env var)")

    p.add_argument("--loop", action="store_true", help="Repeat every 10 min")
    args = p.parse_args(argv)

    while True:
        try:
            run_once(
                api_key=args.api_key,
                regions_path=args.regions,
                local_out=args.local_out,
                s3_bucket=args.s3_bucket,
                s3_key=args.s3_key,
                gh_repo=args.gh_repo,
                gh_path=args.gh_path,
                gh_branch=args.gh_branch,
                gh_token=args.gh_token,
            )
        except Exception as exc:
            print("Error:", exc, file=sys.stderr)
        if not args.loop:
            break
        time.sleep(600)


if __name__ == "__main__":
    main()
