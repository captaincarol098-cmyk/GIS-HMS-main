"""
3-Tier Alert Generation Module
Implementation of NNC OPT Plus Guidelines [50] Early Warning Alert System

Alert Levels:
- Warning (Yellow): Prevalence ≥ 10%
- Critical (Orange): Wasting ≥ 5% OR Any Indicator ≥ 15%
- Emergency (Red): Wasting ≥ 10% OR SAM ≥ 2%
"""

from typing import Dict, List, Any, Literal
from datetime import date, datetime
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Child, Measurement, Barangay, Purok
import json


AlertLevel = Literal["warning", "critical", "emergency", "normal"]


# ============================================================================
# ALERT THRESHOLD CONSTANTS (NNC OPT Plus Guidelines [50])
# Default values - can be overridden by database settings
# ============================================================================

DEFAULT_ALERT_THRESHOLDS = {
    "warning": {
        "any_prevalence": 10.0,  # Any indicator ≥ 10%
        "color": "yellow",
        "emoji": "🟡",
        "action": "Notify BHW, schedule follow-up"
    },
    "critical": {
        "wasting": 5.0,  # Wasting ≥ 5%
        "any_prevalence": 15.0,  # Any indicator ≥ 15%
        "percent_increase": 25.0,  # ≥ 25% increase from baseline
        "color": "orange",
        "emoji": "🟠",
        "action": "Notify Barangay Admin, conduct feeding"
    },
    "emergency": {
        "wasting": 10.0,  # Wasting ≥ 10%
        "sam": 2.0,  # SAM ≥ 2%
        "any_prevalence": 20.0,  # Any indicator ≥ 20%
        "color": "red",
        "emoji": "🔴",
        "action": "Notify CHO, immediate intervention"
    }
}

# Will be populated from database at runtime
ALERT_THRESHOLDS = DEFAULT_ALERT_THRESHOLDS.copy()


# ============================================================================
# PREVALENCE CALCULATION
# ============================================================================

async def calculate_prevalence_rates(
    db: AsyncSession,
    barangay_id: UUID | None = None,
    purok_id: UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None
) -> Dict[str, float]:
    """
    Calculate malnutrition prevalence rates
    
    Formula:
    Prevalence (%) = (Number of children with condition / Total children assessed) × 100
    
    Target Age Group: Children aged 0-71 months [50]
    
    Args:
        db: Database session
        barangay_id: Filter by barangay (optional)
        purok_id: Filter by purok (optional)
        start_date: Start date for measurements (optional)
        end_date: End date for measurements (optional)
    
    Returns:
        Dictionary with prevalence rates for each indicator
    """
    # Build query for latest measurements
    subquery = (
        select(
            Measurement.child_id,
            func.max(Measurement.measurement_date).label("latest_date")
        )
        .join(Child, Measurement.child_id == Child.id)
        .where(Child.is_active == True)
    )
    
    # Apply filters
    if barangay_id:
        subquery = subquery.where(Child.barangay_id == barangay_id)
    if purok_id:
        subquery = subquery.where(Child.purok_id == purok_id)
    if start_date:
        subquery = subquery.where(Measurement.measurement_date >= start_date)
    if end_date:
        subquery = subquery.where(Measurement.measurement_date <= end_date)
    
    subquery = subquery.group_by(Measurement.child_id).subquery()
    
    # Get latest measurements with age filter (0-71 months)
    stmt = (
        select(Measurement)
        .join(subquery, 
              (Measurement.child_id == subquery.c.child_id) & 
              (Measurement.measurement_date == subquery.c.latest_date))
        .where(Measurement.age_in_months <= 71)  # OPT Plus target age
    )
    
    measurements = (await db.scalars(stmt)).all()
    total_children = len(measurements)
    
    if total_children == 0:
        return {
            "total_children": 0,
            "underweight": 0.0,
            "severely_underweight": 0.0,
            "stunted": 0.0,
            "severely_stunted": 0.0,
            "wasted": 0.0,
            "severely_wasted": 0.0,
            "sam": 0.0,
            "mam": 0.0,
            "overweight": 0.0,
            "obese": 0.0
        }
    
    # Count each condition
    counts = {
        "underweight": 0,
        "severely_underweight": 0,
        "stunted": 0,
        "severely_stunted": 0,
        "wasted": 0,
        "severely_wasted": 0,
        "sam": 0,
        "mam": 0,
        "overweight": 0,
        "obese": 0
    }
    
    for m in measurements:
        # WAZ
        if m.waz_status == "underweight":
            counts["underweight"] += 1
        elif m.waz_status == "severely_underweight":
            counts["severely_underweight"] += 1
        
        # HAZ
        if m.haz_status == "stunted":
            counts["stunted"] += 1
        elif m.haz_status == "severely_stunted":
            counts["severely_stunted"] += 1
        
        # WHZ
        if m.whz_status == "wasted":
            counts["wasted"] += 1
        elif m.whz_status == "severely_wasted":
            counts["severely_wasted"] += 1
        elif m.whz_status == "overweight":
            counts["overweight"] += 1
        elif m.whz_status == "obese":
            counts["obese"] += 1
        
        # Overall status
        if m.overall_status == "severe_acute_malnutrition":
            counts["sam"] += 1
        elif m.overall_status == "moderate_acute_malnutrition":
            counts["mam"] += 1
    
    # Calculate prevalence rates
    prevalence = {
        "total_children": total_children,
        "underweight": round((counts["underweight"] / total_children) * 100, 2),
        "severely_underweight": round((counts["severely_underweight"] / total_children) * 100, 2),
        "stunted": round((counts["stunted"] / total_children) * 100, 2),
        "severely_stunted": round((counts["severely_stunted"] / total_children) * 100, 2),
        "wasted": round((counts["wasted"] / total_children) * 100, 2),
        "severely_wasted": round((counts["severely_wasted"] / total_children) * 100, 2),
        "sam": round((counts["sam"] / total_children) * 100, 2),
        "mam": round((counts["mam"] / total_children) * 100, 2),
        "overweight": round((counts["overweight"] / total_children) * 100, 2),
        "obese": round((counts["obese"] / total_children) * 100, 2)
    }
    
    return prevalence


