import argparse
import io
import sys
import time
from datetime import datetime

import geopandas as gpd
import pandas as pd
import requests
import xarray as xr
from shapely.geometry import Point

BASE_URL = "https://api.dataplatform.knmi.nl/open-data/v1"
DATASET = "Actuele10mindataKNMIstations"
VERSION = "2"


def latest_file(api_key: str) -> str:
    """Return the latest filename for the dataset."""
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
    """Return file contents for the given dataset filename."""
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


def parse_qg(data: bytes) -> pd.DataFrame:
    """Extract station coordinates and QG values from NetCDF bytes."""
    with xr.open_dataset(io.BytesIO(data)) as ds:
        # Try common variable/coordinate names
        lat_name = next((c for c in ds.coords if "lat" in c.lower()), None)
        lon_name = next((c for c in ds.coords if "lon" in c.lower()), None)
        station_dim = next((d for d in ds.dims if "station" in d.lower() or d.lower() == "stn"), None)
        qg_var = next((v for v in ds.data_vars if v.lower().startswith("qg")), None)
        if not (lat_name and lon_name and station_dim and qg_var):
            raise ValueError("Dataset does not contain expected variables")
        df = ds[[qg_var]].to_dataframe().reset_index()
        df = df[[station_dim, lat_name, lon_name, qg_var]].dropna()
        df.columns = ["station", "lat", "lon", "qg"]
    return df


def station_geojson(df: pd.DataFrame, path: str) -> gpd.GeoDataFrame:
    gdf = gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df["lon"], df["lat"]),
        crs="EPSG:4326",
    )
    gdf.to_file(path, driver="GeoJSON")
    return gdf


def aggregate_regions(gdf: gpd.GeoDataFrame, regions_path: str) -> gpd.GeoDataFrame:
    regions = gpd.read_file(regions_path)
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


def run_once(api_key: str, regions_path: str, stations_out: str, regions_out: str) -> None:
    fname = latest_file(api_key)
    data = download_file(api_key, fname)
    df = parse_qg(data)
    gdf = station_geojson(df, stations_out)
    agg = aggregate_regions(gdf, regions_path)
    agg.to_file(regions_out, driver="GeoJSON")
    ts = datetime.utcnow().isoformat() + "Z"
    print(f"Updated {stations_out} and {regions_out} at {ts}")


def main(argv=None):
    p = argparse.ArgumentParser(description="Fetch KNMI QG data and update GeoJSON")
    p.add_argument("--api-key", required=True, help="KNMI API key")
    p.add_argument("--regions", default="data/regions_with_capacity.geojson")
    p.add_argument("--stations-out", default="data/qg_stations.geojson")
    p.add_argument("--regions-out", default="data/qg_regions.geojson")
    p.add_argument("--loop", action="store_true", help="Run every 10 minutes")
    args = p.parse_args(argv)

    while True:
        try:
            run_once(args.api_key, args.regions, args.stations_out, args.regions_out)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
        if not args.loop:
            break
        time.sleep(600)


if __name__ == "__main__":
    main()
