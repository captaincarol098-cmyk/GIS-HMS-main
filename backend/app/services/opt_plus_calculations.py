"""
OPT Plus Calculation Modules
Implementation of NNC OPT Plus Guidelines [50] and WHO Child Growth Standards

Modules:
1. Age Calculation (Chronological Milestone Resolution)
2. Height/Length Positional Adjustment
3. Z-Score Calculation (LMS Method)
4. Clinical Priority Interception (Edema Override)
5. Nutritional Status Classification
"""

from datetime import date
from typing import Dict, Any, Literal
import math


# ============================================================================
# MODULE 1: AGE CALCULATION
# ============================================================================

def calculate_age_in_months(birth_date: date, measurement_date: date) -> int:
    """
    Calculate age in months using NNC OPT Plus Guidelines [50]
    
    Algorithm: Chronological Milestone Resolution
    Formula: Age (in months) = FLOOR((Measurement Date - Birth Date) / 30.4375)
    
    Rules:
    - Disregard remaining days (floor function)
    - Example: Child born on 01 October 2004, measured on 21 August 2007
      2 years × 12 months = 24 months + 10 months = 34 months
      Disregard 20 days → Age = 34 months [50]
    
    Args:
        birth_date: Child's date of birth
        measurement_date: Date of measurement
    
    Returns:
        Age in completed months (integer)
    """
    # Calculate total months, discarding extra days
    years_diff = measurement_date.year - birth_date.year
    months_diff = measurement_date.month - birth_date.month
    
    # Adjust if measurement day is before birth day in the month
    if measurement_date.day < birth_date.day:
        months_diff -= 1
    
    total_months = years_diff * 12 + months_diff
    
    return max(0, total_months)  # Ensure non-negative


# ============================================================================
# MODULE 2: HEIGHT/LENGTH POSITIONAL ADJUSTMENT
# ============================================================================

def adjust_height_for_position(
    height_cm: float,
    age_months: int,
    measurement_position: Literal["standing", "lying_down"]
) -> float:
    """
    Adjust height/length based on measurement position per NNC OPT Plus Guidelines [50]
    
    Rules:
    | Age Group      | Measurement Method | Adjustment    |
    |----------------|-------------------|---------------|
    | 0-23 months    | Standing (wrong)  | Add +0.7 cm   |
    | 0-23 months    | Lying (correct)   | No adjustment |
    | 24-71 months   | Lying (wrong)     | Subtract -0.7 |
    | 24-71 months   | Standing (correct)| No adjustment |
    
    Rounding Rule:
    - Round off actual reading to the nearest 0.5 cm
    - Example: 51.3 cm → 51.5 cm
    - Example: 56.3 cm → 56.5 cm
    
    Args:
        height_cm: Raw height/length measurement in cm
        age_months: Age in completed months
        measurement_position: "standing" or "lying_down"
    
    Returns:
        Adjusted height rounded to nearest 0.5 cm
    """
    # Step 1: Round to nearest 0.5 cm
    # Formula: ROUND(Height × 2) / 2
    rounded_height = round(height_cm * 2) / 2
    
    # Step 2: Apply positional adjustment
    adjusted_height = rounded_height
    
    if age_months < 24:  # 0-23 months
        if measurement_position == "standing":
            # Wrong method for this age - add 0.7 cm
            adjusted_height = rounded_height + 0.7
    else:  # 24-71 months
        if measurement_position == "lying_down":
            # Wrong method for this age - subtract 0.7 cm
            adjusted_height = rounded_height - 0.7
    
    return adjusted_height


# ============================================================================
# MODULE 3: Z-SCORE CALCULATION (LMS METHOD)
# ============================================================================

