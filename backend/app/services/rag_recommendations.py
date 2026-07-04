"""
RAG (Retrieval-Augmented Generation) Recommendation System
Generates evidence-based recommendations using retrieved knowledge
"""
from datetime import date, timedelta
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Child, Measurement, Barangay
from .knowledge_base import (
    retrieve_relevant_knowledge,
    calculate_risk_score,
    get_guideline,
    get_protocol,
    get_intervention,
    get_barangay_intervention
)


async def generate_child_recommendations(
    child_id: UUID,
    db: AsyncSession
) -> dict:
    """
    RAG Step-by-Step: Generate evidence-based recommendations for a child.
    
    Steps:
    1. Context Retrieval - Get child's data
    2. Knowledge Retrieval - Query knowledge base
    3. Recommendation Generation - Create tailored recommendations
    4. Risk Prioritization - Calculate risk score
    5. Output Delivery - Format for dashboard/reports
    """
    
    # ========================================
    # STEP 1: Context Retrieval
    # ========================================
    child = await db.get(Child, child_id)
    if not child:
        return {"error": "Child not found"}
    
    # Get measurements history
    measurements = list((await db.scalars(
        select(Measurement)
        .where(Measurement.child_id == child_id)
        .order_by(Measurement.measurement_date.desc())
    )).all())
    
    if not measurements:
        return {"error": "No measurements found for child"}
    
    latest = measurements[0]
    
    # Get barangay info
    barangay = await db.get(Barangay, child.barangay_id) if child.barangay_id else None
    
    # Calculate age
    age_months = latest.age_in_months
    age_years = age_months // 12
    age_display = f"{age_years} years {age_months % 12} months" if age_years > 0 else f"{age_months} months"
    
    # Detect declining trend
    declining_trend = False
    if len(measurements) >= 2:
        prev_whz = measurements[1].whz
        current_whz = latest.whz
        if current_whz < prev_whz - 0.2:  # Declined by more than 0.2 SD
            declining_trend = True
    
    # Child context
    child_context = {
        "id": str(child.id),
        "name": child.full_name,
        "age_months": age_months,
        "age_display": age_display,
        "sex": child.sex.value,
        "guardian_name": child.guardian_name,
        "barangay": barangay.name if barangay else "Unknown",
        "current_status": {
            "whz": latest.whz,
            "haz": latest.haz,
            "waz": latest.waz,
            "whz_status": latest.whz_status.value,
            "haz_status": latest.haz_status.value,
            "waz_status": latest.waz_status.value,
            "overall_status": latest.overall_status.value,
            "weight_kg": float(latest.weight_kg),
            "height_cm": float(latest.height_cm),
            "muac_cm": float(latest.muac_cm) if latest.muac_cm else None,
            "measured_date": latest.measurement_date.isoformat()
        },
        "declining_trend": declining_trend
    }
    
    # ========================================
    # STEP 2: Knowledge Retrieval
    # ========================================
    relevant_knowledge = retrieve_relevant_knowledge({
        "whz_status": latest.whz_status.value,
        "haz_status": latest.haz_status.value,
        "waz_status": latest.waz_status.value,
        "overall_status": latest.overall_status.value
    })
    
    # ========================================
    # STEP 3: Recommendation Generation
    # ========================================
    recommendations = []
    action_items = []
    rationale = []
    
    # Generate based on retrieved knowledge
    for knowledge_doc in relevant_knowledge:
        if knowledge_doc['type'] == 'guideline':
            guideline = knowledge_doc['content']
            
            # Add immediate actions
            if 'immediate_actions' in guideline:
                for action in guideline['immediate_actions']:
                    action_items.append({
                        "action": action,
                        "priority": "immediate",
                        "timeline": "Within 24-48 hours",
                        "source": knowledge_doc['content'].get('source', 'WHO Guidelines')
                    })
            
            # Add rationale
            if 'clinical_significance' in guideline:
                rationale.append({
                    "condition": knowledge_doc['title'],
                    "significance": guideline['clinical_significance'],
                    "source": guideline.get('source', 'WHO')
                })
    
    # Add protocol-based actions
    for knowledge_doc in relevant_knowledge:
        if knowledge_doc['type'] == 'protocol':
            if isinstance(knowledge_doc['content'], list):
                for action in knowledge_doc['content']:
                    action_items.append({
                        "action": action,
                        "priority": "high",
                        "timeline": "Within 1 week",
                        "source": "Philippine NNC Protocol"
                    })
    
    # Add monitoring schedule
    monitoring_schedule = generate_monitoring_schedule(latest, age_months)
    
    # Add nutrition education
    nutrition_advice = generate_nutrition_advice(latest, age_months)
    
    # Generate follow-up plan
    follow_up_plan = generate_follow_up_plan(latest, declining_trend)
    
    # ========================================
    # STEP 4: Risk Prioritization
    # ========================================
    # Determine barangay risk level (simplified)
    barangay_risk = "medium"  # Default, should be calculated from barangay prevalence
    
    risk_assessment = calculate_risk_score({
        "whz": latest.whz,
        "haz": latest.haz,
        "waz": latest.waz,
        "age_months": age_months,
        "muac_cm": float(latest.muac_cm) if latest.muac_cm else 15,
        "declining_trend": declining_trend
    }, barangay_risk)
    
    # ========================================
    # STEP 5: Output Delivery
    # ========================================
    return {
        "generated_at": date.today().isoformat(),
        "method": "RAG (Retrieval-Augmented Generation)",
        "child_context": child_context,
        "risk_assessment": risk_assessment,
        "recommendations": {
            "immediate_actions": [a for a in action_items if a['priority'] == 'immediate'],
            "short_term_actions": [a for a in action_items if a['priority'] == 'high'],
            "ongoing_actions": monitoring_schedule,
            "nutrition_advice": nutrition_advice,
            "follow_up_plan": follow_up_plan
        },
        "evidence_base": {
            "guidelines_consulted": [
                {"title": k['title'], "source": k['content'].get('source', 'N/A')}
                for k in relevant_knowledge if k['type'] == 'guideline'
            ],
            "protocols_applied": [
                {"title": k['title']}
                for k in relevant_knowledge if k['type'] == 'protocol'
            ],
            "rationale": rationale
        },
        "knowledge_retrieved": len(relevant_knowledge)
    }


