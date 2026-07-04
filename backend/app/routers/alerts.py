from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.rbac import get_current_user, require_super_admin
from ..models import Alert, Child, User
from ..services.audit import log_activity
from ..services.websocket import manager
from ..services.population_alerts import generate_population_alerts, get_alert_configuration

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(
    severity: str | None = None,
    is_resolved: bool | None = None,
    year: int = Query(2025, description="Filter alerts by year"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List alerts with optional year filtering for historical analysis"""
    stmt = select(Alert).join(Child, Child.id == Alert.child_id).order_by(Alert.created_at.desc())
    
    # Filter by user's barangay if admin
    if user.role.value == "admin":
        stmt = stmt.where(Child.barangay_id == user.barangay_id)
    
    # Filter by severity
    if severity:
        stmt = stmt.where(Alert.severity == severity)
    
    # Filter by resolution status
    if is_resolved is not None:
        stmt = stmt.where(Alert.is_resolved == is_resolved)
    
    # Year filter - filter by created_at date
    if year:
        start_date = datetime(year, 1, 1).date()
        end_date = datetime(year, 12, 31).date()
        stmt = stmt.where(func.date(Alert.created_at).between(start_date, end_date))
    
    return list((await db.scalars(stmt)).all())


@router.put("/{alert_id}/resolve")
async def resolve_alert(alert_id: UUID, request: Request, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    alert = await db.get(Alert, alert_id)
    alert.is_resolved = True
    alert.resolved_by = user.id
    alert.resolved_at = datetime.now(timezone.utc)
    await log_activity(db, user.id, "RESOLVE_ALERT", "alerts", str(alert.id), {}, request.client.host if request.client else None)
    await db.commit()
    
    # Broadcast WebSocket message for real-time dashboard updates
    await manager.broadcast(
        "alert_resolved",
        {
            "alert_id": str(alert.id),
            "child_id": str(alert.child_id),
            "severity": alert.severity.value,
            "resolved_by": str(user.id),
            "resolved_at": alert.resolved_at.isoformat()
        },
        str(alert.child.barangay_id) if alert.child else None
    )
    
    return {"ok": True}


@router.post("/generate-batch")
async def generate_batch():
    return {"ok": True, "message": "Measurements already generate alerts automatically."}


@router.post("/generate-population-alerts")
async def generate_population_alerts_endpoint(
    barangay_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin)
):
    """
    Generate population-level alerts based on prevalence thresholds and trends.
    Only accessible by City Health Office (super_admin).
    
    - Checks absolute thresholds (e.g., wasting ≥ 5%)
    - Checks trend deterioration (e.g., 25% increase over 3 months)
    - Filters children aged 0-59 months (0-5 years)
    """
    result = await generate_population_alerts(db, barangay_id)
    
    # Broadcast to all connected clients if alerts were created
    if result["alerts_created"] > 0:
        await manager.broadcast(
            "population_alerts_generated",
            {
                "alerts_created": result["alerts_created"],
                "barangays_checked": result["barangays_checked"]
            }
        )
    
    return result


@router.get("/alert-configuration")
async def alert_configuration(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get current alert threshold configuration.
    Shows the multi-tier thresholds and target age range.
    """
    return await get_alert_configuration(db)


@router.get("/unread-count")
async def unread_count(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = await list_alerts(is_resolved=False, db=db, user=user)
    return {"count": sum(1 for a in rows if a.severity.value in {"critical", "high"})}