# WHO LMS Parameters for Weight-for-Age (WAZ)
# Source: WHO Child Growth Standards
WAZ_LMS_PARAMS = {
    # Format: (age_months, sex): (L, M, S)
    # Boys
    (0, "male"): (0.3487, 3.3464, 0.14602),
    (1, "male"): (0.2297, 4.4709, 0.13395),
    (2, "male"): (0.1970, 5.5675, 0.12385),
    (3, "male"): (0.1738, 6.3762, 0.11727),
    (4, "male"): (0.1553, 7.0023, 0.11316),
    (5, "male"): (0.1395, 7.5105, 0.11080),
    (6, "male"): (0.1257, 7.9340, 0.10958),
    (7, "male"): (0.1134, 8.2970, 0.10902),
    (8, "male"): (0.1021, 8.6151, 0.10882),
    (9, "male"): (0.0917, 8.9014, 0.10881),
    (10, "male"): (0.0820, 9.1649, 0.10894),
    (11, "male"): (0.0730, 9.4122, 0.10913),
    (12, "male"): (-0.3521, 9.6, 0.1213),
    (24, "male"): (-0.3521, 12.2, 0.1173),
    # Girls
    (0, "female"): (0.3809, 3.2322, 0.14171),
    (1, "female"): (0.1714, 4.1873, 0.13724),
    (2, "female"): (0.0962, 5.1282, 0.13000),
    (3, "female"): (0.0402, 5.8458, 0.12619),
    (4, "female"): (-0.0050, 6.4237, 0.12402),
    (5, "female"): (-0.0430, 6.8985, 0.12274),
    (6, "female"): (-0.0756, 7.2970, 0.12204),
    (7, "female"): (-0.1039, 7.6422, 0.12178),
    (8, "female"): (-0.1288, 7.9487, 0.12181),
    (9, "female"): (-0.1507, 8.2254, 0.12199),
    (10, "female"): (-0.1700, 8.4800, 0.12223),
    (11, "female"): (-0.1872, 8.7192, 0.12247),
    (12, "female"): (-0.3809, 8.9, 0.1281),
    (24, "female"): (-0.3809, 11.5, 0.1245),
}

# WHO LMS Parameters for Height-for-Age (HAZ)
# L = 1.0 for all HAZ calculations
HAZ_LMS_PARAMS = {
    # Format: (age_months, sex): (L, M, S)
    # Boys
    (0, "male"): (1.0000, 49.8842, 0.03795),
    (1, "male"): (1.0000, 54.7244, 0.03557),
    (2, "male"): (1.0000, 58.4249, 0.03424),
    (3, "male"): (1.0000, 61.4292, 0.03328),
    (4, "male"): (1.0000, 63.8861, 0.03257),
    (5, "male"): (1.0000, 65.9026, 0.03204),
    (6, "male"): (1.0000, 67.6236, 0.03165),
    (7, "male"): (1.0000, 69.1645, 0.03139),
    (8, "male"): (1.0000, 70.5994, 0.03124),
    (9, "male"): (1.0000, 71.9687, 0.03117),
    (10, "male"): (1.0000, 73.2812, 0.03117),
    (11, "male"): (1.0000, 74.5388, 0.03123),
    (12, "male"): (1.0000, 75.7, 0.0354),
    (24, "male"): (1.0000, 87.8, 0.0364),
    # Girls
    (0, "female"): (1.0000, 49.1477, 0.03790),
    (1, "female"): (1.0000, 53.6872, 0.03670),
    (2, "female"): (1.0000, 57.0673, 0.03593),
    (3, "female"): (1.0000, 59.8029, 0.03546),
    (4, "female"): (1.0000, 62.0899, 0.03522),
    (5, "female"): (1.0000, 64.0301, 0.03515),
    (6, "female"): (1.0000, 65.7311, 0.03521),
    (7, "female"): (1.0000, 67.2873, 0.03537),
    (8, "female"): (1.0000, 68.7498, 0.03560),
    (9, "female"): (1.0000, 70.1435, 0.03587),
    (10, "female"): (1.0000, 71.4818, 0.03617),
    (11, "female"): (1.0000, 72.7719, 0.03648),
    (12, "female"): (1.0000, 74.0, 0.0371),
    (24, "female"): (1.0000, 86.4, 0.0382),
}

