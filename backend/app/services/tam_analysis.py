"""
Technology Acceptance Model (TAM) Analysis Module
For evaluating user acceptance of the GIS-HMS system

TAM Constructs:
1. Perceived Usefulness (PU)
2. Perceived Ease of Use (PEOU)
3. Facilitating Conditions (FC)
4. Self-Efficacy (SE)
5. System Quality (SQ)
6. Perceived Reliability of AI Recommendations (PRAI)
7. Behavioral Intention (BI)
8. Actual System Use (AU)

Regression Models:
- BI = β₀ + β₁(PU) + β₂(PEOU) + ε
- AU = β₀ + β₁(BI) + ε
- PU = β₀ + β₁(PEOU) + β₂(SQ) + β₃(PRAI) + ε
- PEOU = β₀ + β₁(FC) + β₂(SE) + ε
"""

from typing import Dict, List, Any
import numpy as np
from scipy import stats


# ============================================================================
# WEIGHTED MEAN CALCULATION
# ============================================================================

def calculate_weighted_mean(responses: List[int]) -> float:
    """
    Calculate weighted mean for survey responses
    
    Weighted Mean Formula:
    x̄ = Σ(f_i × w_i) / N
    
    Where:
    - x̄ = weighted mean
    - f_i = frequency of responses for each scale value
    - w_i = weight value (1 to 5)
    - N = total number of respondents
    
    Args:
        responses: List of response values (1-5 scale)
    
    Returns:
        Weighted mean value
    """
    if not responses:
        return 0.0
    
    N = len(responses)
    
    # Count frequency for each weight (1-5)
    frequencies = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for response in responses:
        if 1 <= response <= 5:
            frequencies[response] += 1
    
    # Calculate weighted mean
    weighted_sum = sum(f * w for w, f in frequencies.items())
    weighted_mean = weighted_sum / N
    
    return round(weighted_mean, 2)


def interpret_weighted_mean(mean: float) -> str:
    """
    Interpret weighted mean value
    
    Scale:
    - 4.50 - 5.00: Strongly Agree
    - 3.50 - 4.49: Agree
    - 2.50 - 3.49: Neutral
    - 1.50 - 2.49: Disagree
    - 1.00 - 1.49: Strongly Disagree
    """
    if mean >= 4.50:
        return "Strongly Agree"
    elif mean >= 3.50:
        return "Agree"
    elif mean >= 2.50:
        return "Neutral"
    elif mean >= 1.50:
        return "Disagree"
    else:
        return "Strongly Disagree"


# ============================================================================
# TAM CONSTRUCT CALCULATION
# ============================================================================

def calculate_construct_score(item_responses: List[List[int]]) -> Dict[str, Any]:
    """
    Calculate score for a TAM construct from multiple survey items
    
    Args:
        item_responses: List of response lists, one per survey item
                       Each inner list contains responses from all participants for that item
    
    Returns:
        Dictionary with construct statistics
    """
    # Calculate mean for each item
    item_means = [calculate_weighted_mean(responses) for responses in item_responses]
    
    # Overall construct score is the mean of all item means
    construct_score = round(np.mean(item_means), 2)
    
    # Calculate standard deviation
    all_responses = [resp for item in item_responses for resp in item]
    std_dev = round(np.std(all_responses, ddof=1), 2) if len(all_responses) > 1 else 0.0
    
    return {
        "score": construct_score,
        "interpretation": interpret_weighted_mean(construct_score),
        "std_dev": std_dev,
        "item_means": item_means,
        "acceptable": construct_score >= 4.0  # Acceptance criterion
    }


# ============================================================================
# REGRESSION ANALYSIS
# ============================================================================

