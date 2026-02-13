"""
Exploratory Analysis API Router
"""
import logging
import time
import pandas as pd
from fastapi import APIRouter, Query
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

# In-memory cache for dashboard keyed by competition_only (None, True, False)
_dashboard_cache: Dict[str, Any] = {}
_dashboard_cache_time: Dict[str, float] = {}
DASHBOARD_CACHE_TTL_SEC = 60


def _cache_key(competition_only: Optional[bool]) -> str:
    return "all" if competition_only is None else ("competition" if competition_only else "non_competition")

from app.models.schemas import (
    ObservationResponse,
    SpeciesSummaryResponse,
    TemporalTrendResponse,
    UserContributionBucketResponse,
    ExploratoryDashboardResponse,
)
from app.services.data_loader import DataLoader
from app.services.taxonomy import (
    summarize_by_taxon,
    get_temporal_trends as taxonomy_temporal_trends,
    get_user_contribution_buckets,
)
from app.services.exploratory_metrics import get_dashboard

router = APIRouter(prefix="/exploratory", tags=["exploratory"])


def _row_to_observation(row) -> dict:
    """Map a GeoDataFrame row to ObservationResponse fields."""
    obs_on = row.get("observed_on")
    if hasattr(obs_on, "strftime"):
        obs_on = obs_on.strftime("%Y-%m-%d") if obs_on else ""
    return {
        "id": int(row["id"]),
        "species_name": str(row.get("species_name", "")),
        "common_name": str(row.get("common_name", "")),
        "taxon_group": str(row.get("taxon_group", "")),
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "observed_on": str(obs_on) if obs_on else "",
        "time_of_day": str(row.get("time_of_day", "unknown")),
        "user_id": str(row["user_id"]),
        "quality_grade": str(row.get("quality_grade", "")),
        "city": str(row.get("city", "")),
    }


def _get_gdf(competition_only: Optional[bool] = None):
    return DataLoader.get_cached_data_filtered(competition_only)


def _row_to_observation_with_tier(row, user_obs_count: Optional[dict] = None) -> dict:
    """Map row to observation dict; add contributor_tier if user_obs_count provided."""
    out = _row_to_observation(row)
    if user_obs_count is not None and "user_id" in row:
        uid = str(row["user_id"])
        n = user_obs_count.get(uid, 0)
        if n <= 1:
            out["contributor_tier"] = "1"
        elif n <= 5:
            out["contributor_tier"] = "2-5"
        elif n <= 20:
            out["contributor_tier"] = "6-20"
        else:
            out["contributor_tier"] = "21+"
    else:
        out["contributor_tier"] = None
    return out


@router.get("/observations", response_model=List[ObservationResponse])
async def get_observations(
    limit: int = Query(50_000, ge=1, le=500_000, description="Max observations to return (clustering used for map performance)"),
    competition_only: Optional[bool] = Query(None, description="True=competition only, False=non-competition only, omit=all"),
    research_grade_only: bool = Query(False, description="If true, only research-grade observations"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
):
    """
    Get observations for scatter map. Filter by competition, grade, and date range.
    Returns contributor_tier per observation for map color-by experience level.
    """
    try:
        gdf = _get_gdf(competition_only)
        if research_grade_only and "quality_grade" in gdf.columns:
            gdf = gdf[gdf["quality_grade"] == "research"]
        if date_from or date_to:
            obs_dt = gdf["_observed_on_dt"] if "_observed_on_dt" in gdf.columns else pd.to_datetime(gdf["observed_on"], errors="coerce")
            gdf = gdf.copy()
            gdf["_odt"] = obs_dt
            gdf = gdf.dropna(subset=["_odt"])
            if date_from:
                from_dt = pd.to_datetime(date_from, errors="coerce")
                if from_dt is not pd.NaT:
                    gdf = gdf[gdf["_odt"] >= from_dt]
            if date_to:
                to_dt = pd.to_datetime(date_to, errors="coerce")
                if to_dt is not pd.NaT:
                    gdf = gdf[gdf["_odt"] <= to_dt]
        gdf = gdf.head(limit)
        per_user = gdf.groupby("user_id").size().to_dict() if "user_id" in gdf.columns else None
        return [_row_to_observation_with_tier(row, per_user) for _, row in gdf.iterrows()]
    except Exception as e:
        logger.exception("get_observations failed: %s", e)
        return []


@router.get("/taxonomy-summary", response_model=List[SpeciesSummaryResponse])
async def get_taxonomy_summary(
    competition_only: Optional[bool] = Query(None, description="True=competition only, False=non-competition only"),
):
    try:
        gdf = _get_gdf(competition_only)
        return summarize_by_taxon(gdf)
    except Exception as e:
        logger.exception("get_taxonomy_summary failed: %s", e)
        return []


@router.get("/temporal-trends", response_model=List[TemporalTrendResponse])
async def get_temporal_trends(
    competition_only: Optional[bool] = Query(None, description="True=competition only, False=non-competition only"),
):
    try:
        gdf = _get_gdf(competition_only)
        return taxonomy_temporal_trends(gdf)
    except Exception as e:
        logger.exception("get_temporal_trends failed: %s", e)
        return []


@router.get("/user-contribution", response_model=List[UserContributionBucketResponse])
async def get_user_contribution(
    competition_only: Optional[bool] = Query(None, description="True=competition only, False=non-competition only"),
):
    try:
        gdf = _get_gdf(competition_only)
        return get_user_contribution_buckets(gdf)
    except Exception as e:
        logger.exception("get_user_contribution failed: %s", e)
        return []


def _minimal_dashboard():
    """Fallback dashboard when get_dashboard fails (e.g. missing columns)."""
    return {
        "kpis": {
            "total_observations": 0,
            "unique_species": 0,
            "unique_observers": 0,
            "date_range_start": None,
            "date_range_end": None,
            "research_grade_pct": None,
        },
        "quality_grade": [],
        "captive_wild": None,
        "by_community": [],
        "by_hour": [{"hour": h, "count": 0} for h in range(24)],
        "user_contribution": {"buckets": [], "pareto_pct": None, "pareto_label": None, "mean_obs_per_user": None, "median_obs_per_user": None, "mode_obs_per_user": None, "mode_bucket": None, "pareto_curve": [], "research_rate_by_segment": []},
        "user_retention": None,
        "top_species": [],
        "upload_delay": None,
        "research_rate_by_taxon": [],
        "taxonomy_summary": [],
        "temporal_trends": [],
        "hourly_by_dow": [],
    }


@router.get("/dashboard", response_model=ExploratoryDashboardResponse)
async def get_exploratory_dashboard(
    competition_only: Optional[bool] = Query(None, description="True=competition only, False=non-competition only, omit=all"),
):
    """
    Full EDA dashboard for Page 1. Filter by competition window; cached per filter for 60s.
    """
    global _dashboard_cache, _dashboard_cache_time
    key = _cache_key(competition_only)
    now = time.time()
    if key in _dashboard_cache and (now - _dashboard_cache_time.get(key, 0)) < DASHBOARD_CACHE_TTL_SEC:
        return _dashboard_cache[key]
    try:
        gdf = _get_gdf(competition_only)
        result = get_dashboard(
            gdf,
            taxonomy_summary_fn=summarize_by_taxon,
            temporal_trends_fn=taxonomy_temporal_trends,
        )
        _dashboard_cache[key] = result
        _dashboard_cache_time[key] = now
        return result
    except Exception as e:
        logger.exception("Exploratory dashboard failed: %s", e)
        return _minimal_dashboard()