def generate_monitoring_schedule(measurement, age_months: int) -> list:
    """Generate monitoring schedule based on status"""
    schedule = []
    
    if measurement.whz_status.value == "severely_wasted":
        schedule.append({
            "activity": "Weight monitoring",
            "frequency": "Weekly",
            "duration": "Until WHZ > -2 (approximately 8-12 weeks)",
            "responsible": "BHW with monthly supervision by BNS"
        })
        schedule.append({
            "activity": "Height measurement",
            "frequency": "Every 2 weeks",
            "duration": "3 months",
            "responsible": "BHW"
        })
        schedule.append({
            "activity": "MUAC screening",
            "frequency": "Weekly",
            "duration": "Until MUAC > 12.5 cm",
            "responsible": "BHW"
        })
    elif measurement.whz_status.value == "wasted":
        schedule.append({
            "activity": "Weight and height monitoring",
            "frequency": "Bi-weekly",
            "duration": "12-16 weeks",
            "responsible": "BHW"
        })
    else:
        schedule.append({
            "activity": "Growth monitoring (OPT Plus)",
            "frequency": "Monthly" if age_months < 24 else "Quarterly",
            "duration": "Ongoing until 59 months",
            "responsible": "BHW"
        })
    
    return schedule


def generate_nutrition_advice(measurement, age_months: int) -> list:
    """Generate age-appropriate nutrition advice"""
    advice = []
    
    # Age-specific feeding
    if age_months < 6:
        advice.append({
            "topic": "Exclusive Breastfeeding",
            "recommendation": "Continue exclusive breastfeeding (breast milk only, no water or other liquids)",
            "rationale": "Breast milk provides complete nutrition for first 6 months"
        })
    elif age_months < 12:
        advice.append({
            "topic": "Complementary Feeding",
            "recommendation": "Continue breastfeeding PLUS start complementary foods (lugaw, mashed vegetables, fruits)",
            "rationale": "Age 6-12 months is critical for introducing diverse foods"
        })
        advice.append({
            "topic": "Feeding Frequency",
            "recommendation": "Feed 5-6 times daily (3 meals + 2-3 snacks) plus breastfeeding on demand",
            "rationale": "Small stomach capacity requires frequent meals"
        })
    else:
        advice.append({
            "topic": "Family Foods",
            "recommendation": "Eat family foods with increased frequency (5-6 times daily)",
            "rationale": "Growing children need energy-dense, nutrient-rich foods"
        })
    
    # Dietary diversity
    advice.append({
        "topic": "Dietary Diversity",
        "recommendation": "Provide foods from at least 4 food groups daily: grains, vegetables, fruits, protein (meat/fish/eggs/beans)",
        "rationale": "Diverse diet ensures adequate micronutrients"
    })
    
    # Locally available nutritious foods
    advice.append({
        "topic": "Nutritious Local Foods",
        "recommendation": "Include: eggs (excellent protein), fish, green leafy vegetables (malunggay, kangkong), mango/papaya (Vitamin A), mongo beans",
        "rationale": "These are affordable and locally available nutrient-dense foods"
    })
    
    # Responsive feeding
    advice.append({
        "topic": "Responsive Feeding",
        "recommendation": "Feed slowly and patiently, encourage but don't force eating, talk to child during feeding",
        "rationale": "Positive feeding environment improves food intake"
    })
    
    return advice


