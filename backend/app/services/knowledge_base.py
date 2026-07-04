"""
Knowledge Base for RAG (Retrieval-Augmented Generation)
Contains nutrition guidelines, protocols, and best practices
"""

# WHO Growth Standards and Guidelines
WHO_GUIDELINES = {
    "severe_wasting": {
        "definition": "Weight-for-height Z-score (WHZ) < -3 SD",
        "clinical_significance": "Indicates acute malnutrition with high mortality risk",
        "immediate_actions": [
            "Immediate referral to health facility for medical assessment",
            "Screen for medical complications (hypoglycemia, hypothermia, dehydration)",
            "Initiate Ready-to-Use Therapeutic Food (RUTF) if no complications",
            "Enroll in Therapeutic Feeding Program (TFP)",
            "Weekly follow-up until WHZ > -2"
        ],
        "monitoring": "Weekly weight monitoring for 8-12 weeks",
        "target": "Achieve WHZ > -2 within 8-12 weeks",
        "source": "WHO 2006 Child Growth Standards"
    },
    
    "moderate_wasting": {
        "definition": "Weight-for-height Z-score (WHZ) between -3 and -2 SD",
        "clinical_significance": "Indicates moderate acute malnutrition",
        "immediate_actions": [
            "Enroll in Supplementary Feeding Program (SFP)",
            "Provide fortified food supplements",
            "Nutrition counseling for parents/guardians",
            "Bi-weekly monitoring",
            "Screen for underlying causes (illness, food insecurity)"
        ],
        "monitoring": "Bi-weekly weight and height monitoring",
        "target": "Achieve WHZ > -1 within 12-16 weeks",
        "source": "WHO Management of Acute Malnutrition Protocol"
    },
    
    "severe_stunting": {
        "definition": "Height-for-age Z-score (HAZ) < -3 SD",
        "clinical_significance": "Indicates chronic malnutrition with long-term developmental impact",
        "immediate_actions": [
            "Comprehensive nutrition assessment",
            "Enroll in long-term nutrition rehabilitation program",
            "Dietary diversity counseling",
            "Micronutrient supplementation (Vitamin A, Iron, Zinc)",
            "Monitor for infections and treat promptly",
            "Family nutrition education"
        ],
        "monitoring": "Monthly height monitoring for 6-12 months",
        "target": "Prevent further deterioration, aim for catch-up growth",
        "source": "WHO Child Growth Standards 2006"
    },
    
    "severe_underweight": {
        "definition": "Weight-for-age Z-score (WAZ) < -3 SD",
        "clinical_significance": "Composite indicator - may indicate wasting, stunting, or both",
        "immediate_actions": [
            "Assess for both acute (wasting) and chronic (stunting) malnutrition",
            "Medical examination to rule out underlying conditions",
            "Therapeutic or supplementary feeding based on WHZ assessment",
            "Deworming if >12 months old",
            "Vitamin A supplementation",
            "Monthly monitoring"
        ],
        "monitoring": "Monthly weight monitoring for 6 months minimum",
        "target": "Achieve WAZ > -2 within 6 months",
        "source": "WHO Management Protocol 2013"
    }
}

