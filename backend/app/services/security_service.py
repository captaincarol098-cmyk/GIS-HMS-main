"""
Security service for tracking suspicious activities and account lockouts
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import User, SecurityAlert, SecurityAlertType, Severity, AccountStatus


MAX_FAILED_ATTEMPTS = 3
LOCKOUT_DURATION_MINUTES = 15  # Lock account for 15 minutes after 3 failed attempts


async def record_failed_login(
    db: AsyncSession,
    username: str,
    ip_address: str,
    user_id: UUID | None = None,
) -> tuple[bool, str]:
    """
    Record a failed login attempt and check if account should be locked.
    
    Returns:
        (should_allow_retry: bool, message: str)
    """
    try:
        # Get user if exists
        user = None
        if user_id:
            user = await db.get(User, user_id)
        
        # Increment failed attempts
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            user.last_failed_login = datetime.now(timezone.utc)
            
            # Lock account if max attempts reached
            if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                user.account_status = AccountStatus.locked
                user.account_locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                
                # Create critical security alert
                alert = SecurityAlert(
                    alert_type=SecurityAlertType.account_locked,
                    user_id=user.id,
                    username=username,
                    ip_address=ip_address,
                    failed_attempts=user.failed_login_attempts,
                    severity=Severity.critical,
                    description=f"Account locked after {MAX_FAILED_ATTEMPTS} failed login attempts",
                    details={
                        "username": username,
                        "ip_address": ip_address,
                        "failed_attempts": user.failed_login_attempts,
                        "locked_until": user.account_locked_until.isoformat(),
                    }
                )
                db.add(alert)
                db.add(user)
                await db.commit()
                return False, f"Account locked due to {MAX_FAILED_ATTEMPTS} failed attempts. Try again in {LOCKOUT_DURATION_MINUTES} minutes."
            
            # Create security alert for failed attempt
            alert = SecurityAlert(
                alert_type=SecurityAlertType.failed_login,
                user_id=user.id,
                username=username,
                ip_address=ip_address,
                failed_attempts=user.failed_login_attempts,
                severity=Severity.high if user.failed_login_attempts >= 2 else Severity.medium,
                description=f"Failed login attempt {user.failed_login_attempts} of {MAX_FAILED_ATTEMPTS}",
                details={
                    "username": username,
                    "ip_address": ip_address,
                    "attempt_number": user.failed_login_attempts,
                    "max_attempts": MAX_FAILED_ATTEMPTS,
                }
            )
            db.add(alert)
            db.add(user)
            await db.commit()
            
            attempts_remaining = MAX_FAILED_ATTEMPTS - user.failed_login_attempts
            return True, f"Invalid credentials. {attempts_remaining} attempts remaining."
        else:
            # Unknown user - still create alert for tracking
            alert = SecurityAlert(
                alert_type=SecurityAlertType.suspicious_activity,
                username=username,
                ip_address=ip_address,
                failed_attempts=1,
                severity=Severity.medium,
                description=f"Failed login attempt for non-existent or inactive user",
                details={
                    "username": username,
                    "ip_address": ip_address,
                    "reason": "user_not_found_or_inactive",
                }
            )
            db.add(alert)
            await db.commit()
            return True, "Invalid credentials"
            
    except Exception as e:
        print(f"Error recording failed login: {str(e)}")
        return True, "Invalid credentials"


async def check_account_locked(db: AsyncSession, user: User) -> tuple[bool, str | None]:
    """
    Check if account is locked and if lockout period has expired.
    
    Returns:
        (is_locked: bool, error_message: str | None)
    """
    if user.account_status == AccountStatus.locked:
        if user.account_locked_until:
            now = datetime.now(timezone.utc)
            if now < user.account_locked_until:
                minutes_left = int((user.account_locked_until - now).total_seconds() / 60)
                return True, f"Account is locked. Try again in {minutes_left} minutes."
            else:
                # Unlock account
                user.account_status = AccountStatus.active
                user.failed_login_attempts = 0
                user.account_locked_until = None
                db.add(user)
                await db.commit()
                return False, None
        else:
            # Locked but no expiry - stay locked
            return True, "Account is locked. Contact administrator."
    
    return False, None


async def reset_failed_login_attempts(db: AsyncSession, user: User):
    """Reset failed login attempts on successful login"""
    if user.failed_login_attempts > 0:
        user.failed_login_attempts = 0
        user.last_failed_login = None
        db.add(user)
        await db.commit()


async def get_security_alerts_for_superadmin(
    db: AsyncSession,
    limit: int = 50,
    unresolved_only: bool = False,
) -> list[dict]:
    """Get recent security alerts for super admin dashboard"""
    query = select(SecurityAlert).order_by(SecurityAlert.created_at.desc()).limit(limit)
    
    if unresolved_only:
        query = query.where(SecurityAlert.is_resolved == False)
    
    result = await db.scalars(query)
    alerts = result.all()
    
    return [
        {
            "id": str(alert.id),
            "type": alert.alert_type.value,
            "severity": alert.severity.value,
            "username": alert.username,
            "ip_address": alert.ip_address,
            "failed_attempts": alert.failed_attempts,
            "description": alert.description,
            "created_at": alert.created_at.isoformat(),
            "is_resolved": alert.is_resolved,
            "details": alert.details,
        }
        for alert in alerts
    ]


async def resolve_security_alert(
    db: AsyncSession,
    alert_id: UUID,
    resolver_id: UUID,
    notes: str | None = None,
):
    """Mark a security alert as resolved by super admin"""
    alert = await db.get(SecurityAlert, alert_id)
    if alert:
        alert.is_resolved = True
        alert.resolved_at = datetime.now(timezone.utc)
        alert.resolved_by = resolver_id
        if notes:
            alert.description += f"\n\n[RESOLVED] {notes}"
        db.add(alert)
        await db.commit()
        return True
    return False
