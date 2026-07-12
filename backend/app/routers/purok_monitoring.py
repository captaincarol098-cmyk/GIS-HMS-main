from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, date
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import Child, Measurement, Purok, Barangay, NutritionProgram, User
from ..services.analytics import EXCLUDED_BARANGAYS
from ..utils.who_zscore import calculate_prevalence, classify_risk_level

router = APIRouter(prefix="/api/purok-monitoring", tags=["purok-monitoring"])


@router.get("")
async def purok_monitoring(
    year: int = Query(None, description="Filter data by year"),
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    from ..services.analytics import latest_measurements

    # Default to current year if not specified
    if year is None:
        year = date.today().year

    if user.role.value == "admin" and user.barangay_id:
        puroks = list((await db.scalars(
            select(Purok).where(Purok.barangay_id == user.barangay_id).order_by(Purok.name)
        )).all())
    else:
        puroks = list((await db.scalars(
            select(Purok).order_by(Purok.name)
        )).all())

    # Build year filter
    start_date = datetime(year, 1, 1).date()
    end_date = datetime(year, 12, 31).date()
    year_filter = [Measurement.measurement_date.between(start_date, end_date)]

    # Get ALL measurements (not just latest) to match OPT+ count
    # This is what Operation Timbang Plus uses as the basis
    # CRITICAL: Filter by user's barangay to avoid mixing data from other barangays
    all_meas = (await db.scalars(
        select(Measurement)
        .join(Child, Child.id == Measurement.child_id)
        .join(Barangay, Barangay.id == Child.barangay_id)
        .where(
            Barangay.name.notin_(EXCLUDED_BARANGAYS),
            Child.barangay_id == user.barangay_id if user.role.value == "admin" else True, 
            *year_filter
        )
        .options(selectinload(Measurement.child).selectinload(Child.purok))
    )).all()
    
    # Also get latest measurements for nutritional status analysis (filtered by year)
    latest_meas = await latest_measurements(db, user.barangay_id if user.role.value == "admin" else None, year)
    
    meas_by_purok: dict = {}
    latest_by_purok: dict = {}
    
    for m in all_meas:
        pid = m.child.purok_id
        if pid not in meas_by_purok:
            meas_by_purok[pid] = []
        meas_by_purok[pid].append(m)
    
    for m in latest_meas:
        pid = m.child.purok_id
        if pid not in latest_by_purok:
            latest_by_purok[pid] = []
        latest_by_purok[pid].append(m)

    result = []
    for p in puroks:
        p_meas_all = meas_by_purok.get(p.id, [])  # All records (OPT+ count)
        p_meas_latest = latest_by_purok.get(p.id, [])  # Latest for status
        
        prev = calculate_prevalence(p_meas_latest) if p_meas_latest else {"wasting_rate": 0, "stunting_rate": 0, "underweight_rate": 0}
        risk_level = classify_risk_level(prev) if p_meas_latest else "low"
        risk_score = prev.get("wasting_rate", 0) * 0.4 + prev.get("stunting_rate", 0) * 0.3 + prev.get("underweight_rate", 0) * 0.3
        
        total_records = len(p_meas_all)  # All measurement records (OPT+ count)
        total_children = len(set(m.child_id for m in p_meas_all))  # Unique children
        
        active = sum(1 for m in p_meas_latest if m.overall_status.value != "normal")
        recovered = sum(1 for m in p_meas_latest if m.overall_status.value == "normal")
        
        programs = await db.scalar(
            select(func.count(NutritionProgram.id)).where(NutritionProgram.purok_id == p.id)
        ) or 0
        
        result.append({
            "id": str(p.id),
            "name": f"{p.name} ({p.barangay.name if p.barangay else ''})",
            "total_records": total_records,  # All measurement records (OPT+ count)
            "total_children": total_children,  # Unique children
            "active_cases": active,
            "recovered_cases": recovered,
            "programs_conducted": programs,
            "risk_level": risk_level,
            "risk_score": round(risk_score, 1),
            "prevalence_rate": round(prev.get("wasting_rate", 0), 1),
            "population": total_records,  # Using record count as population
            "trend": "up" if active > recovered else "down" if recovered > active else "stable",
        })
    return result