# Philippine National Nutrition Council (NNC) Protocols
NNC_PROTOCOLS = {
    "opt_plus": {
        "name": "Operation Timbang Plus (OPT Plus)",
        "description": "Philippine national program for growth monitoring and promotion",
        "target_age": "0-59 months (0-5 years)",
        "frequency": "Monthly weighing for severely malnourished, quarterly for normal",
        "components": [
            "Height and weight measurement",
            "Nutrition education",
            "Micronutrient supplementation",
            "Deworming (>12 months)",
            "Vitamin A supplementation (6-59 months)",
            "Referral to health facility if needed"
        ],
        "severe_malnutrition_protocol": [
            "Immediate referral to BHS/RHU",
            "Enrollment in therapeutic feeding",
            "Weekly home visits by BHW",
            "Coordinate with Municipal Nutrition Action Officer (MNAO)"
        ],
        "source": "NNC Administrative Order 2021"
    },
    
    "supplementary_feeding": {
        "name": "Supplementary Feeding Program",
        "target": "Children with moderate acute malnutrition",
        "duration": "90-120 feeding days (3-4 months)",
        "food_package": "Fortified food supplements (e.g., Nutribun, fortified rice, legumes)",
        "frequency": "Daily feeding, 5-6 days per week",
        "monitoring": "Bi-weekly weighing to track progress",
        "success_criteria": "Achieve normal weight-for-height within 3-4 months",
        "source": "DSWD-DOH Joint Memorandum 2019"
    },
    
    "micronutrient_supplementation": {
        "vitamin_a": {
            "age_6_11_months": "100,000 IU every 6 months",
            "age_12_59_months": "200,000 IU every 6 months",
            "schedule": "February and August (Vitamin A Supplementation Months)"
        },
        "iron": {
            "age_6_23_months": "Iron drops 10-12.5 mg elemental iron daily",
            "pregnant_women": "60 mg elemental iron + 400 mcg folic acid daily"
        },
        "deworming": {
            "age_12_59_months": "Mebendazole 500mg or Albendazole 400mg every 6 months",
            "schedule": "January and July (National Deworming Months)"
        },
        "source": "DOH Administrative Order 2018-0028"
    }
}

# Best Practices and Interventions
INTERVENTION_GUIDELINES = {
    "home_visits": {
        "severe_cases": {
            "frequency": "Weekly for first month, then bi-weekly",
            "duration": "Until child achieves WHZ > -2",
            "activities": [
                "Assess feeding practices",
                "Nutrition counseling",
                "Monitor RUTF consumption",
                "Check for illness",
                "Measure weight",
                "Document progress"
            ]
        },
        "moderate_cases": {
            "frequency": "Bi-weekly",
            "duration": "3-4 months",
            "activities": [
                "Dietary assessment",
                "Cooking demonstrations",
                "Hygiene education",
                "Monitor supplementary feeding",
                "Track weight gain"
            ]
        }
    },
    
    "referral_criteria": {
        "immediate_referral": [
            "WHZ < -3 with medical complications",
            "Failed appetite test",
            "Bilateral pitting edema",
            "Severe visible wasting",
            "MUAC < 11.5 cm (for children 6-59 months)",
            "Signs of infection (fever, cough, diarrhea)"
        ],
        "routine_referral": [
            "WHZ < -2 not improving after 4 weeks",
            "Loss of weight for 2 consecutive measurements",
            "Suspected underlying medical condition"
        ]
    },
    
    "nutrition_education": {
        "key_messages": [
            "Exclusive breastfeeding 0-6 months",
            "Continued breastfeeding up to 2 years",
            "Complementary feeding from 6 months",
            "Dietary diversity (4+ food groups daily)",
            "Frequent feeding (5-6 times daily for young children)",
            "Responsive feeding practices",
            "Handwashing before food preparation and feeding",
            "Safe food storage and preparation"
        ],
        "locally_available_nutritious_foods": [
            "Eggs - excellent protein source",
            "Fish - omega-3 and protein",
            "Green leafy vegetables - iron and vitamins",
            "Orange/yellow fruits - Vitamin A",
            "Legumes (mongo, beans) - protein and iron",
            "Fortified rice - additional micronutrients"
        ]
    }
}

# Barangay-Level Interventions
BARANGAY_INTERVENTIONS = {
    "high_prevalence_response": {
        "threshold": "Wasting ≥ 15% or Severe malnutrition ≥ 2%",
        "immediate_actions": [
            "Declare nutrition emergency in barangay",
            "Activate Barangay Nutrition Committee",
            "Conduct house-to-house screening",
            "Establish emergency feeding station",
            "Daily monitoring of severe cases",
            "Request additional resources from LGU"
        ],
        "short_term": [
            "Mass supplementary feeding program",
            "Intensive nutrition education campaign",
            "Weekly growth monitoring sessions",
            "Community food production initiatives"
        ],
        "long_term": [
            "Sustainable livelihood programs",
            "Food security interventions",
            "Community gardens",
            "Nutrition-sensitive agriculture"
        ]
    },
    
    "moderate_prevalence_response": {
        "threshold": "Wasting 5-14% or any indicator 10-14%",
        "actions": [
            "Strengthen OPT Plus implementation",
            "Increase frequency of nutrition education",
            "Targeted supplementary feeding",
            "Bi-weekly monitoring of at-risk children",
            "Coordinate with health center"
        ]
    }
}

