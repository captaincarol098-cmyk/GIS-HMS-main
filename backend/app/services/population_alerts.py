"""
Population-Level Alert Generation Service
Generates alerts based on prevalence thresholds and trend analysis
"""
from datetime import date, timedelta
from uuid import UUID
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Alert, Barangay, Measurement, Child, Purok, SystemSetting
from ..models.entities import AlertType, Severity
from ..utils.who_zscore import calculate_prevalence
from ..services.analytics import latest_measurements
import json


# Multi-Tier Alert Thresholds (Recommended System)
ALERT_THRESHOLDS = {
    "warning": {
        "absolute": 10.0,           # Any malnutrition ≥ 10%
        "trend": 15.0               # Increase ≥ 15% over 3 months
    },
    "high": {
        "absolute_wasting": 5.0,    # Wasting ≥ 5% (WHO acceptable threshold)
        "absolute_any": 10.0,       # Any indicator ≥ 10%
        "trend": 25.0               # Increase ≥ 25% over 3 months
    },
    "critical": {
        "absolute_wasting": 15.0,   # WHO emergency threshold
        "absolute_severe": 2.0,     # Severe malnutrition ≥ 2%
        "absolute_any": 15.0,       # Any indicator ≥ 15%
        "trend": 50.0               # Rapid deterioration ≥ 50%
    }
}

# Target age range: 0-5 years (0-59 months)
TARGET_AGE_MIN = 0
TARGET_AGE_MAX = 59


def calculate_percent_change(current: float, previous: float) -> float:
    """Calculate percentage change between two values."""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return ((current - previous) / abs(previous)) * 100


async def get_filtered_measurements(
    db: AsyncSession,
    barangay_id: UUID | None = None,
    purok_id: UUID | None = None,
    months_ago: int = 0
) -> list:
    """
    Get latest measurements filtered by age (0-59 months) and optional date range.
    
    Args:
        db: Database session
        barangay_id: Optional barangay filter
        purok_id: Optional purok filter
        months_ago: How many months back to look (0 = current)
    
    Returns:
        List of measurements for children aged 0-59 months
    """
    # Get measurements from the specified period
    if months_ago > 0:
        end_date = date.today() - timedelta(days=30 * months_ago)
        start_date = end_date - timedelta(days=30)
        
        stmt = (
            select(Measurement)
            .join(Child, Child.id == Measurement.child_id)
            .where(
                Measurement.measurement_date >= start_date,
                Measurement.measurement_date <= end_date,
                # Filter by target age: 0-59 months
                Measurement.age_in_months >= TARGET_AGE_MIN,
                Measurement.age_in_months <= TARGET_AGE_MAX
            )
        )
        
        if barangay_id:
            stmt = stmt.where(Child.barangay_id == barangay_id)
        if purok_id:
            stmt = stmt.where(Child.purok_id == purok_id)
            
        measurements = list((await db.scalars(stmt)).all())
    else:
        # Use latest measurements (current period)
        all_measurements = await latest_measurements(db, barangay_id)
        
        # Filter by age and optional purok
        measurements = [
            m for m in all_measurements
            if (TARGET_AGE_MIN <= m.age_in_months <= TARGET_AGE_MAX)
            and (purok_id is None or (m.child and m.child.purok_id == purok_id))
        ]
    
    return measurements