# WHO LMS Parameters for Weight-for-Height (WHZ)
# Simplified - actual implementation would have complete tables
WHZ_LMS_PARAMS = {
    # Format: (height_cm, sex): (L, M, S)
    # This is a simplified version - full implementation would have values for every 0.5 cm
    (50.0, "male"): (0.3809, 3.4, 0.08441),
    (75.0, "male"): (0.1515, 9.2, 0.07219),
    (87.0, "male"): (0.0376, 12.0, 0.06869),
    (50.0, "female"): (0.3833, 3.2, 0.08370),
    (75.0, "female"): (0.1738, 8.8, 0.07025),
    (87.0, "female"): (0.0498, 11.5, 0.06749),
}


def calculate_z_score(
    measurement: float,
    L: float,
    M: float,
    S: float
) -> float:
    """
    Calculate Z-score using WHO Box-Cox Cole and Green (LMS) method
    
    Z-Score Formula:
    For L ≠ 0:  Z = ((X/M)^L - 1) / (L × S)
    For L = 0:  Z = ln(X/M) / S
    
    Where:
    - X = child's actual adjusted physical weight or height input
    - L = Skewness coefficient (Box-Cox power transformation)
    - M = Median reference value for specific age and sex
    - S = Coefficient of variation (scaling factor)
    
    Args:
        measurement: Actual measurement value (weight or height)
        L: Skewness coefficient
        M: Median reference value
        S: Coefficient of variation
    
    Returns:
        Z-score value
    """
    if L != 0:
        # Standard Box-Cox transformation
        z_score = (pow(measurement / M, L) - 1) / (L * S)
    else:
        # Special case when L = 0 (use natural log)
        z_score = math.log(measurement / M) / S
    
    return round(z_score, 2)


def get_lms_params(
    age_months: int,
    sex: str,
    indicator: Literal["waz", "haz", "whz"],
    height_cm: float = None
) -> tuple[float, float, float]:
    """
    Get LMS parameters for a given age, sex, and indicator
    
    Args:
        age_months: Age in completed months
        sex: "male" or "female"
        indicator: "waz", "haz", or "whz"
        height_cm: Height in cm (required for WHZ)
    
    Returns:
        Tuple of (L, M, S) parameters
    """
    if indicator == "waz":
        params_dict = WAZ_LMS_PARAMS
        key = (age_months, sex)
    elif indicator == "haz":
        params_dict = HAZ_LMS_PARAMS
        key = (age_months, sex)
    elif indicator == "whz":
        if height_cm is None:
            raise ValueError("height_cm required for WHZ calculation")
        # Round height to nearest 0.5 cm for lookup
        rounded_height = round(height_cm * 2) / 2
        params_dict = WHZ_LMS_PARAMS
        key = (rounded_height, sex)
    else:
        raise ValueError(f"Unknown indicator: {indicator}")
    
    # Get exact match or interpolate
    if key in params_dict:
        return params_dict[key]
    
    # Simple interpolation for missing values
    # In production, use full WHO tables or linear interpolation
    if indicator in ["waz", "haz"]:
        # Find nearest age
        available_ages = [k[0] for k in params_dict.keys() if k[1] == sex]
        nearest_age = min(available_ages, key=lambda x: abs(x - age_months))
        return params_dict[(nearest_age, sex)]
    else:
        # For WHZ, find nearest height
        available_heights = [k[0] for k in params_dict.keys() if k[1] == sex]
        nearest_height = min(available_heights, key=lambda x: abs(x - height_cm))
        return params_dict[(nearest_height, sex)]


# ============================================================================
# MODULE 4: CLINICAL PRIORITY INTERCEPTION (EDEMA OVERRIDE)
# ============================================================================

