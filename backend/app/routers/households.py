from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import User
from ..models.entities import Household, Purok, Child

router = APIRouter(prefix="/api/households", tags=["households"])


class HouseholdCreate(BaseModel):
    purok_id: UUID
    household_no: str
    head_name: str
    address: str | None = None
    contact_number: str | None = None
    member_count: int = 0
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = None


class HouseholdUpdate(BaseModel):
    household_no: str | None = None
    head_name: str | None = None
    address: str | None = None
    contact_number: str | None = None
    member_count: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = None


@router.get("")
async def list_households(
    purok_id: UUID | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Household).options(selectinload(Household.purok)).order_by(Household.head_name)
    if purok_id:
        stmt = stmt.where(Household.purok_id == purok_id)
    if search:
        q = f"%{search}%"
        stmt = stmt.where(Household.head_name.ilike(q) | Household.household_no.ilike(q))
    return list((await db.scalars(stmt)).all())


@router.get("/{household_id}")
async def get_household(household_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    hh = await db.get(Household, household_id)
    if not hh:
        raise HTTPException(404, "Household not found")
    return hh


@router.post("")
async def create_household(body: HouseholdCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    purok = await db.get(Purok, body.purok_id)
    if not purok:
        raise HTTPException(400, "Purok not found")
    hh = Household(**body.model_dump())
    db.add(hh)
    await db.commit()
    await db.refresh(hh)
    return hh


@router.put("/{household_id}")
async def update_household(household_id: UUID, body: HouseholdUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    hh = await db.get(Household, household_id)
    if not hh:
        raise HTTPException(404, "Household not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(hh, field, value)
    await db.commit()
    await db.refresh(hh)
    return hh


@router.delete("/{household_id}")
async def delete_household(household_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    hh = await db.get(Household, household_id)
    if not hh:
        raise HTTPException(404, "Household not found")
    children_count = await db.scalar(select(func.count(Child.id)).where(Child.household_id == household_id))
    if children_count and children_count > 0:
        raise HTTPException(400, f"Cannot delete household with {children_count} children linked to it. Remove the household reference from children first.")
    await db.delete(hh)
    await db.commit()
    return {"ok": True}