# Risk Scoring Factors
RISK_FACTORS = {
    "child_level": {
        "whz_less_than_minus_3": {"points": 50, "priority": "critical"},
        "whz_less_than_minus_2": {"points": 25, "priority": "high"},
        "haz_less_than_minus_3": {"points": 30, "priority": "high"},
        "waz_less_than_minus_3": {"points": 30, "priority": "high"},
        "age_under_24_months": {"points": 10, "priority": "high", "reason": "Critical window for growth"},
        "muac_less_than_115mm": {"points": 40, "priority": "critical"},
        "declining_trend": {"points": 30, "priority": "high", "reason": "Deteriorating condition"},
        "multiple_deficiencies": {"points": 20, "priority": "high"}
    },
    
    "barangay_level": {
        "critical_risk": {"points": 20, "threshold": "Wasting ≥ 15%"},
        "high_risk": {"points": 10, "threshold": "Wasting ≥ 5%"},
        "high_prevalence_area": {"points": 15, "reason": "Resource-limited setting"}
    }
}


def get_guideline(condition: str) -> dict:
    """
    Retrieve guideline for specific condition.
    
    Args:
        condition: One of 'severe_wasting', 'moderate_wasting', 'severe_stunting', 'severe_underweight'
    
    Returns:
        Dictionary with guideline details
    """
    return WHO_GUIDELINES.get(condition, {})


def get_protocol(protocol_name: str) -> dict:
    """
    Retrieve NNC protocol.
    
    Args:
        protocol_name: One of 'opt_plus', 'supplementary_feeding', 'micronutrient_supplementation'
    
    Returns:
        Dictionary with protocol details
    """
    return NNC_PROTOCOLS.get(protocol_name, {})


def get_intervention(intervention_type: str) -> dict:
    """
    Retrieve intervention guidelines.
    
    Args:
        intervention_type: Type of intervention ('home_visits', 'referral_criteria', 'nutrition_education')
    
    Returns:
        Dictionary with intervention details
    """
    return INTERVENTION_GUIDELINES.get(intervention_type, {})


def get_barangay_intervention(risk_level: str) -> dict:
    """
    Retrieve barangay-level intervention based on risk.
    
    Args:
        risk_level: 'high_prevalence_response' or 'moderate_prevalence_response'
    
    Returns:
        Dictionary with intervention details
    """
    return BARANGAY_INTERVENTIONS.get(risk_level, {})


