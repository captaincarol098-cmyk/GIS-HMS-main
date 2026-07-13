from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel
from typing import Optional, List


class ProgramParticipantIn(BaseModel):
    child_id: UUID
    attended: bool = True
    notes: Optional[str] = None


class ProgramParticipantOut(BaseModel):
    id: UUID
    child_id: UUID
    attended: bool
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ProgramSessionIn(BaseModel):
    purok_id: UUID
    session_date: datetime
    location: Optional[str] = None
    notes: Optional[str] = None
    participants: List[ProgramParticipantIn] = []


class ProgramSessionUpdate(BaseModel):
    location: Optional[str] = None
    notes: Optional[str] = None
    participants: Optional[List[ProgramParticipantIn]] = None


class ProgramSessionOut(BaseModel):
    id: UUID
    program_id: UUID
    purok_id: UUID
    session_date: datetime
    location: Optional[str]
    notes: Optional[str]
    total_participants: int
    participants: List[ProgramParticipantOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NutritionProgramIn(BaseModel):
    name: str
    description: Optional[str] = None
    program_type: str = "Other"  # ProgramType enum value
    funding_source: str = "City Funded Program"  # FundingSource enum value
    purok_id: UUID
    frequency: str  # "weekly" or "monthly"
    status: str = "active"
    government_funded: bool = False
    budget_amount: Optional[float] = None


class NutritionProgramUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    program_type: Optional[str] = None
    funding_source: Optional[str] = None
    frequency: Optional[str] = None
    status: Optional[str] = None
    government_funded: Optional[bool] = None
    budget_amount: Optional[float] = None


class NutritionProgramOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    program_type: str
    funding_source: str
    purok_id: UUID
    frequency: str
    status: str
    government_funded: bool
    budget_amount: Optional[float]
    ai_recommended_budget: Optional[float]
    ai_recommendation_notes: Optional[str]
    approval_status: str
    comments: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NutritionProgramWithSessionsOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    program_type: str
    funding_source: str
    purok_id: UUID
    frequency: str
    status: str
    government_funded: bool
    budget_amount: Optional[float]
    ai_recommended_budget: Optional[float]
    ai_recommendation_notes: Optional[str]
    approval_status: str
    comments: Optional[str]
    sessions: List[ProgramSessionOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



class ProgramSummary(BaseModel):
    program_id: UUID
    program_name: str
    purok_name: str
    session_date: datetime
    total_participants: int
    attended_participants: int
    malnourished_count: int
    normal_count: int
    location: Optional[str]