# ============================================================================
# ALERT LEVEL DETERMINATION
# ============================================================================

def determine_alert_level(prevalence: Dict[str, float]) -> Dict[str, Any]:
    """
    Determine alert level based on prevalence rates per OPT Plus Guidelines [50]
    
    Alert Triggering Logic:
    IF Prevalence ≥ 10% AND < 15% THEN
        TRIGGER Warning Alert (Yellow)
    ELSE IF Wasting ≥ 5% OR Any Indicator ≥ 15% OR ≥ 25% increase THEN
        TRIGGER Critical Alert (Orange)
    ELSE IF Wasting ≥ 10% OR SAM ≥ 2% OR Any Indicator ≥ 20% THEN
        TRIGGER Emergency Alert (Red)
    END IF
    
    Args:
        prevalence: Dictionary with prevalence rates
    
    Returns:
        Dictionary with alert level and details
    """
    # Calculate total wasting (wasted + severely wasted)
    total_wasting = prevalence.get("wasted", 0) + prevalence.get("severely_wasted", 0)
    
    # Get all indicator prevalences (excluding total_children)
    indicators = [
        prevalence.get("underweight", 0),
        prevalence.get("severely_underweight", 0),
        prevalence.get("stunted", 0),
        prevalence.get("severely_stunted", 0),
        prevalence.get("wasted", 0),
        prevalence.get("severely_wasted", 0),
        prevalence.get("sam", 0),
        prevalence.get("mam", 0)
    ]
    
    max_prevalence = max(indicators) if indicators else 0
    
    # Emergency Level (Red)
    if (
        total_wasting >= ALERT_THRESHOLDS["emergency"]["wasting"] or
        prevalence.get("sam", 0) >= ALERT_THRESHOLDS["emergency"]["sam"] or
        max_prevalence >= ALERT_THRESHOLDS["emergency"]["any_prevalence"]
    ):
        return {
            "alert_level": "emergency",
            "color": ALERT_THRESHOLDS["emergency"]["color"],
            "emoji": ALERT_THRESHOLDS["emergency"]["emoji"],
            "action_required": ALERT_THRESHOLDS["emergency"]["action"],
            "triggers": {
                "total_wasting": total_wasting,
                "sam_prevalence": prevalence.get("sam", 0),
                "max_indicator": max_prevalence
            },
            "message": f"EMERGENCY: Immediate intervention required. Wasting: {total_wasting}%, SAM: {prevalence.get('sam', 0)}%"
        }
    
    # Critical Level (Orange)
    elif (
        total_wasting >= ALERT_THRESHOLDS["critical"]["wasting"] or
        max_prevalence >= ALERT_THRESHOLDS["critical"]["any_prevalence"]
    ):
        return {
            "alert_level": "critical",
            "color": ALERT_THRESHOLDS["critical"]["color"],
            "emoji": ALERT_THRESHOLDS["critical"]["emoji"],
            "action_required": ALERT_THRESHOLDS["critical"]["action"],
            "triggers": {
                "total_wasting": total_wasting,
                "max_indicator": max_prevalence
            },
            "message": f"CRITICAL: Urgent action needed. Wasting: {total_wasting}%, Highest indicator: {max_prevalence}%"
        }
    
    # Warning Level (Yellow)
    elif max_prevalence >= ALERT_THRESHOLDS["warning"]["any_prevalence"]:
        return {
            "alert_level": "warning",
            "color": ALERT_THRESHOLDS["warning"]["color"],
            "emoji": ALERT_THRESHOLDS["warning"]["emoji"],
            "action_required": ALERT_THRESHOLDS["warning"]["action"],
            "triggers": {
                "max_indicator": max_prevalence
            },
            "message": f"WARNING: Monitor closely. Highest indicator: {max_prevalence}%"
        }
    
    # Normal (Green)
    else:
        return {
            "alert_level": "normal",
            "color": "green",
            "emoji": "🟢",
            "action_required": "Continue routine monitoring",
            "triggers": {},
            "message": f"Normal range. Continue monitoring."
        }


