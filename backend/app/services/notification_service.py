"""
Notification Service - Business logic for when to send SMS notifications
Determines triggers for automated SMS alerts to health workers
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import date, timedelta
from ..models import Child, Measurement, User, Barangay, HomeVisit
from .sms_service import send_sms
import logging

logger = logging.getLogger(__name__)


async def notify_critical_malnutrition(
    db: AsyncSession,
    child: Child,
    measurement: Measurement
):
    """
    Send SMS when child has severe acute malnutrition (SAM)
    
    Trigger: WHZ < -3 (severely wasted)
    Recipients: All health workers assigned to child's barangay
    Priority: URGENT
    """
    try:
        # Get health workers assigned to this barangay
        stmt = select(User).where(
            User.barangay_id == child.barangay_id,
            User.role == "admin",
            User.is_active == True
        )
        health_workers = (await db.scalars(stmt)).all()
        
        if not health_workers:
            logger.warning(f"No health workers found for barangay {child.barangay_id}")
            return {"success": False, "error": "No health workers assigned"}
        
        # Get barangay name
        barangay = await db.get(Barangay, child.barangay_id)
        barangay_name = barangay.name if barangay else "Unknown"
        
        # Calculate age for context
        age_months = measurement.age_in_months
        age_display = f"{age_months // 12}y {age_months % 12}m" if age_months >= 12 else f"{age_months}m"
        
        # Compose SMS message (keep under 160 chars for single SMS)
        message = (
            f"🚨 URGENT ALERT\n"
            f"Child: {child.full_name} ({age_display})\n"
            f"Status: SEVERE MALNUTRITION\n"
            f"Location: {barangay_name}\n"
            f"Action: Immediate home visit required\n"
            f"- GIS-HMS"
        )
        
        # Send to each health worker
        results = []
        for hw in health_workers:
            if hw.phone_number:
                result = send_sms(
                    phone_number=hw.phone_number,
                    message=message,
                    priority="urgent"
                )
                
                results.append({
                    "recipient": hw.username,
                    "phone": hw.phone_number,
                    **result
                })
                
                if result.get("success"):
                    logger.info(f"Critical alert SMS sent to {hw.username} for child {child.full_name}")
                else:
                    logger.error(f"Failed to send SMS to {hw.username}: {result.get('error')}")
            else:
                logger.warning(f"Health worker {hw.username} has no phone number")
        
        return {
            "success": True,
            "recipients_notified": len([r for r in results if r.get("success")]),
            "total_recipients": len(health_workers),
            "results": results
        }
    
    except Exception as e:
        logger.error(f"Error sending critical malnutrition notification: {e}")
        return {"success": False, "error": str(e)}


async def notify_home_visit_reminder(
    db: AsyncSession,
    home_visit: HomeVisit,
    days_before: int = 1
):
    """
    Send reminder SMS N days before scheduled home visit
    
    Trigger: Scheduled date is N days away
    Recipients: Assigned health worker
    Priority: NORMAL
    
    Note: This should be called by a scheduled job (e.g., daily cron)
    """
    try:
        # Check if visit is N days away
        days_until = (home_visit.scheduled_date - date.today()).days
        
        if days_until != days_before:
            return {"success": False, "error": f"Visit is {days_until} days away, not {days_before}"}
        
        # Get assigned health worker
        health_worker = await db.get(User, home_visit.assigned_to)
        
        if not health_worker or not health_worker.phone_number:
            logger.warning(f"No phone number for health worker assigned to visit {home_visit.id}")
            return {"success": False, "error": "Health worker has no phone number"}
        
        # Get child details
        child = await db.get(Child, home_visit.child_id)
        
        if not child:
            return {"success": False, "error": "Child not found"}
        
        # Compose reminder message
        message = (
            f"📅 REMINDER\n"
            f"Home visit tomorrow {home_visit.scheduled_date.strftime('%m/%d/%Y')}\n"
            f"Child: {child.full_name}\n"
            f"Purpose: {home_visit.purpose[:30]}\n"
            f"- GIS-HMS"
        )
        
        result = send_sms(health_worker.phone_number, message)
        
        if result.get("success"):
            logger.info(f"Home visit reminder sent to {health_worker.username}")
        
        return result
    
    except Exception as e:
        logger.error(f"Error sending home visit reminder: {e}")
        return {"success": False, "error": str(e)}


async def notify_measurement_due(
    db: AsyncSession,
    child: Child,
    last_measurement_date: date
):
    """
    Send SMS when child is due for measurement
    
    Trigger:
    - Children 0-24 months: Monthly measurement due
    - Children 25-59 months: Quarterly measurement due
    
    Recipients: Health workers in child's barangay
    Priority: NORMAL
    """
    try:
        # Calculate age
        today = date.today()
        age_months = (today.year - child.birth_date.year) * 12 + (today.month - child.birth_date.month)
        
        # Determine measurement frequency
        if age_months <= 24:
            due_interval_days = 30  # Monthly
            frequency_text = "monthly"
        else:
            due_interval_days = 90  # Quarterly
            frequency_text = "quarterly"
        
        # Check if overdue
        days_since = (today - last_measurement_date).days
        
        if days_since < due_interval_days:
            return {"success": False, "error": "Not yet due for measurement"}
        
        # Get health workers for this barangay
        stmt = select(User).where(
            User.barangay_id == child.barangay_id,
            User.role == "admin",
            User.is_active == True
        )
        health_workers = (await db.scalars(stmt)).all()
        
        if not health_workers:
            return {"success": False, "error": "No health workers assigned"}
        
        # Compose message
        message = (
            f"📊 MEASUREMENT DUE\n"
            f"Child: {child.full_name}\n"
            f"Age: {age_months} months\n"
            f"Last: {last_measurement_date.strftime('%m/%d/%Y')} ({days_since}d ago)\n"
            f"Schedule {frequency_text} check\n"
            f"- GIS-HMS"
        )
        
        # Send to health workers
        results = []
        for hw in health_workers:
            if hw.phone_number:
                result = send_sms(hw.phone_number, message)
                results.append({"recipient": hw.username, **result})
        
        return {
            "success": True,
            "recipients_notified": len([r for r in results if r.get("success")]),
            "results": results
        }
    
    except Exception as e:
        logger.error(f"Error sending measurement due notification: {e}")
        return {"success": False, "error": str(e)}


async def send_weekly_summary_sms(
    db: AsyncSession,
    barangay_id: UUID
):
    """
    Send weekly summary SMS to barangay health workers
    
    Trigger: Weekly (every Monday, for example)
    Recipients: All health workers in barangay
    Priority: NORMAL
    
    Summary includes:
    - Total children monitored
    - Current malnutrition prevalence
    - Trend (improving/worsening)
    """
    try:
        # Get barangay stats
        from .analytics import latest_measurements
        from ..utils.who_zscore import calculate_prevalence
        
        measurements = await latest_measurements(db, barangay_id)
        prevalence = calculate_prevalence(measurements)
        
        if prevalence['sample_size'] == 0:
            return {"success": False, "error": "No measurements found"}
        
        # Get health workers
        stmt = select(User).where(
            User.barangay_id == barangay_id,
            User.role == "admin",
            User.is_active == True
        )
        health_workers = (await db.scalars(stmt)).all()
        
        if not health_workers:
            return {"success": False, "error": "No health workers assigned"}
        
        # Get barangay name
        barangay = await db.get(Barangay, barangay_id)
        barangay_name = barangay.name if barangay else "Unknown"
        
        # Compose summary message
        message = (
            f"📊 WEEKLY SUMMARY\n"
            f"{barangay_name}\n"
            f"Children: {prevalence['sample_size']}\n"
            f"Wasting: {prevalence['wasting_rate']:.1f}%\n"
            f"Stunting: {prevalence['stunting_rate']:.1f}%\n"
            f"Keep monitoring!\n"
            f"- GIS-HMS"
        )
        
        # Send to each health worker
        results = []
        for hw in health_workers:
            if hw.phone_number:
                result = send_sms(hw.phone_number, message)
                results.append({"recipient": hw.username, **result})
        
        return {
            "success": True,
            "recipients_notified": len([r for r in results if r.get("success")]),
            "total_recipients": len(health_workers),
            "results": results
        }
    
    except Exception as e:
        logger.error(f"Error sending weekly summary: {e}")
        return {"success": False, "error": str(e)}


async def send_custom_sms_to_barangay(
    db: AsyncSession,
    barangay_id: UUID,
    message: str,
    sender_user: User
):
    """
    Send custom SMS message to all health workers in a barangay
    
    Used by super admin to broadcast custom messages
    """
    try:
        # Get health workers
        stmt = select(User).where(
            User.barangay_id == barangay_id,
            User.role == "admin",
            User.is_active == True
        )
        health_workers = (await db.scalars(stmt)).all()
        
        if not health_workers:
            return {"success": False, "error": "No health workers in barangay"}
        
        # Get barangay name
        barangay = await db.get(Barangay, barangay_id)
        barangay_name = barangay.name if barangay else "Unknown"
        
        # Add header
        full_message = f"📢 {barangay_name}\n{message}\n- {sender_user.username}"
        
        # Send to each health worker
        results = []
        for hw in health_workers:
            if hw.phone_number:
                result = send_sms(hw.phone_number, full_message)
                results.append({"recipient": hw.username, **result})
        
        return {
            "success": True,
            "recipients_notified": len([r for r in results if r.get("success")]),
            "results": results
        }
    
    except Exception as e:
        logger.error(f"Error sending custom SMS: {e}")
        return {"success": False, "error": str(e)}