async def check_absolute_thresholds(
    prevalence: dict,
    barangay_id: UUID,
    purok_id: UUID | None = None
) -> list[Alert]:
    """
    Check if prevalence exceeds absolute thresholds.
    
    Returns list of alerts to be created.
    """
    alerts = []
    location_type = "purok" if purok_id else "barangay"
    location_id = purok_id if purok_id else barangay_id
    
    # Extract rates
    wasting_rate = prevalence.get("wasting_rate", 0)
    stunting_rate = prevalence.get("stunting_rate", 0)
    underweight_rate = prevalence.get("underweight_rate", 0)
    severe_wasting_rate = prevalence.get("severe_wasting_rate", 0)
    severe_stunting_rate = prevalence.get("severe_stunting_rate", 0)
    severe_underweight_rate = prevalence.get("severe_underweight_rate", 0)
    
    # Check CRITICAL thresholds
    if wasting_rate >= ALERT_THRESHOLDS["critical"]["absolute_wasting"]:
        alerts.append(Alert(
            child_id=None,  # Population-level alert (no specific child)
            measurement_id=None,
            alert_type=AlertType.high_prevalence,
            severity=Severity.critical,
            message=f"CRITICAL: Wasting prevalence is {wasting_rate:.1f}% (≥{ALERT_THRESHOLDS['critical']['absolute_wasting']}% WHO emergency threshold) in this {location_type}. Immediate intervention required."
        ))
    
    if (severe_wasting_rate >= ALERT_THRESHOLDS["critical"]["absolute_severe"] or
        severe_stunting_rate >= ALERT_THRESHOLDS["critical"]["absolute_severe"] or
        severe_underweight_rate >= ALERT_THRESHOLDS["critical"]["absolute_severe"]):
        alerts.append(Alert(
            child_id=None,
            measurement_id=None,
            alert_type=AlertType.high_prevalence,
            severity=Severity.critical,
            message=f"CRITICAL: Severe malnutrition prevalence ≥{ALERT_THRESHOLDS['critical']['absolute_severe']}% detected in this {location_type}. Emergency response needed."
        ))
    
    # Check if any indicator at critical level
    max_prevalence = max(wasting_rate, stunting_rate, underweight_rate)
    if max_prevalence >= ALERT_THRESHOLDS["critical"]["absolute_any"]:
        alerts.append(Alert(
            child_id=None,
            measurement_id=None,
            alert_type=AlertType.high_prevalence,
            severity=Severity.critical,
            message=f"CRITICAL: Malnutrition prevalence reached {max_prevalence:.1f}% (≥{ALERT_THRESHOLDS['critical']['absolute_any']}%) in this {location_type}."
        ))
    
    # Check HIGH thresholds (only if not already critical)
    if not alerts:
        if wasting_rate >= ALERT_THRESHOLDS["high"]["absolute_wasting"]:
            alerts.append(Alert(
                child_id=None,
                measurement_id=None,
                alert_type=AlertType.high_prevalence,
                severity=Severity.high,
                message=f"HIGH: Wasting prevalence is {wasting_rate:.1f}% (≥{ALERT_THRESHOLDS['high']['absolute_wasting']}% acceptable threshold) in this {location_type}. Intensify interventions."
            ))
        
        if max_prevalence >= ALERT_THRESHOLDS["high"]["absolute_any"]:
            alerts.append(Alert(
                child_id=None,
                measurement_id=None,
                alert_type=AlertType.high_prevalence,
                severity=Severity.high,
                message=f"HIGH: Malnutrition prevalence is {max_prevalence:.1f}% (≥{ALERT_THRESHOLDS['high']['absolute_any']}%) in this {location_type}."
            ))
    
    # Check WARNING thresholds (only if not already high or critical)
    if not alerts and max_prevalence >= ALERT_THRESHOLDS["warning"]["absolute"]:
        alerts.append(Alert(
            child_id=None,
            measurement_id=None,
            alert_type=AlertType.high_prevalence,
            severity=Severity.medium,
            message=f"WARNING: Malnutrition prevalence is {max_prevalence:.1f}% (≥{ALERT_THRESHOLDS['warning']['absolute']}%) in this {location_type}. Attention required."
        ))
    
    return alerts


async def check_trend_thresholds(
    current_prevalence: dict,
    previous_prevalence: dict,
    barangay_id: UUID,
    purok_id: UUID | None = None
) -> list[Alert]:
    """
    Check if prevalence trends exceed deterioration thresholds.
    
    Returns list of alerts to be created.
    """
    alerts = []
    location_type = "purok" if purok_id else "barangay"
    
    # Calculate percent changes
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
    
    max_change = max(wasting_change, stunting_change, underweight_change)
    
    # Determine which indicator changed most
    indicator_name = "wasting" if wasting_change == max_change else \
                     "stunting" if stunting_change == max_change else "underweight"
    
    # Check CRITICAL deterioration
    if max_change >= ALERT_THRESHOLDS["critical"]["trend"]:
        alerts.append(Alert(
            child_id=None,
            measurement_id=None,
            alert_type=AlertType.deteriorating,
            severity=Severity.critical,
            message=f"CRITICAL DETERIORATION: {indicator_name.title()} prevalence increased by {max_change:.1f}% over the past 3 months in this {location_type}. Emergency response required."
        ))
    
    # Check HIGH deterioration
    elif max_change >= ALERT_THRESHOLDS["high"]["trend"]:
        alerts.append(Alert(
            child_id=None,
            measurement_id=None,
            alert_type=AlertType.deteriorating,
            severity=Severity.high,
            message=f"RAPID DETERIORATION: {indicator_name.title()} prevalence increased by {max_change:.1f}% over the past 3 months in this {location_type}. Urgent action needed."
        ))
    
    # Check WARNING deterioration
    elif max_change >= ALERT_THRESHOLDS["warning"]["trend"]:
        alerts.append(Alert(
            child_id=None,
            measurement_id=None,
            alert_type=AlertType.deteriorating,
            severity=Severity.medium,
            message=f"DETERIORATION WARNING: {indicator_name.title()} prevalence increased by {max_change:.1f}% over the past 3 months in this {location_type}. Monitor closely."
        ))
    
    return alerts


