import os
import json
import shutil
import pandas as pd
import requests
from io import StringIO

PESRP_URL = "https://sis.pesrp.edu.pk/dashboard/download_schools_progress_stats"
OUTPUT_DIR = "data"
LIVE_FILE      = os.path.join(OUTPUT_DIR, "live_enrollment.json")
YESTERDAY_FILE = os.path.join(OUTPUT_DIR, "yesterday_enrollment.json")

def main():
    # Create the data directory if it doesn't exist yet
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ------------------------------------------------------------------ #
    # STEP 1: Snapshot today's live file → yesterday BEFORE fetching new  #
    # ------------------------------------------------------------------ #
    if os.path.exists(LIVE_FILE):
        print("Snapshotting current live_enrollment.json → yesterday_enrollment.json...")
        tmp_yesterday = YESTERDAY_FILE + ".tmp"
        shutil.copy2(LIVE_FILE, tmp_yesterday)
        os.replace(tmp_yesterday, YESTERDAY_FILE)
        print("Yesterday snapshot saved.")
    else:
        # First-ever run: no live file exists yet.
        # We'll bootstrap yesterday after fetching today's data (delta = 0).
        print("No existing live_enrollment.json found. Will bootstrap yesterday on first run.")

    # ------------------------------------------------------------------ #
    # STEP 2: Fetch fresh data from PESRP                                  #
    # ------------------------------------------------------------------ #
    print("Fetching live PESRP data stream...")
    response = requests.get(PESRP_URL, timeout=60)

    if response.status_code != 200:
        print(f"Failed to fetch data. Server responded with: {response.status_code}")
        return

    print("Parsing CSV data (Skipping first 2 rows to read headers at Row 3)...")
    csv_data = StringIO(response.text)

    # skiprows=2 skips rows 1 and 2, making row 3 the column header definitions
    df = pd.read_csv(csv_data, skiprows=2)

    # Column names exactly as they appear in the PESRP CSV
    # Note: "Currrent" (triple-r) is a typo in the source CSV, not our code
    emis_col  = "School EMIS"
    enrol_col = "Currrent Enrolled & Unverified"

    if emis_col not in df.columns or enrol_col not in df.columns:
        print("Error: Column names do not match the parsed file headers.")
        print(f"Found headers: {list(df.columns[:15])}...")
        return

    print("Extracting columns and cleaning records...")
    df_clean = df[[emis_col, enrol_col]].dropna()
    df_clean[emis_col]  = df_clean[emis_col].astype(str).str.strip().str.split('.').str[0]
    df_clean[enrol_col] = pd.to_numeric(df_clean[enrol_col], errors='coerce').fillna(0).astype(int)

    # Flat { "EMIS": count } dictionary — fast O(1) lookup
    enrollment_dict = dict(zip(df_clean[emis_col], df_clean[enrol_col]))

    print(f"Successfully processed {len(enrollment_dict)} unique school profiles.")

    # ------------------------------------------------------------------ #
    # STEP 3: Atomic write → live_enrollment.json                          #
    # ------------------------------------------------------------------ #
    tmp_live = LIVE_FILE + ".tmp"
    with open(tmp_live, 'w', encoding='utf-8') as f:
        json.dump(enrollment_dict, f, separators=(',', ':'))
    os.replace(tmp_live, LIVE_FILE)
    print(f"Saved live data to: {LIVE_FILE}")

    # ------------------------------------------------------------------ #
    # STEP 4: First-run bootstrap — yesterday = today (delta will be 0)   #
    # ------------------------------------------------------------------ #
    if not os.path.exists(YESTERDAY_FILE):
        print("Bootstrapping yesterday_enrollment.json from today's data (first run — delta = 0)...")
        tmp_yesterday = YESTERDAY_FILE + ".tmp"
        shutil.copy2(LIVE_FILE, tmp_yesterday)
        os.replace(tmp_yesterday, YESTERDAY_FILE)
        print("Bootstrap complete.")

if __name__ == "__main__":
    main()
