import json
from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.rbac import get_current_user, require_super_admin
from ..models import Alert, Barangay, Child, Measurement, ProjectBudget, Referral, SystemSetting, User
from ..services.analytics import latest_measurements, EXCLUDED_BARANGAYS
from ..utils.who_zscore import calculate_prevalence, classify_risk_level

router = APIRouter(prefix="/api/decisions", tags=["decisions"])

GEMINI_API_KEY = ""  # Set via environment variable or database

# ──────────────────────────────────────────────
# Pydantic schemas
# ──────────────────────────────────────────────

class BudgetIn(BaseModel):
    amount: float
    fiscal_year: str
    label: str | None = None
    notes: str | None = None


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

async def _get_gemini_key(db: AsyncSession) -> str:
    row = await db.scalar(select(SystemSetting).where(SystemSetting.key == "gemini_api_key"))
    if row:
        return row.value
    return GEMINI_API_KEY


async def _collect_system_context(db: AsyncSession) -> dict:
    """Gather all real-time data to feed into the AI."""
    # All barangays (excluding those not part of Cabadbaran City)
    barangays = list((await db.scalars(select(Barangay).where(Barangay.name.notin_(EXCLUDED_BARANGAYS)).order_by(Barangay.name))).all())

    # Latest measurements per child (all barangays)
    all_measurements = await latest_measurements(db, None)
    global_prevalence = calculate_prevalence(all_measurements)

    # Per-barangay breakdown
    barangay_data = []
    for b in barangays:
        b_meas = [m for m in all_measurements if m.child.barangay_id == b.id]
        prev = calculate_prevalence(b_meas)
        severe_count = sum(1 for m in b_meas if m.overall_status.value == "severe_acute_malnutrition")
        moderate_count = sum(1 for m in b_meas if m.overall_status.value == "moderate_acute_malnutrition")
        barangay_data.append({
            "name": b.name,
            "population": b.population_count,
            "total_measured": len(b_meas),
            "severe_sam": severe_count,
            "moderate_mam": moderate_count,
            "total_malnourished": severe_count + moderate_count,
            "wasting_rate": prev["wasting_rate"],
            "stunting_rate": prev["stunting_rate"],
            "underweight_rate": prev["underweight_rate"],
            "risk_level": classify_risk_level(prev),
        })

    barangay_data.sort(key=lambda x: (x["total_malnourished"], x["wasting_rate"]), reverse=True)

    # Active alerts
    alert_rows = list((await db.scalars(
        select(Alert).where(Alert.is_resolved.is_(False))
    )).all())
    alert_summary = {
        "critical": sum(1 for a in alert_rows if a.severity.value == "critical"),
        "high": sum(1 for a in alert_rows if a.severity.value == "high"),
        "medium": sum(1 for a in alert_rows if a.severity.value == "medium"),
        "total": len(alert_rows),
    }

    # Pending referrals
    pending_referrals = await db.scalar(
        select(func.count(Referral.id)).where(Referral.status == "pending")
    ) or 0

    # Total children
    total_children = await db.scalar(
        select(func.count(Child.id)).where(Child.is_active.is_(True))
    ) or 0

    # Budget
    budget_row = await db.scalar(
        select(ProjectBudget).order_by(ProjectBudget.created_at.desc())
    )
    budget_info = None
    if budget_row:
        budget_info = {
            "amount": budget_row.amount,
            "fiscal_year": budget_row.fiscal_year,
            "label": budget_row.label,
            "notes": budget_row.notes,
        }

    return {
        "as_of": date.today().isoformat(),
        "city": "Cabadbaran City",
        "total_children": total_children,
        "global_prevalence": global_prevalence,
        "active_alerts": alert_summary,
        "pending_referrals": pending_referrals,
        "barangays": barangay_data,
        "budget": budget_info,
    }


