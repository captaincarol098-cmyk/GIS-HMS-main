"""
Security management endpoints for super admin
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import User, UserRole, SecurityAlert
from ..models.entities import ActivityLog, ActivityLogType
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


@router.delete("/data/delete-all")
async def delete_all_data(
    confirm: str = Query(..., description="Type 'DELETE ALL DATA' to confirm"),
    children: bool = Query(True, description="Delete children records"),
    measurements: bool = Query(True, description="Delete measurements"),
    alerts: bool = Query(True, description="Delete alerts"),
    referrals: bool = Query(True, description="Delete referrals"),
    reports: bool = Query(True, description="Delete reports"),
    notifications: bool = Query(True, description="Delete notifications"),
    programs: bool = Query(True, description="Delete nutrition programs"),
    homeVisits: bool = Query(True, description="Delete home visits"),
    cases: bool = Query(True, description="Delete cases"),
    messages: bool = Query(True, description="Delete messages"),
    calendar: bool = Query(True, description="Delete calendar events"),
    households: bool = Query(True, description="Delete households"),
    budgets: bool = Query(True, description="Delete project budgets"),
    logs: bool = Query(True, description="Delete activity logs"),
    imports: bool = Query(True, description="Delete import jobs"),
    users: bool = Query(False, description="Delete admin users (superadmin will be preserved)"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete selected data from all barangays - Super admin only
    
    This will delete only the selected data types.
    
    This will ALWAYS preserve:
    - Barangays (kept intact)
    - Puroks (kept intact)
    - Current super_admin account (cannot delete yourself)
    - System settings (kept intact)
    """
    if user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can delete all data")
    
    # Require exact confirmation string
    if confirm != "DELETE ALL DATA":
        raise HTTPException(
            status_code=400, 
            detail="Confirmation failed. Please type 'DELETE ALL DATA' exactly to confirm."
        )
    
    try:
        from ..models.entities import (
            Child, Measurement, Alert, Referral, Report, Notification,
            ActivityLog, BulkImportJob, ProgramParticipant, NutritionProgram,
            HomeVisit, MalnutritionCase, CaseStatusHistory, Message, CalendarEvent,
            ProjectBudget, ProgramSession, CaseActionPlan, Household, LocationAccuracy
        )
        from sqlalchemy import delete
        
        deleted_counts = {}
        
        # Delete in order to respect foreign key constraints
        # CRITICAL: Delete child tables before parent tables
        
        # 1. Delete alerts first (references measurements)
        if alerts:
            result = await db.execute(delete(Alert))
            deleted_counts['alerts'] = result.rowcount
        
        # 2. Delete dependent records for cases
        if cases:
            # Case action plans
            result = await db.execute(delete(CaseActionPlan))
            deleted_counts['case_action_plans'] = result.rowcount
            
            # Case status history
            result = await db.execute(delete(CaseStatusHistory))
            deleted_counts['case_status_history'] = result.rowcount
            
            # Malnutrition cases
            result = await db.execute(delete(MalnutritionCase))
            deleted_counts['cases'] = result.rowcount
        
        # 3. Location accuracy records
        result = await db.execute(delete(LocationAccuracy))
        deleted_counts['location_accuracy'] = result.rowcount
        
        # 4. Delete programs and related data
        if programs:
            # Program participants
            result = await db.execute(delete(ProgramParticipant))
            deleted_counts['program_participants'] = result.rowcount
            
            # Program sessions
            result = await db.execute(delete(ProgramSession))
            deleted_counts['program_sessions'] = result.rowcount
            
            # Nutrition programs
            result = await db.execute(delete(NutritionProgram))
            deleted_counts['nutrition_programs'] = result.rowcount
        
        # 5. Delete other data
        if budgets:
            result = await db.execute(delete(ProjectBudget))
            deleted_counts['project_budgets'] = result.rowcount
        
        if calendar:
            result = await db.execute(delete(CalendarEvent))
            deleted_counts['calendar_events'] = result.rowcount
        
        if messages:
            result = await db.execute(delete(Message))
            deleted_counts['messages'] = result.rowcount
        
        if homeVisits:
            result = await db.execute(delete(HomeVisit))
            deleted_counts['home_visits'] = result.rowcount
        
        if referrals:
            result = await db.execute(delete(Referral))
            deleted_counts['referrals'] = result.rowcount
        
        if reports:
            result = await db.execute(delete(Report))
            deleted_counts['reports'] = result.rowcount
        
        if notifications:
            result = await db.execute(delete(Notification))
            deleted_counts['notifications'] = result.rowcount
        
        # 6. Delete measurements (after alerts)
        if measurements:
            result = await db.execute(delete(Measurement))
            deleted_counts['measurements'] = result.rowcount
        
        # 7. Delete children (after measurements)
        if children:
            result = await db.execute(delete(Child))
            deleted_counts['children'] = result.rowcount
        
        # 8. Delete households
        if households:
            result = await db.execute(delete(Household))
            deleted_counts['households'] = result.rowcount
        
        # 9. Delete remaining data
        if logs:
            result = await db.execute(delete(ActivityLog))
            deleted_counts['activity_logs'] = result.rowcount
        
        if imports:
            result = await db.execute(delete(BulkImportJob))
            deleted_counts['bulk_import_jobs'] = result.rowcount
        
        # 10. Delete admin users (preserve current superadmin)
        if users:
            from sqlalchemy import and_
            result = await db.execute(
                delete(User).where(
                    and_(
                        User.role == UserRole.admin,
                        User.id != user.id  # Don't delete current user
                    )
                )
            )
            deleted_counts['admin_users'] = result.rowcount
        
        # Commit all deletions
        await db.commit()
        
        # Log this action
        log = ActivityLog(
            user_id=user.id,
            action="data_purge_selective",
            action_type=ActivityLogType.report_generated,  # Using closest available type
            resource_type="system",
            resource_id=None,
            details={
                "description": f"Super admin {user.username} deleted selected data from all barangays",
                "deleted_counts": deleted_counts
            }
        )
        db.add(log)
        await db.commit()
        
        total_deleted = sum(deleted_counts.values())
        
        return {
            "ok": True,
            "message": f"Successfully deleted selected data from all barangays. Total records deleted: {total_deleted}",
            "deleted_counts": deleted_counts,
            "preserved": {
                "barangays": "All barangay records preserved",
                "puroks": "All purok records preserved",
                "superadmin": f"Your super_admin account ({user.username}) preserved",
                "admin_users": "Preserved" if not users else f"Deleted {deleted_counts.get('admin_users', 0)} admin users",
                "system_settings": "All system settings preserved"
            }
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete data: {str(e)}"
        )