# ============================================================================
# HOTSPOT DETECTION
# ============================================================================

def classify_risk_level(prevalence: Dict[str, float]) -> Dict[str, str]:
    """
    Classify risk level for hotspot detection
    
    | Malnutrition Prevalence | Risk Level  | Map Color |
    |-------------------------|-------------|-----------|
    | ≥ 30%                   | High Risk   | Red       |
    | 15% – 29%               | Medium Risk | Yellow    |
    | < 15%                   | Low Risk    | Green     |
    
    Args:
        prevalence: Dictionary with prevalence rates
    
    Returns:
        Dictionary with risk classification
    """
    # Use highest prevalence across all indicators
    indicators = [
        prevalence.get("underweight", 0),
        prevalence.get("severely_underweight", 0),
        prevalence.get("stunted", 0),
        prevalence.get("severely_stunted", 0),
        prevalence.get("wasted", 0),
        prevalence.get("severely_wasted", 0),
        prevalence.get("sam", 0)
    ]
    
    max_prevalence = max(indicators) if indicators else 0
    
    if max_prevalence >= 30.0:
        return {
            "risk_level": "high",
            "map_color": "red",
            "max_prevalence": max_prevalence
        }
    elif max_prevalence >= 15.0:
        return {
            "risk_level": "medium",
            "map_color": "yellow",
            "max_prevalence": max_prevalence
        }
    else:
        return {
            "risk_level": "low",
            "map_color": "green",
            "max_prevalence": max_prevalence
        }


# ============================================================================
# TREND ANALYSIS
# ============================================================================

async def calculate_trend(
    db: AsyncSession,
    barangay_id: UUID | None = None,
    purok_id: UUID | None = None,
    current_period_start: date | None = None,
    current_period_end: date | None = None,
    previous_period_start: date | None = None,
    previous_period_end: date | None = None
) -> Dict[str, float]:
    """
    Calculate trend analysis between two periods
    
    Formula:
    Percent Change (%) = ((Current_Prevalence - Previous_Prevalence) / Previous_Prevalence) × 100
    
    Args:
        db: Database session
        barangay_id: Filter by barangay
        purok_id: Filter by purok
        current_period_start: Current period start date
        current_period_end: Current period end date
        previous_period_start: Previous period start date
        previous_period_end: Previous period end date
    
    Returns:
        Dictionary with trend percentages for each indicator
    """
    # Get current period prevalence
    current = await calculate_prevalence_rates(
        db, barangay_id, purok_id, current_period_start, current_period_end
    )
    
    # Get previous period prevalence
    previous = await calculate_prevalence_rates(
        db, barangay_id, purok_id, previous_period_start, previous_period_end
    )
    
    # Calculate percent change for each indicator
    trends = {}
    for key in current.keys():
        if key == "total_children":
            continue
        
        current_val = current.get(key, 0)
        previous_val = previous.get(key, 0)
        
        if previous_val > 0:
            percent_change = ((current_val - previous_val) / previous_val) * 100
            trends[f"{key}_trend"] = round(percent_change, 2)
        else:
            trends[f"{key}_trend"] = 0.0
    
    return {
        "current": current,
        "previous": previous,
        "trends": trends
    }


