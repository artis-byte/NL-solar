import argparse
import csv
import json
import os
import sqlite3
import time
from typing import Tuple

import requests

DEFAULT_SLEEP = 1.1
DEFAULT_UA = "nl-solar-agent/0.1 (contact@example.com)"
CACHE_DB = "data/nominatim_cache.sqlite"

API_URL = "https://nominatim.openstreetmap.org/search"


def init_cache(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS geocode (query TEXT PRIMARY KEY, lat TEXT, lon TEXT, status TEXT)"
    )
    return conn


def cached_lookup(conn: sqlite3.Connection, query: str) -> Tuple[str, str, str]:
    cur = conn.execute(
        "SELECT lat, lon, status FROM geocode WHERE query=?", (query,)
    )
    row = cur.fetchone()
    return row if row else (None, None, None)


def store_cache(conn: sqlite3.Connection, query: str, lat: str, lon: str, status: str) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO geocode (query, lat, lon, status) VALUES (?, ?, ?, ?)",
        (query, lat, lon, status),
    )
    conn.commit()


def geocode(query: str, session: requests.Session, ua: str, sleep: float, conn: sqlite3.Connection) -> Tuple[str, str, str]:
    lat, lon, status = cached_lookup(conn, query)
    if status:
        return lat, lon, status
    params = {"q": query, "format": "json", "limit": 1}
    headers = {"User-Agent": ua}
    try:
        resp = session.get(API_URL, params=params, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if len(data) == 1:
            lat = data[0]["lat"]
            lon = data[0]["lon"]
            status = "OK"
        elif len(data) == 0:
            lat = lon = None
            status = "NO_MATCH"
        else:
            lat = data[0]["lat"]
            lon = data[0]["lon"]
            status = "MULTIPLE"
    except Exception:
        lat = lon = None
        status = "ERROR"
    store_cache(conn, query, lat, lon, status)
    time.sleep(sleep)
    return lat, lon, status


def export_geojson(csv_path: str, out_path: str) -> None:
    features = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row.get("Latitude") or not row.get("Longitude"):
                continue
            props = {k: v for k, v in row.items() if k not in {"Latitude", "Longitude"}}
            features.append(
                {
                    "type": "Feature",
                    "properties": props,
                    "geometry": {
                        "type": "Point",
                        "coordinates": [float(row["Longitude"]), float(row["Latitude"])]
                    },
                }
            )
    fc = {"type": "FeatureCollection", "features": features}
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(fc, f)


def run(args: argparse.Namespace) -> None:
    ua = args.user_agent or os.getenv("OSM_UA", DEFAULT_UA)
    conn = init_cache(CACHE_DB)
    session = requests.Session()
    results = []
    with open(args.csv, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            query = f"{row['Name']}, Netherlands"
            lat, lon, status = geocode(query, session, ua, args.sleep, conn)
            row["Latitude"] = lat
            row["Longitude"] = lon
            row["Status"] = status
            results.append(row)
    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    if args.export_geojson:
        export_geojson(args.output, args.export_geojson)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--csv", default="data/parks.csv")
    p.add_argument("--output", default="data/parks_geocoded.csv")
    p.add_argument("--sleep", type=float, default=DEFAULT_SLEEP)
    p.add_argument("--user-agent", dest="user_agent")
    p.add_argument("--export-geojson", help="write GeoJSON to this file")
    args = p.parse_args()
    run(args)