def simple_linear_regression(X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
    """
    Perform simple linear regression
    
    Model: y = β₀ + β₁X + ε
    
    Args:
        X: Independent variable(s) - can be 1D or 2D array
        y: Dependent variable
    
    Returns:
        Regression results including coefficients, R², p-values
    """
    # Ensure X is 2D
    if X.ndim == 1:
        X = X.reshape(-1, 1)
    
    # Add intercept term
    X_with_intercept = np.column_stack([np.ones(len(X)), X])
    
    # Calculate coefficients using normal equation
    # β = (X'X)^(-1) X'y
    try:
        XtX_inv = np.linalg.inv(X_with_intercept.T @ X_with_intercept)
        beta = XtX_inv @ X_with_intercept.T @ y
    except np.linalg.LinAlgError:
        return {
            "error": "Singular matrix - cannot perform regression",
            "beta": None,
            "r_squared": 0.0
        }
    
    # Calculate predictions
    y_pred = X_with_intercept @ beta
    
    # Calculate R²
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
    
    # Calculate adjusted R²
    n = len(y)
    p = X.shape[1]
    adj_r_squared = 1 - ((1 - r_squared) * (n - 1) / (n - p - 1)) if n > p + 1 else 0.0
    
    # Calculate standard errors and t-statistics
    mse = ss_res / (n - p - 1) if n > p + 1 else 0
    var_beta = mse * XtX_inv.diagonal()
    se_beta = np.sqrt(var_beta)
    t_stats = beta / se_beta if not np.any(se_beta == 0) else np.zeros_like(beta)
    
    # Calculate p-values
    p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), n - p - 1))
    
    return {
        "intercept": round(float(beta[0]), 4),
        "coefficients": [round(float(b), 4) for b in beta[1:]],
        "r_squared": round(float(r_squared), 4),
        "adj_r_squared": round(float(adj_r_squared), 4),
        "mse": round(float(mse), 4),
        "se_coefficients": [round(float(se), 4) for se in se_beta[1:]],
        "t_statistics": [round(float(t), 4) for t in t_stats[1:]],
        "p_values": [round(float(p), 4) for p in p_values[1:]],
        "significant": [p < 0.05 for p in p_values[1:]]
    }


# ============================================================================
# TAM MODEL ANALYSIS
# ============================================================================

def analyze_tam_model(tam_data: Dict[str, List[float]]) -> Dict[str, Any]:
    """
    Perform complete TAM analysis with all regression models
    
    Regression Models:
    1. BI = β₀ + β₁(PU) + β₂(PEOU) + ε
    2. AU = β₀ + β₁(BI) + ε
    3. PU = β₀ + β₁(PEOU) + β₂(SQ) + β₃(PRAI) + ε
    4. PEOU = β₀ + β₁(FC) + β₂(SE) + ε
    
    Args:
        tam_data: Dictionary with construct scores for each participant
                  Keys: "PU", "PEOU", "FC", "SE", "SQ", "PRAI", "BI", "AU"
                  Values: List of scores (one per participant)
    
    Returns:
        Complete TAM analysis results
    """
    # Convert to numpy arrays
    PU = np.array(tam_data.get("PU", []))
    PEOU = np.array(tam_data.get("PEOU", []))
    FC = np.array(tam_data.get("FC", []))
    SE = np.array(tam_data.get("SE", []))
    SQ = np.array(tam_data.get("SQ", []))
    PRAI = np.array(tam_data.get("PRAI", []))
    BI = np.array(tam_data.get("BI", []))
    AU = np.array(tam_data.get("AU", []))
    
    results = {}
    
    # Model 1: BI = β₀ + β₁(PU) + β₂(PEOU) + ε
    if len(PU) > 0 and len(PEOU) > 0 and len(BI) > 0:
        X1 = np.column_stack([PU, PEOU])
        results["model_BI"] = simple_linear_regression(X1, BI)
        results["model_BI"]["formula"] = "BI = β₀ + β₁(PU) + β₂(PEOU) + ε"
        results["model_BI"]["variable_names"] = ["PU", "PEOU"]
    
    # Model 2: AU = β₀ + β₁(BI) + ε
    if len(BI) > 0 and len(AU) > 0:
        results["model_AU"] = simple_linear_regression(BI, AU)
        results["model_AU"]["formula"] = "AU = β₀ + β₁(BI) + ε"
        results["model_AU"]["variable_names"] = ["BI"]
    
    # Model 3: PU = β₀ + β₁(PEOU) + β₂(SQ) + β₃(PRAI) + ε
    if len(PEOU) > 0 and len(SQ) > 0 and len(PRAI) > 0 and len(PU) > 0:
        X3 = np.column_stack([PEOU, SQ, PRAI])
        results["model_PU"] = simple_linear_regression(X3, PU)
        results["model_PU"]["formula"] = "PU = β₀ + β₁(PEOU) + β₂(SQ) + β₃(PRAI) + ε"
        results["model_PU"]["variable_names"] = ["PEOU", "SQ", "PRAI"]
    
    # Model 4: PEOU = β₀ + β₁(FC) + β₂(SE) + ε
    if len(FC) > 0 and len(SE) > 0 and len(PEOU) > 0:
        X4 = np.column_stack([FC, SE])
        results["model_PEOU"] = simple_linear_regression(X4, PEOU)
        results["model_PEOU"]["formula"] = "PEOU = β₀ + β₁(FC) + β₂(SE) + ε"
        results["model_PEOU"]["variable_names"] = ["FC", "SE"]
    
    # Calculate overall acceptance
    construct_means = {
        "PU": round(float(np.mean(PU)), 2) if len(PU) > 0 else 0.0,
        "PEOU": round(float(np.mean(PEOU)), 2) if len(PEOU) > 0 else 0.0,
        "FC": round(float(np.mean(FC)), 2) if len(FC) > 0 else 0.0,
        "SE": round(float(np.mean(SE)), 2) if len(SE) > 0 else 0.0,
        "SQ": round(float(np.mean(SQ)), 2) if len(SQ) > 0 else 0.0,
        "PRAI": round(float(np.mean(PRAI)), 2) if len(PRAI) > 0 else 0.0,
        "BI": round(float(np.mean(BI)), 2) if len(BI) > 0 else 0.0,
        "AU": round(float(np.mean(AU)), 2) if len(AU) > 0 else 0.0
    }
    
    # Overall acceptance criterion: all constructs ≥ 4.0
    overall_mean = np.mean([v for v in construct_means.values() if v > 0])
    overall_acceptable = all(mean >= 4.0 for mean in construct_means.values() if mean > 0)
    
    results["construct_means"] = construct_means
    results["overall_mean"] = round(float(overall_mean), 2)
    results["overall_acceptable"] = overall_acceptable
    results["acceptance_criterion"] = "All constructs ≥ 4.0 (Agree)"
    
    return results