def retrieve_relevant_knowledge(child_status: dict, query_type: str = "treatment") -> list[dict]:
    """
    Retrieve relevant knowledge based on child's nutritional status.
    This is the core RAG retrieval function.
    
    Args:
        child_status: Dict with keys like 'whz_status', 'haz_status', 'waz_status', 'overall_status'
        query_type: 'treatment', 'protocol', 'intervention'
    
    Returns:
        List of relevant knowledge documents
    """
    relevant_docs = []
    
    # Retrieve based on status
    if child_status.get('whz_status') == 'severely_wasted':
        relevant_docs.append({
            "type": "guideline",
            "title": "WHO Severe Wasting Protocol",
            "content": WHO_GUIDELINES['severe_wasting'],
            "relevance_score": 1.0
        })
        relevant_docs.append({
            "type": "protocol",
            "title": "OPT Plus Severe Malnutrition Protocol",
            "content": NNC_PROTOCOLS['opt_plus']['severe_malnutrition_protocol'],
            "relevance_score": 0.9
        })
        relevant_docs.append({
            "type": "intervention",
            "title": "Home Visit Guidelines for Severe Cases",
            "content": INTERVENTION_GUIDELINES['home_visits']['severe_cases'],
            "relevance_score": 0.85
        })
        relevant_docs.append({
            "type": "referral",
            "title": "Immediate Referral Criteria",
            "content": INTERVENTION_GUIDELINES['referral_criteria']['immediate_referral'],
            "relevance_score": 0.95
        })
    
    elif child_status.get('whz_status') == 'wasted':
        relevant_docs.append({
            "type": "guideline",
            "title": "WHO Moderate Wasting Protocol",
            "content": WHO_GUIDELINES['moderate_wasting'],
            "relevance_score": 1.0
        })
        relevant_docs.append({
            "type": "protocol",
            "title": "Supplementary Feeding Program",
            "content": NNC_PROTOCOLS['supplementary_feeding'],
            "relevance_score": 0.95
        })
        relevant_docs.append({
            "type": "intervention",
            "title": "Home Visit Guidelines for Moderate Cases",
            "content": INTERVENTION_GUIDELINES['home_visits']['moderate_cases'],
            "relevance_score": 0.8
        })
    
    if child_status.get('haz_status') == 'severely_stunted':
        relevant_docs.append({
            "type": "guideline",
            "title": "WHO Severe Stunting Management",
            "content": WHO_GUIDELINES['severe_stunting'],
            "relevance_score": 1.0
        })
    
    if child_status.get('waz_status') == 'severely_underweight':
        relevant_docs.append({
            "type": "guideline",
            "title": "WHO Severe Underweight Protocol",
            "content": WHO_GUIDELINES['severe_underweight'],
            "relevance_score": 1.0
        })
    
    # Always include nutrition education
    relevant_docs.append({
        "type": "education",
        "title": "Nutrition Education Key Messages",
        "content": INTERVENTION_GUIDELINES['nutrition_education'],
        "relevance_score": 0.7
    })
    
    # Sort by relevance score
    relevant_docs.sort(key=lambda x: x['relevance_score'], reverse=True)
    
    return relevant_docs


def calculate_risk_score(child_data: dict, barangay_risk: str = "low") -> dict:
    """
    Calculate comprehensive risk score for child prioritization.
    
    Args:
        child_data: Dict with measurement data (whz, haz, waz, age_months, etc.)
        barangay_risk: Barangay risk level ('low', 'medium', 'high', 'critical')
    
    Returns:
        Dict with score, priority, and contributing factors
    """
    score = 0
    factors = []
    
    # Z-score severity
    if child_data.get('whz', 0) < -3:
        score += RISK_FACTORS['child_level']['whz_less_than_minus_3']['points']
        factors.append("Severe wasting (WHZ < -3)")
    elif child_data.get('whz', 0) < -2:
        score += RISK_FACTORS['child_level']['whz_less_than_minus_2']['points']
        factors.append("Moderate wasting (WHZ < -2)")
    
    if child_data.get('haz', 0) < -3:
        score += RISK_FACTORS['child_level']['haz_less_than_minus_3']['points']
        factors.append("Severe stunting (HAZ < -3)")
    
    if child_data.get('waz', 0) < -3:
        score += RISK_FACTORS['child_level']['waz_less_than_minus_3']['points']
        factors.append("Severe underweight (WAZ < -3)")
    
    # Age factor
    if child_data.get('age_months', 60) < 24:
        score += RISK_FACTORS['child_level']['age_under_24_months']['points']
        factors.append("Under 2 years (critical growth window)")
    
    # MUAC if available
    if child_data.get('muac_cm', 999) < 11.5:
        score += RISK_FACTORS['child_level']['muac_less_than_115mm']['points']
        factors.append("MUAC < 11.5 cm (severe)")
    
    # Declining trend
    if child_data.get('declining_trend', False):
        score += RISK_FACTORS['child_level']['declining_trend']['points']
        factors.append("Declining growth trend")
    
    # Barangay risk
    if barangay_risk == 'critical':
        score += RISK_FACTORS['barangay_level']['critical_risk']['points']
        factors.append("From critical-risk barangay")
    elif barangay_risk == 'high':
        score += RISK_FACTORS['barangay_level']['high_risk']['points']
        factors.append("From high-risk barangay")
    
    # Determine priority
    if score >= 70:
        priority = "critical"
    elif score >= 40:
        priority = "high"
    elif score >= 20:
        priority = "medium"
    else:
        priority = "low"
    
    return {
        "score": min(score, 100),  # Cap at 100
        "priority": priority,
        "factors": factors,
        "interpretation": f"Priority: {priority.upper()} - Score: {score}/100"
    }
