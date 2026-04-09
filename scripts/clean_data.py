import pandas as pd
import os
import glob
import sys

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
OUTPUT_FILE = os.path.join(BASE_DIR, "cleaned_villages.csv")

COLUMNS = [
    "state_code", "state_name",
    "district_code", "district_name",
    "subdistrict_code", "subdistrict_name",
    "village_code", "area_name",
]

# Valid Indian state codes — anything outside this is a junk row
VALID_STATE_CODES = {
    "01","02","03","04","05","06","07","08","09","10",
    "11","12","13","14","15","16","17","18","19","20",
    "21","22","23","24","25","26","27","28","29","30",
    "31","32","33","34","35","36","37","38"
}

def read_file(filepath):
    ext      = os.path.splitext(filepath)[1].lower()
    filename = os.path.basename(filepath)

    if os.path.getsize(filepath) == 0:
        print(f"  SKIP — empty file: {filename}")
        return None

    try:
        if ext == ".xlsx":
            df = pd.read_excel(filepath, header=0, dtype=str, engine="openpyxl")
        elif ext == ".xls":
            df = pd.read_excel(filepath, header=0, dtype=str, engine="xlrd")
        elif ext == ".ods":
            df = pd.read_excel(filepath, header=0, dtype=str, engine="odf")
        else:
            print(f"  SKIP — unknown format: {filename}")
            return None
    except Exception as e:
        print(f"  SKIP — could not read {filename}: {e}")
        return None

    # Handle multi-sheet files
    if len(df.columns) != 8:
        try:
            xl = pd.ExcelFile(filepath)
            for sheet in xl.sheet_names:
                try:
                    df2 = pd.read_excel(filepath, sheet_name=sheet, header=0, dtype=str)
                    if len(df2.columns) == 8 and len(df2) > 5:
                        df = df2
                        break
                except Exception:
                    continue
        except Exception:
            pass

    if len(df.columns) != 8 or len(df) == 0:
        print(f"  SKIP — wrong columns ({len(df.columns)}): {filename}")
        return None

    df.columns = COLUMNS
    return df


def clean(df):
    # Strip whitespace
    for col in COLUMNS:
        df[col] = df[col].astype(str).str.strip()

    # Remove .0 from numeric codes (pandas reads numbers as "2.0" etc)
    for col in ["state_code", "district_code", "subdistrict_code", "village_code"]:
        df[col] = df[col].str.split(".").str[0]

    # Pad codes with leading zeros
    df["state_code"]       = df["state_code"].str.zfill(2)
    df["district_code"]    = df["district_code"].str.zfill(3)
    df["subdistrict_code"] = df["subdistrict_code"].str.zfill(5)
    df["village_code"]     = df["village_code"].str.zfill(6)

    # Remove summary rows (village_code = 000000)
    before = len(df)
    df = df[df["village_code"] != "000000"].copy()
    removed = before - len(df)
    if removed:
        print(f"  Removed {removed} summary rows")

    # CRITICAL FIX: Remove junk rows where state_code is not a valid Indian state code
    before = len(df)
    df = df[df["state_code"].isin(VALID_STATE_CODES)].copy()
    junk = before - len(df)
    if junk:
        print(f"  Removed {junk} junk rows (invalid state codes)")

    # Fill nulls
    df["subdistrict_name"] = df["subdistrict_name"].replace("nan", "Unknown").fillna("Unknown")
    df["area_name"]        = df["area_name"].replace("nan", "Unknown").fillna("Unknown")
    df["district_name"]    = df["district_name"].replace("nan", "Unknown").fillna("Unknown")
    df["state_name"]       = df["state_name"].replace("nan", "Unknown").fillna("Unknown")

    # Title case for names
    for col in ["state_name", "district_name", "subdistrict_name"]:
        df[col] = df[col].str.title()

    return df


def main():
    print("=" * 55)
    print("  India Geo Data Cleaner  (Fixed Version)")
    print("=" * 55)
    print(f"\nLooking in: {DATASET_DIR}\n")

    if not os.path.isdir(DATASET_DIR):
        print(f"ERROR: dataset folder not found:\n  {DATASET_DIR}")
        sys.exit(1)

    all_files = []
    for p in ["*.xls", "*.xlsx", "*.ods"]:
        all_files += glob.glob(os.path.join(DATASET_DIR, p))

    by_base = {}
    for f in sorted(all_files):
        base = os.path.splitext(f)[0]
        ext  = os.path.splitext(f)[1].lower()
        if base not in by_base or ext == ".xlsx":
            by_base[base] = f
    unique_files = sorted(by_base.values())

    print(f"Found {len(unique_files)} files\n")

    all_data = []
    skipped  = 0

    for filepath in unique_files:
        print(f"Processing: {os.path.basename(filepath)}")
        df = read_file(filepath)
        if df is None:
            skipped += 1
            print()
            continue

        cleaned = clean(df)
        if len(cleaned) == 0:
            skipped += 1
            print()
            continue

        state = cleaned["state_name"].iloc[0]
        print(f"  OK: {state} — {len(cleaned):,} villages\n")
        all_data.append(cleaned)

    if not all_data:
        print("ERROR: No data processed!")
        sys.exit(1)

    print("Combining all states...")
    combined = pd.concat(all_data, ignore_index=True)

    before = len(combined)
    combined = combined.drop_duplicates(subset=["village_code"], keep="first")
    dupes = before - len(combined)
    if dupes:
        print(f"Removed {dupes} duplicate village codes")

    combined.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")

    print("\n" + "=" * 55)
    print("  CLEANING COMPLETE")
    print("=" * 55)
    print(f"  States        : {combined['state_name'].nunique()}")
    print(f"  Districts     : {combined['district_name'].nunique()}")
    print(f"  Sub-districts : {combined['subdistrict_name'].nunique()}")
    print(f"  Villages      : {len(combined):,}")
    print(f"  Files skipped : {skipped}")
    print(f"  Saved to      : {OUTPUT_FILE}")
    print("=" * 55)


if __name__ == "__main__":
    main()