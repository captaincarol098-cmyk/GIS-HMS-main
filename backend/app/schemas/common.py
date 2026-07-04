from datetime import date, datetime
from typing import Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "admin"
    barangay_id: UUID | None = None


class UserRead(ORMModel):
    id: UUID
    username: str
    email: EmailStr
    role: str
    barangay_id: UUID | None
    barangay_name: str | None = None
    is_active: bool
    account_status: str = "active"
    last_login: datetime | None = None


class ChildCreate(BaseModel):
    full_name: str
    birth_date: date
    sex: str
    guardian_name: str
    contact_number: str | None = None
    purok_id: UUID
    barangay_id: UUID
    latitude: float
    longitude: float


class ChildRead(ORMModel):
    id: UUID
    full_name: str
    birth_date: date
    sex: str
    guardian_name: str
    contact_number: str | None
    purok_id: UUID
    barangay_id: UUID
    latitude: float
    longitude: float
    is_active: bool
    latest_measurement: dict[str, Any] | None = None


class MeasurementCreate(BaseModel):
    child_id: UUID
    measurement_date: date
    weight_kg: float
    height_cm: float
    muac_cm: float | None = None
    measurement_position: str = "standing"  # NEW: "standing" or "lying_down"
    has_bilateral_edema: bool = False  # NEW: Edema override flag


class MeasurementRead(ORMModel):
    id: UUID
    child_id: UUID
    measurement_date: date
    age_in_months: int
    weight_kg: float
    height_cm: float
    muac_cm: float | None
    waz: float
    haz: float
    whz: float
    waz_status: str
    haz_status: str
    whz_status: str
    overall_status: str
    created_at: datetime


class ReferralCreate(BaseModel):
    child_id: UUID
    referred_to: str
    reason: str
    priority: str = "routine"
    notes: str | None = None


class ReportGenerate(BaseModel):
    title: str
    report_type: str
    report_category: str = "executive"
    barangay_id: UUID | None = None
    period_start: date
    period_end: date
    content: str | None = None  # HTML formatted report content
    data: dict[str, Any] | None = None  # Report data as backup


# Report Workflow Schemas for Sharing Workspace
class ReportApproveRequest(BaseModel):
    comments: str | None = None


class ReportRejectRequest(BaseModel):
    reason: str  # Required - why it was rejected
    comments: str | None = None


class ReportRevisionRequest(BaseModel):
    required_changes: str  # What needs to be changed
    comments: str | None = None


class ReportEditRequest(BaseModel):
    content: str  # Updated HTML content
    notes: str | None = None  # Edit notes
