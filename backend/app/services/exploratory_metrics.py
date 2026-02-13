"""
Exploratory dashboard metrics for Page 1 (EDA summary, quality, captive, community, hour, Pareto, top species, upload delay, research by taxon).
"""
import geopandas as gpd
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional


def _safe(col: str, gdf: gpd.GeoDataFrame, default=None):
    return gdf[col] if col in gdf.columns else default


def get_kpis(gdf: gpd.GeoDataFrame) -> Dict[str, Any]:
    """KPI strip: total observations, unique species, unique observers, date range, research-grade %."""
    n_obs = len(gdf)
    n_species = gdf["species_name"].nunique() if "species_name" in gdf.columns else 0
    n_observers = gdf["user_id"].nunique() if "user_id" in gdf.columns else 0

    date_min = date_max = None
    if "_observed_on_dt" in gdf.columns:
        valid = gdf["_observed_on_dt"].dropna()
        if len(valid):
            date_min = valid.min().strftime("%Y-%m-%d")
            date_max = valid.max().strftime("%Y-%m-%d")
    if date_min is None and "observed_on" in gdf.columns:
        dates = pd.to_datetime(gdf["observed_on"], errors="coerce").dropna()
        if len(dates):
            date_min = dates.min().strftime("%Y-%m-%d")
            date_max = dates.max().strftime("%Y-%m-%d")

    research_pct = None
    if "quality_grade" in gdf.columns and n_obs:
        research_count = (gdf["quality_grade"] == "research").sum()
        research_pct = round(100 * research_count / n_obs, 1)

    return {
        "total_observations": int(n_obs),
        "unique_species": int(n_species),
        "unique_observers": int(n_observers),
        "date_range_start": date_min,
        "date_range_end": date_max,
        "research_grade_pct": research_pct,
    }


def get_quality_grade_breakdown(gdf: gpd.GeoDataFrame) -> List[Dict[str, Any]]:
    """Quality grade: research / needs_id / casual (counts and %)."""
    if "quality_grade" not in gdf.columns:
        return []
    s = gdf["quality_grade"].fillna("unknown").astype(str).str.lower()
    counts = s.value_counts()
    total = counts.sum()
    return [
        {"grade": k, "count": int(v), "pct": round(100 * v / total, 1) if total else 0}
        for k, v in counts.items()
    ]


def get_captive_wild(gdf: gpd.GeoDataFrame) -> Optional[Dict[str, Any]]:
    """Captive vs wild: share of observations that are captive/cultivated vs wild."""
    col = "captive_cultivated"
    if col not in gdf.columns:
        return None
    gdf = gdf.copy()
    # handle bool or string
    captive = gdf[col].fillna(False)
    if captive.dtype == object or captive.dtype.name == "string":
        captive = captive.astype(str).str.lower().isin(("true", "1", "yes", "c"))
    n_captive = int(captive.sum())
    n_total = len(gdf)
    n_wild = n_total - n_captive
    return {
        "captive_count": n_captive,
        "wild_count": n_wild,
        "captive_pct": round(100 * n_captive / n_total, 1) if n_total else 0,
        "wild_pct": round(100 * n_wild / n_total, 1) if n_total else 0,
    }


def get_by_community(gdf: gpd.GeoDataFrame) -> List[Dict[str, Any]]:
    """Observations by region/community (e.g. San Diego, Vista, Oceanside)."""
    col = "city" if "city" in gdf.columns else "community"
    if col not in gdf.columns:
        return []
    gdf = gdf.copy()
    gdf[col] = gdf[col].fillna("Unknown").astype(str).replace("", "Unknown")
    counts = gdf.groupby(col).agg({"id": "count"}).reset_index()
    counts.columns = ["community", "count"]
    counts["count"] = counts["count"].astype(int)
    return counts.sort_values("count", ascending=False).to_dict("records")


def get_by_hour(gdf: gpd.GeoDataFrame) -> List[Dict[str, Any]]:
    """Observations by hour of day (0–23). Uses _observed_on_dt (observation time from time_observed_at when available), not upload time."""
    out = []
    if "_observed_on_dt" in gdf.columns:
        gdf = gdf.dropna(subset=["_observed_on_dt"])
        if len(gdf):
            hours = gdf["_observed_on_dt"].dt.hour
            by_hour = hours.value_counts().sort_index()
            for h in range(24):
                out.append({"hour": h, "count": int(by_hour.get(h, 0))})
            return out
    # Fallback: time_of_day -> approximate hour
    time_map = {"morning": 9, "afternoon": 14, "evening": 18, "night": 21}
    if "time_of_day" in gdf.columns:
        gdf = gdf.copy()
        gdf["_hour"] = gdf["time_of_day"].map(lambda x: time_map.get(str(x).lower(), 12))
        by_hour = gdf.groupby("_hour").size()
        for h in range(24):
            out.append({"hour": h, "count": int(by_hour.get(h, 0))})
        return out
    for h in range(24):
        out.append({"hour": h, "count": 0})
    return out


