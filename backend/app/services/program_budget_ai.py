"""
AI-Powered Budget Recommendation Service for Nutrition Programs
Automatically generates budget recommendations when creating programs
"""
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import NutritionProgram, Child, Measurement, Purok, Barangay, SystemSetting
from ..services.analytics import latest_measurements
from ..utils.who_zscore import calculate_prevalence


async def generate_program_budget_recommendation_simple(
    db: AsyncSession,
    program_type: str,
    funding_source: str,
    estimated_participants: int,
    purok_id: UUID
) -> dict:
    """
    Simplified AI budget recommendation based on estimated participants
    """
    
    # Get purok info
    purok = await db.get(Purok, purok_id)
    if not purok:
        return {
            "recommended_budget": 0,
            "recommendation_notes": "Purok not found",
            "breakdown": {}
        }
    
    # Base rates per program type (monthly cost per child)
    program_costs = {
        "Feeding Program": 150.0,
        "Vitamin Supplementation": 25.0,
        "Deworming": 15.0,
        "Health Screening": 50.0,
        "Nutrition Education": 100.0,
        "Growth Monitoring": 30.0,
        "Operation Timbang Plus": 200.0,
        "Other": 50.0,
    }
    
    base_cost_per_child = program_costs.get(program_type, 50.0)
    
    # Calculate base budget
    monthly_budget = estimated_participants * base_cost_per_child
    
    # Add overhead (admin, supplies, logistics) - 20%
    overhead = monthly_budget * 0.20
    
    # Funding source adjustment
    funding_multiplier = {
        "City Funded Program": 1.0,
        "Barangay Funded Program": 0.7,
        "Operation Timbang Plus Program": 1.5,
        "Other": 1.0,
    }.get(funding_source, 1.0)
    
    # Final recommended budget (monthly)
    recommended_monthly = (monthly_budget + overhead) * funding_multiplier
    
    # Generate notes
    notes = f"""
**AI Budget Recommendation**

**Program:** {program_type}
**Funding:** {funding_source}
**Estimated Participants:** {estimated_participants} children

**Cost Breakdown:**
- Base Cost per Child: ₱{base_cost_per_child:,.2f}
- Monthly Program Cost: ₱{monthly_budget:,.2f}
- Overhead (20%): ₱{overhead:,.2f}
- Funding Adjustment: x{funding_multiplier}

**Recommended Budget:**
- Monthly: ₱{recommended_monthly:,.2f}
- Quarterly: ₱{recommended_monthly * 3:,.2f}
- Annual: ₱{recommended_monthly * 12:,.2f}

This is an AI-generated estimate based on standard program costs.
    """.strip()
    
    return {
        "recommended_budget": round(recommended_monthly, 2),
        "recommendation_notes": notes,
        "breakdown": {
            "target_children": estimated_participants,
            "base_cost": base_cost_per_child,
            "monthly_cost": round(monthly_budget, 2),
            "overhead": round(overhead, 2),
            "funding_multiplier": funding_multiplier,
            "recommended_monthly": round(recommended_monthly, 2),
            "recommended_annual": round(recommended_monthly * 12, 2),
        }
    }


