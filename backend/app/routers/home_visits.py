from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import HomeVisit, HomeVisitStatus, User

router = APIRouter(prefix="/api/home-visits", tags=["home-visits"])


class HomeVisitOut(BaseModel):
    id: str
    child_name: str
    child_id: str
    parent_name: str
    address: str
    purok: str
    scheduled_date: str
    scheduled_time: str
    assigned_bns: str
    status: str
    findings: str | None = None
    recommendations: str | None = None
    gps_verified: bool = False
    photos: list = []


@router.get("")
async def list_home_visits(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(HomeVisit).order_by(HomeVisit.scheduled_date.desc())
    if user.role.value == "admin" and user.barangay_id:
        from ..models import Child
        stmt = stmt.join(Child, HomeVisit.child_id == Child.id).where(Child.barangay_id == user.barangay_id)
    rows = list((await db.scalars(stmt)).all())
    result = []
    for r in rows:
        child = r.child
        result.append(HomeVisitOut(
            id=str(r.id),
            child_name=child.full_name if child else "Unknown",
            child_id=str(r.child_id),
            parent_name=child.guardian_name if child else "Unknown",
            address=f"{child.purok.name if child and child.purok else ''}, {child.barangay.name if child and child.barangay else ''}" if child else "",
            purok=child.purok.name if child and child.purok else "",
            scheduled_date=r.scheduled_date.isoformat() if isinstance(r.scheduled_date, date) else str(r.scheduled_date),
            scheduled_time=r.scheduled_time,
            assigned_bns=r.assigned_user.username if r.assigned_user else "Unassigned",
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            findings=r.findings,
            recommendations=r.recommendations,
            gps_verified=r.gps_verified,
        ))
    return result


class ScheduleVisitIn(BaseModel):
    child_id: str
    scheduled_date: str
    scheduled_time: str
    assigned_to: str | None = None
    notes: str | None = None


@router.post("")
async def schedule_visit(body: ScheduleVisitIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    from ..models import Child
    child = await db.get(Child, UUID(body.child_id))
    if not child:
        raise HTTPException(404, "Child not found")
    visit = HomeVisit(
        child_id=UUID(body.child_id),
        scheduled_date=date.fromisoformat(body.scheduled_date),
        scheduled_time=body.scheduled_time,
        assigned_to=UUID(body.assigned_to) if body.assigned_to else None,
        notes=body.notes,
    )
    db.add(visit)
    await db.commit()
    await db.refresh(visit)
    return {"id": str(visit.id), "status": "created"}


@router.post("/{visit_id}/complete")
async def complete_visit(visit_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    visit = await db.get(HomeVisit, visit_id)
    if not visit:
        raise HTTPException(404, "Home visit not found")
    visit.status = HomeVisitStatus.completed
    await db.commit()
    return {"id": str(visit.id), "status": "completed"}
