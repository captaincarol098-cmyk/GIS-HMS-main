"""
Security management endpoints for super admin
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import User, UserRole, SecurityAlert
from ..services.security_service import (
    get_security_alerts_for_superadmin,
    resolve_security_alert,
)

router = APIRouter(prefix="/api/security", tags=["security"])


@router.get("/alerts")
async def get_security_alerts(
    limit: int = Query(50, ge=1, le=200),
    unresolved_only: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get security alerts - Super admin only"""
    if user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can access security alerts")
    
    alerts = await get_security_alerts_for_superadmin(db, limit=limit, unresolved_only=unresolved_only)
    return {"alerts": alerts, "total": len(alerts)}


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: UUID,
    notes: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resolve a security alert - Super admin only"""
    if user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can resolve alerts")
    
    success = await resolve_security_alert(db, alert_id, user.id, notes)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"ok": True, "message": "Alert marked as resolved"}


@router.post("/users/{user_id}/unlock")
async def unlock_account(
    user_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually unlock a locked account - Super admin only"""
    if user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can unlock accounts")
    
    target_user = await db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Unlock account
    from ..models.entities import AccountStatus
    target_user.account_status = AccountStatus.active
    target_user.failed_login_attempts = 0
    target_user.account_locked_until = None
    db.add(target_user)
    await db.commit()
    
    return {
        "ok": True,
        "message": f"Account unlocked for {target_user.username}",
        "user": {
            "id": str(target_user.id),
            "username": target_user.username,
            "account_status": target_user.account_status.value,
        }
    }


@router.post("/users/{user_id}/reset-attempts")
async def reset_login_attempts(
    user_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually reset failed login attempts - Super admin only"""
    if user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can reset login attempts")
    
    target_user = await db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_attempts = target_user.failed_login_attempts
    target_user.failed_login_attempts = 0
    target_user.last_failed_login = None
    db.add(target_user)
    await db.commit()
    
    return {
        "ok": True,
        "message": f"Reset login attempts for {target_user.username}",
        "user": {
            "id": str(target_user.id),
            "username": target_user.username,
            "previous_failed_attempts": old_attempts,
            "current_failed_attempts": 0,
        }
    }


@router.get("/users/{user_id}/status")
async def get_user_security_status(
    user_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get security status of a user - Super admin only"""
    if user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can view security status")
    
    target_user = await db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user": {
            "id": str(target_user.id),
            "username": target_user.username,
            "email": target_user.email,
            "role": target_user.role.value,
            "is_active": target_user.is_active,
            "account_status": target_user.account_status.value,
        },
        "security": {
            "failed_login_attempts": target_user.failed_login_attempts,
            "last_failed_login": target_user.last_failed_login.isoformat() if target_user.last_failed_login else None,
            "account_locked_until": target_user.account_locked_until.isoformat() if target_user.account_locked_until else None,
            "last_login": target_user.last_login.isoformat() if target_user.last_login else None,
        }
    }
