from uuid import UUID
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models import Barangay, Purok, Child, User, ActivityLog, Report, NutritionProgram, Measurement
from ..models.entities import ActivityLogType
from ..services.analytics import latest_measurements, EXCLUDED_BARANGAYS, summary_for_barangay
from ..utils.who_zscore import calculate_prevalence, classify_risk_level
from ..middleware.rbac import get_current_user, require_super_admin

router = APIRouter(tags=["barangays"])


def feature(obj, props: dict):
    geometry = obj.geometry
    return {"type": "Feature", "geometry": geometry, "properties": {"id": str(obj.id), **props}}


def _brgy_out(b: Barangay) -> dict:
    return {
        "id": str(b.id), "name": b.name, "code": b.code,
        "population_count": b.population_count,
        "captain": b.captain, "nutrition_scholar": b.nutrition_scholar,
        "contact_number": b.contact_number, "address": b.address,
        "is_archived": b.is_archived,
    }


# ─── PUBLIC ENDPOINTS ───────────────────────────────────────

@router.get("/api/barangays")
async def list_barangays(archived: bool = False, db: AsyncSession = Depends(get_db)):
    stmt = select(Barangay).where(Barangay.name.notin_(EXCLUDED_BARANGAYS))
    if not archived:
        stmt = stmt.where(Barangay.is_archived == False)
    stmt = stmt.order_by(Barangay.name)
    rows = (await db.scalars(stmt)).all()
    return [_brgy_out(b) for b in rows]


@router.get("/api/barangays/geojson")
async def barangays_geojson(db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(Barangay).where(Barangay.name.notin_(EXCLUDED_BARANGAYS)).where(Barangay.is_archived == False))).all()
    return {"type": "FeatureCollection", "features": [feature(b, {"name": b.name, "code": b.code}) for b in rows]}


