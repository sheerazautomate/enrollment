# Enrollment Data Pipeline

A Python-based data pipeline that fetches live enrollment statistics from the PESRP (Punjab Education Sector Reform Program) SIS and processes them into an optimized JSON format for fast lookups.

## Project Structure

```
enrollment/
├── README.md                      # Project documentation
├── generate_enrollment.py         # Main data pipeline script
├── data/
│   └── live_enrollment.json      # Output: Processed enrollment data (O(1) lookup)
└── .github/
    └── workflows/               # CI/CD automation
```

## Features

- **Real-time Data Fetching**: Connects to PESRP SIS API endpoint
- **CSV Parsing**: Handles custom CSV format with headers at row 3
- **Data Cleaning**: Removes null values, converts data types, normalizes EMIS codes
- **Optimized Storage**: Generates minified JSON with O(1) lookup performance
- **Error Handling**: Validates API responses and column names

## Functions

### `main()`

**Location**: `generate_enrollment.py:10`

**Purpose**: Primary orchestrator function that manages the entire enrollment data pipeline.

**Workflow**:
1. Fetches live data from PESRP SIS endpoint
2. Creates output directory if needed
3. Parses CSV data with custom row offset
4. Validates required columns
5. Cleans and processes enrollment records
6. Generates optimized lookup dictionary
7. Saves minified JSON output

**Parameters**: None

**Returns**: None (prints status messages to console)

**Error Handling**:
- Returns early if API response status is not 200
- Validates that required columns exist in parsed CSV
- Uses pandas `errors='coerce'` to handle invalid numeric values

**Output**: 
- Prints: Progress messages and status updates
- File: `data/live_enrollment.json` - Dictionary mapping EMIS codes to enrollment counts

**Performance**:
- Time Complexity: O(n) where n = number of schools
- Space Complexity: O(n) for the lookup dictionary
- Lookup Time: O(1) for enrollment data retrieval

## Data Flow

```
PESRP SIS API
    ↓
requests.get() - Fetch CSV data
    ↓
StringIO - Convert to file-like object
    ↓
pd.read_csv() - Parse with skiprows=2
    ↓
Column Validation - Check EMIS and Enrollment columns
    ↓
Data Cleaning - Remove NaN, normalize EMIS, convert types
    ↓
dict(zip()) - Create O(1) lookup dictionary
    ↓
json.dump() - Minified JSON output
    ↓
live_enrollment.json - Final data asset
```

## Configuration

| Variable | Value | Description |
|----------|-------|-------------|
| `PESRP_URL` | `https://sis.pesrp.edu.pk/dashboard/download_schools_progress_stats` | API endpoint for enrollment data |
| `OUTPUT_DIR` | `data` | Directory for output files |
| `OUTPUT_FILE` | `data/live_enrollment.json` | Output file path |
| `EMIS_COL` | `School EMIS` | Column header for school EMIS codes |
| `ENROL_COL` | `Currrent Enrolled & Unverified` | Column header for enrollment counts |
| `TIMEOUT` | `60` seconds | API request timeout |

## Data Processing Details

### CSV Parsing
- Skips first 2 rows (rows 1-2)
- Uses row 3 as column headers
- Converts response text to StringIO for pandas compatibility

### EMIS Code Normalization
- Strips whitespace
- Splits on decimal and takes first part
- Converts to string type

### Enrollment Count Processing
- Converts to numeric type with error coercion
- Replaces NaN values with 0
- Converts to integer type

### Output Format
```json
{
  "EMIS_CODE_1": enrollment_count,
  "EMIS_CODE_2": enrollment_count,
  ...
}
```

## Usage

### Basic Usage
```bash
python generate_enrollment.py
```

### Expected Output
```
Fetching live PESRP data stream...
Parsing CSV data (Skipping first 2 rows to read headers at Row 3)...
Extracting columns and cleaning records...
Successfully processed 5000 unique school profiles.
Saved compressed data asset to: data/live_enrollment.json
```

## Dependencies

- `os` - File system operations
- `json` - JSON serialization
- `pandas` - Data frame manipulation and CSV parsing
- `requests` - HTTP requests to PESRP API
- `io.StringIO` - In-memory file object for CSV conversion

**Installation**:
```bash
pip install pandas requests
```

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|-----------|
| API Status Code Error | Server unavailable or invalid URL | Check network connection and PESRP endpoint status |
| Column Not Found | CSV format changed or headers misaligned | Update column names or adjust `skiprows` parameter |
| Data Type Conversion | Invalid numeric values in enrollment column | Handled automatically with `errors='coerce'` |
| Directory Creation Failed | Permission issues | Check write permissions in project directory |

## Performance Metrics

- **Data Points Processed**: Thousands of unique school records per run
- **File Size**: Minified JSON with separator optimization `(',', ':')` 
- **Lookup Speed**: O(1) constant time for enrollment retrieval
- **API Timeout**: 60 seconds for large dataset fetches

## Future Enhancements

- [ ] Add caching mechanism to reduce API calls
- [ ] Implement incremental data updates
- [ ] Add data validation and quality checks
- [ ] Create visualization dashboard
- [ ] Add automated scheduling via cron/GitHub Actions
- [ ] Implement data versioning with timestamps

## License

Proprietary - PESRP

## Contact

For issues or questions, contact: sheerazautomate
