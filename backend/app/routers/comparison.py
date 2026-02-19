"""
City Comparison API Router
"""
from fastapi import APIRouter
from typing import List
from app.models.schemas import CityStatsResponse

router = APIRouter(prefix="/comparison", tags=["comparison"])


@router.get("/city-stats", response_model=List[CityStatsResponse])
async def get_city_stats():
    """
    Get comparative statistics across cities
    TODO: [Team Member] — Load actual multi-city data and calculate real statistics
    """
    # Dummy data for now
    stats = [
        {
            'city': 'San Diego',
            'year': 2025,
            'total_observations': 45230,
            'unique_species': 1842,
            'total_participants': 3421,
            'species_per_observer': 13.22
        },
        {
            'city': 'San Antonio',
            'year': 2025,
            'total_observations': 38104,
            'unique_species': 1567,
            'total_participants': 2893,
            'species_per_observer': 13.17
        },
        {
            'city': 'Los Angeles',
            'year': 2025,
            'total_observations': 67521,
            'unique_species': 2134,
            'total_participants': 5247,
            'species_per_observer': 12.87
        }
    ]
    
    return stats


@router.get("/yearly-trends", response_model=List[CityStatsResponse])
async def get_yearly_trends():
    """
    Get multi-year trends for city comparison
    """
    # Dummy multi-year data
    trends = []
    cities = ['San Diego', 'San Antonio', 'Los Angeles']
    
    for year in [2023, 2024, 2025]:
        for i, city in enumerate(cities):
            trends.append({
                'city': city,
                'year': year,
                'total_observations': 35000 + (year - 2023) * 5000 + i * 10000,
                'unique_species': 1400 + (year - 2023) * 200 + i * 300,
                'total_participants': 2500 + (year - 2023) * 400 + i * 1000,
                'species_per_observer': 13.0 + (i * 0.2)
            })
    
    return trends