@router.get("/api/barangays/{barangay_id}")
async def barangay_detail(barangay_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Get complete barangay details including statistics, puroks, and prevalence data.
    This endpoint consolidates all barangay information in one call.
    """
    b = await db.get(Barangay, barangay_id)
    if not b:
        raise HTTPException(404, "Barangay not found")
    puroks = (await db.scalars(select(Purok).where(Purok.barangay_id == barangay_id).order_by(Purok.name))).all()
    children = (await db.scalars(select(Child).where(Child.barangay_id == barangay_id, Child.is_active == True))).all()
    admin = await db.scalar(select(User).where(User.barangay_id == barangay_id, User.role == "admin", User.is_active == True).limit(1))
    measurements = await latest_measurements(db, barangay_id)
    prevalence = calculate_prevalence(measurements) if measurements else {}
    risk = classify_risk_level(prevalence) if prevalence else "low"
    return {
        **_brgy_out(b),
        "puroks": [{"id": str(p.id), "name": p.name, "code": p.code, "is_archived": p.is_archived} for p in puroks],
        "child_count": len(children),
        "assigned_admin": {"id": str(admin.id), "username": admin.username, "email": admin.email} if admin else None,
        "prevalence": prevalence,
        "risk_level": risk,
    }


@router.get("/api/barangays/{barangay_id}/stats")
async def barangay_stats(
    barangay_id: UUID,
    year: int = Query(None, description="Filter measurements by year"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get barangay statistics with optional year filtering.
    Returns prevalence data, case counts, and risk level.
    """
    b = await db.get(Barangay, barangay_id)
    if not b:
        raise HTTPException(404, "Barangay not found")
    
    # Get measurements - filter by year if provided
    if year:
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        stmt = (
            select(Measurement)
            .join(Child, Child.id == Measurement.child_id)
            .where(
                Child.barangay_id == barangay_id,
                Measurement.measurement_date.between(start_date, end_date)
            )
        )
        measurements = (await db.scalars(stmt)).all()
    else:
        measurements = await latest_measurements(db, barangay_id)
    
    prevalence = calculate_prevalence(measurements) if measurements else {}
    risk = classify_risk_level(prevalence) if prevalence else "low"
    
    severe_count = sum(1 for m in measurements if m.overall_status.value == "severe_acute_malnutrition")
    moderate_count = sum(1 for m in measurements if m.overall_status.value == "moderate_acute_malnutrition")
    
    return {
        "barangay_id": str(barangay_id),
        "barangay_name": b.name,
        "year": year or date.today().year,
        "total_children": len(measurements),
        "severe_cases": severe_count,
        "moderate_cases": moderate_count,
        "active_cases": severe_count + moderate_count,
        "prevalence": prevalence,
        "risk_level": risk,
    }


# ─── SUPERADMIN-ONLY ENDPOINTS ──────────────────────────────

class BarangayIn(BaseModel):
    name: str
    code: str
    population_count: int = 0
    captain: str | None = None
    nutrition_scholar: str | None = None
    contact_number: str | None = None
    address: str | None = None


@router.post("/api/barangays")
async def create_barangay(body: BarangayIn, db: AsyncSession = Depends(get_db), _=Depends(require_super_admin)):
    existing = await db.scalar(select(Barangay).where(or_(Barangay.name == body.name, Barangay.code == body.code)))
    if existing:
        raise HTTPException(400, "Barangay with this name or code already exists")
    b = Barangay(**body.model_dump())
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return _brgy_out(b)


@router.put("/api/barangays/{barangay_id}")
async def update_barangay(barangay_id: UUID, body: BarangayIn, db: AsyncSession = Depends(get_db), _=Depends(require_super_admin)):
    b = await db.get(Barangay, barangay_id)
    if not b:
        raise HTTPException(404, "Barangay not found")
    for k, v in body.model_dump().items():
        setattr(b, k, v)
    await db.commit()
    await db.refresh(b)
    return _brgy_out(b)


@router.delete("/api/barangays/{barangay_id}")
async def archive_barangay(barangay_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(require_super_admin)):
    b = await db.get(Barangay, barangay_id)
    if not b:
        raise HTTPException(404, "Barangay not found")
    b.is_archived = True
    await db.commit()
    return {"ok": True}


@router.put("/api/barangays/{barangay_id}/restore")
async def restore_barangay(barangay_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(require_super_admin)):
    b = await db.get(Barangay, barangay_id)
    if not b or not b.is_archived:
        raise HTTPException(404, "Archived barangay not found")
    b.is_archived = False
    await db.commit()
    return {"ok": True}


class AssignAdminIn(BaseModel):
    user_id: UUID


@router.put("/api/barangays/{barangay_id}/assign-admin")
async def assign_barangay_admin(barangay_id: UUID, body: AssignAdminIn, db: AsyncSession = Depends(get_db), _=Depends(require_super_admin)):
    b = await db.get(Barangay, barangay_id)
    if not b:
        raise HTTPException(404, "Barangay not found")
    user = await db.get(User, body.user_id)
    if not user or user.role.value != "admin":
        raise HTTPException(400, "User must be an admin")
    user.barangay_id = barangay_id
    await db.commit()
    return {"ok": True, "message": f"Assigned {user.username} to {b.name}"}


@router.get("/api/barangays/{barangay_id}/activity-logs")
async def barangay_activity_logs(
    barangay_id: UUID,
    year: int = Query(None, description="Filter logs by year"),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin)
):
    if year:
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31, 23, 59, 59)
        logs = (await db.scalars(
            select(ActivityLog).where(
                ActivityLog.barangay_id == barangay_id,
                ActivityLog.created_at.between(start_date, end_date)
            )
            .order_by(ActivityLog.created_at.desc()).limit(100)
        )).all()
    else:
        since = datetime.utcnow() - timedelta(days=90)
        logs = (await db.scalars(
            select(ActivityLog).where(ActivityLog.barangay_id == barangay_id, ActivityLog.created_at >= since)
            .order_by(ActivityLog.created_at.desc()).limit(100)
        )).all()
    return [
        {"id": str(l.id), "action": l.action, "action_type": l.action_type.value if hasattr(l.action_type, "value") else "other",
         "user": l.user.username if l.user else "System", "details": l.details,
         "timestamp": l.created_at.isoformat() if l.created_at else ""}
        for l in logs
    ]


@router.get("/api/barangays/{barangay_id}/reports")
async def barangay_reports(
    barangay_id: UUID,
    year: int = Query(None, description="Filter reports by year"),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin)
):
    user_ids = (await db.scalars(select(User.id).where(User.barangay_id == barangay_id))).all()
    if not user_ids:
        return []
    
    if year:
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31, 23, 59, 59)
        reports = (await db.scalars(
            select(Report).where(
                Report.created_by.in_(user_ids),
                Report.created_at.between(start_date, end_date)
            ).order_by(Report.created_at.desc()).limit(50)
        )).all()
    else:
        reports = (await db.scalars(
            select(Report).where(Report.created_by.in_(user_ids)).order_by(Report.created_at.desc()).limit(50)
        )).all()
    
    return [
        {"id": str(r.id), "title": r.title, "report_type": r.report_type.value if hasattr(r.report_type, "value") else "other",
         "status": r.status.value if hasattr(r.status, "value") else "draft",
         "created_by": r.creator.username if r.creator else "Unknown",
         "created_at": r.created_at.isoformat() if r.created_at else ""}
        for r in reports
    ]