async def generate_population_alerts(
    db: AsyncSession,
    barangay_id: UUID | None = None
) -> dict:
    """
    Generate population-level alerts for barangays and puroks.
    Checks both absolute thresholds and trend deterioration.
    
    Args:
        db: Database session
        barangay_id: Optional single barangay to check (None = all barangays)
    
    Returns:
        Summary of alerts generated
    """
    total_alerts_created = 0
    barangays_checked = 0
    puroks_checked = 0
    
    # Get barangays to check
    if barangay_id:
        barangays = [await db.get(Barangay, barangay_id)]
    else:
        barangays = list((await db.scalars(select(Barangay))).all())
    
    for barangay in barangays:
        if not barangay:
            continue
            
        barangays_checked += 1
        
        # Get current and 3-month-ago measurements for this barangay (0-59 months only)
        current_measurements = await get_filtered_measurements(db, barangay.id, months_ago=0)
        previous_measurements = await get_filtered_measurements(db, barangay.id, months_ago=3)
        
        if not current_measurements:
            continue  # Skip if no data
        
        # Calculate prevalence
        current_prevalence = calculate_prevalence(current_measurements)
        
        # Check absolute thresholds
        absolute_alerts = await check_absolute_thresholds(
            current_prevalence,
            barangay.id
        )
        
        # Check trend thresholds (if we have historical data)
        trend_alerts = []
        if previous_measurements:
            previous_prevalence = calculate_prevalence(previous_measurements)
            trend_alerts = await check_trend_thresholds(
                current_prevalence,
                previous_prevalence,
                barangay.id
            )
        
        # Save barangay-level alerts
        for alert in absolute_alerts + trend_alerts:
            # Avoid duplicates by checking if similar alert exists recently
            existing = await db.scalar(
                select(Alert).where(
                    Alert.alert_type == alert.alert_type,
                    Alert.severity == alert.severity,
                    Alert.is_resolved == False,
                    Alert.created_at >= date.today() - timedelta(days=7)
                ).limit(1)
            )
            
            if not existing:
                db.add(alert)
                total_alerts_created += 1
        
        # Check puroks within this barangay
        puroks = list((await db.scalars(
            select(Purok).where(Purok.barangay_id == barangay.id)
        )).all())
        
        for purok in puroks:
            puroks_checked += 1
            
            # Get purok-specific measurements (0-59 months only)
            purok_current = await get_filtered_measurements(
                db, barangay.id, purok.id, months_ago=0
            )
            purok_previous = await get_filtered_measurements(
                db, barangay.id, purok.id, months_ago=3
            )
            
            if not purok_current:
                continue
            
            # Calculate purok prevalence
            purok_prevalence = calculate_prevalence(purok_current)
            
            # Check purok thresholds
            purok_absolute_alerts = await check_absolute_thresholds(
                purok_prevalence,
                barangay.id,
                purok.id
            )
            
            purok_trend_alerts = []
            if purok_previous:
                purok_prev_prevalence = calculate_prevalence(purok_previous)
                purok_trend_alerts = await check_trend_thresholds(
                    purok_prevalence,
                    purok_prev_prevalence,
                    barangay.id,
                    purok.id
                )
            
            # Save purok-level alerts
            for alert in purok_absolute_alerts + purok_trend_alerts:
                existing = await db.scalar(
                    select(Alert).where(
                        Alert.alert_type == alert.alert_type,
                        Alert.severity == alert.severity,
                        Alert.is_resolved == False,
                        Alert.created_at >= date.today() - timedelta(days=7)
                    ).limit(1)
                )
                
                if not existing:
                    db.add(alert)
                    total_alerts_created += 1
    
    await db.commit()
    
    return {
        "success": True,
        "barangays_checked": barangays_checked,
        "puroks_checked": puroks_checked,
        "alerts_created": total_alerts_created,
        "target_age_range": f"{TARGET_AGE_MIN}-{TARGET_AGE_MAX} months (0-5 years)",
        "thresholds": ALERT_THRESHOLDS
    }


async def get_alert_configuration(db: AsyncSession) -> dict:
    """
    Get current alert threshold configuration from database or use defaults.
    Can be modified by both admin and superadmin via API.
    """
    from ..models import SystemSetting
    import json
    
    # Try to fetch thresholds from database
    try:
        thresholds_setting = await db.scalar(
            select(SystemSetting).where(SystemSetting.key == "alert_thresholds")
        )
        if thresholds_setting and thresholds_setting.value:
            thresholds = json.loads(thresholds_setting.value)
        else:
            thresholds = DEFAULT_ALERT_THRESHOLDS
    except Exception:
        thresholds = DEFAULT_ALERT_THRESHOLDS
    
    # Update module-level thresholds
    global ALERT_THRESHOLDS
    ALERT_THRESHOLDS = thresholds
    
    return {
        "thresholds": thresholds,
        "target_age_range": {
            "min_months": TARGET_AGE_MIN,
            "max_months": TARGET_AGE_MAX,
            "description": "0-5 years old"
        },
        "configurable": True,
        "last_updated": None
    }
