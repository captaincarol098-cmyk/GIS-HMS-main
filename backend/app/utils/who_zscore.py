from __future__ import annotations
import csv
import math
from functools import lru_cache
from pathlib import Path
from typing import Iterable

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "who_tables"


def calculate_zscore(value: float, L: float, M: float, S: float) -> float:
    if value <= 0 or M <= 0 or S == 0:
        return 0.0
    z = (math.log(value / M) / S) if L == 0 else (((value / M) ** L) - 1) / (L * S)
    return round(max(-6, min(6, z)), 2)


def classify_waz(z: float) -> str:
    """
    Classify Weight-for-Age Z-score per OPT Plus Guidelines [50]
    Overlapping Edge Logic: Scores exactly at -2.00 are classified as NORMAL
    """
    if z < -3:
        return "severely_underweight"
    if z < -2:
        return "underweight"
    if z <= 2:  # -2.00 is NORMAL per OPT Plus
        return "normal"
    return "overweight"


def classify_haz(z: float) -> str:
    """
    Classify Height-for-Age Z-score per OPT Plus Guidelines [50]
    Overlapping Edge Logic: Scores exactly at -2.00 are classified as NORMAL
    """
    if z < -3:
        return "severely_stunted"
    if z < -2:
        return "stunted"
    if z <= 2:  # -2.00 is NORMAL per OPT Plus
        return "normal"
    return "tall"


def classify_whz(z: float) -> str:
    """
    Classify Weight-for-Height/Length Z-score per OPT Plus Guidelines [50]
    Overlapping Edge Logic: Scores exactly at -2.00 are classified as NORMAL
    """
    if z < -3:
        return "severely_wasted"
    if z < -2:
        return "wasted"
    if z <= 2:  # -2.00 is NORMAL per OPT Plus
        return "normal"
    if z <= 3:
        return "overweight"
    return "obese"


def classify_overall(whz_status: str, waz_status: str) -> str:
    if whz_status == "severely_wasted":
        return "severe_acute_malnutrition"
    if whz_status == "wasted":
        return "moderate_acute_malnutrition"
    if waz_status in {"severely_underweight", "underweight"}:
        return "moderate_acute_malnutrition"
    if whz_status in {"overweight", "obese"} or waz_status == "overweight":
        return "overweight"
    return "normal"


@lru_cache
def load_who_tables() -> dict[str, list[dict[str, float]]]:
    tables: dict[str, list[dict[str, float]]] = {}
    for file in DATA_DIR.glob("*.csv"):
        with file.open(newline="", encoding="utf-8-sig") as handle:
            rows = []
            for row in csv.DictReader(handle):
                rows.append({k.strip().lower(): float(v) for k, v in row.items() if v not in (None, "")})
            tables[file.stem] = rows
    return tables


def _fallback_median(kind: str, sex: str, age_months: int, height_cm: float | None = None) -> tuple[float, float, float]:
    sex_adj = 1.03 if sex == "male" else 0.97
    if kind == "waz":
        median = (3.3 + age_months * 0.28) * sex_adj
        return 0.1, median, 0.13
    if kind == "haz":
        median = (50 + age_months * 1.15) * (1.01 if sex == "male" else 0.99)
        return 1.0, median, 0.04
    median = ((height_cm or 80) - 45) * 0.22 * sex_adj
    return -0.1, max(3, median), 0.12


def _lookup(kind: str, sex: str, age_months: int, height_cm: float | None = None) -> tuple[float, float, float]:
    tables = load_who_tables()
    candidates = [k for k in tables if sex in k and (kind in k or {"waz": "wfa", "haz": "lhfa", "whz": "wfh"}[kind] in k)]
    if not candidates:
        return _fallback_median(kind, sex, age_months, height_cm)
    rows = tables[candidates[0]]
    key = "height" if kind == "whz" else "month"
    target = height_cm if kind == "whz" else age_months
    row = min(rows, key=lambda r: abs(r.get(key, r.get("age_months", 0)) - float(target or 0)))
    return row.get("l", 1.0), row.get("m", 1.0), row.get("s", 0.1)


def calculate_full_assessment(child_sex: str, age_months: int, weight_kg: float, height_cm: float) -> dict:
    waz = calculate_zscore(weight_kg, *_lookup("waz", child_sex, age_months))
    haz = calculate_zscore(height_cm, *_lookup("haz", child_sex, age_months))
    whz = calculate_zscore(weight_kg, *_lookup("whz", child_sex, age_months, height_cm))
    waz_status = classify_waz(waz)
    haz_status = classify_haz(haz)
    whz_status = classify_whz(whz)
    return {
        "waz": waz,
        "haz": haz,
        "whz": whz,
        "waz_status": waz_status,
        "haz_status": haz_status,
        "whz_status": whz_status,
        "overall_status": classify_overall(whz_status, waz_status),
    }


def calculate_prevalence(measurements: Iterable) -> dict:
    items = list(measurements)
    total = len(items) or 1
    def rate(predicate):
        return round(sum(1 for m in items if predicate(m)) / total * 100, 1)
    return {
        "stunting_rate": rate(lambda m: m.haz_status in {"stunted", "severely_stunted"}),
        "wasting_rate": rate(lambda m: m.whz_status in {"wasted", "severely_wasted"}),
        "underweight_rate": rate(lambda m: m.waz_status in {"underweight", "severely_underweight"}),
        "severe_stunting_rate": rate(lambda m: m.haz_status == "severely_stunted"),
        "severe_wasting_rate": rate(lambda m: m.whz_status == "severely_wasted"),
        "severe_underweight_rate": rate(lambda m: m.waz_status == "severely_underweight"),
        "overweight_rate": rate(lambda m: m.overall_status == "overweight"),
        "sample_size": len(items),
    }


def classify_risk_level(prevalence: dict) -> str:
    if prevalence.get("wasting_rate", 0) >= 15 or prevalence.get("severe_wasting_rate", 0) >= 2:
        return "critical"
    if prevalence.get("wasting_rate", 0) >= 10:
        return "high"
    if prevalence.get("wasting_rate", 0) >= 5:
        return "medium"
    return "low"
