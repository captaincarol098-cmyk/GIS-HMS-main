from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.rbac import get_current_user, require_super_admin
from ..models import SystemSetting, User
import json

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
async def get_settings(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = list((await db.scalars(select(SystemSetting))).all())
    return {r.key: r.value for r in rows}


@router.get("/{key}")
async def get_setting(key: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await db.scalar(select(SystemSetting).where(SystemSetting.key == key))
    if not row:
        raise HTTPException(404, "Setting not found")
    return {row.key: row.value}


class SettingIn(BaseModel):
    key: str
    value: str


@router.post("")
async def set_setting(body: SettingIn, db: AsyncSession = Depends(get_db), user: User = Depends(require_super_admin)):
    row = await db.scalar(select(SystemSetting).where(SystemSetting.key == body.key))
    if row:
        row.value = body.value
    else:
        row = SystemSetting(key=body.key, value=body.value)
        db.add(row)
    await db.commit()
    return {body.key: body.value}


# ============================================================================
# ALERT THRESHOLD CONFIGURATION
# ============================================================================

class AlertThresholdConfig(BaseModel):
    warning_any_prevalence: float = Field(default=10.0, ge=0, le=100, description="Warning threshold for any indicator (%)")
    critical_wasting: float = Field(default=5.0, ge=0, le=100, description="Critical threshold for wasting (%)")
    critical_any_prevalence: float = Field(default=15.0, ge=0, le=100, description="Critical threshold for any indicator (%)")
    critical_percent_increase: float = Field(default=25.0, ge=0, le=100, description="Critical threshold for percent increase (%)")
    emergency_wasting: float = Field(default=10.0, ge=0, le=100, description="Emergency threshold for wasting (%)")
    emergency_sam: float = Field(default=2.0, ge=0, le=100, description="Emergency threshold for SAM (%)")
    emergency_any_prevalence: float = Field(default=20.0, ge=0, le=100, description="Emergency threshold for any indicator (%)")


@router.get("/alert-thresholds")
async def get_alert_thresholds(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get current alert threshold configuration.
    Accessible by both admin and superadmin.
    """
    from ..services.population_alerts import get_alert_configuration
    return await get_alert_configuration(db)


@router.put("/alert-thresholds")
async def update_alert_thresholds(
    config: AlertThresholdConfig,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Update alert threshold configuration.
    Accessible by both admin and superadmin.
    
    Args:
        config: Alert threshold values (all optional, will use existing if not provided)
    """
    # Allow both admin and superadmin
    if user.role.value not in ["admin", "super_admin"]:
        raise HTTPException(403, "Only admin and superadmin can configure alert thresholds")
    
    # Build new thresholds object
    thresholds = {
        "warning": {
            "any_prevalence": config.warning_any_prevalence,
            "color": "yellow",
            "emoji": "🟡",
            "action": "Notify BHW, schedule follow-up"
        },
        "critical": {
            "wasting": config.critical_wasting,
            "any_prevalence": config.critical_any_prevalence,
            "percent_increase": config.critical_percent_increase,
            "color": "orange",
            "emoji": "🟠",
            "action": "Notify Barangay Admin, conduct feeding"
        },
        "emergency": {
            "wasting": config.emergency_wasting,
            "sam": config.emergency_sam,
            "any_prevalence": config.emergency_any_prevalence,
            "color": "red",
            "emoji": "🔴",
            "action": "Notify CHO, immediate intervention"
        }
    }
    
    # Save to database
    setting = await db.scalar(
        select(SystemSetting).where(SystemSetting.key == "alert_thresholds")
    )
    
    if setting:
        setting.value = json.dumps(thresholds)
    else:
        setting = SystemSetting(
            key="alert_thresholds",
            value=json.dumps(thresholds)
        )
        db.add(setting)
    
    await db.commit()
    
    # Log the change
    from ..services.audit import log_activity
    await log_activity(
        db,
        user.id,
        "UPDATE_ALERT_THRESHOLDS",
        "settings",
        "alert_thresholds",
        {"new": thresholds}
    )
    
    return {
        "message": "Alert thresholds updated successfully",
        "thresholds": thresholds,
        "updated_by": str(user.id),
        "role": user.role.value
    }
