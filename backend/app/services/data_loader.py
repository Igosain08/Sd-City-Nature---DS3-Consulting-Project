"""
Data loading and caching utilities
"""
import zipfile
import pandas as pd
import geopandas as gpd
from typing import Optional
from pathlib import Path

# Module-level cache
_cached_data: Optional[gpd.GeoDataFrame] = None

# Paths to look for cleaned dataset
# __file__ = backend/app/services/data_loader.py -> backend/ is parent.parent.parent
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_PROJECT_ROOT = _BACKEND_DIR.parent  # repo root (contains backend/, frontend/, cleaned_finalized_dataset.csv.zip)
_DATA_DIR = _BACKEND_DIR / "data"
_CSV_PATHS = [
    _PROJECT_ROOT / "cleaned_finalized_dataset.csv.zip",
    _PROJECT_ROOT / "cleaned_finalized_dataset.csv",
    _DATA_DIR / "cleaned_finalized_dataset.csv",
    _DATA_DIR / "cleaned_finalized_dataset.csv.zip",
]


class DataLoader:
    """Handles loading and caching of iNaturalist observation data"""

    @staticmethod
    def load_observations(city: str = "San Diego") -> gpd.GeoDataFrame:
        """
        Load iNaturalist observations from CSV and convert to GeoDataFrame.
        Uses cleaned_finalized_dataset if present; otherwise returns dummy data.

        Args:
            city: City name (used for filtering or when no dataset is found)

        Returns:
            GeoDataFrame with observation data (columns aligned with API schemas)
        """
        for path in _CSV_PATHS:
            if not path.exists():
                continue
            try:
                if path.suffix == ".zip":
                    with zipfile.ZipFile(path, "r") as z:
                        csv_members = [n for n in z.namelist() if n.endswith(".csv") and "__MACOSX" not in n and not n.startswith(".")]
                        if not csv_members:
                            raise ValueError("No .csv file found in zip")
                        with z.open(csv_members[0]) as f:
                            df = pd.read_csv(f, nrows=None)
                else:
                    df = pd.read_csv(path, nrows=None)
            except Exception as e:
                print(f"DataLoader: Could not read {path}: {e}")
                continue

            # Map cleaned CSV columns to API schema (species_name, taxon_group, city, etc.)
            rename = {}
            if "scientific_name" in df.columns and "species_name" not in df.columns:
                rename["scientific_name"] = "species_name"
            if "iconic_taxon_name" in df.columns and "taxon_group" not in df.columns:
                rename["iconic_taxon_name"] = "taxon_group"
            if "community" in df.columns and "city" not in df.columns:
                rename["community"] = "city"
            df = df.rename(columns=rename)

            # Ensure required columns exist; fill missing from alternate column names or defaults
            fallbacks = [
                ("species_name", "scientific_name"),
                ("common_name", "common_name"),
                ("taxon_group", "iconic_taxon_name"),
                ("latitude", "latitude"),
                ("longitude", "longitude"),
                ("observed_on", "observed_on"),
                ("user_id", "user_id"),
                ("quality_grade", "quality_grade"),
                ("city", "community"),
            ]
            for api_col, alt_col in fallbacks:
                if api_col not in df.columns:
                    df[api_col] = df[alt_col] if alt_col in df.columns else ""

            # Normalize column set for downstream
            if "id" not in df.columns:
                df["id"] = range(len(df))
            if "time_of_day" not in df.columns:
                df["time_of_day"] = "unknown"
            if "captive_cultivated" not in df.columns:
                df["captive_cultivated"] = pd.NA
            if "during_competition" not in df.columns:
                df["during_competition"] = 1

            # Observation datetime: use time_observed_at (when observation took place) for hour,
            # not created_at (upload time). Combine observed_on date + time_observed_at time when available.
            obs_date = pd.to_datetime(df["observed_on"], errors="coerce").dt.normalize()
            df["observed_on"] = obs_date.astype("str")
            if "time_observed_at" in df.columns:
                time_obs = pd.to_datetime(df["time_observed_at"], errors="coerce")
                # Where time_observed_at is valid, add its time-of-day to observed_on date
                df["_observed_on_dt"] = (
                    obs_date
                    + pd.to_timedelta(time_obs.dt.hour.fillna(0), unit="h")
                    + pd.to_timedelta(time_obs.dt.minute.fillna(0), unit="m")
                    + pd.to_timedelta(time_obs.dt.second.fillna(0), unit="s")
                )
            else:
                df["_observed_on_dt"] = obs_date
            if "created_at" in df.columns:
                df["_created_at_dt"] = pd.to_datetime(df["created_at"], errors="coerce")
            df["user_id"] = df["user_id"].astype(str)

            # Drop rows missing coordinates
            df = df.dropna(subset=["latitude", "longitude"])

            gdf = gpd.GeoDataFrame(
                df,
                geometry=gpd.points_from_xy(df["longitude"], df["latitude"]),
                crs="EPSG:4326",
            )
            print(f"DataLoader: Loaded {len(gdf):,} observations from {path}")
            return gdf

        print("DataLoader: No cleaned_finalized_dataset found, using dummy data")
        return DataLoader._dummy_gdf(city)
    
    @staticmethod
    def get_cached_data() -> gpd.GeoDataFrame:
        """
        Returns cached observation data, loading it if necessary.
        On load failure, falls back to dummy data so the app never returns empty.
        """
        global _cached_data

        if _cached_data is None:
            try:
                _cached_data = DataLoader.load_observations()
            except Exception as e:
                print(f"DataLoader: load_observations failed ({e}), using dummy data")
                _cached_data = DataLoader._dummy_gdf()
            if _cached_data is None or len(_cached_data) == 0:
                print("DataLoader: cache empty, using dummy data")
                _cached_data = DataLoader._dummy_gdf()

        return _cached_data

    @staticmethod
    def _dummy_gdf(city: str = "San Diego") -> gpd.GeoDataFrame:
        """Minimal GeoDataFrame for fallback when CSV load fails."""
        obs_dt = pd.to_datetime(["2026-04-26"] * 100)
        data = {
            "id": list(range(1, 101)),
            "species_name": ["Quercus agrifolia"] * 100,
            "common_name": ["Coast Live Oak"] * 100,
            "taxon_group": ["Plants"] * 50 + ["Birds"] * 50,
            "latitude": [32.7 + i * 0.01 for i in range(100)],
            "longitude": [-117.1 - i * 0.01 for i in range(100)],
            "observed_on": obs_dt.astype("str").tolist(),
            "_observed_on_dt": obs_dt,
            "time_of_day": ["morning"] * 100,
            "user_id": ["user_1"] * 100,
            "quality_grade": ["research"] * 100,
            "city": [city] * 100,
            "during_competition": [1] * 100,
        }
        df = pd.DataFrame(data)
        return gpd.GeoDataFrame(
            df,
            geometry=gpd.points_from_xy(df["longitude"], df["latitude"]),
            crs="EPSG:4326",
        )

    @staticmethod
    def get_cached_data_filtered(competition_only: Optional[bool] = None) -> gpd.GeoDataFrame:
        """
        Return cached data, optionally filtered by during_competition.
        competition_only=True -> only rows where during_competition == 1
        competition_only=False -> only rows where during_competition == 0
        competition_only=None -> all rows
        """
        gdf = DataLoader.get_cached_data()
        if competition_only is None:
            return gdf
        if "during_competition" not in gdf.columns:
            return gdf
        value = 1 if competition_only else 0
        return gdf[gdf["during_competition"] == value].copy()

    @staticmethod
    def load_data():
        """Initialize data cache on application startup"""
        global _cached_data
        _cached_data = DataLoader.load_observations()
        print(f"Loaded {len(_cached_data)} observations into cache")