def _rule_based_analysis(ctx: dict) -> dict:
    """Fallback rule-based AI analysis when no Gemini key is available."""
    barangays = ctx["barangays"]
    budget = ctx["budget"]
    total_malnourished = sum(b["total_malnourished"] for b in barangays)
    critical_barangays = [b for b in barangays if b["risk_level"] == "critical"]
    high_barangays = [b for b in barangays if b["risk_level"] == "high"]

    priority_list = barangays[:5]

    interventions = []
    for b in priority_list:
        actions = []
        if b["severe_sam"] > 0:
            actions.append(f"Initiate RUTF therapeutic feeding for {b['severe_sam']} SAM case(s)")
            actions.append("Immediate referral to City Health Office")
        if b["moderate_mam"] > 0:
            actions.append(f"Supplementary feeding program for {b['moderate_mam']} MAM case(s)")
        actions.append("Monthly growth monitoring and counseling")
        if b["wasting_rate"] >= 15:
            actions.append("Declare nutrition emergency and mobilize BHW team")
        interventions.append({"barangay": b["name"], "risk": b["risk_level"], "actions": actions})

    # Budget allocation
    budget_alloc = []
    if budget and budget["amount"] > 0:
        total_cases = max(1, total_malnourished)
        for b in priority_list:
            share = (b["total_malnourished"] / total_cases) * budget["amount"]
            budget_alloc.append({
                "barangay": b["name"],
                "allocated": round(share, 2),
                "cases": b["total_malnourished"],
            })

    summary = (
        f"As of {ctx['as_of']}, {ctx['city']} has {ctx['total_children']} registered children. "
        f"System-wide wasting rate is {ctx['global_prevalence']['wasting_rate']}%, "
        f"stunting rate {ctx['global_prevalence']['stunting_rate']}%, "
        f"underweight rate {ctx['global_prevalence']['underweight_rate']}%. "
        f"There are {len(critical_barangays)} critical and {len(high_barangays)} high-risk barangays requiring immediate attention. "
        f"Total active alerts: {ctx['active_alerts']['total']} ({ctx['active_alerts']['critical']} critical). "
        f"Pending referrals: {ctx['pending_referrals']}."
    )

    return {
        "source": "rule_based",
        "executive_summary": summary,
        "priority_barangays": [
            {"rank": i + 1, "name": b["name"], "risk_level": b["risk_level"],
             "malnourished": b["total_malnourished"], "wasting_rate": b["wasting_rate"],
             "justification": f"Ranked #{i+1} due to {b['total_malnourished']} malnourished children and {b['wasting_rate']}% wasting rate."}
            for i, b in enumerate(priority_list)
        ],
        "recommended_interventions": interventions,
        "budget_allocation": budget_alloc,
        "high_risk_children_count": sum(b["severe_sam"] for b in barangays),
        "timeline": "Immediate actions within 2 weeks; short-term programs 1-6 months; long-term 6-18 months",
        "generated_at": ctx["as_of"],
    }


async def _gemini_analysis(ctx: dict, api_key: str) -> dict:
    """Call Google Gemini API with full system context."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        budget_str = "No budget has been set yet."
        if ctx["budget"]:
            b = ctx["budget"]
            budget_str = f"Total allocated budget: ₱{b['amount']:,.2f} for fiscal year {b['fiscal_year']}. Label: {b.get('label', 'N/A')}. Notes: {b.get('notes', 'None')}."

        barangay_summary = "\n".join([
            f"  - {b['name']}: {b['total_malnourished']} malnourished ({b['severe_sam']} SAM, {b['moderate_mam']} MAM), "
            f"wasting {b['wasting_rate']}%, stunting {b['stunting_rate']}%, underweight {b['underweight_rate']}%, "
            f"risk: {b['risk_level']}, population: {b['population']}, measured: {b['total_measured']}"
            for b in ctx["barangays"] if b["total_measured"] > 0
        ]) or "  No barangay measurement data available yet."

        prompt = f"""You are an expert public health nutritionist AI for Cabadbaran City Health Office, Philippines.
Analyze the following REAL-TIME nutrition monitoring data as of {ctx['as_of']} and produce a comprehensive decision support analysis.

=== SYSTEM DATA ===
City: {ctx['city']}
Total Registered Children: {ctx['total_children']}
Global Wasting Rate: {ctx['global_prevalence']['wasting_rate']}%
Global Stunting Rate: {ctx['global_prevalence']['stunting_rate']}%
Global Underweight Rate: {ctx['global_prevalence']['underweight_rate']}%
Active Alerts: {ctx['active_alerts']['total']} total ({ctx['active_alerts']['critical']} critical, {ctx['active_alerts']['high']} high)
Pending Referrals: {ctx['pending_referrals']}
Budget: {budget_str}

=== BARANGAY BREAKDOWN ===
{barangay_summary}

=== INSTRUCTIONS ===
Respond ONLY with a valid JSON object (no markdown, no extra text) with this exact structure:
{{
  "executive_summary": "<2-3 sentence narrative summary of the nutrition situation>",
  "priority_barangays": [
    {{
      "rank": 1,
      "name": "<barangay name>",
      "risk_level": "<critical|high|medium|low>",
      "malnourished": <number>,
      "wasting_rate": <number>,
      "justification": "<1-2 sentence AI justification for this ranking>"
    }}
  ],
  "recommended_interventions": [
    {{
      "barangay": "<name>",
      "risk": "<level>",
      "actions": ["<action 1>", "<action 2>", "..."]
    }}
  ],
  "budget_allocation": [
    {{
      "barangay": "<name>",
      "allocated": <peso amount as number>,
      "cases": <number>,
      "rationale": "<brief reason>"
    }}
  ],
  "high_risk_children_count": <number>,
  "timeline": "<overall timeline recommendation>",
  "key_findings": ["<finding 1>", "<finding 2>", "<finding 3>"]
}}