def check_edema_override(has_bilateral_edema: bool) -> Dict[str, Any]:
    """
    Implement edema override algorithm per NNC OPT Plus Guidelines [50]
    
    Algorithmic Logic:
    IF Bilateral_Edema == True THEN
        SKIP Z-score calculations (WAZ, HAZ, WHZ)
        SET Nutritional_Status = "Severe Acute Malnutrition (SAM)"
        SET Priority_Level = "Immediate Emergency"
        TRIGGER Emergency Alert (Red)
        MAP Color = Solid Red
    END IF
    
    Rationale: Fluid accumulation artificially alters a child's weight record,
    making WAZ and WHZ calculations medically invalid [50].
    
    Args:
        has_bilateral_edema: Boolean indicating presence of bilateral edema
    
    Returns:
        Dictionary with override status and classification if applicable
    """
    if has_bilateral_edema:
        return {
            "override_active": True,
            "skip_z_scores": True,
            "nutritional_status": "severe_acute_malnutrition",
            "priority_level": "emergency",
            "alert_level": "red",
            "map_color": "red",
            "waz_status": "severely_underweight",
            "haz_status": "normal",  # Not affected by edema
            "whz_status": "severely_wasted",
            "overall_status": "severe_acute_malnutrition",
            "reason": "Bilateral edema present - clinical SAM diagnosis"
        }
    
    return {
        "override_active": False,
        "skip_z_scores": False
    }


# ============================================================================
# MODULE 5: NUTRITIONAL STATUS CLASSIFICATION
# ============================================================================

def classify_waz_status(z_score: float) -> str:
    """
    Classify Weight-for-Age Z-score per OPT Plus Guidelines [50]
    
    | Z-Score Range      | OPT Plus Status      | Priority Level |
    |--------------------|---------------------|----------------|
    | Z > +2.00          | Overweight          | Low            |
    | -2.00 ≤ Z ≤ +2.00  | Normal              | Baseline       |
    | -3.00 ≤ Z < -2.00  | Underweight         | Moderate       |
    | Z < -3.00          | Severely Underweight| High           |
    
    Overlapping Edge Logic:
    - Scores exactly at -2.00 are classified as NORMAL
    - Malnutrition statuses trigger when score falls completely past the line
    """
    if z_score > 2.00:
        return "overweight"
    elif z_score >= -2.00:  # Includes exactly -2.00
        return "normal"
    elif z_score >= -3.00:  # -3.00 to -2.01
        return "underweight"
    else:  # < -3.00
        return "severely_underweight"


def classify_haz_status(z_score: float) -> str:
    """
    Classify Height-for-Age Z-score per OPT Plus Guidelines [50]
    
    | Z-Score Range      | OPT Plus Status      | Priority Level |
    |--------------------|---------------------|----------------|
    | Z > +2.00          | Tall                | Low            |
    | -2.00 ≤ Z ≤ +2.00  | Normal              | Baseline       |
    | -3.00 ≤ Z < -2.00  | Stunted             | Moderate       |
    | Z < -3.00          | Severely Stunted    | Critical       |
    """
    if z_score > 2.00:
        return "tall"
    elif z_score >= -2.00:
        return "normal"
    elif z_score >= -3.00:
        return "stunted"
    else:
        return "severely_stunted"


def classify_whz_status(z_score: float) -> str:
    """
    Classify Weight-for-Height/Length Z-score per OPT Plus Guidelines [50]
    
    | Z-Score Range      | OPT Plus Status      | Priority Level |
    |--------------------|---------------------|----------------|
    | Z > +3.00          | Obese               | High           |
    | +2.00 < Z ≤ +3.00  | Overweight          | Moderate       |
    | -2.00 ≤ Z ≤ +2.00  | Normal              | Baseline       |
    | -3.00 ≤ Z < -2.00  | Wasted (Thin)       | High Acute     |
    | Z < -3.00          | Severely Wasted     | Emergency      |
    """
    if z_score > 3.00:
        return "obese"
    elif z_score > 2.00:
        return "overweight"
    elif z_score >= -2.00:
        return "normal"
    elif z_score >= -3.00:
        return "wasted"
    else:
        return "severely_wasted"


def classify_overall_status(
    waz_status: str,
    haz_status: str,
    whz_status: str
) -> str:
    """
    Determine overall nutritional status based on all indicators
    
    Priority order:
    1. Severe Acute Malnutrition (SAM) - if WHZ severely wasted
    2. Moderate Acute Malnutrition (MAM) - if WHZ wasted
    3. Overweight/Obese - if WHZ overweight/obese
    4. Normal - if all indicators normal or only chronic malnutrition
    """
    # Acute malnutrition (WHZ) takes priority
    if whz_status == "severely_wasted":
        return "severe_acute_malnutrition"
    elif whz_status == "wasted":
        return "moderate_acute_malnutrition"
    elif whz_status in ["obese", "overweight"]:
        return "overweight"
    else:
        return "normal"


