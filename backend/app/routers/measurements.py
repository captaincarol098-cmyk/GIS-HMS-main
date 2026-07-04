from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ..database import get_db
from ..middleware.rbac import assert_barangay_scope, get_current_user
from ..models import Child, Measurement, User
from ..schemas.common import MeasurementCreate
from ..services.alerts import alerts_for_measurement
from ..services.audit import log_activity
from ..utils.who_zscore import calculate_full_assessment
from ..services.websocket import manager

router = APIRouter(prefix="/api/measurements", tags=["measurements"])


def age_months(birth_date: date, measurement_date: date) -> int:
    return max(0, (measurement_date.year - birth_date.year) * 12 + measurement_date.month - birth_date.month - (1 if measurement_date.day < birth_date.day else 0))


async def build_measurement(body: MeasurementCreate, child: Child, user: User | None) -> Measurement:
    age = age_months(child.birth_date, body.measurement_date)
    
    # Validate target age range: 0-59 months (0-5 years)
    if age > 59:
        raise HTTPException(
            400,
            f"Child is {age} months old, which is outside the target age range of 0-59 months (0-5 years). "
            "This system focuses on children under 5 years old."
        )
    
    assessment = calculate_full_assessment(child.sex.value, age, body.weight_kg, body.height_cm)
    return Measurement(child_id=child.id, measured_by=user.id if user else None, measurement_date=body.measurement_date, age_in_months=age, weight_kg=body.weight_kg, height_cm=body.height_cm, muac_cm=body.muac_cm, **assessment)


@router.post("")
async def create_measurement(body: MeasurementCreate, request: Request, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    child = await db.get(Child, body.child_id)
    if not child:
        raise HTTPException(404, "Child not found")
    assert_barangay_scope(user, child.barangay_id)
    measurement = await build_measurement(body, child, user)
    db.add(measurement)
    await db.flush()
    for alert in alerts_for_measurement(child, measurement):
        db.add(alert)
    await log_activity(db, user.id, "ADD_MEASUREMENT", "measurements", str(measurement.id), {}, request.client.host if request.client else None)
    await db.commit()
    
    # Broadcast WebSocket message for real-time dashboard updates
    await manager.broadcast(
        "measurement_created",
        {
            "measurement_id": str(measurement.id),
            "child_id": str(child.id),
            "barangay_id": str(child.barangay_id),
            "status": measurement.overall_status,
            "age_months": measurement.age_in_months,
            "weight_kg": float(measurement.weight_kg),
            "height_cm": float(measurement.height_cm)
        },
        str(child.barangay_id)
    )
    
    await db.refresh(measurement)
    return measurement


@router.put("/{measurement_id}")
async def update_measurement(measurement_id: UUID, body: MeasurementCreate, request: Request, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    measurement = await db.get(Measurement, measurement_id)
    child = await db.get(Child, body.child_id)
    if not measurement or not child:
        raise HTTPException(404, "Measurement not found")
    assert_barangay_scope(user, child.barangay_id)
    updated = await build_measurement(body, child, user)
    for key in ["measurement_date", "age_in_months", "weight_kg", "height_cm", "muac_cm", "waz", "haz", "whz", "waz_status", "haz_status", "whz_status", "overall_status"]:
        setattr(measurement, key, getattr(updated, key))
    await log_activity(db, user.id, "UPDATE_MEASUREMENT", "measurements", str(measurement.id), {}, request.client.host if request.client else None)
    await db.commit()
    
    # Broadcast WebSocket message for real-time dashboard updates
    await manager.broadcast(
        "measurement_updated",
        {
            "measurement_id": str(measurement.id),
            "child_id": str(child.id),
            "barangay_id": str(child.barangay_id),
            "status": measurement.overall_status,
            "age_months": measurement.age_in_months,
            "weight_kg": float(measurement.weight_kg),
            "height_cm": float(measurement.height_cm)
        },
        str(child.barangay_id)
    )
    
    await db.refresh(measurement)
    return measurement


@router.delete("/{measurement_id}")
async def delete_measurement(measurement_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    measurement = await db.scalar(select(Measurement).options(selectinload(Measurement.child)).where(Measurement.id == measurement_id))
    if not measurement:
        raise HTTPException(404, "Measurement not found")
    assert_barangay_scope(user, measurement.child.barangay_id)
    
    child_barangay_id = measurement.child.barangay_id
    
    await db.delete(measurement)
    await db.commit()
    
    # Broadcast WebSocket message for real-time dashboard updates
    await manager.broadcast(
        "measurement_deleted",
        {
            "measurement_id": str(measurement_id),
            "child_id": str(measurement.child.id),
            "barangay_id": str(child_barangay_id)
        },
        str(child_barangay_id)
    )
    
    return {"ok": True}


@router.get("/latest")
async def latest(barangay_id: UUID | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    from ..services.analytics import latest_measurements
    if user.role.value == "admin":
        barangay_id = user.barangay_id
    return await latest_measurements(db, barangay_id)
