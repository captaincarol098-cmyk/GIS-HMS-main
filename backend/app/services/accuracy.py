"""
GIS Accuracy Validation Service
Calculates and tracks data accuracy for barangays
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date
from uuid import UUID
from typing import Optional
from ..models import LocationAccuracy, Child, Measurement, User


async def calculate_accuracy(
    db: AsyncSession,
    barangay_id: UUID,
    measurement_date: date,
    verified_count: int,
    created_by_user_id: Optional[UUID] = None,
    notes: Optional[str] = None
) -> dict:
    """
    Calculate and store GIS accuracy for a barangay.
    
    Formula: Accuracy = (1 - |Expected - Actual| / Expected) × 100%
    
    Args:
        db: Database session
        barangay_id: Barangay ID
        measurement_date: Date to check accuracy for
        verified_count: Manually verified children count (expected)
        created_by_user_id: User who performed verification
        notes: Additional notes about verification
    
    Returns:
        {
            "expected": 150,
            "actual": 145,
            "accuracy_pct": 96.7,
            "is_reliable": true,
            "message": "✅ Data is reliable for heatmap display"
        }
    """
    
    # Get system count (children with measurements on that date in this barangay)
    system_count = await db.scalar(
        select(func.count(func.distinct(Measurement.child_id))).where(
            Measurement.measurement_date == measurement_date,
            Child.barangay_id == barangay_id
        ).join(Child)
    ) or 0
    
    # Calculate accuracy
    if verified_count == 0:
        accuracy_pct = 0.0
    else:
        diff = abs(verified_count - system_count)
        accuracy_pct = (1 - (diff / verified_count)) * 100
    
    # Round to 1 decimal place
    accuracy_pct = round(accuracy_pct, 1)
    
    # Determine reliability (95% or higher is reliable)
    is_reliable = accuracy_pct >= 95.0
    
    # Store in database
    record = LocationAccuracy(
        barangay_id=barangay_id,
        measurement_date=measurement_date,
        expected_count=verified_count,
        actual_count=system_count,
        accuracy_pct=accuracy_pct,
        is_reliable=is_reliable,
        created_by_user_id=created_by_user_id,
        notes=notes
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    
    return {
        "id": str(record.id),
        "expected": verified_count,
        "actual": system_count,
        "accuracy_pct": accuracy_pct,
        "is_reliable": is_reliable,
        "message": "✅ Data is reliable for heatmap display" if is_reliable 
                   else f"⚠️ Accuracy {accuracy_pct}% is below 95% threshold"
    }


async def get_latest_accuracy(
    db: AsyncSession,
    barangay_id: UUID
) -> Optional[dict]:
    """Get latest accuracy record for a barangay"""
    
    latest = await db.scalar(
        select(LocationAccuracy)
        .where(LocationAccuracy.barangay_id == barangay_id)
        .order_by(LocationAccuracy.measurement_date.desc())
        .limit(1)
    )
    
    if not latest:
        return None
    
    return {
        "id": str(latest.id),
        "expected": latest.expected_count,
        "actual": latest.actual_count,
        "accuracy_pct": latest.accuracy_pct,
        "is_reliable": latest.is_reliable,
        "measurement_date": latest.measurement_date.isoformat(),
        "created_at": latest.created_at.isoformat(),
        "notes": latest.notes
    }


async def get_accuracy_history(
    db: AsyncSession,
    barangay_id: UUID,
    limit: int = 12
) -> list:
    """Get accuracy history for a barangay (last N records)"""
    
    records = await db.scalars(
        select(LocationAccuracy)
        .where(LocationAccuracy.barangay_id == barangay_id)
        .order_by(LocationAccuracy.measurement_date.desc())
        .limit(limit)
    )
    
    return [
        {
            "id": str(r.id),
            "expected": r.expected_count,
            "actual": r.actual_count,
            "accuracy_pct": r.accuracy_pct,
            "is_reliable": r.is_reliable,
            "measurement_date": r.measurement_date.isoformat()
        }
        for r in records
    ]


async def get_all_barangay_accuracy(
    db: AsyncSession
) -> list:
    """Get latest accuracy for all barangays"""
    
    # Subquery to get latest record per barangay
    latest_per_barangay = select(
        LocationAccuracy.barangay_id,
        func.max(LocationAccuracy.measurement_date).label('latest_date')
    ).group_by(LocationAccuracy.barangay_id).subquery()
    
    # Main query
    records = await db.scalars(
        select(LocationAccuracy).join(
            latest_per_barangay,
            (LocationAccuracy.barangay_id == latest_per_barangay.c.barangay_id) &
            (LocationAccuracy.measurement_date == latest_per_barangay.c.latest_date)
        )
    )
    
    return [
        {
            "barangay_id": str(r.barangay_id),
            "expected": r.expected_count,
            "actual": r.actual_count,
            "accuracy_pct": r.accuracy_pct,
            "is_reliable": r.is_reliable,
            "measurement_date": r.measurement_date.isoformat()
        }
        for r in records
    ]
