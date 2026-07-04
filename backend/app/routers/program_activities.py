from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import NutritionProgram, ProgramSession, ProgramParticipant, Child, User

router = APIRouter(prefix="/api/programs", tags=["program-activities"])


def _program_out(p: NutritionProgram) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "type": p.frequency.value if hasattr(p.frequency, "value") else "monthly",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": "08:00 AM",
        "location": p.purok.name if p.purok else "TBA",
        "status": p.status.value if hasattr(p.status, "value") else "active",
        "registered_children": 0,
        "total_children": sum(len(s.participants) for s in p.sessions) if p.sessions else 0,
    }


@router.get("")
async def list_programs(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        stmt = (
            select(NutritionProgram)
            .options(
                selectinload(NutritionProgram.purok),
                selectinload(NutritionProgram.sessions).selectinload(ProgramSession.participants)
            )
            .order_by(NutritionProgram.created_at.desc())
        )
        rows = list((await db.scalars(stmt)).all())
        return [_program_out(r) for r in rows]
    except Exception as e:
        print(f"Error loading programs: {e}")
        import traceback
        traceback.print_exc()
        return []


def _child_out(c: Child, attended: bool = False, check_in_time: str | None = None) -> dict:
    from datetime import date
    age = 0
    if c.birth_date:
        age = date.today().year - c.birth_date.year
    return {
        "id": str(c.id),
        "name": c.full_name,
        "age": age,
        "sex": c.sex.value if hasattr(c.sex, "value") else "male",
        "qr_code": f"QR-{str(c.id)[:8].upper()}",
        "attended": attended,
        "check_in_time": check_in_time,
    }


@router.get("/{program_id}/children")
async def program_children(program_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    sessions = list((await db.scalars(
        select(ProgramSession).where(ProgramSession.program_id == program_id)
    )).all())
    child_ids = set()
    attended_map = {}
    for s in sessions:
        for p in s.participants:
            child_ids.add(p.child_id)
            if p.attended:
                attended_map[p.child_id] = s.session_date.strftime("%I:%M %p") if s.session_date else "Checked In"
    children = list((await db.scalars(
        select(Child).where(Child.id.in_(child_ids)) if child_ids else select(Child).where(Child.id.is_(None))
    )).all()) if child_ids else []
    return [_child_out(c, c.id in attended_map, attended_map.get(c.id)) for c in children]


class CheckInIn(BaseModel):
    child_id: UUID


@router.post("/{program_id}/check-in")
async def check_in(program_id: UUID, body: CheckInIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    session = await db.scalar(
        select(ProgramSession).where(ProgramSession.program_id == program_id).order_by(ProgramSession.session_date.desc())
    )
    if not session:
        return {"status": "no_active_session"}
    participant = await db.scalar(
        select(ProgramParticipant).where(
            ProgramParticipant.session_id == session.id,
            ProgramParticipant.child_id == body.child_id,
        )
    )
    if participant:
        participant.attended = True
    else:
        participant = ProgramParticipant(session_id=session.id, child_id=body.child_id, attended=True)
        db.add(participant)
    await db.commit()
    return {"status": "checked_in"}


class ParticipantRegistrationIn(BaseModel):
    child_name: str
    birth_date: str  # YYYY-MM-DD
    sex: str  # "male" or "female"
    weight: float
    height: float
    guardian_name: str
    guardian_contact: str | None = None
    address: str | None = None
    notes: str | None = None


@router.post("/{program_id}/register")
async def register_participant(
    program_id: UUID,
    body: ParticipantRegistrationIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Register a new child participant in the program and save as a permanent record"""
    from datetime import date as date_type
    from ..models.entities import Sex, Purok, Measurement, WazStatus, HazStatus, WhzStatus, OverallStatus
    
    # Get the program and its purok
    program = await db.scalar(
        select(NutritionProgram).where(NutritionProgram.id == program_id)
    )
    if not program:
        from fastapi import HTTPException
        raise HTTPException(404, "Program not found")
    
    # Get purok details for barangay assignment
    purok = await db.scalar(
        select(Purok).where(Purok.id == program.purok_id)
    )
    if not purok:
        from fastapi import HTTPException
        raise HTTPException(404, "Purok not found for this program")
    
    # Parse birth date
    try:
        birth_date = date_type.fromisoformat(body.birth_date)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(400, "Invalid birth date format. Use YYYY-MM-DD")
    
    # Calculate age in months
    today = date_type.today()
    age_months = (today.year - birth_date.year) * 12 + (today.month - birth_date.month)
    if today.day < birth_date.day:
        age_months -= 1
    
    # Create or find the child record
    sex_enum = Sex.male if body.sex.lower() == "male" else Sex.female
    
    # Check if child already exists by name and birth_date in the same purok
    existing_child = await db.scalar(
        select(Child).where(
            Child.full_name == body.child_name,
            Child.birth_date == birth_date,
            Child.purok_id == program.purok_id
        )
    )
    
    if existing_child:
        child_id = existing_child.id
        # Update guardian info if provided
        if body.guardian_name:
            existing_child.guardian_name = body.guardian_name
        if body.guardian_contact:
            existing_child.contact_number = body.guardian_contact
    else:
        # Create new child record with default coordinates (will be updated later)
        new_child = Child(
            full_name=body.child_name,
            birth_date=birth_date,
            sex=sex_enum,
            guardian_name=body.guardian_name,
            contact_number=body.guardian_contact,
            purok_id=program.purok_id,
            barangay_id=purok.barangay_id,
            latitude=0.0,  # Default, should be updated by BHW later
            longitude=0.0,  # Default, should be updated by BHW later
            is_active=True
        )
        db.add(new_child)
        await db.flush()
        child_id = new_child.id
    
    # Calculate WHO z-scores and nutritional status
    from ..utils.who_zscore import calculate_full_assessment
    sex_for_calc = "male" if body.sex.lower() == "male" else "female"
    assessment = calculate_full_assessment(sex_for_calc, age_months, body.weight, body.height)
    
    # Extract values from assessment and convert to enum types
    waz = assessment["waz"]
    haz = assessment["haz"]
    whz = assessment["whz"]
    
    # Convert string statuses to enum values
    waz_status = WazStatus[assessment["waz_status"]]
    haz_status = HazStatus[assessment["haz_status"]]
    whz_status = WhzStatus[assessment["whz_status"]]
    overall_status = OverallStatus[assessment["overall_status"]]
    
    # Create measurement record
    measurement = Measurement(
        child_id=child_id,
        measured_by=user.id,
        measurement_date=today,
        age_in_months=age_months,
        weight_kg=body.weight,
        height_cm=body.height,
        muac_cm=None,
        waz=waz,
        haz=haz,
        whz=whz,
        waz_status=waz_status,
        haz_status=haz_status,
        whz_status=whz_status,
        overall_status=overall_status
    )
    db.add(measurement)
    await db.flush()
    
    # Get or create active session for this program
    session = await db.scalar(
        select(ProgramSession)
        .where(ProgramSession.program_id == program_id)
        .order_by(ProgramSession.session_date.desc())
    )
    
    if not session:
        # Create a new session for today
        session = ProgramSession(
            program_id=program_id,
            purok_id=program.purok_id,
            session_date=datetime.now(),
            location=body.address or purok.name,
            conducted_by=user.id,
            notes=f"Registration session for {program.name}",
            total_participants=0
        )
        db.add(session)
        await db.flush()
    
    # Check if already registered in this session
    existing_participant = await db.scalar(
        select(ProgramParticipant).where(
            ProgramParticipant.session_id == session.id,
            ProgramParticipant.child_id == child_id
        )
    )
    
    if not existing_participant:
        # Add child as participant
        participant = ProgramParticipant(
            session_id=session.id,
            child_id=child_id,
            measurement_id=measurement.id,
            attended=True,  # Registered means attended
            notes=body.notes
        )
        db.add(participant)
        
        # Update session participant count
        session.total_participants += 1
    else:
        # Update existing participant with new measurement
        existing_participant.measurement_id = measurement.id
        existing_participant.attended = True
        if body.notes:
            existing_participant.notes = body.notes
    
    await db.commit()
    
    return {
        "status": "success",
        "child_id": str(child_id),
        "measurement_id": str(measurement.id),
        "message": f"{body.child_name} successfully registered for {program.name}"
    }


class ProgramCreateIn(BaseModel):
    name: str
    type: str
    date: str
    time: str
    location: str
    description: str | None = None


@router.post("")
async def create_program(
    body: ProgramCreateIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create a new program activity"""
    from ..models.entities import ProgramStatus, ProgramFrequency, Purok
    
    # Get user's first purok or create a default one
    purok = await db.scalar(
        select(Purok).where(Purok.barangay_id == user.barangay_id).limit(1)
    )
    
    if not purok:
        # If no purok exists, we still need to create the program
        # This is a fallback - ideally puroks should exist
        from fastapi import HTTPException
        raise HTTPException(400, "No purok found for your barangay. Please create a purok first.")
    
    # Create nutrition program
    program = NutritionProgram(
        name=body.name,
        description=body.description or f"{body.type} scheduled for {body.date} at {body.time} in {body.location}",
        purok_id=purok.id,
        frequency=ProgramFrequency.weekly if "weekly" in body.type.lower() else ProgramFrequency.monthly,
        status=ProgramStatus.active if body.date == datetime.now().strftime("%Y-%m-%d") else ProgramStatus.active,
        government_funded=True,
        created_by=user.id
    )
    
    db.add(program)
    await db.flush()
    
    # Create initial session
    try:
        session_datetime = datetime.strptime(f"{body.date} {body.time}", "%Y-%m-%d %H:%M")
        # Make timezone-aware (UTC)
        from datetime import timezone as dt_timezone
        session_datetime = session_datetime.replace(tzinfo=dt_timezone.utc)
    except:
        session_datetime = datetime.now(dt_timezone.utc)
    
    session = ProgramSession(
        program_id=program.id,
        purok_id=purok.id,
        session_date=session_datetime,
        location=body.location,
        conducted_by=user.id,
        notes=body.description or f"{body.type} activity",
        total_participants=0
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(program)
    
    return _program_out(program)