def get_hourly_by_dow(gdf: gpd.GeoDataFrame) -> List[Dict[str, Any]]:
    """
    Observations by (day_of_week, hour) for small multiples. Uses _observed_on_dt (observation time,
    from time_observed_at when available in the dataset), not upload/create time.
    day_of_week: 0=Monday, 6=Sunday. Returns list of { day_of_week, day_name, hour, count }.
    """
    if "_observed_on_dt" not in gdf.columns:
        return []
    gdf = gdf.dropna(subset=["_observed_on_dt"])
    if len(gdf) == 0:
        return []
    gdf = gdf.copy()
    gdf["_dow"] = gdf["_observed_on_dt"].dt.dayofweek
    gdf["_hour"] = gdf["_observed_on_dt"].dt.hour
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    agg = gdf.groupby(["_dow", "_hour"]).size().reset_index(name="count")
    out = []
    for _, row in agg.iterrows():
        out.append({
            "day_of_week": int(row["_dow"]),
            "day_name": day_names[int(row["_dow"])],
            "hour": int(row["_hour"]),
            "count": int(row["count"]),
        })
    return out


def get_user_contribution_with_pareto(gdf: gpd.GeoDataFrame) -> Dict[str, Any]:
    """
    User contribution: buckets 1, 2–5, 6–20, 21–100, 100+ (First-timers / Returning / Power);
    Pareto curve; mean/median/mode; research-grade rate by segment.
    """
    if "user_id" not in gdf.columns:
        return _empty_user_contribution()
    per_user = gdf.groupby("user_id").agg({"id": "count"}).reset_index()
    per_user.columns = ["user_id", "obs_count"]
    total_obs = per_user["obs_count"].sum()
    n_users = len(per_user)
    if total_obs == 0:
        return _empty_user_contribution()

    bins = [0, 1, 5, 20, 100, float("inf")]
    labels = ["1", "2–5", "6–20", "21–100", "100+"]
    segment_names = ["First-timers", "Returning", "Regular", "Power", "Super"]
    per_user["bucket"] = pd.cut(per_user["obs_count"], bins=bins, labels=labels, right=True)
    bucket_counts = per_user.groupby("bucket", observed=True).agg({"user_id": "count", "obs_count": "sum"}).reset_index()
    bucket_counts["bucket_label"] = bucket_counts["bucket"].astype(str)
    bucket_counts["user_count"] = bucket_counts["user_id"].astype(int)
    bucket_counts["total_obs"] = bucket_counts["obs_count"].astype(int)
    buckets = bucket_counts[["bucket_label", "user_count", "total_obs"]].to_dict("records")

    # Mean, median, mode (mode = most frequent obs_count value, or bucket with most users)
    mean_obs = float(per_user["obs_count"].mean())
    median_obs = float(per_user["obs_count"].median())
    mode_obs = int(per_user["obs_count"].mode().iloc[0]) if len(per_user["obs_count"].mode()) else None
    mode_bucket = bucket_counts.loc[bucket_counts["user_count"].idxmax(), "bucket_label"] if len(bucket_counts) else None

    # Research-grade rate by segment
    if "quality_grade" in gdf.columns:
        gdf = gdf.copy()
        gdf["_is_research"] = (gdf["quality_grade"].astype(str).str.lower() == "research").astype(int)
        per_user_r = gdf.groupby("user_id").agg({"id": "count", "_is_research": "sum"}).reset_index()
        per_user_r.columns = ["user_id", "obs_count", "research_count"]
        per_user_r["bucket"] = pd.cut(per_user_r["obs_count"], bins=bins, labels=labels, right=True)
        seg = per_user_r.groupby("bucket", observed=True).agg({"obs_count": "sum", "research_count": "sum"}).reset_index()
        seg["bucket_label"] = seg["bucket"].astype(str)
        seg["research_pct"] = (100 * seg["research_count"] / seg["obs_count"]).round(1).fillna(0)
        research_by_segment = [{"bucket_label": r["bucket_label"], "research_pct": float(r["research_pct"])} for _, r in seg.iterrows()]
    else:
        research_by_segment = []

    # Pareto curve: cumulative % users (sorted desc by obs) -> cumulative % observations
    per_user_sorted = per_user.sort_values("obs_count", ascending=False).reset_index(drop=True)
    per_user_sorted["cum_obs"] = per_user_sorted["obs_count"].cumsum()
    per_user_sorted["cum_obs_pct"] = 100 * per_user_sorted["cum_obs"] / total_obs
    per_user_sorted["cum_user_pct"] = 100 * (np.arange(1, len(per_user_sorted) + 1) / n_users)
    # Sample curve at ~20 points to keep payload small
    step = max(1, len(per_user_sorted) // 20)
    curve = per_user_sorted.iloc[::step][["cum_user_pct", "cum_obs_pct"]].rename(
        columns={"cum_user_pct": "user_pct", "cum_obs_pct": "obs_pct"}
    )
    pareto_curve = [{"user_pct": round(float(r["user_pct"]), 1), "obs_pct": round(float(r["obs_pct"]), 1)} for _, r in curve.iterrows()]
    if len(pareto_curve) and pareto_curve[-1]["user_pct"] < 100:
        pareto_curve.append({"user_pct": 100.0, "obs_pct": 100.0})

    # Pareto summary: top X% contribute 80%
    threshold = 0.8 * total_obs
    mask = per_user_sorted["cum_obs"] >= threshold
    top_n_users = (mask.idxmax() + 1) if mask.any() else n_users
    pct = round(100 * top_n_users / n_users, 1) if n_users else 0
    pareto_label = f"Top {pct}% of users contribute 80% of observations."

    # Add segment_name to each bucket for frontend
    label_to_name = dict(zip(labels, segment_names))
    for b in buckets:
        b["segment_name"] = label_to_name.get(b["bucket_label"], b["bucket_label"])

    return {
        "buckets": buckets,
        "pareto_pct": pct,
        "pareto_label": pareto_label,
        "mean_obs_per_user": round(mean_obs, 1),
        "median_obs_per_user": round(median_obs, 1),
        "mode_obs_per_user": mode_obs,
        "mode_bucket": mode_bucket,
        "pareto_curve": pareto_curve,
        "research_rate_by_segment": research_by_segment,
    }


def _empty_user_contribution() -> Dict[str, Any]:
    return {
        "buckets": [],
        "pareto_pct": None,
        "pareto_label": None,
        "mean_obs_per_user": None,
        "median_obs_per_user": None,
        "mode_obs_per_user": None,
        "mode_bucket": None,
        "pareto_curve": [],
        "research_rate_by_segment": [],
    }


def get_user_retention(gdf: gpd.GeoDataFrame) -> Optional[Dict[str, Any]]:
    """
    User retention: of users who observed in 2024, how many also observed in 2025?
    Requires _observed_on_dt or observed_on with year.
    """
    if "_observed_on_dt" not in gdf.columns and "observed_on" not in gdf.columns:
        return None
    gdf = gdf.copy()
    if "_observed_on_dt" in gdf.columns:
        dt = pd.to_datetime(gdf["_observed_on_dt"], errors="coerce")
    else:
        dt = pd.to_datetime(gdf["observed_on"], errors="coerce")
    gdf = gdf.dropna(subset=["user_id"])
    gdf["_year"] = dt.dt.year
    gdf = gdf[gdf["_year"].isin([2024, 2025])]
    if len(gdf) == 0:
        return None
    users_2024 = set(gdf[gdf["_year"] == 2024]["user_id"].unique())
    users_2025 = set(gdf[gdf["_year"] == 2025]["user_id"].unique())
    users_both = users_2024 & users_2025
    n_2024 = len(users_2024)
    n_2025 = len(users_2025)
    n_both = len(users_both)
    retention_pct = round(100 * n_both / n_2024, 1) if n_2024 else None
    return {
        "users_2024": n_2024,
        "users_2025": n_2025,
        "users_both": n_both,
        "users_2024_only": n_2024 - n_both,
        "retention_pct": retention_pct,
    }


def get_top_species(gdf: gpd.GeoDataFrame, n: int = 20) -> List[Dict[str, Any]]:
    """Top N species by observation count (common or scientific name)."""
    name_col = "common_name" if "common_name" in gdf.columns else "species_name"
    if name_col not in gdf.columns:
        return []
    gdf = gdf.copy()
    gdf[name_col] = gdf[name_col].fillna("").astype(str)
    # Prefer non-empty common_name, fallback to species_name
    if "common_name" in gdf.columns and "species_name" in gdf.columns:
        gdf["_display_name"] = gdf["common_name"].replace("", pd.NA).fillna(gdf["species_name"])
    else:
        gdf["_display_name"] = gdf[name_col]
    counts = gdf["_display_name"].value_counts().head(n)
    return [{"species": str(k), "count": int(v)} for k, v in counts.items()]


def get_upload_delay(gdf: gpd.GeoDataFrame) -> Optional[Dict[str, Any]]:
    """Upload delay: time from observation to upload (hours). Same-day %, median hours."""
    if "_observed_on_dt" not in gdf.columns or "_created_at_dt" not in gdf.columns:
        return None
    gdf = gdf.copy()
    gdf = gdf.dropna(subset=["_observed_on_dt", "_created_at_dt"])
    if len(gdf) == 0:
        return None
    # Normalize to date for same-day; for delay use (created - observed) in hours
    obs_dt = pd.to_datetime(gdf["_observed_on_dt"])
    created_dt = pd.to_datetime(gdf["_created_at_dt"])
    obs_date = obs_dt.dt.normalize()
    created_date = created_dt.dt.normalize()
    same_day = (obs_date == created_date).sum()
    n = len(gdf)
    same_day_pct = round(100 * same_day / n, 1) if n else 0
    delay_hours = (created_dt - obs_dt).dt.total_seconds() / 3600
    median_hours = float(delay_hours.median())
    # Histogram: 0-1h, 1-6h, 6-24h, 1-3d, 3d+
    bins = [0, 1, 6, 24, 72, float("inf")]
    labels = ["0–1 h", "1–6 h", "6–24 h", "1–3 d", "3+ d"]
    delay_hours_clipped = delay_hours.clip(lower=0)
    delay_buckets = pd.cut(delay_hours_clipped, bins=bins, labels=labels, right=False)
    hist = delay_buckets.value_counts().sort_index()
    histogram = [{"bucket": str(k), "count": int(hist.get(k, 0))} for k in labels]
    return {
        "same_day_pct": same_day_pct,
        "median_hours": round(median_hours, 1),
        "histogram": histogram,
    }


def get_research_rate_by_taxon(gdf: gpd.GeoDataFrame) -> List[Dict[str, Any]]:
    """Research-grade rate by iconic taxon (%)."""
    if "taxon_group" not in gdf.columns or "quality_grade" not in gdf.columns:
        return []
    gdf = gdf.copy()
    gdf["taxon_group"] = gdf["taxon_group"].fillna("Unknown").astype(str).replace("", "Unknown")
    gdf["is_research"] = (gdf["quality_grade"] == "research").astype(int)
    agg = gdf.groupby("taxon_group").agg({"id": "count", "is_research": "sum"}).reset_index()
    agg.columns = ["taxon_group", "total", "research_count"]
    agg["research_pct"] = (100 * agg["research_count"] / agg["total"]).round(1)
    return [
        {"taxon_group": str(r["taxon_group"]), "total": int(r["total"]), "research_pct": float(r["research_pct"])}
        for _, r in agg.iterrows()
    ]


def _safe_float(x) -> float:
    try:
        return float(x) if x is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def _safe_kpis(gdf: Optional[gpd.GeoDataFrame]) -> Dict[str, Any]:
    """KPIs with type coercion; never raises."""
    try:
        if gdf is None or (hasattr(gdf, "__len__") and len(gdf) == 0):
            return {
                "total_observations": 0,
                "unique_species": 0,
                "unique_observers": 0,
                "date_range_start": None,
                "date_range_end": None,
                "research_grade_pct": None,
            }
        k = get_kpis(gdf)
        return {
            "total_observations": int(k.get("total_observations", 0)),
            "unique_species": int(k.get("unique_species", 0)),
            "unique_observers": int(k.get("unique_observers", 0)),
            "date_range_start": k.get("date_range_start"),
            "date_range_end": k.get("date_range_end"),
            "research_grade_pct": _safe_float(k.get("research_grade_pct")) if k.get("research_grade_pct") is not None else None,
        }
    except Exception:
        return {
            "total_observations": 0,
            "unique_species": 0,
            "unique_observers": 0,
            "date_range_start": None,
            "date_range_end": None,
            "research_grade_pct": None,
        }


def get_dashboard(gdf: gpd.GeoDataFrame, taxonomy_summary_fn=None, temporal_trends_fn=None) -> Dict[str, Any]:
    """Single dashboard payload for Page 1. Each section is defensive; never raises."""
    out = {
        "kpis": _safe_kpis(gdf),
        "quality_grade": [],
        "captive_wild": None,
        "by_community": [],
        "by_hour": [{"hour": h, "count": 0} for h in range(24)],
        "hourly_by_dow": [],
        "user_contribution": {"buckets": [], "pareto_pct": None, "pareto_label": None, "mean_obs_per_user": None, "median_obs_per_user": None, "mode_obs_per_user": None, "mode_bucket": None, "pareto_curve": [], "research_rate_by_segment": []},
        "user_retention": None,
        "top_species": [],
        "upload_delay": None,
        "research_rate_by_taxon": [],
        "taxonomy_summary": [],
        "temporal_trends": [],
    }
    if gdf is None or len(gdf) == 0:
        return out

    if callable(taxonomy_summary_fn):
        try:
            out["taxonomy_summary"] = taxonomy_summary_fn(gdf)
        except Exception:
            pass
    if callable(temporal_trends_fn):
        try:
            out["temporal_trends"] = temporal_trends_fn(gdf)
        except Exception:
            pass

    try:
        q = get_quality_grade_breakdown(gdf)
        out["quality_grade"] = [{"grade": str(x["grade"]), "count": int(x["count"]), "pct": _safe_float(x.get("pct", 0))} for x in q]
    except Exception:
        pass

    try:
        out["captive_wild"] = get_captive_wild(gdf)
    except Exception:
        pass

    try:
        bc = get_by_community(gdf)
        out["by_community"] = [{"community": str(b["community"]), "count": int(b["count"])} for b in bc]
    except Exception:
        pass

    try:
        bh = get_by_hour(gdf)
        out["by_hour"] = [{"hour": int(h["hour"]), "count": int(h["count"])} for h in bh]
    except Exception:
        pass

    try:
        hbd = get_hourly_by_dow(gdf)
        out["hourly_by_dow"] = [
            {"day_of_week": int(x["day_of_week"]), "day_name": str(x["day_name"]), "hour": int(x["hour"]), "count": int(x["count"])}
            for x in hbd
        ]
    except Exception:
        pass

    try:
        uc = get_user_contribution_with_pareto(gdf)
        buckets_out = []
        for b in uc.get("buckets", []):
            buckets_out.append({
                "bucket_label": str(b["bucket_label"]),
                "user_count": int(b["user_count"]),
                "total_obs": int(b.get("total_obs", 0)),
                "segment_name": str(b.get("segment_name", b["bucket_label"])),
            })
        out["user_contribution"] = {
            "buckets": buckets_out,
            "pareto_pct": _safe_float(uc["pareto_pct"]) if uc.get("pareto_pct") is not None else None,
            "pareto_label": uc.get("pareto_label"),
            "mean_obs_per_user": _safe_float(uc.get("mean_obs_per_user")),
            "median_obs_per_user": _safe_float(uc.get("median_obs_per_user")),
            "mode_obs_per_user": int(uc["mode_obs_per_user"]) if uc.get("mode_obs_per_user") is not None else None,
            "mode_bucket": uc.get("mode_bucket"),
            "pareto_curve": [{"user_pct": float(p["user_pct"]), "obs_pct": float(p["obs_pct"])} for p in uc.get("pareto_curve", [])],
            "research_rate_by_segment": [{"bucket_label": str(r["bucket_label"]), "research_pct": _safe_float(r.get("research_pct", 0))} for r in uc.get("research_rate_by_segment", [])],
        }
    except Exception:
        pass

    try:
        ret = get_user_retention(gdf)
        if ret is not None:
            out["user_retention"] = {
                "users_2024": int(ret["users_2024"]),
                "users_2025": int(ret["users_2025"]),
                "users_both": int(ret["users_both"]),
                "users_2024_only": int(ret["users_2024_only"]),
                "retention_pct": _safe_float(ret["retention_pct"]),
            }
    except Exception:
        pass

    try:
        ts = get_top_species(gdf, 20)
        out["top_species"] = [{"species": str(s["species"]), "count": int(s["count"])} for s in ts]
    except Exception:
        pass

    try:
        ud = get_upload_delay(gdf)
        if ud is not None:
            out["upload_delay"] = {
                "same_day_pct": _safe_float(ud["same_day_pct"]),
                "median_hours": _safe_float(ud["median_hours"]),
                "histogram": [{"bucket": str(h["bucket"]), "count": int(h["count"])} for h in ud.get("histogram", [])],
            }
    except Exception:
        pass

    try:
        rr = get_research_rate_by_taxon(gdf)
        out["research_rate_by_taxon"] = [{"taxon_group": str(r["taxon_group"]), "total": int(r["total"]), "research_pct": _safe_float(r.get("research_pct", 0))} for r in rr]
    except Exception:
        pass

    return out
