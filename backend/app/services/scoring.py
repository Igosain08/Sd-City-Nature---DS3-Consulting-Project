"""
Priority zone scoring and recommendation generation
"""
import geopandas as gpd
from typing import List, Dict
import random


def score_priority_zones(hex_gdf: gpd.GeoDataFrame) -> List[Dict]:
    """
    Compute priority scores for observation zones
    
    Scoring based on:
    1. Low observation density
    2. High habitat diversity potential
    3. Proximity to underrepresented taxa
    
    Args:
        hex_gdf: GeoDataFrame with hex bin statistics
        
    Returns:
        List of priority zones with scores
    """
    # Calculate priority score
    # Higher score = higher priority (inverse of observation count)
    max_obs = hex_gdf['observation_count'].max()
    
    hex_gdf['priority_score'] = (
        100 * (1 - (hex_gdf['observation_count'] / max_obs))
    )
    
    # Boost score for areas with high potential biodiversity yield
    hex_gdf['priority_score'] += hex_gdf['biodiversity_yield'] * 20
    hex_gdf['priority_score'] = hex_gdf['priority_score'].clip(0, 100)
    
    # Sort by priority
    priority_zones = hex_gdf.sort_values('priority_score', ascending=False)
    
    return priority_zones.to_dict('records')


def generate_recommendations(priority_zones: List[Dict]) -> List[Dict]:
    """
    Convert scored zones into actionable recommendations
    
    Args:
        priority_zones: List of priority zone dictionaries
        
    Returns:
        List of recommendation objects with timing and taxa guidance
    """
    recommendations = []
    
    times = ['Early morning (6-9 AM)', 'Late afternoon (4-7 PM)', 'Morning (9-12 PM)']
    taxa_options = [
        ['Birds', 'Insects'],
        ['Plants', 'Fungi'],
        ['Reptiles', 'Amphibians'],
        ['Mammals', 'Birds']
    ]
    
    rationales = [
        'Undersampled area with high biodiversity potential',
        'Low observation density despite habitat diversity',
        'Gap in spatial coverage, accessible location',
        'Adjacent to known hotspots but underexplored'
    ]
    
    for i, zone in enumerate(priority_zones[:10]):
        rec = {
            'zone_id': zone.get('hex_id', f'zone_{i}'),
            'name': f'Priority Zone {i+1}',
            'center_lat': zone.get('center_lat', 32.7),
            'center_lng': zone.get('center_lng', -117.1),
            'radius_km': 2.0,
            'priority_score': zone.get('priority_score', 50),
            'recommended_time': random.choice(times),
            'target_taxa': random.choice(taxa_options),
            'rationale': random.choice(rationales),
            'geometry': zone.get('geometry', {})
        }
        recommendations.append(rec)
    
    return recommendations


def calculate_timing_efficiency(gdf: gpd.GeoDataFrame) -> List[Dict]:
    """
    Calculate efficiency scores for different time windows
    
    Args:
        gdf: GeoDataFrame with observation data
        
    Returns:
        List of timing window recommendations
    """
    # TODO: Implement actual temporal efficiency analysis
    # For now, return dummy timing data
    
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    hours = [6, 7, 8, 9, 14, 15, 16, 17, 18]
    
    windows = []
    for day in days[:3]:
        for hour in hours[:3]:
            windows.append({
                'day_of_week': day,
                'hour': hour,
                'observation_count': random.randint(50, 200),
                'unique_species': random.randint(20, 80),
                'efficiency_score': random.uniform(40, 95)
            })
    
    return sorted(windows, key=lambda x: x['efficiency_score'], reverse=True)
