"""
OPT Plus API Router
Endpoints for OPT Plus calculations and 3-tier alert system
"""

from datetime import date, datetime
from uuid import UUID
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from openpyxl import load_workbook
from io import BytesIO
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import User, Child, Measurement, Barangay, Purok
from ..models.entities import Sex, WazStatus, HazStatus, WhzStatus
from ..services.opt_plus_calculations import (
    calculate_age_in_months,
    adjust_height_for_position,
    calculate_full_opt_plus_assessment
)
from ..services.three_tier_alerts import (
    generate_comprehensive_alert,
    generate_all_barangay_alerts,
    generate_all_purok_alerts,
    calculate_prevalence_rates,
    determine_alert_level,
    classify_risk_level
)

router = APIRouter(prefix="/api/opt-plus", tags=["OPT Plus"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class OPTPlusCalculationRequest(BaseModel):
    sex: Literal["male", "female"]
    birth_date: date
    measurement_date: date
    weight_kg: float = Field(gt=0, description="Weight in kilograms")
    height_cm: float = Field(gt=0, description="Height/length in centimeters")
    measurement_position: Literal["standing", "lying_down"] = "standing"
    has_bilateral_edema: bool = False


class AgeCalculationRequest(BaseModel):
    birth_date: date
    measurement_date: date


class HeightAdjustmentRequest(BaseModel):
    height_cm: float
    age_months: int
    measurement_position: Literal["standing", "lying_down"]


class ImportMeasurementRow(BaseModel):
    child_id: Optional[UUID] = None
    full_name: str
    birth_date: date
    sex: Literal["M", "F", "male", "female"]
    measurement_date: date
    weight_kg: float
    height_cm: float
    muac_cm: Optional[float] = None
    notes: Optional[str] = None


# ============================================================================
# MODULE 1: AGE CALCULATION
# ============================================================================

@router.post("/calculate-age")
async def calculate_age(
    body: AgeCalculationRequest,
    user: User = Depends(get_current_user)
):
    """
    Calculate age in months using NNC OPT Plus Guidelines [50]
    
    Algorithm: Chronological Milestone Resolution
    Formula: Age (in months) = FLOOR((Measurement Date - Birth Date) / 30.4375)
    
    Rules:
    - Disregard remaining days (floor function)
    """
    age_months = calculate_age_in_months(body.birth_date, body.measurement_date)
    
    return {
        "birth_date": body.birth_date,
        "measurement_date": body.measurement_date,
        "age_months": age_months,
        "age_years": age_months // 12,
        "remaining_months": age_months % 12
    }


# ============================================================================
# MODULE 2: HEIGHT/LENGTH ADJUSTMENT
# ============================================================================

@router.post("/adjust-height")
async def adjust_height(
    body: HeightAdjustmentRequest,
    user: User = Depends(get_current_user)
):
    """
    Adjust height/length based on measurement position per NNC OPT Plus Guidelines [50]
    
    Rules:
    - 0-23 months + Standing (wrong): Add +0.7 cm
    - 24-71 months + Lying (wrong): Subtract -0.7 cm
    - Round to nearest 0.5 cm
    """
    adjusted_height = adjust_height_for_position(
        body.height_cm,
        body.age_months,
        body.measurement_position
    )
    
    adjustment = adjusted_height - round(body.height_cm * 2) / 2
    
    return {
        "raw_height_cm": body.height_cm,
        "rounded_height_cm": round(body.height_cm * 2) / 2,
        "adjusted_height_cm": adjusted_height,
        "adjustment_cm": round(adjustment, 1),
        "age_months": body.age_months,
        "measurement_position": body.measurement_position,
        "age_group": "0-23 months" if body.age_months < 24 else "24-71 months",
        "correct_position": "lying_down" if body.age_months < 24 else "standing"
    }


# ============================================================================
# MODULE 3-5: COMPLETE OPT PLUS ASSESSMENT
# ============================================================================

@router.post("/calculate-assessment")
async def calculate_assessment(
    body: OPTPlusCalculationRequest,
    user: User = Depends(get_current_user)
):
    """
    Complete OPT Plus assessment with all modules
    
    Includes:
    1. Age calculation
    2. Height adjustment
    3. Z-score calculation (LMS method)
    4. Edema override check
    5. Nutritional status classification
    """
    try:
        result = calculate_full_opt_plus_assessment(
            sex=body.sex,
            birth_date=body.birth_date,
            measurement_date=body.measurement_date,
            weight_kg=body.weight_kg,
            height_cm=body.height_cm,
            measurement_position=body.measurement_position,
            has_bilateral_edema=body.has_bilateral_edema
        )
        
        return {
            "success": True,
            "input": body.dict(),
            "assessment": result
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


# ============================================================================
# MODULE 6: 3-TIER ALERT GENERATION
# ============================================================================

@router.get("/alerts/comprehensive")
async def get_comprehensive_alert(
    barangay_id: Optional[UUID] = Query(None),
    purok_id: Optional[UUID] = Query(None),
    include_trends: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Generate comprehensive 3-tier alert with all analytics
    
    Alert Levels:
    - Warning (🟡 Yellow): Prevalence ≥ 10%
    - Critical (🟠 Orange): Wasting ≥ 5% OR Any Indicator ≥ 15%
    - Emergency (🔴 Red): Wasting ≥ 10% OR SAM ≥ 2%
    """
    # BHW can only access their barangay
    if user.role.value == "admin":
        barangay_id = user.barangay_id
    
    alert = await generate_comprehensive_alert(
        db, barangay_id, purok_id, include_trends
    )
    
    return alert


@router.get("/alerts/barangays")
async def get_all_barangay_alerts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Generate alerts for all barangays
    """
    alerts = await generate_all_barangay_alerts(db)
    
    # Filter for BHW users
    if user.role.value == "admin":
        alerts = [a for a in alerts if a.get("barangay_id") == str(user.barangay_id)]
    
    return {
        "alerts": alerts,
        "total_barangays": len(alerts),
        "emergency_count": sum(1 for a in alerts if a["alert"]["alert_level"] == "emergency"),
        "critical_count": sum(1 for a in alerts if a["alert"]["alert_level"] == "critical"),
        "warning_count": sum(1 for a in alerts if a["alert"]["alert_level"] == "warning")
    }


@router.get("/alerts/puroks")
async def get_all_purok_alerts(
    barangay_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Generate alerts for all puroks
    """
    # BHW can only access their barangay
    if user.role.value == "admin":
        barangay_id = user.barangay_id
    
    alerts = await generate_all_purok_alerts(db, barangay_id)
    
    return {
        "alerts": alerts,
        "barangay_id": str(barangay_id) if barangay_id else None,
        "total_puroks": len(alerts),
        "emergency_count": sum(1 for a in alerts if a["alert"]["alert_level"] == "emergency"),
        "critical_count": sum(1 for a in alerts if a["alert"]["alert_level"] == "critical"),
        "warning_count": sum(1 for a in alerts if a["alert"]["alert_level"] == "warning")
    }


# ============================================================================
# MODULE 8-9: PREVALENCE AND TREND ANALYSIS
# ============================================================================

@router.get("/prevalence")
async def get_prevalence_rates(
    barangay_id: Optional[UUID] = Query(None),
    purok_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Calculate malnutrition prevalence rates
    
    Formula:
    Prevalence (%) = (Number of children with condition / Total children assessed) × 100
    
    Target Age Group: Children aged 0-71 months
    """
    # BHW can only access their barangay
    if user.role.value == "admin":
        barangay_id = user.barangay_id
    
    prevalence = await calculate_prevalence_rates(
        db, barangay_id, purok_id, start_date, end_date
    )
    
    alert = determine_alert_level(prevalence)
    risk = classify_risk_level(prevalence)
    
    return {
        "prevalence": prevalence,
        "alert": alert,
        "risk": risk,
        "filters": {
            "barangay_id": str(barangay_id) if barangay_id else None,
            "purok_id": str(purok_id) if purok_id else None,
            "start_date": start_date,
            "end_date": end_date
        }
    }


# ============================================================================
# MODULE 10: HOTSPOT DETECTION
# ============================================================================

@router.get("/hotspots")
async def get_hotspots(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Detect malnutrition hotspots
    
    Risk Levels:
    - High Risk (Red): ≥ 30% prevalence
    - Medium Risk (Yellow): 15% - 29% prevalence
    - Low Risk (Green): < 15% prevalence
    """
    alerts = await generate_all_barangay_alerts(db)
    
    # Filter for BHW users
    if user.role.value == "admin":
        alerts = [a for a in alerts if a.get("barangay_id") == str(user.barangay_id)]
    
    # Classify hotspots
    hotspots = {
        "high_risk": [],
        "medium_risk": [],
        "low_risk": []
    }
    
    for alert in alerts:
        risk_level = alert["risk"]["risk_level"]
        if risk_level == "high":
            hotspots["high_risk"].append(alert)
        elif risk_level == "medium":
            hotspots["medium_risk"].append(alert)
        else:
            hotspots["low_risk"].append(alert)
    
    return {
        "hotspots": hotspots,
        "summary": {
            "high_risk_count": len(hotspots["high_risk"]),
            "medium_risk_count": len(hotspots["medium_risk"]),
            "low_risk_count": len(hotspots["low_risk"]),
            "total_areas": len(alerts)
        }
    }


# ============================================================================
# DATA INTEGRITY VALIDATION
# ============================================================================

@router.post("/validate-measurement")
async def validate_measurement(
    body: OPTPlusCalculationRequest,
    user: User = Depends(get_current_user)
):
    """
    Validate measurement data against OPT Plus data integrity rules
    
    Rules:
    - Overlapping Edge Logic: Scores exactly -2.00 are NORMAL
    - Drop-Day Age Factor: Discard days in age computation
    - Physical Adjustment Constants: +0.7 cm / -0.7 cm adjustments
    - Clinical Override Clause: Edema → SAM emergency
    """
    errors = []
    warnings = []
    
    # Age validation
    age_months = calculate_age_in_months(body.birth_date, body.measurement_date)
    if age_months > 71:
        errors.append(f"Age {age_months} months exceeds OPT Plus range (0-71 months)")
    
    # Weight validation
    if body.weight_kg < 1 or body.weight_kg > 50:
        warnings.append(f"Weight {body.weight_kg} kg seems unusual. Please verify.")
    
    # Height validation
    if body.height_cm < 40 or body.height_cm > 130:
        warnings.append(f"Height {body.height_cm} cm seems unusual. Please verify.")
    
    # Edema check
    if body.has_bilateral_edema:
        warnings.append("Bilateral edema present - will override Z-score calculations per OPT Plus guidelines")
    
    # Position check
    correct_position = "lying_down" if age_months < 24 else "standing"
    if body.measurement_position != correct_position:
        warnings.append(
            f"Measurement position '{body.measurement_position}' may not be optimal for age {age_months} months. "
            f"Recommended: '{correct_position}'. Adjustment of ±0.7 cm will be applied."
        )
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "age_months": age_months,
        "recommended_position": correct_position
    }


# ============================================================================
# MODULE 6: BATCH IMPORT TO ASSESSMENT RECORDS
# ============================================================================

@router.get("/report")
async def get_opt_plus_report(
    year: int = Query(None, description="Filter data by year"),
    month: int = Query(None, description="Filter data by month (1-12)"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Get OPT Plus report data for dashboard
    Returns aggregated child nutrition data with KPIs and summaries
    Accessible to all authenticated users
    """
    
    # Use current year/month if not specified
    if year is None:
        year = date.today().year
    if month is None:
        month = date.today().month
    
    # Calculate date range
    from calendar import monthrange
    
    start_date = datetime(year, month, 1).date()
    _, last_day = monthrange(year, month)
    end_date = datetime(year, month, last_day).date()
    
    try:
        # Get all active children aged 0-59 months with measurements in the period
        measurements_query = (
            select(Measurement)
            .options(selectinload(Measurement.child).selectinload(Child.barangay))
            .join(Child)
            .where(
                Child.is_active.is_(True),
                Measurement.age_in_months.between(0, 59),
                Measurement.measurement_date.between(start_date, end_date)
            )
        )
        
        measurements_result = await db.scalars(measurements_query)
        measurements = measurements_result.all()
        
        # Get barangay data for header
        barangays_result = await db.scalars(select(Barangay))
        barangays = barangays_result.all()
        
        # Get total population count
        total_population = sum([b.population_count or 0 for b in barangays]) or 10000
        
        # Initialize counters
        children_0_59_months = 0
        total_wfa = 0
        total_hfa = 0
        total_wflh = 0
        
        undernutrition_0_59 = 0
        overweight_0_59 = 0
        undernutrition_0_23 = 0
        overweight_0_23 = 0
        
        children_by_age_group = {
            "0-5": 0,
            "6-11": 0,
            "12-23": 0,
            "24-35": 0,
            "36-47": 0,
            "48-59": 0,
        }
        
        gender_breakdown = {
            "male": 0,
            "female": 0
        }
        
        # Process measurements
        for measurement in measurements:
            child = measurement.child
            age = measurement.age_in_months
            
            children_0_59_months += 1
            
            # Count by indicator
            if measurement.waz_status is not None:
                total_wfa += 1
            if measurement.haz_status is not None:
                total_hfa += 1
            if measurement.whz_status is not None:
                total_wflh += 1
            
            # Determine age group
            if age <= 5:
                age_group = "0-5"
            elif age <= 11:
                age_group = "6-11"
            elif age <= 23:
                age_group = "12-23"
            elif age <= 35:
                age_group = "24-35"
            elif age <= 47:
                age_group = "36-47"
            else:
                age_group = "48-59"
            
            children_by_age_group[age_group] += 1
            
            # Count gender
            if child and child.sex:
                if str(child.sex).upper() == "M":
                    gender_breakdown["male"] += 1
                else:
                    gender_breakdown["female"] += 1
            
            # Count nutritional issues
            # Using WAZ (Weight-for-Age) as primary indicator for undernutrition
            is_undernutrition = False
            is_overweight = False
            
            if measurement.waz_status in [WazStatus.underweight, WazStatus.severely_underweight]:
                is_undernutrition = True
            elif measurement.waz_status == WazStatus.overweight:
                is_overweight = True
            
            # Fallback to HAZ and WHZ if WAZ not available
            if measurement.haz_status in [HazStatus.stunted, HazStatus.severely_stunted]:
                is_undernutrition = True
            if measurement.whz_status in [WhzStatus.wasted, WhzStatus.severely_wasted]:
                is_undernutrition = True
            
            if is_undernutrition:
                undernutrition_0_59 += 1
                if age <= 23:
                    undernutrition_0_23 += 1
            
            if is_overweight:
                overweight_0_59 += 1
                if age <= 23:
                    overweight_0_23 += 1
        
        # Build age group data array
        age_group_data = []
        for age_group in ["0-5", "6-11", "12-23", "24-35", "36-47", "48-59"]:
            age_group_data.append({
                "age_group": age_group,
                "count": children_by_age_group[age_group]
            })
        
        # Get location info - get from Cabadbaran City configuration
        # Assuming Cabadbaran City is the primary municipality
        municipality = "Cabadbaran City"
        region = "Region XIII (CARAGA)"
        province = "Agusan del Norte"
        psgc = "053812000"  # Cabadbaran City PSGC code
        
        # Calculate coverage percentage
        # Coverage = (children measured / expected children 0-59m in area) * 100
        # Expected children = 12% of total population (demographic standard)
        expected_children_0_59 = max(1, total_population * 0.12)
        
        if children_0_59_months > 0:
            coverage_percentage = (children_0_59_months / expected_children_0_59) * 100
            coverage_percentage = min(100, coverage_percentage)  # Cap at 100%
        else:
            coverage_percentage = 0.0
        
        return {
            "province": province,
            "region": region,
            "municipality": municipality,
            "psgc": psgc,
            "total_population": total_population,
            "children_0_59_months": children_0_59_months,
            "coverage_percentage": coverage_percentage,
            "total_wfa": total_wfa,
            "total_hfa": total_hfa,
            "total_wflh": total_wflh,
            "age_group_data": age_group_data,
            "gender_breakdown": gender_breakdown,
            "summary": {
                "undernutrition_0_59": undernutrition_0_59,
                "overweight_0_59": overweight_0_59,
                "undernutrition_0_23": undernutrition_0_23,
                "overweight_0_23": overweight_0_23
            },
            "period": {
                "year": year,
                "month": month,
                "start_date": str(start_date),
                "end_date": str(end_date)
            }
        }
        
    except Exception as e:
        import traceback
        error_msg = f"Error generating OPT Plus report: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=error_msg)


@router.post("/import-measurements")
async def import_measurements(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Import children measurements from Excel file and save to Assessment Records.
    
    Expected columns in Excel:
    - full_name (required)
    - birth_date (required, YYYY-MM-DD format)
    - sex (required, M or F)
    - measurement_date (required, YYYY-MM-DD format)
    - weight_kg (required, decimal)
    - height_cm (required, decimal)
    - muac_cm (optional, decimal)
    - notes (optional)
    - child_id (optional, UUID - will create new child if not provided)
    
    Returns summary of imported records and any errors.
    """
    try:
        # Read Excel file
        contents = await file.read()
        wb = load_workbook(BytesIO(contents))
        ws = wb.active
        
        imported_count = 0
        error_count = 0
        errors = []
        imported_records = []
        
        # Get child records for faster lookup
        children_stmt = select(Child)
        children_result = await db.scalars(children_stmt)
        children_map = {str(child.id): child for child in children_result}
        
        # Process each row (skip header)
        for idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            try:
                if not row or all(cell is None for cell in row):
                    continue  # Skip empty rows
                
                # Extract values
                full_name = row[0]
                birth_date_val = row[1]
                sex_val = row[2]
                measurement_date_val = row[3]
                weight_kg = row[4]
                height_cm = row[5]
                muac_cm = row[6] if len(row) > 6 else None
                notes = row[7] if len(row) > 7 else None
                child_id_val = row[8] if len(row) > 8 else None
                
                # Validate required fields
                if not full_name or not birth_date_val or not sex_val:
                    errors.append(f"Row {idx}: Missing required fields (name, birth_date, sex)")
                    error_count += 1
                    continue
                
                if not measurement_date_val or weight_kg is None or height_cm is None:
                    errors.append(f"Row {idx}: Missing measurement data (date, weight, height)")
                    error_count += 1
                    continue
                
                # Convert date strings if necessary
                if isinstance(birth_date_val, str):
                    birth_date = datetime.strptime(birth_date_val, "%Y-%m-%d").date()
                else:
                    birth_date = birth_date_val
                
                if isinstance(measurement_date_val, str):
                    measurement_date = datetime.strptime(measurement_date_val, "%Y-%m-%d").date()
                else:
                    measurement_date = measurement_date_val
                
                # Normalize sex
                sex_normalized = "M" if str(sex_val).upper() in ["M", "MALE"] else "F"
                
                # Find or get child
                child = None
                if child_id_val:
                    child_id_str = str(child_id_val)
                    child = children_map.get(child_id_str)
                
                if not child:
                    # Try to find by name (case-insensitive)
                    name_search_stmt = select(Child).where(
                        Child.full_name.ilike(f"%{full_name}%")
                    )
                    child = (await db.scalars(name_search_stmt)).first()
                
                if not child:
                    errors.append(f"Row {idx}: Child '{full_name}' not found. Please add child first.")
                    error_count += 1
                    continue
                
                # Calculate age in months
                age_months = calculate_age_in_months(birth_date, measurement_date)
                
                # Validate age is in OPT Plus range
                if age_months > 71:
                    errors.append(f"Row {idx}: Child age {age_months} months exceeds OPT Plus range (0-71)")
                    error_count += 1
                    continue
                
                # Adjust height for position (assume standing for > 24 months, lying for < 24)
                position = "lying_down" if age_months < 24 else "standing"
                adjusted_height = adjust_height_for_position(height_cm, age_months, position)
                
                # Calculate full assessment
                assessment = calculate_full_opt_plus_assessment(
                    sex=sex_normalized,
                    age_months=age_months,
                    weight_kg=float(weight_kg),
                    height_cm=adjusted_height,
                    has_bilateral_edema=False
                )
                
                # Create Measurement record
                measurement = Measurement(
                    child_id=child.id,
                    measured_by=user.id,
                    measurement_date=measurement_date,
                    age_in_months=age_months,
                    weight_kg=float(weight_kg),
                    height_cm=adjusted_height,
                    muac_cm=float(muac_cm) if muac_cm else None,
                    waz=assessment["waz"],
                    haz=assessment["haz"],
                    whz=assessment["whz"],
                    waz_status=assessment["waz_status"],
                    haz_status=assessment["haz_status"],
                    whz_status=assessment["whz_status"],
                    overall_status=assessment["overall_status"]
                )
                
                db.add(measurement)
                imported_count += 1
                
                # Track imported record for response
                imported_records.append({
                    "child_name": child.full_name,
                    "age_months": age_months,
                    "weight_kg": float(weight_kg),
                    "height_cm": adjusted_height,
                    "status": assessment["overall_status"]
                })
                
            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")
                error_count += 1
                continue
        
        # Commit all records
        await db.commit()
        
        return {
            "success": True,
            "imported": imported_count,
            "errors": error_count,
            "error_details": errors[:10],  # Return first 10 errors
            "imported_records": imported_records,
            "message": f"Successfully imported {imported_count} measurements"
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
