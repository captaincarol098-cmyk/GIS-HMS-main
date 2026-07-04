from sqlalchemy.ext.asyncio import AsyncSession
from ..models import ActivityLog


async def log_activity(db: AsyncSession, user_id, action: str, resource_type: str | None = None, resource_id: str | None = None, details: dict | None = None, ip_address: str | None = None):
    db.add(ActivityLog(user_id=user_id, action=action, resource_type=resource_type, resource_id=resource_id, details=details or {}, ip_address=ip_address))
