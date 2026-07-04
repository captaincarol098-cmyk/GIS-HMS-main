"""
Trend Analysis Service
Provides functions to calculate trend velocity and percent change for nutritional indicators.
"""

from typing import Optional


def calculate_percent_change(current: float, previous: float) -> float:
    """
    Calculate percent change between two values.
    
    Formula: ((Current - Previous) / Previous) × 100
    
    Args:
        current: Current value
        previous: Previous value
        
    Returns:
        Percentage change (positive = increase, negative = decrease)
        Returns 0 if previous is 0 (no baseline)
    """
    if previous == 0:
        return 0.0
    
    return ((current - previous) / previous) * 100


def analyze_prevalence_trend(
    current_prevalence: dict, 
    previous_prevalence: Optional[dict] = None
) -> dict:
    """
    Analyze WAZ, HAZ, WHZ trend velocity.
    
    Args:
        current_prevalence: Current prevalence dict with keys:
            - wasting_rate
            - stunting_rate
            - underweight_rate
        previous_prevalence: Previous period prevalence dict (same structure)
            If None, returns 0 for all percent changes
            
    Returns:
        Dict with percent_change for each indicator:
        {
            "wasting_change_pct": float,      # % change in wasting rate
            "stunting_change_pct": float,     # % change in stunting rate
            "underweight_change_pct": float,  # % change in underweight rate
            "interpretation": str             # Human-readable trend
        }
    """
    if not previous_prevalence:
        return {
            "wasting_change_pct": 0.0,
            "stunting_change_pct": 0.0,
            "underweight_change_pct": 0.0,
            "interpretation": "No previous data available for comparison"
        }
    
    wasting_change = calculate_percent_change(
        current_prevalence.get("wasting_rate", 0),
        previous_prevalence.get("wasting_rate", 0)
    )
    
    stunting_change = calculate_percent_change(
        current_prevalence.get("stunting_rate", 0),
        previous_prevalence.get("stunting_rate", 0)
    )
    
    underweight_change = calculate_percent_change(
        current_prevalence.get("underweight_rate", 0),
        previous_prevalence.get("underweight_rate", 0)
    )
    
    # Generate human-readable interpretation
    avg_change = (wasting_change + stunting_change + underweight_change) / 3
    
    if avg_change < -10:
        interpretation = "📈 Significant Improvement"
    elif avg_change < 0:
        interpretation = "✅ Slight Improvement"
    elif avg_change == 0:
        interpretation = "⏸️  Stable (No Change)"
    elif avg_change < 10:
        interpretation = "⚠️  Slight Worsening"
    else:
        interpretation = "🔴 Significant Worsening"
    
    return {
        "wasting_change_pct": round(wasting_change, 1),
        "stunting_change_pct": round(stunting_change, 1),
        "underweight_change_pct": round(underweight_change, 1),
        "average_change_pct": round(avg_change, 1),
        "interpretation": interpretation
    }


def classify_trend_direction(percent_change: float) -> str:
    """
    Classify trend direction based on percent change.
    
    Args:
        percent_change: Percent change value
        
    Returns:
        "improving", "stable", or "worsening"
    """
    if percent_change < -1:
        return "improving"
    elif percent_change > 1:
        return "worsening"
    else:
        return "stable"


def calculate_trend_velocity(percent_changes: list[float]) -> dict:
    """
    Calculate trend velocity based on multiple data points.
    
    Args:
        percent_changes: List of percent changes over time periods
        
    Returns:
        Dict with:
        - trend_direction: "improving", "stable", "worsening"
        - average_velocity: Average percent change
        - acceleration: Is trend accelerating or decelerating
    """
    if not percent_changes or len(percent_changes) == 0:
        return {
            "trend_direction": "stable",
            "average_velocity": 0.0,
            "acceleration": "neutral"
        }
    
    avg_velocity = sum(percent_changes) / len(percent_changes)
    trend_direction = classify_trend_direction(avg_velocity)
    
    # Detect acceleration: comparing first half vs second half
    if len(percent_changes) >= 2:
        mid = len(percent_changes) // 2
        first_half_avg = sum(percent_changes[:mid]) / mid if mid > 0 else 0
        second_half_avg = sum(percent_changes[mid:]) / (len(percent_changes) - mid) if (len(percent_changes) - mid) > 0 else 0
        
        if abs(second_half_avg) > abs(first_half_avg):
            acceleration = "accelerating"
        elif abs(second_half_avg) < abs(first_half_avg):
            acceleration = "decelerating"
        else:
            acceleration = "steady"
    else:
        acceleration = "neutral"
    
    return {
        "trend_direction": trend_direction,
        "average_velocity": round(avg_velocity, 1),
        "acceleration": acceleration
    }
