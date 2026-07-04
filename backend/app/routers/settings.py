from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.rbac import get_current_user, require_super_admin
from ..models import SystemSetting, User

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
