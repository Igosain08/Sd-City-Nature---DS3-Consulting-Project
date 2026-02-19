"""
Strategy Recommendations API Router
"""
from fastapi import APIRouter
from typing import List
from app.models.schemas import PriorityZoneResponse, TimingWindowResponse
from app.services.data_loader import DataLoader
from app.services.spatial import hex_bin_observations
from app.services.scoring import score_priority_zones, generate_recommendations, calculate_timing_efficiency
from app.config import HEX_RESOLUTION

router = APIRouter(prefix="/strategy", tags=["strategy"])


@router.get("/priority-zones", response_model=List[PriorityZoneResponse])
async def get_priority_zones():
    """
    Get priority zones for targeted observation efforts
    TODO: [Team Member] — Refine scoring algorithm and add habitat classification
    """
    gdf = DataLoader.get_cached_data()
    hex_gdf = hex_bin_observations(gdf, resolution=HEX_RESOLUTION)
    
    priority_zones = score_priority_zones(hex_gdf)
    recommendations = generate_recommendations(priority_zones)
    
    return recommendations


@router.get("/timing-windows", response_model=List[TimingWindowResponse])
async def get_timing_windows():
    """
    Get optimal timing windows for observations
    """
    gdf = DataLoader.get_cached_data()
    timing = calculate_timing_efficiency(gdf)
    
    return timing