# ============================================================================
# SURVEY DATA PROCESSING
# ============================================================================

def process_survey_responses(
    survey_data: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Process raw survey responses and calculate TAM analysis
    
    Args:
        survey_data: List of survey responses, each containing:
                    - participant_id
                    - PU_items: List of responses for PU questions (1-5)
                    - PEOU_items: List of responses for PEOU questions
                    - FC_items, SE_items, SQ_items, PRAI_items, BI_items, AU_items
    
    Returns:
        Complete analysis with construct scores and regression results
    """
    # Calculate construct scores for each participant
    participant_scores = {
        "PU": [],
        "PEOU": [],
        "FC": [],
        "SE": [],
        "SQ": [],
        "PRAI": [],
        "BI": [],
        "AU": []
    }
    
    for response in survey_data:
        for construct in participant_scores.keys():
            item_key = f"{construct}_items"
            if item_key in response:
                # Calculate mean score across items for this participant
                items = response[item_key]
                if items:
                    participant_score = calculate_weighted_mean(items)
                    participant_scores[construct].append(participant_score)
    
    # Calculate construct statistics
    construct_analysis = {}
    for construct, scores in participant_scores.items():
        if scores:
            construct_analysis[construct] = {
                "mean": round(float(np.mean(scores)), 2),
                "std_dev": round(float(np.std(scores, ddof=1)), 2) if len(scores) > 1 else 0.0,
                "min": round(float(np.min(scores)), 2),
                "max": round(float(np.max(scores)), 2),
                "interpretation": interpret_weighted_mean(np.mean(scores)),
                "acceptable": np.mean(scores) >= 4.0,
                "n_responses": len(scores)
            }
    
    # Perform TAM regression analysis
    tam_results = analyze_tam_model(participant_scores)
    
    return {
        "construct_analysis": construct_analysis,
        "regression_models": {
            k: v for k, v in tam_results.items() 
            if k.startswith("model_")
        },
        "overall_assessment": {
            "construct_means": tam_results["construct_means"],
            "overall_mean": tam_results["overall_mean"],
            "overall_acceptable": tam_results["overall_acceptable"],
            "acceptance_criterion": tam_results["acceptance_criterion"]
        },
        "n_participants": len(survey_data)
    }


# ============================================================================
# REPORTING
# ============================================================================

def generate_tam_report(analysis_results: Dict[str, Any]) -> str:
    """
    Generate human-readable TAM analysis report
    
    Args:
        analysis_results: Output from process_survey_responses
    
    Returns:
        Formatted report string
    """
    report = []
    report.append("=" * 80)
    report.append("TECHNOLOGY ACCEPTANCE MODEL (TAM) ANALYSIS REPORT")
    report.append("GIS-Integrated Health Monitoring System")
    report.append("=" * 80)
    report.append(f"\nNumber of Participants: {analysis_results['n_participants']}\n")
    
    # Construct Analysis
    report.append("\n" + "=" * 80)
    report.append("CONSTRUCT ANALYSIS")
    report.append("=" * 80)
    
    construct_names = {
        "PU": "Perceived Usefulness",
        "PEOU": "Perceived Ease of Use",
        "FC": "Facilitating Conditions",
        "SE": "Self-Efficacy",
        "SQ": "System Quality",
        "PRAI": "Perceived Reliability of AI Recommendations",
        "BI": "Behavioral Intention",
        "AU": "Actual System Use"
    }
    
    for construct, name in construct_names.items():
        if construct in analysis_results["construct_analysis"]:
            data = analysis_results["construct_analysis"][construct]
            status = "✓ ACCEPTABLE" if data["acceptable"] else "✗ BELOW THRESHOLD"
            report.append(f"\n{name} ({construct}):")
            report.append(f"  Mean: {data['mean']} ({data['interpretation']}) {status}")
            report.append(f"  Std Dev: {data['std_dev']}")
            report.append(f"  Range: {data['min']} - {data['max']}")
    
    # Regression Models
    report.append("\n" + "=" * 80)
    report.append("REGRESSION ANALYSIS")
    report.append("=" * 80)
    
    for model_name, model_data in analysis_results["regression_models"].items():
        if "error" in model_data:
            report.append(f"\n{model_name}: {model_data['error']}")
            continue
        
        report.append(f"\n{model_data['formula']}")
        report.append(f"  R² = {model_data['r_squared']}")
        report.append(f"  Adjusted R² = {model_data['adj_r_squared']}")
        report.append(f"  Intercept (β₀) = {model_data['intercept']}")
        
        for i, var_name in enumerate(model_data['variable_names']):
            coef = model_data['coefficients'][i]
            se = model_data['se_coefficients'][i]
            t = model_data['t_statistics'][i]
            p = model_data['p_values'][i]
            sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
            report.append(f"  β{i+1}({var_name}) = {coef} (SE: {se}, t: {t}, p: {p}) {sig}")
    
    # Overall Assessment
    report.append("\n" + "=" * 80)
    report.append("OVERALL ASSESSMENT")
    report.append("=" * 80)
    
    overall = analysis_results["overall_assessment"]
    report.append(f"\nOverall Mean Score: {overall['overall_mean']}")
    report.append(f"Acceptance Criterion: {overall['acceptance_criterion']}")
    
    if overall["overall_acceptable"]:
        report.append("\n✓✓✓ SYSTEM ACCEPTED ✓✓✓")
        report.append("All TAM constructs meet the acceptance threshold (≥ 4.0)")
    else:
        report.append("\n✗✗✗ SYSTEM BELOW ACCEPTANCE THRESHOLD ✗✗✗")
        report.append("Some constructs are below the 4.0 threshold")
        
        # List constructs below threshold
        report.append("\nConstructs below threshold:")
        for construct, mean in overall["construct_means"].items():
            if mean < 4.0 and mean > 0:
                report.append(f"  - {construct_names.get(construct, construct)}: {mean}")
    
    report.append("\n" + "=" * 80)
    report.append("END OF REPORT")
    report.append("=" * 80)
    
    return "\n".join(report)
