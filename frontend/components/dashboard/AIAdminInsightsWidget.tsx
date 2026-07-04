"use client";

import { Brain, AlertTriangle, Target, TrendingUp, MapPin, Clock } from "lucide-react";
import Link from "next/link";

interface AtRiskChild {
  child_id: string;
  name: string;
  age_months: number;
  purok_name: string;
  risk_score: number;
  risk_level: "high" | "moderate";
  risk_factors: string[];
  status: string;
  waz: number;
  haz: number;
  whz: number;
  last_measured: string;
}

interface Recommendation {
  priority: "urgent" | "high" | "medium";
  category: "intervention" | "program" | "hotspot" | "age-specific";
  title: string;
  description: string;
  action: string;
  affected_children?: number;
  affected_purok?: string;
}

interface AIAdminInsightsData {
  has_insights: boolean;
  message?: string;
  at_risk_children: AtRiskChild[];
  at_risk_count: number;
  high_risk_count: number;
  moderate_risk_count: number;
  recommendations: Recommendation[];
  recommendation_count: number;
  generated_at: string;
}

const priorityColors = {
  urgent: "bg-red-50 border-red-200 text-red-900",
  high: "bg-orange-50 border-orange-200 text-orange-900",
  medium: "bg-amber-50 border-amber-200 text-amber-900",
};

const riskLevelColors = {
  high: "bg-red-100 text-red-800",
  moderate: "bg-yellow-100 text-yellow-800",
};

const priorityBadgeColors = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
};

export function AIAdminInsightsWidget({
  data,
  isLoading,
}: {
  data?: AIAdminInsightsData;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded-lg w-1/3" />
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded-lg w-full" />
            <div className="h-4 bg-slate-200 rounded-lg w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.has_insights) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-slate-400" />
          <p className="text-sm text-slate-600">{data?.message || "No data available for analysis"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Header Card */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Brain className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">AI Insights & Predictive Forecast</h2>
              <p className="text-sm text-slate-600 mt-1">
                Evidence-based recommendations generated from your barangay's child health data
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Generated</p>
            <p className="text-xs font-mono text-slate-700 mt-0.5">{data.generated_at}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-emerald-200">
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">At-Risk Children</p>
            <p className="text-2xl font-black text-emerald-700">{data.at_risk_count}</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">High Risk</p>
            <p className="text-2xl font-black text-red-600">{data.high_risk_count}</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Recommendations</p>
            <p className="text-2xl font-black text-orange-600">{data.recommendation_count}</p>
          </div>
        </div>
      </div>

      {/* Recommendations Section */}
      {data.recommendation_count > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-600" />
            Actionable Recommendations
          </h3>

          <div className="space-y-3">
            {data.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`border rounded-xl p-4 ${priorityColors[rec.priority]}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${priorityBadgeColors[rec.priority]}`}>
                      {rec.priority.toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm mb-1">{rec.title}</h4>
                      <p className="text-sm leading-relaxed mb-2">{rec.description}</p>
                      <p className="text-xs font-semibold flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {rec.action}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At-Risk Children List */}
      {data.at_risk_count > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Top At-Risk Children
            </h3>
            <Link
              href="/children"
              className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
            >
              View All
            </Link>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.at_risk_children.slice(0, 8).map((child) => (
              <div key={child.child_id} className="bg-white border border-slate-200 rounded-lg p-3.5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900">{child.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{child.age_months} months old</span>
                      <MapPin className="h-3 w-3 ml-1.5" />
                      <span>{child.purok_name}</span>
                    </div>
                  </div>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${riskLevelColors[child.risk_level]}`}>
                    {child.risk_level === "high" ? "HIGH RISK" : "MODERATE"}
                  </span>
                </div>

                {/* Risk Factors */}
                <div className="mb-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Risk Factors:</p>
                  <div className="flex flex-wrap gap-1">
                    {child.risk_factors.map((factor) => (
                      <span key={factor} className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Z-Scores */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-[10px] font-bold text-slate-600 uppercase">WAZ</p>
                    <p className="text-sm font-black text-slate-900">{child.waz.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-[10px] font-bold text-slate-600 uppercase">HAZ</p>
                    <p className="text-sm font-black text-slate-900">{child.haz.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-[10px] font-bold text-slate-600 uppercase">WHZ</p>
                    <p className="text-sm font-black text-slate-900">{child.whz.toFixed(2)}</p>
                  </div>
                </div>

                {/* Risk Score Bar */}
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-slate-600">Risk Score</p>
                    <p className="text-xs font-black text-slate-900">{child.risk_score}/100</p>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        child.risk_score >= 70
                          ? "bg-red-600"
                          : child.risk_score >= 50
                          ? "bg-orange-500"
                          : "bg-yellow-500"
                      }`}
                      style={{ width: `${Math.min(child.risk_score, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Brain className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold">AI Analysis powered by RAG (Retrieval-Augmented Generation)</span>
        </div>
        <Link
          href="/children"
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          View All Children →
        </Link>
      </div>
    </div>
  );
}
