"use client";
import "@/styles/admin.css";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type BarangaySeverity = {
  id: string;
  name: string;
  risk_level: "critical" | "high" | "medium" | "low";
  prevalence_rate: number;
  total_children: number;
  malnutrition_count: number;
  moderate_count: number;
  severe_count: number;
};

type Budget = {
  id: string;
  amount: number;
  fiscal_year: string;
  label: string | null;
  notes: string | null;
};

type Analysis = {
  source: "gemini" | "rule_based";
  executive_summary: string;
  priority_barangays: {
    rank: number;
    name: string;
    risk_level: string;
    malnourished: number;
    wasting_rate: number;
    justification: string;
  }[];
  recommended_interventions: {
    barangay: string;
    risk: string;
    actions: string[];
  }[];
  budget_allocation: {
    barangay: string;
    allocated: number;
    cases: number;
    rationale?: string;
  }[];
  high_risk_children_count: number;
  timeline: string;
  key_findings?: string[];
  error_note?: string;
  generated_at: string;
};

// ─── Risk Badge ───────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border border-red-200",
    high:     "bg-orange-100 text-orange-700 border border-orange-200",
    medium:   "bg-yellow-100 text-yellow-700 border border-yellow-200",
    low:      "bg-green-100 text-green-700 border border-green-200",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[level] ?? styles.low}`}>
      {level} risk
    </span>
  );
}

// ─── Typing animation ─────────────────────────────────────────────────────────

function TypedText({ text, speed = 10 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(iv);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return <span>{displayed}</span>;
}

// ─── Live Pulse ───────────────────────────────────────────────────────────────

function LivePulse({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? "bg-teal-500" : "bg-slate-300"}`} />
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DecisionSupportPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";
  const queryClient = useQueryClient();

  const [selectedBrgy, setSelectedBrgy]   = useState<string | null>(null);
  const [analysis, setAnalysis]           = useState<Analysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetForm, setBudgetForm]       = useState({
    amount: "",
    fiscal_year: new Date().getFullYear().toString(),
    label: "",
    notes: "",
  });
  const [budgetSaved, setBudgetSaved]     = useState(false);

  // ── Data fetching (polls every 30 s) ──────────────────────────────────────

  const choroplethQuery = useQuery({
    queryKey: ["barangay-severity-decisions"],
    queryFn: () =>
      api.get("/api/maps/barangay-choropleth").then(
        (r) => r.data as { features: { properties: BarangaySeverity }[] }
      ),
    refetchInterval: 30_000,
  });

  const budgetQuery = useQuery({
    queryKey: ["project-budget"],
    queryFn: () => api.get("/api/decisions/budget").then((r) => r.data as Budget | null),
    refetchInterval: 60_000,
  });

  const barangays: BarangaySeverity[] =
    choroplethQuery.data?.features?.map((f) => f.properties) ?? [];

  const sorted = [...barangays].sort((a, b) =>
    b.malnutrition_count !== a.malnutrition_count
      ? b.malnutrition_count - a.malnutrition_count
      : b.prevalence_rate - a.prevalence_rate
  );

  const activeName = selectedBrgy ?? sorted[0]?.name ?? null;
  const activeIdx  = sorted.findIndex((b) => b.name === activeName);
  const active     = sorted[activeIdx] ?? null;

  // Pre-fill budget form from fetched data
  useEffect(() => {
    if (budgetQuery.data) {
      setBudgetForm({
        amount:      budgetQuery.data.amount.toString(),
        fiscal_year: budgetQuery.data.fiscal_year,
        label:       budgetQuery.data.label  ?? "",
        notes:       budgetQuery.data.notes  ?? "",
      });
    }
  }, [budgetQuery.data]);

  // ── Auto-generate analysis once barangay data is ready ───────────────────

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res = await api.get("/api/decisions/ai-analysis");
      setAnalysis(res.data as Analysis);
    } catch {
      setAnalysisError("Failed to generate analysis. Please check the backend.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Trigger automatically once data is loaded (and once only per session)
  const hasAutoRun = useState(false);
  useEffect(() => {
    if (!choroplethQuery.isLoading && barangays.length > 0 && !analysis && !analysisLoading && !hasAutoRun[0]) {
      hasAutoRun[1](true);
      runAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choroplethQuery.isLoading, barangays.length]);

  // ── Budget save ───────────────────────────────────────────────────────────

  const saveBudget = async () => {
    try {
      const payload = {
        amount:      parseFloat(budgetForm.amount),
        fiscal_year: budgetForm.fiscal_year,
        label:       budgetForm.label  || null,
        notes:       budgetForm.notes  || null,
      };
      if (budgetQuery.data?.id) {
        await api.put(`/api/decisions/budget/${budgetQuery.data.id}`, payload);
      } else {
        await api.post("/api/decisions/budget", payload);
      }
      queryClient.invalidateQueries({ queryKey: ["project-budget"] });
      setBudgetSaved(true);
      setShowBudgetForm(false);
      setTimeout(() => setBudgetSaved(false), 3000);
      // Re-run analysis with new budget
      runAnalysis();
    } catch {
      alert("Failed to save budget. Please try again.");
    }
  };

  // ── KPIs ─────────────────────────────────────────────────────────────────

  const criticalCount    = sorted.filter((b) => b.risk_level === "critical" || b.severe_count > 0).length;
  const priorityCount    = sorted.filter((b) => b.malnutrition_count > 0).length;
  const totalMalnourished = sorted.reduce((s, b) => s + b.malnutrition_count, 0);
  const budget           = budgetQuery.data;

  const getTimeline = (b: BarangaySeverity) =>
    b.risk_level === "critical" || b.severe_count > 0
      ? "12–18 months"
      : b.malnutrition_count > 1
      ? "6–12 months"
      : "3–6 months";

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="admin-container space-y-6">

      {/* ── Page Header ── */}
      <div className="admin-page-header flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold">Decision Support</h2>
          <p className="text-sm mt-0.5">
            Real-time nutrition analysis · Cabadbaran City Health Office
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LivePulse active={!choroplethQuery.isLoading} />
          <span className="text-xs text-slate-400">
            {choroplethQuery.isLoading ? "Loading data..." : `Live · ${sorted.length} barangays`}
          </span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold text-slate-500">Critical Barangays</p>
          <p className="mt-1 text-3xl font-extrabold text-red-600">{criticalCount}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-semibold text-slate-500">Priority Areas</p>
          <p className="mt-1 text-3xl font-extrabold text-orange-600">{priorityCount}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-slate-500">Total Malnourished</p>
          <p className="mt-1 text-3xl font-extrabold text-amber-600">{totalMalnourished}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            {budget ? "Budget Allocated" : "Budget"}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-blue-600">
            {budget ? `₱${(budget.amount / 1000).toFixed(0)}K` : "Not Set"}
          </p>
          {budget && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              {budget.fiscal_year}{budget.label ? ` · ${budget.label}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* ── Budget Management (superadmin only) ── */}
      {isSuperAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Project Budget</h3>
              <p className="text-xs text-slate-400">Set the total nutrition project budget</p>
            </div>
            <div className="flex items-center gap-2">
              {budgetSaved && <span className="text-xs font-semibold text-green-600">Saved!</span>}
              <button
                onClick={() => setShowBudgetForm((v) => !v)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                {showBudgetForm ? "Cancel" : budget ? "Edit Budget" : "Set Budget"}
              </button>
            </div>
          </div>

          {/* Current budget display */}
          {!showBudgetForm && budget && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Amount",      value: `₱${budget.amount.toLocaleString()}` },
                { label: "Fiscal Year", value: budget.fiscal_year },
                { label: "Label",       value: budget.label ?? "—" },
                { label: "Notes",       value: budget.notes ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{label}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Budget form */}
          {showBudgetForm && (
            <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-2">
              {[
                { key: "amount",      label: "Total Budget Amount (₱) *", placeholder: "e.g. 500000", type: "number" },
                { key: "fiscal_year", label: "Fiscal Year *",              placeholder: "e.g. 2025",   type: "text"   },
                { key: "label",       label: "Label",                      placeholder: "e.g. Annual Nutrition Budget", type: "text" },
                { key: "notes",       label: "Notes",                      placeholder: "Additional notes...",          type: "text" },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                  <input
                    type={type}
                    value={budgetForm[key as keyof typeof budgetForm]}
                    onChange={(e) => setBudgetForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              ))}
              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={saveBudget}
                  disabled={!budgetForm.amount || !budgetForm.fiscal_year}
                  className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-40 transition-colors"
                >
                  Save Budget
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Analysis Panel ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* Panel header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Nutrition Decision Analysis</h3>
            <p className="text-[10px] text-slate-400">
              {analysis
                ? `Generated ${analysis.generated_at} · Updates with real-time data`
                : analysisLoading
                ? "Analyzing nutrition data..."
                : "Waiting for data..."}
            </p>
          </div>
          {/* Refresh button */}
          <button
            onClick={runAnalysis}
            disabled={analysisLoading || choroplethQuery.isLoading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            {analysisLoading ? "Analyzing..." : "Refresh"}
          </button>
        </div>

        <div className="p-5">

          {/* Loading */}
          {analysisLoading && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-100 border-t-teal-500" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Analyzing real-time nutrition data...</p>
              <p className="text-xs text-slate-400">Processing barangay statistics, alerts, referrals and budget</p>
            </div>
          )}

          {/* Error */}
          {analysisError && !analysisLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {analysisError}
            </div>
          )}

          {/* Results */}
          {analysis && !analysisLoading && (
            <div className="admin-container space-y-6">

              {/* Fallback note */}
              {analysis.error_note && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
                  {analysis.error_note}
                </div>
              )}

              {/* Executive Summary */}
              <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">Executive Summary</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  <TypedText text={analysis.executive_summary} speed={8} />
                </p>
              </div>

              {/* Key Findings */}
              {analysis.key_findings && analysis.key_findings.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Key Findings</p>
                  <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                    {analysis.key_findings.map((f, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <span className="text-xs font-bold text-teal-600 mr-1">{i + 1}.</span>
                        <span className="text-xs text-slate-700">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority + Interventions */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">

                {/* Priority Barangays */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Priority Ranking</p>
                  <div className="space-y-2">
                    {analysis.priority_barangays.map((b) => (
                      <div key={b.name} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">
                              {b.rank}
                            </span>
                            <span className="text-sm font-bold text-slate-800">{b.name}</span>
                          </div>
                          <RiskBadge level={b.risk_level} />
                        </div>
                        <p className="text-xs text-slate-500 ml-7">{b.malnourished} cases · {b.wasting_rate}% wasting</p>
                        <p className="text-xs text-slate-400 mt-1 ml-7 italic">{b.justification}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Interventions */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recommended Interventions</p>
                  <div className="space-y-2">
                    {analysis.recommended_interventions.map((item) => (
                      <div key={item.barangay} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-slate-800">{item.barangay}</span>
                          <RiskBadge level={item.risk} />
                        </div>
                        <ul className="space-y-1">
                          {item.actions.map((a, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budget Allocation Table */}
              {analysis.budget_allocation.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Budget Allocation{budget ? ` — Total: ₱${budget.amount.toLocaleString()}` : " (Suggested)"}
                  </p>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Barangay</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Cases</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Allocated</th>
                          {budget && (
                            <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">% of Budget</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analysis.budget_allocation.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-slate-800">{row.barangay}</td>
                            <td className="px-4 py-2.5 text-slate-600">{row.cases}</td>
                            <td className="px-4 py-2.5 font-bold text-teal-700">₱{row.allocated.toLocaleString()}</td>
                            {budget && (
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                                    <div
                                      className="h-1.5 rounded-full bg-teal-500"
                                      style={{ width: `${Math.min(100, (row.allocated / budget.amount) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-slate-500 text-[10px] w-10 text-right">
                                    {((row.allocated / budget.amount) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Timeline + High Risk */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Intervention Timeline</p>
                  <p className="text-sm text-slate-700">{analysis.timeline}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">High-Risk Children (SAM)</p>
                  <p className="text-3xl font-extrabold text-red-600">{analysis.high_risk_children_count}</p>
                  <p className="text-xs text-slate-500 mt-1">Children requiring immediate therapeutic intervention</p>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ── Barangay Priority List + Detail ── */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[360px_1fr]">

        {/* Left: Ranked list */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-bold text-slate-800">Barangay Rankings</h3>
          <p className="text-xs text-slate-400 mb-4">Sorted by case count and severity</p>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {sorted.map((b, idx) => {
              const sel = b.name === activeName;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBrgy(b.name)}
                  className={`rounded-lg border p-3 cursor-pointer transition-all ${
                    sel
                      ? "border-slate-800 bg-slate-50 shadow-sm ring-1 ring-slate-800/10"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">#{idx + 1} {b.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {b.malnutrition_count} cases · {b.prevalence_rate}% prevalence
                      </p>
                    </div>
                    <RiskBadge level={b.risk_level} />
                  </div>
                </div>
              );
            })}
            {sorted.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No data available</p>
            )}
          </div>
        </div>

        {/* Right: Barangay detail */}
        {active ? (
          <div className="admin-container space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="admin-page-header flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-extrabold text-slate-900">{active.name}</h2>
                    <RiskBadge level={active.risk_level} />
                  </div>
                  <p className="text-sm text-slate-400 mt-1">Priority #{activeIdx + 1} · Intervention recommended</p>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mt-5">
                {[
                  { label: "Total Cases",    value: active.malnutrition_count, color: "text-slate-800" },
                  { label: "Prevalence",     value: `${active.prevalence_rate}%`, color: "text-slate-800" },
                  { label: "SAM Cases",      value: active.severe_count,  color: "text-red-600" },
                  { label: "Timeline",       value: getTimeline(active),  color: "text-slate-800" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className={`mt-1.5 text-xl font-extrabold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action timeline cards */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-bold text-slate-800 mb-3">Immediate Actions</h4>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                  {active.malnutrition_count > 0 && <li>Review nutrition status within 2 weeks</li>}
                  <li>Update malnutrition case registry</li>
                  {active.severe_count > 0 && (
                    <li className="font-semibold text-red-700">Refer critical SAM cases to City Health Office</li>
                  )}
                </ul>
              </div>
              <div className="rounded-xl border border-orange-200 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-bold text-slate-800 mb-3">Short-Term (1–6 months)</h4>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                  <li>Regular growth monitoring (monthly)</li>
                  {active.malnutrition_count > 0 && <li>Nutrition counseling for parents</li>}
                  {active.malnutrition_count > 1 && <li>Supplementary feeding sessions</li>}
                </ul>
              </div>
              <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-bold text-slate-800 mb-3">Long-Term (6+ months)</h4>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                  <li>Maintain preventive nutrition programs</li>
                  <li>Quarterly progress reviews</li>
                  <li>Strengthen barangay health capacity</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-slate-400">Loading data...</p>
          </div>
        )}

      </div>
    </div>
  );
}
