from datetime import date, datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import Measurement, Alert, Report, NutritionProgram, ProgramSession, User

router = APIRouter(prefix="/api/accomplishments", tags=["accomplishments"])


@router.get("")
async def get_accomplishments(month: int, year: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    total_measurements = await db.scalar(
        select(func.count(Measurement.id)).where(
            extract("month", Measurement.measurement_date) == month,
            extract("year", Measurement.measurement_date) == year,
        )
    ) or 0

    total_sessions = await db.scalar(
        select(func.count(ProgramSession.id)).where(
            extract("month", ProgramSession.session_date) == month,
            extract("year", ProgramSession.session_date) == year,
        )
    ) or 0

    total_reports = await db.scalar(
        select(func.count(Report.id)).where(
            extract("month", Report.generated_at) == month,
            extract("year", Report.generated_at) == year,
        )
    ) or 0

    total_alerts = await db.scalar(
        select(func.count(Alert.id)).where(
            extract("month", Alert.created_at) == month,
            extract("year", Alert.created_at) == year,
        )
    ) or 0

    resolved_alerts = await db.scalar(
        select(func.count(Alert.id)).where(
            Alert.is_resolved == True,
            extract("month", Alert.resolved_at) == month if Alert.resolved_at else False,
            extract("year", Alert.resolved_at) == year if Alert.resolved_at else False,
        )
    ) or 0

    def pct(completed: int, target: int) -> int:
        return min(100, round((completed / max(1, target)) * 100))

    target_assessments = max(50, total_measurements + 10)
    target_programs = max(4, total_sessions + 2)
    target_visits = 30
    target_reports = max(2, total_reports + 1)
    target_alerts = max(total_alerts, resolved_alerts + 1)

    return {
        "assessments": {"completed": total_measurements, "target": target_assessments, "percentage": pct(total_measurements, target_assessments)},
        "programs": {"completed": total_sessions, "target": target_programs, "percentage": pct(total_sessions, target_programs)},
        "home_visits": {"completed": 0, "target": target_visits, "percentage": 0},
        "reports": {"completed": total_reports, "target": target_reports, "percentage": pct(total_reports, target_reports)},
        "alerts_resolved": {"completed": resolved_alerts, "target": target_alerts, "percentage": pct(resolved_alerts, target_alerts)},
    }