Rules:
- priority_barangays: list top 5 barangays by severity
- recommended_interventions: cover only the top 5 priority barangays
- budget_allocation: distribute the budget proportionally by case severity; if no budget is set, suggest ideal amounts
- Use Philippine health protocols (DOH, WHO standards)
- Be specific with numbers from the data above
- key_findings: exactly 3 most important findings
"""

        response = model.generate_content(prompt)
        text = response.text.strip()
        # Strip possible markdown code fences
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()
        result = json.loads(text)
        result["source"] = "gemini"
        result["generated_at"] = ctx["as_of"]
        return result
    except Exception as e:
        # Fallback to rule-based on any error
        fallback = _rule_based_analysis(ctx)
        fallback["error_note"] = f"Gemini error: {str(e)[:120]}. Showing rule-based analysis."
        return fallback


# ──────────────────────────────────────────────
# Budget endpoints
# ──────────────────────────────────────────────

@router.get("/budget")
async def get_budget(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await db.scalar(select(ProjectBudget).order_by(ProjectBudget.created_at.desc()))
    if not row:
        return None
    return {
        "id": str(row.id),
        "amount": row.amount,
        "fiscal_year": row.fiscal_year,
        "label": row.label,
        "notes": row.notes,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.post("/budget")
async def create_budget(body: BudgetIn, db: AsyncSession = Depends(get_db), user: User = Depends(require_super_admin)):
    row = ProjectBudget(
        amount=body.amount,
        fiscal_year=body.fiscal_year,
        label=body.label,
        notes=body.notes,
        created_by=user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": str(row.id), "amount": row.amount, "fiscal_year": row.fiscal_year, "label": row.label}


@router.put("/budget/{budget_id}")
async def update_budget(budget_id: UUID, body: BudgetIn, db: AsyncSession = Depends(get_db), user: User = Depends(require_super_admin)):
    row = await db.scalar(select(ProjectBudget).where(ProjectBudget.id == budget_id))
    if not row:
        raise HTTPException(status_code=404, detail="Budget not found")
    row.amount = body.amount
    row.fiscal_year = body.fiscal_year
    row.label = body.label
    row.notes = body.notes
    await db.commit()
    await db.refresh(row)
    return {"id": str(row.id), "amount": row.amount, "fiscal_year": row.fiscal_year, "label": row.label}


# ──────────────────────────────────────────────
# AI Analysis endpoint
# ──────────────────────────────────────────────

@router.get("/ai-analysis")
async def ai_analysis(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    ctx = await _collect_system_context(db)
    api_key = await _get_gemini_key(db)
    if api_key:
        return await _gemini_analysis(ctx, api_key)
    return _rule_based_analysis(ctx)


# ──────────────────────────────────────────────
# Legacy endpoints (kept for backward compat)
# ──────────────────────────────────────────────

@router.get("/recommendations")
async def recommendations(barangay_id: UUID | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role.value == "admin":
        barangay_id = user.barangay_id
    from ..utils.who_zscore import calculate_prevalence
    prevalence = calculate_prevalence(await latest_measurements(db, barangay_id))
    recs = []
    if prevalence["wasting_rate"] >= 15:
        recs.append({"title": "Activate Therapeutic Feeding Program", "description": "Wasting prevalence has crossed the emergency threshold.", "priority": "critical", "evidence": prevalence})
    if prevalence["stunting_rate"] >= 40:
        recs.append({"title": "Nutrition-Sensitive Agriculture intervention", "description": "Stunting prevalence indicates chronic nutrition stress.", "priority": "high", "evidence": prevalence})
    if not recs:
        recs.append({"title": "Maintain routine monitoring", "description": "Current prevalence does not trigger emergency thresholds.", "priority": "routine", "evidence": prevalence})
    return recs


@router.get("/high-risk-children")
async def high_risk_children(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = await latest_measurements(db, user.barangay_id if user.role.value == "admin" else None)
    return [{"child_id": str(m.child_id), "name": m.child.full_name, "overall_status": m.overall_status.value, "whz": m.whz, "waz": m.waz, "haz": m.haz} for m in rows if m.overall_status.value != "normal"]
