"""
Case Management Router
Handles malnutrition case lifecycle: enrollment, status tracking, action planning, and resolution.
"""
from datetime import date, datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func, and_, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional

from ..database import get_db
from ..models.entities import (
    MalnutritionCase, CaseStatusHistory, CaseActionPlan, 
    Child, Measurement, User, Alert, CaseStatus, CaseType, ActivityLogType
)
from ..schemas.common import (
    MalnutritionCaseCreate, MalnutritionCaseRead, MalnutritionCaseDetail,
    MalnutritionCaseUpdate, MalnutritionCaseStatusChangeRequest, 
    CaseActionPlanCreate, CaseActionPlanRead, CaseStatusHistoryRead
)
from ..middleware.rbac import get_current_user, assert_barangay_scope, scoped_barangay_filter
from ..services.audit import log_activity
from ..services.websocket import manager

router = APIRouter(prefix="/api/cases", tags=["cases"])


async def log_case_activity(
    db: AsyncSession,
    user_id: UUID | None,
    case_id: UUID | None,
    action: str,
    details: dict | None = None,
    ip_address: str | None = None
):
    """Log case-related activity for audit trail"""
    await log_activity(
        db, 
        user_id, 
        "case_management" if not user_id else ActivityLogType.other,
        "malnutrition_cases",
        str(case_id) if case_id else None,
        details or {},
        ip_address
    )


def case_detail(case: MalnutritionCase, child: Child | None = None) -> dict:
    """Build case detail response"""
    return {
        "id": str(case.id),
        "child_id": str(case.child_id),
        "barangay_id": str(case.barangay_id),
        "case_status": case.case_status.value,
        "case_type": case.case_type.value,
        "enrollment_date": case.enrollment_date,
        "resolution_date": case.resolution_date,
        "assigned_bns_id": str(case.assigned_bns_id) if case.assigned_bns_id else None,
        "responsible_facility": case.responsible_facility,
        "initial_notes": case.initial_notes,
        "resolution_notes": case.resolution_notes,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
    }


# ============ CASE MANAGEMENT ENDPOINTS ============

