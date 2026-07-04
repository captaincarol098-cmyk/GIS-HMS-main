from datetime import date
from sqlalchemy import and_, func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Alert, Barangay, Child, Measurement, Referral
from ..utils.who_zscore import calculate_prevalence, classify_risk_level

# Barangays explicitly excluded from all city-scoped queries
# Concepcion is NOT part of Cabadbaran City proper
EXCLUDED_BARANGAYS = {"Concepcion"}

# Target age range: 0-5 years (0-59 months)
TARGET_AGE_MIN = 0
TARGET_AGE_MAX = 59


async def latest_measurements(db: AsyncSession, barangay_id=None, year=None):
    """
    Get latest measurements for children aged 0-59 months (0-5 years old).
    This ensures all analytics focus on the target age group.
    Supports year filtering for historical analysis.
    """
    print(f"[DEBUG] latest_measurements called with barangay_id={barangay_id}, year={year}")
    
    subq_where = [
        Child.is_active.is_(True),
        Barangay.name.notin_(EXCLUDED_BARANGAYS),
        # Filter by target age: 0-59 months
        Measurement.age_in_months >= TARGET_AGE_MIN,
        Measurement.age_in_months <= TARGET_AGE_MAX
    ]
    
    # Add year filter if specified
    if year:
        from datetime import datetime
        start_date = datetime(year, 1, 1).date()
        end_date = datetime(year, 12, 31).date()
        print(f"[DEBUG] Adding year filter: {start_date} to {end_date}")
        subq_where.append(Measurement.measurement_date.between(start_date, end_date))
    
    subq = (
        select(Measurement.child_id, func.max(Measurement.measurement_date).label("max_date"))
        .join(Child, Child.id == Measurement.child_id)
        .join(Barangay, Barangay.id == Child.barangay_id)
        .where(and_(*subq_where))
        .group_by(Measurement.child_id)
        .subquery()
    )
    
    stmt_where = [
        Barangay.name.notin_(EXCLUDED_BARANGAYS),
        # Filter by target age: 0-59 months
        Measurement.age_in_months >= TARGET_AGE_MIN,
        Measurement.age_in_months <= TARGET_AGE_MAX
    ]
    
    # Add year filter to main query as well
    if year:
        from datetime import datetime
        start_date = datetime(year, 1, 1).date()
        end_date = datetime(year, 12, 31).date()
        stmt_where.append(Measurement.measurement_date.between(start_date, end_date))
    
    stmt = (
        select(Measurement)
        .options(selectinload(Measurement.child).selectinload(Child.barangay))
        .join(subq, and_(Measurement.child_id == subq.c.child_id, Measurement.measurement_date == subq.c.max_date))
        .join(Child, Child.id == Measurement.child_id)
        .join(Barangay, Barangay.id == Child.barangay_id)
        .where(and_(*stmt_where))
    )
    if barangay_id:
        stmt = stmt.where(Child.barangay_id == barangay_id)
    
    results = list((await db.scalars(stmt)).all())
    print(f"[DEBUG] latest_measurements returned {len(results)} results for year={year}")
    return results


async def summary_for_barangay(db: AsyncSession, barangay_id=None, year=None) -> dict:
    """
    Generate summary statistics for a barangay (or city-wide if no barangay_id).
    Supports year filtering for historical comparison.
    """
    child_stmt = select(func.count(Child.id)).where(Child.is_active.is_(True))
    alert_stmt = select(Alert.severity, func.count(Alert.id)).where(Alert.is_resolved.is_(False)).group_by(Alert.severity)
    ref_stmt = select(func.count(Referral.id)).where(Referral.status == "pending")
    
    # Add year filter for alerts and referrals
    if year:
        from datetime import datetime
        start_date = datetime(year, 1, 1).date()
        end_date = datetime(year, 12, 31).date()
        alert_stmt = alert_stmt.where(func.date(Alert.created_at).between(start_date, end_date))
        ref_stmt = ref_stmt.where(func.date(Referral.referred_at).between(start_date, end_date))
    
    if barangay_id:
        child_stmt = child_stmt.where(Child.barangay_id == barangay_id)
        alert_stmt = alert_stmt.join(Child, Child.id == Alert.child_id).where(Child.barangay_id == barangay_id)
        ref_stmt = ref_stmt.join(Child, Child.id == Referral.child_id).where(Child.barangay_id == barangay_id)
    
    measurements = await latest_measurements(db, barangay_id, year)
    prevalence = calculate_prevalence(measurements)
    alerts = {str(row[0]): row[1] for row in (await db.execute(alert_stmt)).all()}
    critical_barangays_count = 0
    if not barangay_id:
        for barangay in (await db.scalars(select(Barangay).where(Barangay.name.notin_(EXCLUDED_BARANGAYS)))).all():
            barangay_measurements = await latest_measurements(db, barangay.id, year)
            barangay_prevalence = calculate_prevalence(barangay_measurements)
            if classify_risk_level(barangay_prevalence) == "critical":
                critical_barangays_count += 1
    
    # Get month for "measured this month" - use December if filtering by year
    target_month = 12 if year and year < date.today().year else date.today().month
    
    return {
        "total_children": await db.scalar(child_stmt) or 0,
        "critical_barangays_count": critical_barangays_count,
        "total_measured_this_month": len([m for m in measurements if m.measurement_date.month == target_month]),
        "prevalence": {
            "stunting": prevalence["stunting_rate"],
            "wasting": prevalence["wasting_rate"],
            "underweight": prevalence["underweight_rate"],
        },
        "active_alerts_count": alerts,
        "pending_referrals_count": await db.scalar(ref_stmt) or 0,
        "risk_level": classify_risk_level(prevalence),
        "risk_level_label": classify_risk_level(prevalence).replace("_", " ").title(),
        "sample_size": prevalence["sample_size"],
        "year": year or date.today().year,
    }
