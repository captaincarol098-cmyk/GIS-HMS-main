from datetime import datetime, timezone
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.rbac import get_current_user, require_super_admin
from ..models import Report, Barangay, User, Notification
from ..models.entities import ReportStatus, ReportType, NotificationType
from ..schemas.common import (
    ReportGenerate,
    ReportApproveRequest,
    ReportRejectRequest,
    ReportRevisionRequest,
    ReportEditRequest,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("")
async def list_reports(
    status: Optional[str] = None,
    barangay_id: Optional[UUID] = None,
    year: int = Query(2025, description="Filter reports by year"),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    """
    List saved reports based on user role with year filtering.
    - SuperAdmin sees ALL reports with filters (submitted, approved, rejected, revision)
    - Admin sees only their own barangay's reports
    - Returns submitted, approved, rejected, and revision reports (no drafts)
    - Filter by status, barangay, and year
    """
    stmt = select(Report).order_by(Report.generated_at.desc())
    
    # Filter by status - show submitted/approved/rejected/revision reports (not drafts)
    status_filter = [
        ReportStatus.submitted,
        ReportStatus.approved,
        ReportStatus.rejected,
        ReportStatus.revision,
    ]
    stmt = stmt.where(Report.status.in_(status_filter))
    
    # Year filter - filter by generated_at date
    if year:
        start_date = datetime(year, 1, 1).date()
        end_date = datetime(year, 12, 31).date()
        stmt = stmt.where(func.date(Report.generated_at).between(start_date, end_date))
    
    # Role-based filtering
    if user:
        # If admin (not superadmin), only show reports from their barangay
        if user.role != "super_admin" and user.barangay_id:
            stmt = stmt.where(Report.barangay_id == user.barangay_id)
    
    # Optional status filter
    if status:
        try:
            status_enum = ReportStatus(status)
            stmt = stmt.where(Report.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    
    # Optional barangay filter (superadmin can filter by specific barangay)
    if barangay_id:
        stmt = stmt.where(Report.barangay_id == barangay_id)
    
    # Get all reports matching criteria
    reports = list((await db.scalars(stmt)).all())
    result = []
    
    for r in reports:
        brgy = await db.get(Barangay, r.barangay_id) if r.barangay_id else None
        d = {}
        for c in Report.__table__.columns:
            val = getattr(r, c.name)
            # Convert UUID and datetime to strings for JSON serialization
            if hasattr(val, 'isoformat'):
                d[c.name] = val.isoformat()
            elif isinstance(val, UUID):
                d[c.name] = str(val)
            else:
                d[c.name] = val
        d["barangay_name"] = brgy.name if brgy else "City-wide"
        d["report_category"] = (r.data or {}).get("report_category", "comprehensive")
        result.append(d)
    
    return result


@router.post("/generate")
async def generate_report(
    body: ReportGenerate, 
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    """Generate and save a report as draft"""
    try:
        # Use provided data if available, otherwise create empty data
        data = body.data if body.data else {}
        data["report_category"] = body.report_category
        data["generated_at"] = datetime.now(timezone.utc).isoformat()
        
        # If no barangay specified, use user's barangay (if user is logged in)
        barangay_id = body.barangay_id
        if not barangay_id and user and user.barangay_id:
            barangay_id = user.barangay_id
        
        report = Report(
            title=body.title,
            report_type=ReportType(body.report_type),
            barangay_id=barangay_id,
            generated_by=user.id if user else None,
            period_start=body.period_start,
            period_end=body.period_end,
            data=data,
            content=body.content,  # Store HTML content if provided
            status=ReportStatus.draft,  # Start as draft, not submitted
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        return report
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.get("/my-reports/drafts")
async def get_my_drafts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get draft reports created by current user.
    - Admin can edit and submit their own drafts
    - SuperAdmin cannot see other users' drafts
    """
    stmt = select(Report).where(
        Report.generated_by == user.id,
        Report.status == ReportStatus.draft
    ).order_by(Report.generated_at.desc())
    
    reports = list((await db.scalars(stmt)).all())
    result = []
    
    for r in reports:
        brgy = await db.get(Barangay, r.barangay_id) if r.barangay_id else None
        d = {}
        for c in Report.__table__.columns:
            val = getattr(r, c.name)
            if hasattr(val, 'isoformat'):
                d[c.name] = val.isoformat()
            elif isinstance(val, UUID):
                d[c.name] = str(val)
            else:
                d[c.name] = val
        d["barangay_name"] = brgy.name if brgy else "City-wide"
        d["report_category"] = (r.data or {}).get("report_category", "comprehensive")
        result.append(d)
    
    return result


@router.get("/my-reports/submitted")
async def get_my_submitted(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get submitted and revision reports created by current user.
    - Admin can see their submitted reports
    - Admin can see reports awaiting their revision
    """
    stmt = select(Report).where(
        Report.generated_by == user.id,
        Report.status.in_([ReportStatus.submitted, ReportStatus.revision, ReportStatus.approved, ReportStatus.rejected])
    ).order_by(Report.generated_at.desc())
    
    reports = list((await db.scalars(stmt)).all())
    result = []
    
    for r in reports:
        brgy = await db.get(Barangay, r.barangay_id) if r.barangay_id else None
        d = {}
        for c in Report.__table__.columns:
            val = getattr(r, c.name)
            if hasattr(val, 'isoformat'):
                d[c.name] = val.isoformat()
            elif isinstance(val, UUID):
                d[c.name] = str(val)
            else:
                d[c.name] = val
        d["barangay_name"] = brgy.name if brgy else "City-wide"
        d["report_category"] = (r.data or {}).get("report_category", "comprehensive")
        result.append(d)
    
    return result


@router.get("/{report_id}")
async def get_report(report_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Get a specific report"""
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # For non-superadmin, check if they can view this report
    if user.role != "super_admin":
        # Admin can only view reports from their barangay
        if report.barangay_id != user.barangay_id:
            raise HTTPException(
                status_code=403,
                detail="You can only view reports from your barangay"
            )
    
    return report


@router.post("/{report_id}/submit")
async def submit_report(report_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Submit a report for approval"""
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status != ReportStatus.draft:
        raise HTTPException(
            status_code=400,
            detail=f"Only draft reports can be submitted. Current status: {report.status.value}"
        )
    
    report.status = ReportStatus.submitted
    report.submitted_at = datetime.now(timezone.utc)
    report.generated_by = user.id  # Track who submitted
    
    await db.commit()
    await db.refresh(report)
    
    # Create notification for all superadmins
    superadmin_stmt = select(User).where(User.role == "super_admin")
    superadmins = (await db.scalars(superadmin_stmt)).all()
    
    barangay = await db.get(Barangay, report.barangay_id) if report.barangay_id else None
    barangay_name = barangay.name if barangay else "Unknown Barangay"
    
    for superadmin in superadmins:
        notification = Notification(
            user_id=superadmin.id,
            type=NotificationType.report_submitted,
            title="📬 New Report Submitted",
            message=f"Report '{report.title}' from {barangay_name} submitted by {user.username}.",
            link=f"/reports/{report.id}",
            related_id=str(report.id),
        )
        db.add(notification)
    
    await db.commit()
    
    return report


# ============================================================================
# SHARED WORKSPACE ENDPOINTS - APPROVAL WORKFLOW
# ============================================================================


@router.put("/{report_id}/approve")
async def approve_report(
    report_id: UUID,
    body: ReportApproveRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin),
):
    """
    SuperAdmin approves a submitted report.
    - Sets status to 'approved'
    - Records reviewer info and timestamp
    - Sends notification to report creator
    """
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status != ReportStatus.submitted:
        raise HTTPException(
            status_code=400,
            detail=f"Can only approve reports in 'submitted' status. Current status: {report.status.value}",
        )
    
    # Update report status and review info
    report.status = ReportStatus.approved
    report.reviewed_by = user.id
    report.reviewed_at = datetime.now(timezone.utc)
    report.review_notes = body.comments or "Approved"
    
    await db.commit()
    await db.refresh(report)
    
    # Create notification for report creator
    if report.generated_by:
        notification = Notification(
            user_id=report.generated_by,
            type=NotificationType.report_approved,
            title="✅ Your Report Has Been Approved",
            message=f"Report '{report.title}' has been approved by {user.username}.",
            link=f"/reports/{report.id}",
            related_id=str(report.id),
        )
        db.add(notification)
        await db.commit()
    
    return report


@router.put("/{report_id}/reject")
async def reject_report(
    report_id: UUID,
    body: ReportRejectRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin),
):
    """
    SuperAdmin rejects a submitted report with reason and optional comments.
    - Sets status to 'rejected'
    - Records reviewer info, rejection reason, and timestamp
    - Sends notification to report creator with reason
    """
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status != ReportStatus.submitted:
        raise HTTPException(
            status_code=400,
            detail=f"Can only reject reports in 'submitted' status. Current status: {report.status.value}",
        )
    
    # Build rejection notes with reason and optional comments
    rejection_notes = f"Rejected: {body.reason}"
    if body.comments:
        rejection_notes += f"\n\nComments: {body.comments}"
    
    # Update report status and review info
    report.status = ReportStatus.rejected
    report.reviewed_by = user.id
    report.reviewed_at = datetime.now(timezone.utc)
    report.review_notes = rejection_notes
    
    await db.commit()
    await db.refresh(report)
    
    # Create notification for report creator
    if report.generated_by:
        notification = Notification(
            user_id=report.generated_by,
            type=NotificationType.report_rejected,
            title="❌ Your Report Has Been Rejected",
            message=f"Report '{report.title}' has been rejected. Reason: {body.reason}",
            link=f"/reports/{report.id}",
            related_id=str(report.id),
        )
        db.add(notification)
        await db.commit()
    
    return report


@router.put("/{report_id}/request-revision")
async def request_report_revision(
    report_id: UUID,
    body: ReportRevisionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin),
):
    """
    SuperAdmin requests revision with specific required changes.
    - Sets status to 'revision'
    - Records required changes and optional comments
    - Sends notification to report creator
    - Admin can then edit and resubmit
    """
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status != ReportStatus.submitted:
        raise HTTPException(
            status_code=400,
            detail=f"Can only request revision for reports in 'submitted' status. Current status: {report.status.value}",
        )
    
    # Build revision notes with required changes and optional comments
    revision_notes = f"Revision Required:\n{body.required_changes}"
    if body.comments:
        revision_notes += f"\n\nAdditional Comments: {body.comments}"
    
    # Update report status and review info
    report.status = ReportStatus.revision
    report.reviewed_by = user.id
    report.reviewed_at = datetime.now(timezone.utc)
    report.review_notes = revision_notes
    
    await db.commit()
    await db.refresh(report)
    
    # Create notification for report creator
    if report.generated_by:
        notification = Notification(
            user_id=report.generated_by,
            type=NotificationType.report_approved,  # Using approved type for revision notice
            title="📝 Your Report Needs Revision",
            message=f"Report '{report.title}' needs revision. Please make the required changes.",
            link=f"/reports/{report.id}",
            related_id=str(report.id),
        )
        db.add(notification)
        await db.commit()
    
    return report


@router.put("/{report_id}/edit")
async def edit_report(
    report_id: UUID,
    body: ReportEditRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Admin edits report content.
    - Allowed in 'draft', 'submitted', or 'revision' status
    - Updates content and tracking info
    - Allows admin to make changes before/after submission
    """
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Verify user is the creator
    if report.generated_by != user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only edit your own reports"
        )
    
    # Only allow editing in draft, submitted, or revision state
    if report.status not in [ReportStatus.draft, ReportStatus.submitted, ReportStatus.revision]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit report in '{report.status.value}' status. Only 'draft', 'submitted', and 'revision' reports can be edited.",
        )
    
    # Update content and edit tracking
    report.content = body.content
    report.last_edited_by = user.id
    report.last_edited_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(report)
    
    return report


# ============================================================================
# QUICK DATA ENTRY ENDPOINT - For manual data encoding
# ============================================================================


@router.put("/{report_id}/data")
async def update_report_data(
    report_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Update report data (not HTML content).
    - Admin can encode/update data fields directly
    - Allowed for draft, submitted, and revision reports
    - Tracks who edited and when
    
    Example body:
    {
      "total_children": 150,
      "undernourished": 25,
      "referrals": 5,
      "immunization_coverage": 92.5,
      "malnutrition_cases": 12,
      "custom_field": "value"
    }
    """
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Verify user is the creator OR is superadmin
    if user.role != "super_admin" and report.generated_by != user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to update this report"
        )
    
    # Only allow editing in draft, submitted, or revision state
    if report.status not in [ReportStatus.draft, ReportStatus.submitted, ReportStatus.revision]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot update data for reports in '{report.status.value}' status",
        )
    
    # Update the data dictionary with new values
    if report.data is None:
        report.data = {}
    
    # Merge new data with existing data
    report.data.update(body)
    
    # Keep report metadata
    if "report_category" not in report.data:
        report.data["report_category"] = "comprehensive"
    if "generated_at" not in report.data:
        report.data["generated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update edit tracking
    report.last_edited_by = user.id
    report.last_edited_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(report)
    
    return {
        "message": "Report data updated successfully",
        "report_id": str(report.id),
        "data": report.data,
        "last_edited_by": str(report.last_edited_by),
        "last_edited_at": report.last_edited_at.isoformat()
    }


@router.post("/{report_id}/data-form")
async def encode_report_data_form(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Get available data fields for a report.
    Helps frontend build a dynamic form for data entry.
    """
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Define common health monitoring fields
    available_fields = {
        "demographics": {
            "total_children": {"type": "number", "label": "Total Children", "required": True},
            "age_group_0_2": {"type": "number", "label": "Age Group 0-2 Years", "required": False},
            "age_group_2_5": {"type": "number", "label": "Age Group 2-5 Years", "required": False},
            "male": {"type": "number", "label": "Male", "required": False},
            "female": {"type": "number", "label": "Female", "required": False},
        },
        "nutrition": {
            "undernourished": {"type": "number", "label": "Undernourished Cases", "required": False},
            "malnutrition_cases": {"type": "number", "label": "Malnutrition Cases", "required": False},
            "severe_acute_malnutrition": {"type": "number", "label": "Severe Acute Malnutrition (SAM)", "required": False},
            "moderate_acute_malnutrition": {"type": "number", "label": "Moderate Acute Malnutrition (MAM)", "required": False},
            "vaccination_coverage": {"type": "number", "label": "Vaccination Coverage %", "required": False, "min": 0, "max": 100},
            "immunization_coverage": {"type": "number", "label": "Immunization Coverage %", "required": False, "min": 0, "max": 100},
        },
        "health_services": {
            "referrals": {"type": "number", "label": "Number of Referrals", "required": False},
            "follow_ups": {"type": "number", "label": "Follow-ups Completed", "required": False},
            "home_visits": {"type": "number", "label": "Home Visits Conducted", "required": False},
            "counseling_sessions": {"type": "number", "label": "Counseling Sessions", "required": False},
        },
        "programs": {
            "feeding_programs": {"type": "number", "label": "Feeding Programs", "required": False},
            "nutrition_classes": {"type": "number", "label": "Nutrition Classes", "required": False},
            "health_education": {"type": "number", "label": "Health Education Sessions", "required": False},
        },
        "notes": {
            "observations": {"type": "text", "label": "Observations", "required": False},
            "challenges": {"type": "text", "label": "Challenges Encountered", "required": False},
            "recommendations": {"type": "text", "label": "Recommendations", "required": False},
        }
    }
    
    return {
        "report_id": str(report.id),
        "report_title": report.title,
        "current_data": report.data or {},
        "available_fields": available_fields,
        "editable": report.status in ["draft", "submitted", "revision"]
    }


@router.post("/{report_id}/resubmit")
async def resubmit_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Admin resubmits report after revision.
    - Only allowed if report is in 'revision' status
    - Changes status back to 'submitted' for re-review
    - Sends notification to superadmin
    """
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status != ReportStatus.revision:
        raise HTTPException(
            status_code=400,
            detail=f"Can only resubmit reports in 'revision' status. Current status: {report.status.value}",
        )
    
    # Update report status for re-review
    report.status = ReportStatus.submitted
    report.submitted_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(report)
    
    # Notify superadmin to review again
    # Get first superadmin user
    super_admin_stmt = select(User).where(User.role == "super_admin").limit(1)
    super_admin = (await db.scalars(super_admin_stmt)).first()
    
    if super_admin:
        notification = Notification(
            user_id=super_admin.id,
            type=NotificationType.report_submitted,
            title="📥 Report Resubmitted for Review",
            message=f"Report '{report.title}' has been resubmitted after revision by {user.username}.",
            link=f"/reports/{report.id}",
            related_id=str(report.id),
        )
        db.add(notification)
        await db.commit()
    
    return report


# ============================================================================
# DELETE ENDPOINT
# ============================================================================


@router.delete("/{report_id}")
async def delete_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Delete a report.
    - Admin can delete their own DRAFT reports
    - SuperAdmin can delete ANY report (submitted, approved, rejected, revision)
    - All reports can be deleted by their creators
    """
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Permission checks
    if user.role != "super_admin":
        # Admin can only delete their own DRAFT reports
        if report.generated_by != user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own reports"
            )
        
        if report.status != ReportStatus.draft:
            raise HTTPException(
                status_code=400,
                detail=f"You can only delete draft reports. This report is in '{report.status.value}' status"
            )
    else:
        # SuperAdmin can delete ANY report (no status restrictions)
        pass
    
    # Delete the report
    await db.delete(report)
    await db.commit()
    
    return {"message": f"Report '{report.title}' has been deleted successfully"}


@router.post("/{report_id}/restore")
async def restore_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Restore a rejected report to draft status.
    - Admin can restore their own rejected reports
    - Allows re-editing and re-submission
    """
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check permissions
    if report.generated_by != user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only restore your own reports"
        )
    
    if report.status != ReportStatus.rejected:
        raise HTTPException(
            status_code=400,
            detail=f"Can only restore rejected reports. This report is in '{report.status.value}' status"
        )
    
    # Restore to draft
    report.status = ReportStatus.draft
    report.reviewed_by = None
    report.reviewed_at = None
    report.review_notes = None
    
    await db.commit()
    await db.refresh(report)
    
    return report