async def generate_program_budget_recommendation(
    db: AsyncSession,
    program_type: str,
    funding_source: str,
    purok_id: UUID,
    frequency: str
) -> dict:
    """
    Generate AI-powered budget recommendation for a nutrition program
    
    Returns:
        {
            "recommended_budget": float,
            "recommendation_notes": str,
            "breakdown": {...}
        }
    """
    
    # Get purok and barangay info
    purok = await db.get(Purok, purok_id)
    if not purok:
        return {
            "recommended_budget": 0,
            "recommendation_notes": "Purok not found",
            "breakdown": {}
        }
    
    barangay = await db.get(Barangay, purok.barangay_id)
    
    # Get children count in purok
    children_count = await db.scalar(
        select(func.count(Child.id))
        .where(Child.purok_id == purok_id, Child.is_active == True)
    )
    
    # Get malnutrition prevalence in purok
    measurements = await latest_measurements(db, purok.barangay_id)
    purok_measurements = [m for m in measurements if m.child.purok_id == purok_id]
    prevalence = calculate_prevalence(purok_measurements)
    
    malnourished_count = sum(
        1 for m in purok_measurements 
        if m.overall_status.value in ["severe_acute_malnutrition", "moderate_acute_malnutrition"]
    )
    
    # Base rates per program type (monthly cost per child)
    program_costs = {
        "Feeding Program": 150.0,  # ₱150 per child per month
        "Vitamin Supplementation": 25.0,  # ₱25 per child per dose
        "Deworming": 15.0,  # ₱15 per child per dose
        "Health Screening": 50.0,  # ₱50 per child per screening
        "Nutrition Education": 100.0,  # ₱100 per session (flat rate)
        "Growth Monitoring": 30.0,  # ₱30 per child per session
        "Operation Timbang Plus": 200.0,  # ₱200 per child (comprehensive)
        "Other": 50.0,  # Default rate
    }
    
    base_cost_per_child = program_costs.get(program_type, 50.0)
    
    # Calculate target children based on program type
    if program_type in ["Feeding Program", "Operation Timbang Plus"]:
        # Target malnourished children primarily
        target_children = max(malnourished_count, int(children_count * 0.1))  # At least 10%
    else:
        # Universal programs target all children
        target_children = children_count or 10
    
    # Frequency multiplier
    frequency_multiplier = 4 if frequency == "weekly" else 1  # weekly = 4x monthly
    
    # Calculate base budget
    monthly_budget = target_children * base_cost_per_child * frequency_multiplier
    
    # Add overhead (admin, supplies, logistics) - 20%
    overhead = monthly_budget * 0.20
    
    # Funding source adjustment
    funding_multiplier = {
        "City Funded Program": 1.0,
        "Barangay Funded Program": 0.7,  # Barangay has less budget
        "Operation Timbang Plus Program": 1.5,  # Comprehensive program
        "Other": 1.0,
    }.get(funding_source, 1.0)
    
    # Risk adjustment based on prevalence
    malnutrition_rate = prevalence["sample_size"] and (
        (malnourished_count / prevalence["sample_size"]) * 100
    ) or 0
    
    if malnutrition_rate >= 30:
        risk_multiplier = 1.3  # Critical - need more resources
    elif malnutrition_rate >= 15:
        risk_multiplier = 1.15  # High - moderate increase
    else:
        risk_multiplier = 1.0  # Low - standard budget
    
    # Final recommended budget (monthly)
    recommended_monthly = (monthly_budget + overhead) * funding_multiplier * risk_multiplier
    
    # Generate notes
    notes = f"""
**AI Budget Recommendation Analysis**

**Purok Context:**
- Purok: {purok.name}, Barangay: {barangay.name if barangay else 'Unknown'}
- Total Children: {children_count}
- Malnourished Children: {malnourished_count}
- Malnutrition Rate: {malnutrition_rate:.1f}%

**Program Details:**
- Type: {program_type}
- Funding: {funding_source}
- Frequency: {frequency.capitalize()}
- Target Beneficiaries: {target_children} children

**Cost Breakdown:**
- Base Cost per Child: ₱{base_cost_per_child:,.2f}
- Monthly Program Cost: ₱{monthly_budget:,.2f}
- Overhead (20%): ₱{overhead:,.2f}
- Risk Adjustment: x{risk_multiplier}
- Funding Adjustment: x{funding_multiplier}

**Recommended Monthly Budget: ₱{recommended_monthly:,.2f}**
**Recommended Quarterly Budget: ₱{recommended_monthly * 3:,.2f}**
**Recommended Annual Budget: ₱{recommended_monthly * 12:,.2f}**

**Justification:**
{'Critical malnutrition rate detected - increased budget needed for urgent intervention.' if malnutrition_rate >= 30 else 
 'Elevated malnutrition rate - moderate budget increase recommended.' if malnutrition_rate >= 15 else
 'Standard budget allocation based on normal malnutrition levels.'}

This recommendation is generated using AI analysis of local health data and should be reviewed by health officials.
    """.strip()
    
    return {
        "recommended_budget": round(recommended_monthly, 2),
        "recommendation_notes": notes,
        "breakdown": {
            "target_children": target_children,
            "malnourished_count": malnourished_count,
            "malnutrition_rate": round(malnutrition_rate, 1),
            "base_cost": base_cost_per_child,
            "monthly_cost": round(monthly_budget, 2),
            "overhead": round(overhead, 2),
            "risk_multiplier": risk_multiplier,
            "funding_multiplier": funding_multiplier,
            "recommended_monthly": round(recommended_monthly, 2),
            "recommended_annual": round(recommended_monthly * 12, 2),
        }
    }


async def get_gemini_key(db: AsyncSession) -> str:
    """Get Gemini API key from settings"""
    row = await db.scalar(select(SystemSetting).where(SystemSetting.key == "gemini_api_key"))
    if row:
        return row.value
    return ""