# ─── PUROK ENDPOINTS ────────────────────────────────────────

def _purok_out(p: Purok) -> dict:
    return {
        "id": str(p.id), "name": p.name, "code": p.code,
        "barangay_id": str(p.barangay_id),
        "leader": p.leader, "population": p.population,
        "contact_number": p.contact_number, "notes": p.notes,
        "is_archived": p.is_archived,
        "assigned_bns": p.assigned_bns,
        "assigned_health_worker": p.assigned_health_worker,
        "household_count": p.household_count,
    }


@router.get("/api/puroks")
async def list_puroks(barangay_id: UUID | None = None, archived: bool = False, db: AsyncSession = Depends(get_db)):
    stmt = select(Purok).order_by(Purok.name)
    if not archived:
        stmt = stmt.where(Purok.is_archived == False)
    if barangay_id:
        stmt = stmt.where(Purok.barangay_id == barangay_id)
    rows = (await db.scalars(stmt)).all()
    return [_purok_out(p) for p in rows]


@router.get("/api/puroks/{purok_id}")
async def purok_detail(purok_id: UUID, db: AsyncSession = Depends(get_db)):
    p = await db.get(Purok, purok_id)
    if not p:
        raise HTTPException(404, "Purok not found")
    children = (await db.scalars(select(Child).where(Child.purok_id == purok_id, Child.is_active == True))).all()
    measurements = await latest_measurements(db)
    p_meas = [m for m in measurements if m.child and m.child.purok_id == purok_id]
    prevalence = calculate_prevalence(p_meas) if p_meas else {}
    risk = classify_risk_level(prevalence) if prevalence else "low"
    active_cases = sum(1 for m in p_meas if m.overall_status.value in ("severe_acute_malnutrition", "moderate_acute_malnutrition"))
    return {
        **_purok_out(p),
        "child_count": len(children),
        "active_cases": active_cases,
        "prevalence": prevalence,
        "risk_level": risk,
    }


@router.get("/api/puroks/{purok_id}/stats")
async def purok_stats(purok_id: UUID, db: AsyncSession = Depends(get_db)):
    measurements = await latest_measurements(db)
    measurements = [m for m in measurements if m.child and m.child.purok_id == purok_id]
    prevalence = calculate_prevalence(measurements)
    return {"prevalence": prevalence, "risk_level": classify_risk_level(prevalence)}


class PurokIn(BaseModel):
    name: str
    code: str = ""
    leader: str | None = None
    population: int = 0
    contact_number: str | None = None
    notes: str | None = None
    assigned_bns: str | None = None
    assigned_health_worker: str | None = None
    household_count: int = 0


