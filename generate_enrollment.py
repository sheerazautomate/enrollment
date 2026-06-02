import os
import json
import pandas as pd
import requests

PESRP_URL = "https://sis.pesrp.edu.pk/dashboard/download_schools_progress_stats"
OUTPUT_DIR = "data"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "live_enrollment.json")

def main():
    print("Fetching live PESRP data stream...")
    response = requests.get(PESRP_URL, timeout=60)
    
    if response.status_code != 200:
        print(f"Failed to fetch data. Server responded with: {response.status_code}")
        return

    # Create the data directory if it doesn't exist yet
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Parsing CSV data (Skipping first 2 rows to read headers at Row 3)...")
    # Convert text to file-like object and read with pandas
    from io import StringIO
    csv_data = StringIO(response.text)
    
    # skiprows=2 skips rows 1 and 2, making row 3 the column header definitions
    df = pd.read_csv(csv_data, skiprows=2)

    # Use the explicit column labels you provided
    emis_col = "School EMIS"
    enrol_col = "Currrent Enrolled & Unverified"

    if emis_col not in df.columns or enrol_col not in df.columns:
        print("Error: Column names do not match the parsed file headers.")
        print(f"Found headers: {list(df.columns[:15])}...")
        return

    print("Extracting columns and cleaning records...")
    # Drop empty rows and force correct data types
    df_clean = df[[emis_col, enrol_col]].dropna()
    df_clean[emis_col] = df_clean[emis_col].astype(str).str.strip().str.split('.').str[0]
    df_clean[enrol_col] = pd.to_numeric(df_clean[enrol_col], errors='coerce').fillna(0).astype(int)

    # Convert the dataframe into an ultra-fast O(1) lookup dictionary: { "EMIS": Enrollment }
    enrollment_dict = dict(zip(df_clean[emis_col], df_clean[enrol_col]))

    print(f"Successfully processed {len(enrollment_dict)} unique school profiles.")

    # Save as minified JSON to save file size overhead
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(enrollment_dict, f, separators=(',', ':'))
        
    print(f"Saved compressed data asset to: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
