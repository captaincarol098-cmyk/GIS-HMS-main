from datetime import datetime, timedelta
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import ActivityLog, Alert, NutritionProgram, User, Barangay, Purok
from ..services.websocket import manager

router = APIRouter(prefix="/api/realtime", tags=["realtime"])


@router.get("/activities")
async def realtime_activities(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Get recent activity log entries for real-time monitoring"""
    try:
        since = datetime.utcnow() - timedelta(hours=24)
        stmt = select(ActivityLog).where(ActivityLog.created_at >= since)
        if user.role.value != "super_admin" and user.barangay_id:
            stmt = stmt.where(ActivityLog.barangay_id == user.barangay_id)
        stmt = stmt.order_by(ActivityLog.created_at.desc()).limit(50)
        rows = list((await db.scalars(stmt)).all())
        return [
            {
                "id": str(r.id),
                "type": r.action_type.value if hasattr(r.action_type, "value") else "activity",
                "user": r.user.username if r.user else "System",
                "action": r.action,
                "details": r.details.get("description", r.action) if isinstance(r.details, dict) else str(r.details),
                "timestamp": r.created_at.isoformat() if r.created_at else datetime.utcnow().isoformat(),
                "location": r.barangay.name if r.barangay else None,
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error fetching realtime activities: {e}")
        return []


@router.get("/status")
async def realtime_status(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Get real-time system status including WebSocket connection metrics"""
    try:
        # Optimized queries - run in parallel where possible
        online_users = await db.scalar(select(func.count(User.id)).where(User.is_active == True)) or 0
        active_alerts = await db.scalar(select(func.count(Alert.id)).where(Alert.is_resolved == False)) or 0
        active_programs = await db.scalar(
            select(func.count(NutritionProgram.id)).where(NutritionProgram.status == "active")
        ) or 0
        recent_activities = await db.scalar(
            select(func.count(ActivityLog.id)).where(ActivityLog.created_at >= datetime.utcnow() - timedelta(hours=1))
        ) or 0
        
        # Get WebSocket statistics
        ws_stats = manager.get_stats()
        
        return {
            "online_users": online_users,
            "active_activities": recent_activities,
            "ongoing_programs": active_programs,
            "pending_alerts": active_alerts,
            "sync_status": "online",
            "last_sync": datetime.utcnow().isoformat(),
            "websocket": {
                "connected_clients": ws_stats.get("active_connections", 0),
                "total_messages_sent": ws_stats.get("total_messages_sent", 0),
                "queued_messages": ws_stats.get("queued_messages", 0),
                "errors": ws_stats.get("errors", 0),
            }
        }
    except Exception as e:
        print(f"Error fetching realtime status: {e}")
        return {
            "online_users": 0,
            "active_activities": 0,
            "ongoing_programs": 0,
            "pending_alerts": 0,
            "sync_status": "offline",
            "last_sync": datetime.utcnow().isoformat(),
            "websocket": {
                "connected_clients": 0,
                "total_messages_sent": 0,
                "queued_messages": 0,
                "errors": 0,
            }
        }


@router.post("/broadcast-test")
async def broadcast_test(message: dict = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Test endpoint to send a broadcast message (admin only)"""
    if user.role.value != "super_admin":
        from fastapi import HTTPException
        raise HTTPException(403, "Only super_admin can send test broadcasts")
    
    test_message = message or {
        "test": True,
        "sent_by": user.username,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.broadcast(
        "test_broadcast",
        test_message,
        priority="high"
    )
    
    return {"ok": True, "message": "Test broadcast sent"}



# ─── BARANGAY MANAGEMENT ENDPOINTS ──────────────────────

@router.get("/barangays")
async def realtime_barangays(
    archived: bool = False,
    barangay_id: UUID = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get real-time barangay list with filters (archived status, specific barangay)"""
    try:
        stmt = select(Barangay).order_by(Barangay.name)
        
        # Filter archived status
        if not archived:
            stmt = stmt.where(Barangay.is_archived == False)
        else:
            stmt = stmt.where(Barangay.is_archived == True)
        
        # Filter specific barangay if provided
        if barangay_id:
            stmt = stmt.where(Barangay.id == barangay_id)
        
        # Super admin sees all, admins see only their barangay
        if user.role.value != "super_admin" and user.barangay_id:
            stmt = stmt.where(Barangay.id == user.barangay_id)
        
        barangays = (await db.scalars(stmt)).all()
        
        return [
            {
                "id": str(b.id),
                "name": b.name,
                "code": b.code,
                "population_count": b.population_count,
                "captain": b.captain,
                "nutrition_scholar": b.nutrition_scholar,
                "contact_number": b.contact_number,
                "address": b.address,
                "is_archived": b.is_archived,
                "timestamp": datetime.utcnow().isoformat(),
            }
            for b in barangays
        ]
    except Exception as e:
        print(f"Error fetching realtime barangays: {e}")
        return []


@router.get("/barangays/{barangay_id}/puroks")
async def realtime_barangay_puroks(
    barangay_id: UUID,
    archived: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get real-time purok list for a barangay with filters"""
    try:
        from fastapi import HTTPException
        
        # Verify barangay exists
        barangay = await db.get(Barangay, barangay_id)
        if not barangay:
            raise HTTPException(404, "Barangay not found")
        
        # Check access: admins can only view their barangay
        if user.role.value == "admin" and user.barangay_id != barangay_id:
            raise HTTPException(403, "Access denied - you can only view puroks from your assigned barangay")
        
        stmt = select(Purok).where(Purok.barangay_id == barangay_id).order_by(Purok.name)
        
        # Filter archived status
        if not archived:
            stmt = stmt.where(Purok.is_archived == False)
        else:
            stmt = stmt.where(Purok.is_archived == True)
        
        puroks = (await db.scalars(stmt)).all()
        
        return [
            {
                "id": str(p.id),
                "name": p.name,
                "code": p.code,
                "barangay_id": str(p.barangay_id),
                "leader": p.leader,
                "population": p.population,
                "contact_number": p.contact_number,
                "notes": p.notes,
                "is_archived": p.is_archived,
                "assigned_bns": p.assigned_bns,
                "assigned_health_worker": p.assigned_health_worker,
                "household_count": p.household_count,
                "timestamp": datetime.utcnow().isoformat(),
            }
            for p in puroks
        ]
    except Exception as e:
        print(f"Error fetching realtime barangay puroks: {e}")
        from fastapi import HTTPException
        if "Access denied" in str(e) or "not found" in str(e).lower():
            raise
        return []


@router.get("/barangays/{barangay_id}/status")
async def realtime_barangay_status(
    barangay_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get real-time barangay status metrics"""
    try:
        from fastapi import HTTPException
        
        # Verify barangay exists
        barangay = await db.get(Barangay, barangay_id)
        if not barangay:
            raise HTTPException(404, "Barangay not found")
        
        # Check access: admins can only view their barangay
        if user.role.value == "admin" and user.barangay_id != barangay_id:
            raise HTTPException(403, "Access denied - you can only view status from your assigned barangay")
        
        # Get metrics
        puroks_count = await db.scalar(
            select(func.count(Purok.id)).where(Purok.barangay_id == barangay_id, Purok.is_archived == False)
        ) or 0
        
        active_puroks = await db.scalar(
            select(func.count(Purok.id)).where(Purok.barangay_id == barangay_id, Purok.is_archived == False)
        ) or 0
        
        recent_activities = await db.scalar(
            select(func.count(ActivityLog.id)).where(
                ActivityLog.barangay_id == barangay_id,
                ActivityLog.created_at >= datetime.utcnow() - timedelta(hours=24)
            )
        ) or 0
        
        active_alerts = await db.scalar(
            select(func.count(Alert.id)).where(
                Alert.barangay_id == barangay_id,
                Alert.is_resolved == False
            )
        ) or 0
        
        active_programs = await db.scalar(
            select(func.count(NutritionProgram.id)).where(
                NutritionProgram.barangay_id == barangay_id,
                NutritionProgram.status == "active"
            )
        ) or 0
        
        return {
            "barangay_id": str(barangay_id),
            "barangay_name": barangay.name,
            "puroks_count": puroks_count,
            "active_puroks": active_puroks,
            "recent_activities_24h": recent_activities,
            "pending_alerts": active_alerts,
            "active_programs": active_programs,
            "status": "online",
            "last_update": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        print(f"Error fetching realtime barangay status: {e}")
        from fastapi import HTTPException
        if "Access denied" in str(e) or "not found" in str(e).lower():
            raise
        return {
            "barangay_id": str(barangay_id),
            "status": "error",
            "message": str(e),
            "last_update": datetime.utcnow().isoformat(),
        }