@router.post("/api/puroks")
async def create_purok(body: PurokIn, barangay_id: UUID = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if not barangay_id:
        barangay_id = user.barangay_id
    if not barangay_id:
        raise HTTPException(400, "barangay_id is required")
    b = await db.get(Barangay, barangay_id)
    if not b:
        raise HTTPException(404, "Barangay not found")
    p = Purok(barangay_id=barangay_id, **body.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return _purok_out(p)


@router.put("/api/puroks/{purok_id}")
async def update_purok(purok_id: UUID, body: PurokIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    p = await db.get(Purok, purok_id)
    if not p:
        raise HTTPException(404, "Purok not found")
    if user.role.value != "super_admin" and p.barangay_id != user.barangay_id:
        raise HTTPException(403, "Not authorized")
    for k, v in body.model_dump().items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return _purok_out(p)


@router.delete("/api/puroks/{purok_id}")
async def archive_purok(purok_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    p = await db.get(Purok, purok_id)
    if not p:
        raise HTTPException(404, "Purok not found")
    if user.role.value != "super_admin" and p.barangay_id != user.barangay_id:
        raise HTTPException(403, "Not authorized")
    p.is_archived = True
    await db.commit()
    return {"ok": True}


@router.put("/api/puroks/{purok_id}/restore")
async def restore_purok(purok_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(require_super_admin)):
    p = await db.get(Purok, purok_id)
    if not p or not p.is_archived:
        raise HTTPException(404, "Archived purok not found")
    p.is_archived = False
    await db.commit()
    return {"ok": True}


@router.get("/api/puroks/{purok_id}/children")
async def purok_children(purok_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    # Check purok access for admin users
    if user.role.value == "admin":
        p = await db.get(Purok, purok_id)
        if not p:
            raise HTTPException(404, "Purok not found")
        if p.barangay_id != user.barangay_id:
            raise HTTPException(403, "Access denied - you can only view children from puroks in your assigned barangay")
    
    kids = (await db.scalars(select(Child).where(Child.purok_id == purok_id, Child.is_active == True).order_by(Child.full_name))).all()
    measurements = await latest_measurements(db)
    out = []
    for c in kids:
        m = next((x for x in measurements if x.child_id == c.id), None)
        age = 0
        if c.birth_date:
            age = (datetime.now().date() - c.birth_date).days // 365
        out.append({
            "id": str(c.id), "name": c.full_name, "age": age, "sex": c.sex.value if hasattr(c.sex, "value") else "male",
            "nutritional_status": m.overall_status.value if m else "unknown",
            "latest_assessment": m.measurement_date.isoformat() if m and m.measurement_date else None,
        })
    return out


@router.get("/api/puroks/{purok_id}/programs")
async def purok_programs(purok_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    # Check purok access for admin users
    if user.role.value == "admin":
        p = await db.get(Purok, purok_id)
        if not p:
            raise HTTPException(404, "Purok not found")
        if p.barangay_id != user.barangay_id:
            raise HTTPException(403, "Access denied - you can only view programs from puroks in your assigned barangay")
    
    programs = (await db.scalars(
        select(NutritionProgram).where(NutritionProgram.purok_id == purok_id).order_by(NutritionProgram.created_at.desc()).limit(50)
    )).all()
    return [
        {"id": str(p.id), "name": p.name, "frequency": p.frequency.value if hasattr(p.frequency, "value") else "monthly",
         "status": p.status.value if hasattr(p.status, "value") else "active",
         "start_date": p.created_at.isoformat() if p.created_at else ""}
        for p in programs
    ]


@router.get("/api/puroks/{purok_id}/home-visits")
async def purok_home_visits(purok_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    # Check purok access for admin users
    if user.role.value == "admin":
        p = await db.get(Purok, purok_id)
        if not p:
            raise HTTPException(404, "Purok not found")
        if p.barangay_id != user.barangay_id:
            raise HTTPException(403, "Access denied - you can only view home visits from puroks in your assigned barangay")
    
    from ..models import HomeVisit
    kids = (await db.scalars(select(Child.id).where(Child.purok_id == purok_id, Child.is_active == True))).all()
    if not kids:
        return []
    visits = (await db.scalars(
        select(HomeVisit).where(HomeVisit.child_id.in_(kids)).order_by(HomeVisit.created_at.desc()).limit(50)
    )).all()
    return [
        {"id": str(v.id), "child_name": v.child.full_name if v.child else "Unknown",
         "status": v.status.value if hasattr(v.status, "value") else v.status,
         "scheduled_date": v.scheduled_date.isoformat() if hasattr(v, "scheduled_date") and v.scheduled_date else "",
         "findings": v.findings, "created_at": v.created_at.isoformat() if v.created_at else ""}
        for v in visits
    ]


@router.get("/api/puroks/{purok_id}/activity-logs")
async def purok_activity_logs(purok_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    p = await db.get(Purok, purok_id)
    if not p:
        raise HTTPException(404, "Purok not found")
    
    # Check purok access for admin users
    if user.role.value == "admin" and p.barangay_id != user.barangay_id:
        raise HTTPException(403, "Access denied - you can only view activity logs from puroks in your assigned barangay")
    
    since = datetime.utcnow() - timedelta(days=90)
    
    # Get children in this purok for more specific activity tracking
    child_ids = (await db.scalars(select(Child.id).where(Child.purok_id == purok_id))).all()
    child_id_strs = [str(id) for id in child_ids]
    
    # Get activities related to children in this purok OR general barangay activities
    logs = (await db.scalars(
        select(ActivityLog).where(
            or_(
                ActivityLog.resource_id.in_(child_id_strs),
                ActivityLog.barangay_id == p.barangay_id
            ),
            ActivityLog.created_at >= since
        )
        .order_by(ActivityLog.created_at.desc()).limit(100)
    )).all()
    return [
        {"id": str(l.id), "action": l.action, "action_type": l.action_type.value if hasattr(l.action_type, "value") else "other",
         "user": l.user.username if l.user else "System", "details": l.details,
         "timestamp": l.created_at.isoformat() if l.created_at else ""}
        for l in logs
    ]


@router.get("/api/puroks/{purok_id}/export")
async def export_purok(purok_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    p = await db.get(Purok, purok_id)
    if not p:
        raise HTTPException(404, "Purok not found")
    
    # BHW can only export puroks in their barangay
    if user.role.value == "admin" and p.barangay_id != user.barangay_id:
        raise HTTPException(403, "Access denied - you can only export data from puroks in your assigned barangay")
    children = (await db.scalars(select(Child).where(Child.purok_id == purok_id, Child.is_active == True))).all()
    measurements = await latest_measurements(db)
    p_meas = [m for m in measurements if m.child and m.child.purok_id == purok_id]
    prevalence = calculate_prevalence(p_meas) if p_meas else {}
    active_cases = sum(1 for m in p_meas if m.overall_status.value in ("severe_acute_malnutrition", "moderate_acute_malnutrition"))
    programs = (await db.scalars(select(NutritionProgram).where(NutritionProgram.purok_id == purok_id))).all()
    return {
        "purok": _purok_out(p),
        "barangay_name": p.barangay.name if p.barangay else "",
        "children_count": len(children),
        "active_cases": active_cases,
        "prevalence": prevalence,
        "risk_level": classify_risk_level(prevalence) if prevalence else "low",
        "programs_count": len(programs),
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/api/barangays/{barangay_id}/export")
async def export_barangay(barangay_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    b = await db.get(Barangay, barangay_id)
    if not b:
        raise HTTPException(404, "Barangay not found")
    
    # BHW can only export their own barangay
    if user.role.value == "admin" and user.barangay_id != barangay_id:
        raise HTTPException(403, "Access denied - you can only export data from your assigned barangay")
    puroks = (await db.scalars(select(Purok).where(Purok.barangay_id == barangay_id))).all()
    children = (await db.scalars(select(Child).where(Child.barangay_id == barangay_id, Child.is_active == True))).all()
    measurements = await latest_measurements(db)
    b_meas = [m for m in measurements if m.child and m.child.barangay_id == barangay_id]
    active_cases = sum(1 for m in b_meas if m.overall_status.value in ("severe_acute_malnutrition", "moderate_acute_malnutrition"))
    reports = (await db.scalars(select(Report).where(Report.barangay_id == barangay_id).order_by(Report.created_at.desc()).limit(20))).all()
    admin = (await db.scalars(select(User).where(User.barangay_id == barangay_id, User.role == "admin"))).first()
    return {
        "barangay": _brgy_out(b),
        "assigned_admin": admin.username if admin else None,
        "puroks": [_purok_out(p) for p in puroks],
        "purok_count": len(puroks),
        "children_count": len(children),
        "active_cases": active_cases,
        "reports_count": len(reports),
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/api/barangays/{barangay_id}/login-history")
async def barangay_login_history(
    barangay_id: UUID,
    year: int = Query(None, description="Filter login history by year"),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin)
):
    admins = (await db.scalars(select(User).where(User.barangay_id == barangay_id, User.role == "admin"))).all()
    if not admins:
        return []
    admin_ids = [a.id for a in admins]
    
    if year:
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31, 23, 59, 59)
        logs = (await db.scalars(
            select(ActivityLog).where(
                ActivityLog.user_id.in_(admin_ids),
                ActivityLog.action_type == ActivityLogType.auth,
                ActivityLog.created_at.between(start_date, end_date)
            )
            .order_by(ActivityLog.created_at.desc()).limit(100)
        )).all()
    else:
        logs = (await db.scalars(
            select(ActivityLog).where(ActivityLog.user_id.in_(admin_ids), ActivityLog.action_type == ActivityLogType.auth)
            .order_by(ActivityLog.created_at.desc()).limit(100)
        )).all()
    
    return [
        {"id": str(l.id), "user": l.user.username if l.user else "Unknown",
         "action": l.action, "ip_address": (l.details or {}).get("ip_address", ""),
         "timestamp": l.created_at.isoformat() if l.created_at else ""}
        for l in logs
    ]
