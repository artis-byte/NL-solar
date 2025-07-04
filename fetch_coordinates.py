import csv
import sys
import time
import requests

API_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "NL-Solar-Parks/1.0 (contact: example@example.com)"


def fetch_location(query):
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
    }
    headers = {"User-Agent": USER_AGENT}
    try:
        resp = requests.get(API_URL, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if data:
            return data[0]["lat"], data[0]["lon"]
    except Exception as e:
        print(f"Failed to fetch {query}: {e}")
    return None, None


def main(input_csv="solar_parks.csv", output_csv="solar_parks_with_coords.csv"):
    results = []
    with open(input_csv, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["Name"]
            query = f"{name}, Netherlands"
            lat, lon = fetch_location(query)
            row["Latitude"] = lat
            row["Longitude"] = lon
            results.append(row)
            time.sleep(1)  # be polite to the API
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        fieldnames = list(results[0].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        in_file = sys.argv[1]
        out_file = sys.argv[2] if len(sys.argv) > 2 else "solar_parks_with_coords.csv"
        main(in_file, out_file)
    else:
        main()