def generate_follow_up_plan(measurement, declining_trend: bool) -> dict:
    """Generate follow-up plan"""
    plan = {}
    
    if measurement.whz_status.value == "severely_wasted" or declining_trend:
        plan = {
            "next_visit": "Within 1 week",
            "next_measurement": "Within 1 week (weekly for first month)",
            "referral_needed": True,
            "referral_to": "Barangay Health Station or Rural Health Unit",
            "referral_reason": "Severe malnutrition requires medical assessment and therapeutic feeding",
            "home_visit_frequency": "Weekly until improvement"
        }
    elif measurement.whz_status.value == "wasted":
        plan = {
            "next_visit": "Within 2 weeks",
            "next_measurement": "Bi-weekly for 3 months",
            "referral_needed": False,
            "community_program": "Enroll in Supplementary Feeding Program",
            "home_visit_frequency": "Bi-weekly"
        }
    else:
        plan = {
            "next_visit": "Within 1 month",
            "next_measurement": "Monthly (per OPT Plus schedule)",
            "referral_needed": False,
            "home_visit_frequency": "As needed, minimum quarterly"
        }
    
    return plan


async def generate_barangay_recommendations(
    barangay_id: UUID,
    db: AsyncSession
) -> dict:
    """
    Generate barangay-level recommendations based on prevalence and trends.
    """
    from .analytics import latest_measurements
    from ..utils.who_zscore import calculate_prevalence, classify_risk_level
    
    # Get barangay data
    barangay = await db.get(Barangay, barangay_id)
    if not barangay:
        return {"error": "Barangay not found"}
    
    # Get latest measurements
    measurements = await latest_measurements(db, barangay_id)
    prevalence = calculate_prevalence(measurements)
    risk_level = classify_risk_level(prevalence)
    
    # Retrieve appropriate intervention
    if prevalence['wasting_rate'] >= 15:
        intervention = get_barangay_intervention('high_prevalence_response')
        priority = "CRITICAL"
    elif prevalence['wasting_rate'] >= 5:
        intervention = get_barangay_intervention('moderate_prevalence_response')
        priority = "HIGH"
    else:
        intervention = None
        priority = "ROUTINE"
    
    return {
        "barangay": barangay.name,
        "prevalence": prevalence,
        "risk_level": risk_level,
        "priority": priority,
        "intervention": intervention,
        "generated_at": date.today().isoformat()
    }
