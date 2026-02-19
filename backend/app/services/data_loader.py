"""
Data loading and caching utilities
"""
import pandas as pd
import geopandas as gpd
from typing import Optional
from pathlib import Path
import os
from functools import lru_cache

# Module-level cache
_cached_data: Optional[gpd.GeoDataFrame] = None
_cached_county_boundary: Optional[gpd.GeoDataFrame] = None


class DataLoader:
    """Handles loading and caching of iNaturalist observation data"""
    
    @staticmethod
    def load_observations(city: str = "San Diego") -> gpd.GeoDataFrame:
        """
        Load iNaturalist observations from CSV and convert to GeoDataFrame
        
        Args:
            city: City name ("San Diego", "San Antonio", "Los Angeles")
            
        Returns:
            GeoDataFrame with observation data
        """
        df = pd.read_csv("data/cleaned_finalized_dataset_final.csv.zip")
        gdf = gpd.GeoDataFrame(
            df,
            geometry=gpd.points_from_xy(df.longitude, df.latitude),
            crs="EPSG:4326"
        )
        
        return gdf
    
    @staticmethod
    def get_cached_data() -> gpd.GeoDataFrame:
        """
        Returns cached observation data, loading it if necessary
        
        Returns:
            Cached GeoDataFrame
        """
        global _cached_data
        
        if _cached_data is None:
            _cached_data = DataLoader.load_observations()
        
        return _cached_data
    
    
    @staticmethod
    def load_data():
        """Initialize data cache on application startup"""
        global _cached_data
        _cached_data = DataLoader.load_observations()
        print(f"Loaded {len(_cached_data)} observations into cache")
        
    

    # app/services/data_loader.py

# app/services/data_loader.py

   