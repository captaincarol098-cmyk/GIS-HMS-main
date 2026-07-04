"""
SMS Notifications API
Manage SMS notifications and test SMS functionality
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from uuid import UUID
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import User
from ..services.sms_service import send_sms, send_bulk_sms, validate_phone
from ..services.notification_service import (
    send_weekly_summary_sms,
    send_custom_sms_to_barangay
)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class SendSMSRequest(BaseModel):
    phone_number: str
    message: str
    priority: str = "normal"


class BulkSMSRequest(BaseModel):
    recipients: list[dict]  # [{"phone": "09xx", "message": "..."}]


class CustomBroadcastRequest(BaseModel):
    barangay_id: UUID
    message: str


@router.post("/sms/send")
async def api_send_sms(
    request: SendSMSRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send single SMS (Super Admin only)
    
    Example:
    {
        "phone_number": "09171234567",
        "message": "Test message from GIS-HMS",
        "priority": "normal"
    }
    """
    if user.role.value != "super_admin":
        raise HTTPException(403, "Only super admin can send SMS")
    
    result = send_sms(
        phone_number=request.phone_number,
        message=request.message,
        priority=request.priority
    )
    
    if not result.get("success"):
        raise HTTPException(500, f"Failed to send SMS: {result.get('error')}")
    
    return {
        "success": True,
        "message": "SMS sent successfully",
        **result
    }


@router.post("/sms/bulk")
async def api_send_bulk_sms(
    request: BulkSMSRequest,
    user: User = Depends(get_current_user)
):
    """
    Send bulk SMS (Super Admin only)
    
    Example:
    {
        "recipients": [
            {"phone": "09171234567", "message": "Hello BHW 1"},
            {"phone": "09181234567", "message": "Hello BHW 2"}
        ]
    }
    """
    if user.role.value != "super_admin":
        raise HTTPException(403, "Only super admin can send bulk SMS")
    
    result = send_bulk_sms(request.recipients)
    return {
        "success": True,
        "message": f"Sent {result['success']}/{result['total']} SMS successfully",
        **result
    }


@router.post("/weekly-summary/{barangay_id}")
async def api_send_weekly_summary(
    barangay_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send weekly summary SMS to barangay health workers (Super Admin only)
    
    Sends nutrition statistics for the barangay to all assigned health workers
    """
    if user.role.value != "super_admin":
        raise HTTPException(403, "Only super admin can trigger summaries")
    
    result = await send_weekly_summary_sms(db, barangay_id)
    
    if not result.get("success"):
        raise HTTPException(500, f"Failed to send summary: {result.get('error')}")
    
    return {
        "success": True,
        "message": f"Weekly summary sent to {result.get('recipients_notified')} health workers",
        **result
    }


@router.post("/broadcast")
async def api_broadcast_to_barangay(
    request: CustomBroadcastRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send custom broadcast message to all health workers in a barangay
    (Super Admin only)
    
    Example:
    {
        "barangay_id": "uuid-here",
        "message": "Please submit monthly reports by Friday"
    }
    """
    if user.role.value != "super_admin":
        raise HTTPException(403, "Only super admin can broadcast messages")
    
    result = await send_custom_sms_to_barangay(
        db,
        request.barangay_id,
        request.message,
        user
    )
    
    if not result.get("success"):
        raise HTTPException(500, f"Failed to broadcast: {result.get('error')}")
    
    return {
        "success": True,
        "message": f"Broadcast sent to {result.get('recipients_notified')} health workers",
        **result
    }


@router.get("/test")
async def test_sms_service(
    phone: str,
    user: User = Depends(get_current_user)
):
    """
    Test SMS service configuration
    
    Sends a test message to verify SMS integration is working
    
    Example: GET /api/notifications/test?phone=09171234567
    """
    if user.role.value != "super_admin":
        raise HTTPException(403, "Only super admin can test SMS")
    
    # Validate phone first
    validation = validate_phone(phone)
    if not validation.get("valid"):
        raise HTTPException(400, validation.get("error"))
    
    result = send_sms(
        phone_number=phone,
        message="🧪 GIS-HMS SMS Test\n\nIf you receive this message, SMS integration is working correctly!\n\n- GIS-HMS System",
        priority="normal"
    )
    
    if not result.get("success"):
        raise HTTPException(500, f"SMS test failed: {result.get('error')}")
    
    return {
        "success": True,
        "message": f"Test SMS sent successfully to {validation.get('normalized')}",
        **result
    }


@router.post("/validate-phone")
async def api_validate_phone(
    phone: str,
    user: User = Depends(get_current_user)
):
    """
    Validate phone number format without sending SMS
    
    Example: POST /api/notifications/validate-phone?phone=09171234567
    """
    result = validate_phone(phone)
    
    if not result.get("valid"):
        return {
            "valid": False,
            "error": result.get("error")
        }
    
    return {
        "valid": True,
        "normalized": result.get("normalized"),
        "format": result.get("format")
    }


@router.get("/status")
async def get_sms_status(
    user: User = Depends(get_current_user)
):
    """
    Get SMS service configuration status
    
    Shows if SMS is enabled, which provider is active, and test mode status
    """
    import os
    
    return {
        "enabled": os.getenv("SMS_ENABLED", "false").lower() == "true",
        "provider": os.getenv("SMS_PROVIDER", "semaphore"),
        "test_mode": os.getenv("SMS_TEST_MODE", "false").lower() == "true",
        "sender_name": os.getenv("SEMAPHORE_SENDER_NAME", "GIS-HMS"),
        "configured": bool(os.getenv("SEMAPHORE_API_KEY") or os.getenv("TWILIO_ACCOUNT_SID"))
    }
