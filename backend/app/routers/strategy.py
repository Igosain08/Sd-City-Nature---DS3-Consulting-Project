"""
Strategy Recommendations API Router
"""
from fastapi import APIRouter
from typing import List
from app.models.schemas import PriorityZonesBundle, TimingWindowResponse
from app.services.data_loader import DataLoader
from app.services.spatial import generate_county_hex_grid, hex_bin_observations, build_fill_boundary
from app.services.scoring import calculate_timing_efficiency, calculate_priority_score, generate_recommendations
from app.config import HEX_RESOLUTION
import geopandas as gpd
from pathlib import Path



router = APIRouter(prefix="/strategy", tags=["strategy"])

BACKEND_DIR = Path(__file__).resolve().parents[2]   # routers -> app -> backend
SD_PATH = BACKEND_DIR / "data" / "San_Diego_County_Boundary_(GIS)_20260216.geojson"

if not SD_PATH.exists():
    raise FileNotFoundError(f"Boundary geojson not found: {SD_PATH}")

sd_boundary = gpd.read_file(SD_PATH, engine="pyogrio")

SD_COASTAL = BACKEND_DIR / "data" / "coastal_zones.geojson"

sd_coastal = gpd.read_file(SD_COASTAL, engine="pyogrio")

@router.get("/priority-zones", response_model=PriorityZonesBundle)
async def get_priority_zones():
    """
    Get priority zones for targeted observation efforts across full San Diego County
    Returns ALL hexes with priority scores (including zero-observation areas)
    """
    # Load observations
    gdf = DataLoader.get_cached_data()

    fill_boundary = build_fill_boundary(sd_boundary, sd_coastal)

    fill_boundary = sd_boundary.to_crs("EPSG:26911").copy()
    fill_boundary["geometry"] = fill_boundary.buffer(10000)
    fill_boundary = fill_boundary.to_crs(sd_boundary.crs)
    
    
    hex_stats = hex_bin_observations(
    gdf=gdf,
    county_boundary=fill_boundary,
    resolution=7,
    min_non_cnc=30,
    use_existing_cnc_flag=True,  # you already have during_competition
    )

    hex_scored = calculate_priority_score(hex_stats)

    hexs_finalized = generate_recommendations(hex_scored, gdf, top_n=len(hex_scored))

    top10 = hexs_finalized

    return {"hexes": hexs_finalized, "top": top10}

@router.get("/timing-windows", response_model=List[TimingWindowResponse])
async def get_timing_windows():
    """
    Get optimal timing windows for top priority zones with sufficient data
    """
    # Load observations
    gdf = DataLoader.get_cached_data()
    
   
    return [
        {
            "day_of_week": "Saturday",
            "hour": 9,
            "observation_count": 420,
            "unique_species": 185,
            "efficiency_score": 78.4,
        }
    ]
    
    


