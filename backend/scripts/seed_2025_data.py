"""
Seed script to add 2025 test data for barangays, children, and measurements.
This creates realistic data for 2025 to test the year filtering.
"""
import asyncio
import random
import re
from datetime import date, timedelta, datetime
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Child, Measurement, Purok, Barangay, User, Alert, Referral, NutritionProgram, ProgramSession
from app.models.entities import Sex, UserRole, Priority, ReferralStatus, ProgramFrequency, ProgramStatus
from app.utils.security import hash_password
from app.utils.who_zscore import calculate_full_assessment
from app.services.alerts import alerts_for_measurement


async def seed_2025_data():
    """Add 2025 test data to existing database"""
    print("Connecting to database...")
    async with AsyncSessionLocal() as db:
        # Get existing barangays
        barangays = (await db.scalars(select(Barangay))).all()
        print(f"Found {len(barangays)} barangays")
        
        if not barangays:
            print("No barangays found! Please run the main seed script first.")
            return
        
        # Get superadmin
        superadmin = await db.scalar(select(User).where(User.username == "superadmin"))
        if not superadmin:
            print("Superadmin not found! Please run the main seed script first.")
            return
        
        # Get all puroks
        all_puroks = (await db.scalars(select(Purok))).all()
        print(f"Found {len(all_puroks)} puroks")
        
        names = ["Ana", "Ben", "Carla", "Dino", "Ella", "Finn", "Gina", "Hugo", "Iris", "Joel", "Karen", "Luis", "Maria", "Noel", "Olivia"]
        
        # Create 30 new children with 2025 measurements
        print("\nCreating 30 new children with 2025 measurements...")
        for i in range(30):
            barangay = random.choice(barangays)
            purok = random.choice([x for x in all_puroks if x.barangay_id == barangay.id])
            
            # Birth dates for children 0-59 months old
            birth = date.today() - timedelta(days=random.randint(30, 60 * 30))
            
            child = Child(
                full_name=f"{random.choice(names)} 2025-{i+1}",
                birth_date=birth,
                sex=random.choice([Sex.male, Sex.female]),
                guardian_name=f"Guardian 2025-{i+1}",
                contact_number="09" + "".join(random.choice("0123456789") for _ in range(9)),
                purok_id=purok.id,
                barangay_id=barangay.id,
                latitude=barangay.geometry["coordinates"][0][0][0][0] + random.uniform(-0.005, 0.005),
                longitude=barangay.geometry["coordinates"][0][0][0][1] + random.uniform(-0.005, 0.005),
            )
            db.add(child)
            await db.flush()
            
            # Create 2025 measurements (Jan-June 2025)
            malnourished = i % 5 == 0 or i % 3 == 0
            
            # Measurement 1: January 2025
            mdate_1 = date(2025, 1, random.randint(1, 28))
            age_1 = max(1, (mdate_1.year - birth.year) * 12 + mdate_1.month - birth.month)
            height_1 = 52 + age_1 * 1.05 + random.uniform(-3, 3)
            weight_1 = 3.5 + age_1 * 0.25 + random.uniform(-1, 1)
            if malnourished:
                weight_1 *= 0.72 if i % 5 == 0 else 0.84
            
            assessment_1 = calculate_full_assessment(child.sex.value, age_1, weight_1, height_1)
            m1 = Measurement(
                child_id=child.id,
                measured_by=superadmin.id,
                measurement_date=mdate_1,
                age_in_months=age_1,
                weight_kg=round(weight_1, 2),
                height_cm=round(height_1, 1),
                muac_cm=round(random.uniform(10, 15), 1),
                **assessment_1
            )
            db.add(m1)
            await db.flush()
            
            # Create alerts for measurement 1
            for alert in alerts_for_measurement(child, m1):
                db.add(alert)
                if alert.severity.value in {"critical", "high"}:
                    db.add(Referral(
                        child_id=child.id,
                        referred_by=superadmin.id,
                        referred_to="Cabadbaran City Health Office",
                        reason=alert.message,
                        status=ReferralStatus.pending,
                        priority=Priority.urgent
                    ))
            
            # Measurement 2: April 2025
            mdate_2 = date(2025, 4, random.randint(1, 28))
            age_2 = max(1, (mdate_2.year - birth.year) * 12 + mdate_2.month - birth.month)
            height_2 = 52 + age_2 * 1.05 + random.uniform(-3, 3)
            weight_2 = 3.5 + age_2 * 0.25 + random.uniform(-1, 1)
            if malnourished:
                weight_2 *= 0.72 if i % 5 == 0 else 0.84
            
            assessment_2 = calculate_full_assessment(child.sex.value, age_2, weight_2, height_2)
            m2 = Measurement(
                child_id=child.id,
                measured_by=superadmin.id,
                measurement_date=mdate_2,
                age_in_months=age_2,
                weight_kg=round(weight_2, 2),
                height_cm=round(height_2, 1),
                muac_cm=round(random.uniform(10, 15), 1),
                **assessment_2
            )
            db.add(m2)
            await db.flush()
            
            # Create alerts for measurement 2
            for alert in alerts_for_measurement(child, m2):
                db.add(alert)
        
        print("✅ Created 30 children with 2025 measurements")
        
        # Add 2025 nutrition programs
        print("\nCreating 2025 nutrition programs...")
        if all_puroks:
            programs_2025 = []
            
            # Program 1
            p1 = NutritionProgram(
                name="2025 Supplementary Feeding - Quarter 1",
                description="Q1 2025 supplementary feeding program for underweight children",
                purok_id=all_puroks[0].id,
                frequency=ProgramFrequency.weekly,
                status=ProgramStatus.active,
                government_funded=True,
                budget_amount=50000.0,
                created_by=superadmin.id,
                approval_status="approved",
                comments="Approved for 2025",
                created_at=datetime(2025, 1, 15)
            )
            programs_2025.append(p1)
            
            # Program 2
            p2 = NutritionProgram(
                name="2025 Vitamin A Campaign",
                description="Semiannual Vitamin A supplementation - 2025",
                purok_id=all_puroks[1].id,
                frequency=ProgramFrequency.monthly,
                status=ProgramStatus.active,
                government_funded=True,
                budget_amount=25000.0,
                created_by=superadmin.id,
                approval_status="approved",
                comments="Approved for 2025",
                created_at=datetime(2025, 2, 1)
            )
            programs_2025.append(p2)
            
            # Program 3
            p3 = NutritionProgram(
                name="2025 Barangay Health & Nutrition Fair",
                description="Monthly health and nutrition awareness sessions",
                purok_id=all_puroks[2].id,
                frequency=ProgramFrequency.monthly,
                status=ProgramStatus.active,
                government_funded=False,
                budget_amount=15000.0,
                created_by=superadmin.id,
                approval_status="approved",
                comments="Approved for 2025",
                created_at=datetime(2025, 1, 20)
            )
            programs_2025.append(p3)
            
            db.add_all(programs_2025)
            await db.flush()
            
            # Add program sessions for 2025
            print("Creating program sessions for 2025...")
            for program in programs_2025:
                for month in range(1, 7):  # Jan-June 2025
                    session_date = date(2025, month, random.randint(1, 28))
                    session = ProgramSession(
                        program_id=program.id,
                        purok_id=program.purok_id,
                        session_date=session_date,
                        conducted_by=superadmin.id,
                        location=f"{program.purok.name}, {program.purok.barangay.name}",
                        total_participants=random.randint(15, 50),
                        notes=f"2025 {program.name} session",
                    )
                    db.add(session)
            
            print("✅ Created 2025 nutrition programs and sessions")
        
        await db.commit()
        print("\n✅ 2025 data seed complete!")
        print(f"   - 30 new children added")
        print(f"   - 60 2025 measurements added (2 per child)")
        print(f"   - 3 nutrition programs added")
        print(f"   - 18 program sessions added (6 per program)")


if __name__ == "__main__":
    asyncio.run(seed_2025_data())
