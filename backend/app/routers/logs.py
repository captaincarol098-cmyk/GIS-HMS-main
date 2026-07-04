from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import ActivityLog, User

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("")
async def logs(
    action: str | None = None,
    log_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(ActivityLog).order_by(ActivityLog.created_at.desc())
    if user.role.value == "admin":
        stmt = stmt.join(User, User.id == ActivityLog.user_id).where(User.barangay_id == user.barangay_id)
    if action:
        stmt = stmt.where(ActivityLog.action == action)
    if log_date:
        stmt = stmt.where(func.date(ActivityLog.created_at) == log_date)
    return list((await db.scalars(stmt)).all())


@router.get("/actions")
async def log_actions(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(ActivityLog.action).distinct().order_by(ActivityLog.action)
    if user.role.value == "admin":
        stmt = stmt.join(User, User.id == ActivityLog.user_id).where(User.barangay_id == user.barangay_id)
    rows = await db.execute(stmt)
    return [row[0] for row in rows.all()]