@router.post("", response_model=MalnutritionCaseRead)
async def create_case(
    body: MalnutritionCaseCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Create a new malnutrition case.
    Typically triggered when a child is first identified as SAM or MAM.
    """
    # Verify child exists
    child = await db.get(Child, body.child_id)
    if not child:
        raise HTTPException(404, "Child not found")
    
    # Check authorization
    assert_barangay_scope(user, child.barangay_id)
    
    # Verify case type is valid
    try:
        case_type = CaseType(body.case_type)
    except ValueError:
        raise HTTPException(400, f"Invalid case_type. Must be 'sam' or 'mam'")
    
    # Create the case
    case = MalnutritionCase(
        child_id=body.child_id,
        barangay_id=child.barangay_id,
        case_status=CaseStatus.active,
        case_type=case_type,
        assigned_bns_id=body.assigned_bns_id,
        responsible_facility=body.responsible_facility,
        initial_notes=body.initial_notes,
        enrollment_date=date.today(),
    )
    db.add(case)
    await db.flush()
    
    # Create initial status history entry
    status_history = CaseStatusHistory(
        case_id=case.id,
        previous_status=None,
        new_status=CaseStatus.active,
        changed_by=user.id,
        reason="Case enrollment",
        notes=body.initial_notes,
    )
    db.add(status_history)
    
    # Log activity
    await log_case_activity(
        db, user.id, case.id, 
        "CASE_CREATED",
        {"case_type": body.case_type, "child_name": child.full_name},
        request.client.host if request.client else None
    )
    
    await db.commit()
    await db.refresh(case)
    return case


@router.get("", response_model=list[MalnutritionCaseRead])
async def list_cases(
    case_status: str | None = Query(None, description="Filter by case status (active, resolved, transferred, lost_to_followup)"),
    case_type: str | None = Query(None, description="Filter by case type (sam, mam)"),
    assigned_to: UUID | None = Query(None, description="Filter by assigned BNS"),
    barangay_id: UUID | None = Query(None),
    days_since_enrollment: int | None = Query(None, description="Filter cases enrolled in last N days"),
    search: str | None = Query(None, description="Search by child name"),
    skip: int = Query(0),
    limit: int = Query(50),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    List malnutrition cases with filtering and pagination.
    Supports filtering by status, type, assignment, and time range.
    """
    stmt = select(MalnutritionCase).options(selectinload(MalnutritionCase.child))
    
    # Authorization check
    if user.role.value == "admin":
        barangay_id = user.barangay_id
    
    if barangay_id:
        stmt = stmt.where(MalnutritionCase.barangay_id == barangay_id)
    
    # Status filter
    if case_status:
        try:
            status = CaseStatus(case_status)
            stmt = stmt.where(MalnutritionCase.case_status == status)
        except ValueError:
            raise HTTPException(400, f"Invalid case_status: {case_status}")
    
    # Type filter
    if case_type:
        try:
            ctype = CaseType(case_type)
            stmt = stmt.where(MalnutritionCase.case_type == ctype)
        except ValueError:
            raise HTTPException(400, f"Invalid case_type: {case_type}")
    
    # Assignment filter
    if assigned_to:
        stmt = stmt.where(MalnutritionCase.assigned_bns_id == assigned_to)
    
    # Date range filter
    if days_since_enrollment:
        cutoff_date = date.today()
        from datetime import timedelta
        cutoff_date = (datetime.combine(cutoff_date, datetime.min.time()) - timedelta(days=days_since_enrollment)).date()
        stmt = stmt.where(MalnutritionCase.enrollment_date >= cutoff_date)
    
    # Search filter
    if search:
        stmt = stmt.join(Child).where(
            or_(
                Child.full_name.ilike(f"%{search}%"),
                Child.guardian_name.ilike(f"%{search}%")
            )
        )
    
    # Order and pagination
    stmt = stmt.order_by(desc(MalnutritionCase.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    cases = result.scalars().all()
    return cases


@router.get("/{case_id}", response_model=MalnutritionCaseDetail)
async def get_case_detail(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get detailed case information including child data, status history, and action plans.
    """
    case = await db.get(
        MalnutritionCase,
        case_id,
        options=[
            selectinload(MalnutritionCase.child),
            selectinload(MalnutritionCase.status_history),
            selectinload(MalnutritionCase.action_plans)
        ]
    )
    if not case:
        raise HTTPException(404, "Case not found")
    
    # Check authorization
    assert_barangay_scope(user, case.barangay_id)
    
    return case


@router.put("/{case_id}", response_model=MalnutritionCaseRead)
async def update_case(
    case_id: UUID,
    body: MalnutritionCaseUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Update case information (assignment, facility, notes).
    Note: To change status, use the change_status endpoint.
    """
    case = await db.get(MalnutritionCase, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    
    # Check authorization
    assert_barangay_scope(user, case.barangay_id)
    
    # Update fields
    if body.assigned_bns_id is not None:
        case.assigned_bns_id = body.assigned_bns_id
    if body.responsible_facility is not None:
        case.responsible_facility = body.responsible_facility
    if body.initial_notes is not None:
        case.initial_notes = body.initial_notes
    if body.resolution_notes is not None:
        case.resolution_notes = body.resolution_notes
    
    await log_case_activity(
        db, user.id, case.id,
        "CASE_UPDATED",
        {"updated_fields": body.dict(exclude_unset=True)},
        request.client.host if request.client else None
    )
    
    await db.commit()
    await db.refresh(case)
    return case


@router.post("/{case_id}/status", response_model=MalnutritionCaseRead)
async def change_case_status(
    case_id: UUID,
    body: MalnutritionCaseStatusChangeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Change case status with audit trail.
    Supported transitions:
    - active → resolved / transferred / lost_to_followup
    - resolved → active (re-opening)
    - transferred → active / resolved
    - lost_to_followup → active
    """
    case = await db.get(MalnutritionCase, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    
    # Check authorization
    assert_barangay_scope(user, case.barangay_id)
    
    # Validate new status
    try:
        new_status = CaseStatus(body.new_status)
    except ValueError:
        raise HTTPException(400, f"Invalid status: {body.new_status}")
    
    previous_status = case.case_status
    
    # Apply status change
    case.case_status = new_status
    if new_status == CaseStatus.resolved:
        case.resolution_date = date.today()
        case.resolution_notes = body.resolution_notes or body.notes
    
    # Create status history record
    status_change = CaseStatusHistory(
        case_id=case.id,
        previous_status=previous_status,
        new_status=new_status,
        changed_by=user.id,
        reason=body.reason,
        notes=body.notes,
    )
    db.add(status_change)
    
    # Log activity
    await log_case_activity(
        db, user.id, case.id,
        "CASE_STATUS_CHANGED",
        {
            "from": previous_status.value,
            "to": new_status.value,
            "reason": body.reason
        },
        request.client.host if request.client else None
    )
    
    # Broadcast WebSocket notification
    await manager.broadcast(
        "case_status_changed",
        {
            "case_id": str(case.id),
            "child_id": str(case.child_id),
            "from_status": previous_status.value,
            "to_status": new_status.value,
            "barangay_id": str(case.barangay_id)
        },
        str(case.barangay_id),
        priority="high"
    )
    
    await db.commit()
    await db.refresh(case)
    return case


# ============ CASE ACTION PLAN ENDPOINTS ============

@router.post("/{case_id}/action-plans", response_model=CaseActionPlanRead)
async def create_action_plan(
    case_id: UUID,
    body: CaseActionPlanCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Create an action plan for a case.
    Defines planned interventions and expected outcomes.
    """
    case = await db.get(MalnutritionCase, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    
    # Check authorization
    assert_barangay_scope(user, case.barangay_id)
    
    # Validate dates
    if body.expected_end_date <= body.start_date:
        raise HTTPException(400, "Expected end date must be after start date")
    
    plan = CaseActionPlan(
        case_id=case.id,
        title=body.title,
        description=body.description,
        planned_interventions=body.planned_interventions,
        start_date=body.start_date,
        expected_end_date=body.expected_end_date,
        expected_outcomes=body.expected_outcomes,
        created_by=user.id,
    )
    db.add(plan)
    
    await log_case_activity(
        db, user.id, case.id,
        "ACTION_PLAN_CREATED",
        {"plan_title": body.title, "interventions": body.planned_interventions},
        request.client.host if request.client else None
    )
    
    await db.commit()
    await db.refresh(plan)
    return plan


@router.get("/{case_id}/action-plans", response_model=list[CaseActionPlanRead])
async def list_action_plans(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    List all action plans for a case.
    """
    case = await db.get(MalnutritionCase, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    
    # Check authorization
    assert_barangay_scope(user, case.barangay_id)
    
    stmt = select(CaseActionPlan).where(CaseActionPlan.case_id == case_id).order_by(desc(CaseActionPlan.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.put("/{case_id}/action-plans/{plan_id}", response_model=CaseActionPlanRead)
async def update_action_plan(
    case_id: UUID,
    plan_id: UUID,
    body: CaseActionPlanCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Update an action plan.
    """
    case = await db.get(MalnutritionCase, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    
    # Check authorization
    assert_barangay_scope(user, case.barangay_id)
    
    plan = await db.get(CaseActionPlan, plan_id)
    if not plan or plan.case_id != case_id:
        raise HTTPException(404, "Action plan not found")
    
    plan.title = body.title
    plan.description = body.description
    plan.planned_interventions = body.planned_interventions
    plan.start_date = body.start_date
    plan.expected_end_date = body.expected_end_date
    plan.expected_outcomes = body.expected_outcomes
    
    await log_case_activity(
        db, user.id, case.id,
        "ACTION_PLAN_UPDATED",
        {"plan_id": str(plan_id)},
        request.client.host if request.client else None
    )
    
    await db.commit()
    await db.refresh(plan)
    return plan


@router.get("/{case_id}/status-history", response_model=list[CaseStatusHistoryRead])
async def get_case_status_history(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get the complete status change history for a case.
    Useful for audit trails and understanding case progression.
    """
    case = await db.get(MalnutritionCase, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    
    # Check authorization
    assert_barangay_scope(user, case.barangay_id)
    
    stmt = select(CaseStatusHistory).where(CaseStatusHistory.case_id == case_id).order_by(desc(CaseStatusHistory.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/statistics/summary")
async def get_case_statistics(
    barangay_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get case management statistics.
    - Active cases by type
    - Recent status changes
    - Average resolution time
    - Unassigned cases
    """
    if user.role.value == "admin":
        barangay_id = user.barangay_id
    
    # Build base filter
    base_filter = []
    if barangay_id:
        base_filter.append(MalnutritionCase.barangay_id == barangay_id)
    
    # Active cases by type
    sam_count = await db.scalar(
        select(func.count(MalnutritionCase.id)).where(
            *base_filter,
            MalnutritionCase.case_status == CaseStatus.active,
            MalnutritionCase.case_type == CaseType.sam
        )
    ) or 0
    
    mam_count = await db.scalar(
        select(func.count(MalnutritionCase.id)).where(
            *base_filter,
            MalnutritionCase.case_status == CaseStatus.active,
            MalnutritionCase.case_type == CaseType.mam
        )
    ) or 0
    
    # Resolved cases (this month)
    from datetime import timedelta, datetime as dt
    month_start = date.today().replace(day=1)
    resolved_this_month = await db.scalar(
        select(func.count(MalnutritionCase.id)).where(
            *base_filter,
            MalnutritionCase.case_status == CaseStatus.resolved,
            MalnutritionCase.resolution_date >= month_start
        )
    ) or 0
    
    # Unassigned active cases
    unassigned = await db.scalar(
        select(func.count(MalnutritionCase.id)).where(
            *base_filter,
            MalnutritionCase.case_status == CaseStatus.active,
            MalnutritionCase.assigned_bns_id.is_(None)
        )
    ) or 0
    
    return {
        "active_cases": {"sam": sam_count, "mam": mam_count, "total": sam_count + mam_count},
        "resolved_this_month": resolved_this_month,
        "unassigned_active_cases": unassigned,
    }