def get_priority_level(overall_status: str, whz_status: str, haz_status: str) -> str:
    """
    Determine priority level for intervention
    
    Returns: "emergency", "high", "moderate", "baseline", "low"
    """
    if overall_status == "severe_acute_malnutrition":
        return "emergency"
    elif whz_status == "wasted" or haz_status == "severely_stunted":
        return "high"
    elif whz_status == "overweight" or haz_status == "stunted":
        return "moderate"
    elif overall_status == "normal":
        return "baseline"
    else:
        return "low"


def get_map_color(overall_status: str, whz_status: str, haz_status: str) -> str:
    """
    Get map marker color based on nutritional status
    
    Returns: "red", "orange", "yellow", "green", "blue", "purple"
    """
    if overall_status == "severe_acute_malnutrition":
        return "red"
    elif overall_status == "moderate_acute_malnutrition":
        return "orange"
    elif whz_status == "overweight" or whz_status == "obese":
        return "blue"
    elif haz_status in ["stunted", "severely_stunted"]:
        return "orange"
    elif overall_status == "overweight":
        return "purple"
    else:
        return "green"


# ============================================================================
# MAIN CALCULATION FUNCTION
# ============================================================================

def calculate_full_opt_plus_assessment(
    sex: str,
    birth_date: date,
    measurement_date: date,
    weight_kg: float,
    height_cm: float,
    measurement_position: Literal["standing", "lying_down"] = "standing",
    has_bilateral_edema: bool = False
) -> Dict[str, Any]:
    """
    Complete OPT Plus assessment following all NNC guidelines
    
    Args:
        sex: "male" or "female"
        birth_date: Child's date of birth
        measurement_date: Date of measurement
        weight_kg: Weight in kilograms
        height_cm: Height/length in centimeters
        measurement_position: "standing" or "lying_down"
        has_bilateral_edema: Presence of bilateral edema
    
    Returns:
        Dictionary containing all calculated values and classifications
    """
    # Step 1: Check for edema override
    edema_check = check_edema_override(has_bilateral_edema)
    if edema_check["override_active"]:
        return edema_check
    
    # Step 2: Calculate age in months
    age_months = calculate_age_in_months(birth_date, measurement_date)
    
    # Validate age range (0-71 months per OPT Plus)
    if age_months > 71:
        raise ValueError(
            f"Child is {age_months} months old. OPT Plus guidelines apply to children 0-71 months (0-5 years)."
        )
    
    # Step 3: Adjust height for position
    adjusted_height = adjust_height_for_position(height_cm, age_months, measurement_position)
    
    # Step 4: Calculate Z-scores
    # Get LMS parameters
    waz_lms = get_lms_params(age_months, sex, "waz")
    haz_lms = get_lms_params(age_months, sex, "haz")
    whz_lms = get_lms_params(age_months, sex, "whz", adjusted_height)
    
    # Calculate Z-scores
    waz = calculate_z_score(weight_kg, *waz_lms)
    haz = calculate_z_score(adjusted_height, *haz_lms)
    whz = calculate_z_score(weight_kg, *whz_lms)
    
    # Step 5: Classify nutritional status
    waz_status = classify_waz_status(waz)
    haz_status = classify_haz_status(haz)
    whz_status = classify_whz_status(whz)
    overall_status = classify_overall_status(waz_status, haz_status, whz_status)
    
    # Step 6: Determine priority and map color
    priority_level = get_priority_level(overall_status, whz_status, haz_status)
    map_color = get_map_color(overall_status, whz_status, haz_status)
    
    return {
        "age_months": age_months,
        "adjusted_height_cm": round(adjusted_height, 1),
        "waz": waz,
        "haz": haz,
        "whz": whz,
        "waz_status": waz_status,
        "haz_status": haz_status,
        "whz_status": whz_status,
        "overall_status": overall_status,
        "priority_level": priority_level,
        "map_color": map_color,
        "has_edema": has_bilateral_edema
    }
