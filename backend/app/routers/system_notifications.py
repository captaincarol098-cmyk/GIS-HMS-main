"""
System Notifications API
Manage in-app notifications for messages, report submissions, approvals, etc.
"""
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import Notification, NotificationType, User

router = APIRouter(prefix="/api/system-notifications", tags=["system-notifications"])


@router.get("")
async def list_notifications(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get notifications for current user"""
    stmt = select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())
    
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    
    notifications = (await db.scalars(stmt)).all()
    
    return [
        {
            "id": str(n.id),
            "type": n.type.value,
            "title": n.title,
            "message": n.message,
            "link": n.link,
            "is_read": n.is_read,
            "related_id": n.related_id,
            "created_at": n.created_at.isoformat(),
            "read_at": n.read_at.isoformat() if n.read_at else None,
        }
        for n in notifications
    ]


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Mark a notification as read"""
    notif = await db.get(Notification, notification_id)
    
    if not notif:
        raise HTTPException(404, "Notification not found")
    
    if notif.user_id != user.id:
        raise HTTPException(403, "Not your notification")
    
    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {"success": True}


@router.post("/mark-all-read")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Mark all notifications as read for current user"""
    stmt = select(Notification).where(
        Notification.user_id == user.id,
        Notification.is_read.is_(False)
    )
    
    notifications = (await db.scalars(stmt)).all()
    
    for notif in notifications:
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return {"success": True, "count": len(notifications)}


async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    type: NotificationType,
    title: str,
    message: str,
    link: str | None = None,
    related_id: str | None = None
):
    """Helper function to create notifications"""
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link,
        related_id=related_id
    )
    db.add(notification)
    await db.commit()
    return notification
