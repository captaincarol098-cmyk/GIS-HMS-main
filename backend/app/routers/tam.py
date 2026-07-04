"""
Technology Acceptance Model (TAM) API Router
Endpoints for TAM survey data collection and analysis
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..middleware.rbac import get_current_user
from ..models import User
from ..services.tam_analysis import (
    calculate_weighted_mean,
    interpret_weighted_mean,
    process_survey_responses,
    generate_tam_report
)

router = APIRouter(prefix="/api/tam", tags=["TAM Analysis"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class TAMSurveyResponse(BaseModel):
    participant_id: str
    PU_items: List[int] = Field(description="Perceived Usefulness items (1-5 scale)")
    PEOU_items: List[int] = Field(description="Perceived Ease of Use items (1-5 scale)")
    FC_items: List[int] = Field(description="Facilitating Conditions items (1-5 scale)")
    SE_items: List[int] = Field(description="Self-Efficacy items (1-5 scale)")
    SQ_items: List[int] = Field(description="System Quality items (1-5 scale)")
    PRAI_items: List[int] = Field(description="Perceived Reliability of AI items (1-5 scale)")
    BI_items: List[int] = Field(description="Behavioral Intention items (1-5 scale)")
    AU_items: List[int] = Field(description="Actual System Use items (1-5 scale)")


class TAMBatchRequest(BaseModel):
    responses: List[TAMSurveyResponse]


class WeightedMeanRequest(BaseModel):
    responses: List[int] = Field(description="List of survey responses (1-5 scale)")


# ============================================================================
# TAM SURVEY ENDPOINTS
# ============================================================================

@router.post("/submit-response")
async def submit_tam_response(
    response: TAMSurveyResponse,
    user: User = Depends(get_current_user)
):
    """
    Submit a single TAM survey response
    """
    # Validate all responses are in 1-5 range
    all_items = (
        response.PU_items + response.PEOU_items + response.FC_items + 
        response.SE_items + response.SQ_items + response.PRAI_items + 
        response.BI_items + response.AU_items
    )
    
    if any(item < 1 or item > 5 for item in all_items):
        raise HTTPException(400, "All survey responses must be between 1 and 5")
    
    return {
        "success": True,
        "participant_id": response.participant_id,
        "message": "Survey response submitted successfully"
    }


@router.post("/analyze")
async def analyze_tam_survey(
    batch: TAMBatchRequest,
    user: User = Depends(get_current_user)
):
    """
    Analyze TAM survey responses
    
    Calculates:
    - Construct scores (PU, PEOU, FC, SE, SQ, PRAI, BI, AU)
    - Regression models:
      * BI = β₀ + β₁(PU) + β₂(PEOU) + ε
      * AU = β₀ + β₁(BI) + ε
      * PU = β₀ + β₁(PEOU) + β₂(SQ) + β₃(PRAI) + ε
      * PEOU = β₀ + β₁(FC) + β₂(SE) + ε
    - Overall acceptance assessment
    """
    if len(batch.responses) < 2:
        raise HTTPException(400, "At least 2 responses required for analysis")
    
    # Convert to format expected by analysis function
    survey_data = [r.dict() for r in batch.responses]
    
    # Perform analysis
    analysis_results = process_survey_responses(survey_data)
    
    return analysis_results


@router.post("/analyze/report")
async def generate_analysis_report(
    batch: TAMBatchRequest,
    user: User = Depends(get_current_user)
):
    """
    Generate formatted TAM analysis report
    """
    if len(batch.responses) < 2:
        raise HTTPException(400, "At least 2 responses required for analysis")
    
    survey_data = [r.dict() for r in batch.responses]
    analysis_results = process_survey_responses(survey_data)
    report = generate_tam_report(analysis_results)
    
    return {
        "analysis": analysis_results,
        "report": report
    }


# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

@router.post("/calculate-weighted-mean")
async def calculate_mean(
    body: WeightedMeanRequest,
    user: User = Depends(get_current_user)
):
    """
    Calculate weighted mean for survey responses
    
    Weighted Mean Formula:
    x̄ = Σ(f_i × w_i) / N
    
    Where:
    - x̄ = weighted mean
    - f_i = frequency of responses for each scale value
    - w_i = weight value (1 to 5)
    - N = total number of respondents
    """
    if not all(1 <= r <= 5 for r in body.responses):
        raise HTTPException(400, "All responses must be between 1 and 5")
    
    weighted_mean = calculate_weighted_mean(body.responses)
    interpretation = interpret_weighted_mean(weighted_mean)
    
    # Calculate frequency distribution
    frequencies = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for response in body.responses:
        frequencies[response] += 1
    
    return {
        "weighted_mean": weighted_mean,
        "interpretation": interpretation,
        "acceptable": weighted_mean >= 4.0,
        "n_responses": len(body.responses),
        "frequencies": frequencies
    }


@router.get("/acceptance-criteria")
async def get_acceptance_criteria():
    """
    Get TAM acceptance criteria
    """
    return {
        "acceptance_threshold": 4.0,
        "interpretation_scale": {
            "4.50 - 5.00": "Strongly Agree",
            "3.50 - 4.49": "Agree",
            "2.50 - 3.49": "Neutral",
            "1.50 - 2.49": "Disagree",
            "1.00 - 1.49": "Strongly Disagree"
        },
        "constructs": {
            "PU": "Perceived Usefulness",
            "PEOU": "Perceived Ease of Use",
            "FC": "Facilitating Conditions",
            "SE": "Self-Efficacy",
            "SQ": "System Quality",
            "PRAI": "Perceived Reliability of AI Recommendations",
            "BI": "Behavioral Intention",
            "AU": "Actual System Use"
        },
        "regression_models": [
            "BI = β₀ + β₁(PU) + β₂(PEOU) + ε",
            "AU = β₀ + β₁(BI) + ε",
            "PU = β₀ + β₁(PEOU) + β₂(SQ) + β₃(PRAI) + ε",
            "PEOU = β₀ + β₁(FC) + β₂(SE) + ε"
        ]
    }


@router.get("/survey-template")
async def get_survey_template():
    """
    Get TAM survey template with sample questions
    """
    return {
        "PU": {
            "construct": "Perceived Usefulness",
            "questions": [
                "The GIS-HMS system helps me monitor child nutrition more effectively",
                "Using the system improves my work performance",
                "The system enables me to identify malnourished children faster",
                "The system is useful for making intervention decisions"
            ]
        },
        "PEOU": {
            "construct": "Perceived Ease of Use",
            "questions": [
                "Learning to use the GIS-HMS system is easy",
                "The system is user-friendly",
                "It is easy to navigate through the system",
                "The system interface is clear and understandable"
            ]
        },
        "FC": {
            "construct": "Facilitating Conditions",
            "questions": [
                "I have the resources necessary to use the system",
                "I have the knowledge necessary to use the system",
                "Technical support is available when needed",
                "The system is compatible with my work devices"
            ]
        },
        "SE": {
            "construct": "Self-Efficacy",
            "questions": [
                "I am confident in my ability to use the system",
                "I can use the system without assistance",
                "I can troubleshoot system problems",
                "I feel comfortable using the system features"
            ]
        },
        "SQ": {
            "construct": "System Quality",
            "questions": [
                "The system provides accurate information",
                "The system responds quickly",
                "The system is reliable",
                "The system rarely crashes or has errors"
            ]
        },
        "PRAI": {
            "construct": "Perceived Reliability of AI Recommendations",
            "questions": [
                "The AI recommendations are accurate",
                "I trust the AI-generated insights",
                "The AI recommendations help me make better decisions",
                "The AI explanations are clear and understandable"
            ]
        },
        "BI": {
            "construct": "Behavioral Intention",
            "questions": [
                "I intend to continue using the system",
                "I would recommend the system to others",
                "I plan to use the system regularly",
                "I prefer this system over manual methods"
            ]
        },
        "AU": {
            "construct": "Actual System Use",
            "questions": [
                "I use the system frequently",
                "I use most of the system features",
                "The system is part of my regular workflow",
                "I rely on the system for my daily tasks"
            ]
        },
        "scale": {
            "1": "Strongly Disagree",
            "2": "Disagree",
            "3": "Neutral",
            "4": "Agree",
            "5": "Strongly Agree"
        }
    }