# ============================================================================
# COMPREHENSIVE ALERT GENERATION
# ============================================================================

async def generate_comprehensive_alert(
    db: AsyncSession,
    barangay_id: UUID | None = None,
    purok_id: UUID | None = None,
    include_trends: bool = False
) -> Dict[str, Any]:
    """
    Generate comprehensive 3-tier alert with all analytics
    
    Args:
        db: Database session
        barangay_id: Filter by barangay
        purok_id: Filter by purok
        include_trends: Include trend analysis
    
    Returns:
        Comprehensive alert report
    """
    # Calculate current prevalence
    prevalence = await calculate_prevalence_rates(db, barangay_id, purok_id)
    
    # Determine alert level
    alert = determine_alert_level(prevalence)
    
    # Classify risk level
    risk = classify_risk_level(prevalence)
    
    result = {
        "timestamp": datetime.now().isoformat(),
        "barangay_id": str(barangay_id) if barangay_id else None,
        "purok_id": str(purok_id) if purok_id else None,
        "prevalence": prevalence,
        "alert": alert,
        "risk": risk
    }
    
    # Add trend analysis if requested
    if include_trends:
        from datetime import timedelta
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        prev_end = start_date - timedelta(days=1)
        prev_start = prev_end - timedelta(days=30)
        
        trends = await calculate_trend(
            db, barangay_id, purok_id,
            start_date, end_date,
            prev_start, prev_end
        )
        result["trends"] = trends
    
    return result


# ============================================================================
# BARANGAY-LEVEL ALERTS
# ============================================================================

async def generate_all_barangay_alerts(
    db: AsyncSession
) -> List[Dict[str, Any]]:
    """
    Generate alerts for all barangays
    
    Returns:
        List of alert reports for each barangay
    """
    # Get all barangays
    stmt = select(Barangay).where(Barangay.is_archived == False)
    barangays = (await db.scalars(stmt)).all()
    
    alerts = []
    for barangay in barangays:
        alert = await generate_comprehensive_alert(
            db, barangay_id=barangay.id, include_trends=False
        )
        alert["barangay_name"] = barangay.name
        alerts.append(alert)
    
    # Sort by alert severity
    severity_order = {"emergency": 0, "critical": 1, "warning": 2, "normal": 3}
    alerts.sort(key=lambda x: severity_order.get(x["alert"]["alert_level"], 4))
    
    return alerts


async def generate_all_purok_alerts(
    db: AsyncSession,
    barangay_id: UUID | None = None
) -> List[Dict[str, Any]]:
    """
    Generate alerts for all puroks
    
    Args:
        barangay_id: Filter by barangay (optional)
    
    Returns:
        List of alert reports for each purok
    """
    # Get all puroks
    stmt = select(Purok).where(Purok.is_archived == False)
    if barangay_id:
        stmt = stmt.where(Purok.barangay_id == barangay_id)
    
    puroks = (await db.scalars(stmt)).all()
    
    alerts = []
    for purok in puroks:
        alert = await generate_comprehensive_alert(
            db, barangay_id=purok.barangay_id, purok_id=purok.id, include_trends=False
        )
        alert["purok_name"] = purok.name
        alert["barangay_id"] = str(purok.barangay_id)
        alerts.append(alert)
    
    # Sort by alert severity
    severity_order = {"emergency": 0, "critical": 1, "warning": 2, "normal": 3}
    alerts.sort(key=lambda x: severity_order.get(x["alert"]["alert_level"], 4))
    
    return alerts
