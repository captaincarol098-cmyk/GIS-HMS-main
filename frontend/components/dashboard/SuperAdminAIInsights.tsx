"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import {
  Zap, AlertTriangle, TrendingUp, Users, Target, CheckCircle,
  AlertCircle, Loader2, RefreshCw, Sparkles, Brain, BarChart3, ListChecks
} from "lucide-react";

interface CityAIInsight {
  city_summary: {
    total_children: number;
    total_at_risk: number;
    critical_cases: number;
    high_risk_cases: number;
    city_malnutrition_rate: number;
    city_wasting_rate: number;
    city_stunting_rate: number;
    city_underweight_rate: number;
    overall_risk_level: string;
    overall_risk_score: number;
  };
  barangay_rankings: Array<{
    barangay_name: string;
    risk_level: string;
    malnutrition_rate: number;
    critical_cases: number;
    at_risk_children: number;
  }>;
  critical_barangays: Array<{
    barangay_name: string;
    risk_level: string;
    cases_needing_action: number;
    priority_level: string;
  }>;
  recommended_city_interventions: Array<{
    type: string;
    priority?: string;
    title: string;
    description: string;
    target_barangays?: string[];
    expected_impact?: string;
  }>;
  ai_interpretation?: {
    city_trend_analysis: string;
    forecast_outlook: string;
    critical_city_alerts: string[];
    positive_indicators: string[];
    strategic_recommendations: string;
  };
}

export default function SuperAdminAIInsights({ 
  data, 
  isLoading 
}: { 
  data?: CityAIInsight; 
  isLoading?: boolean;
}) {
  const [insights, setInsights] = useState<CityAIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // If data is provided via props, use it
  useEffect(() => {
    if (data) {
      console.log("✅ [SuperAdminAIInsights] Received data via props:", data);
      setInsights(data);
      setLoading(false);
      setError(null);
      setLastUpdated(new Date());
    }
  }, [data]);

  // Set loading state from props if provided
  useEffect(() => {
    if (isLoading !== undefined) {
      setLoading(isLoading && !insights);
    }
  }, [isLoading, insights]);

  const fetchInsights = async () => {
    try {
      setRefreshing(true);
      console.log("🔍 [SuperAdminAIInsights] Fetching AI insights from: /api/dashboard/superadmin/ai-insights");
      const response = await api.get("/api/dashboard/superadmin/ai-insights");
      console.log("✅ [SuperAdminAIInsights] Response received:", response);
      console.log("✅ [SuperAdminAIInsights] Response status:", response.status);
      console.log("✅ [SuperAdminAIInsights] Response data:", response.data);
      
      if (response.data && response.status === 200) {
        console.log("✅ [SuperAdminAIInsights] Setting insights data");
        setInsights(response.data);
        setLastUpdated(new Date());
        setError(null);
        setLoading(false);
      } else {
        console.warn("⚠️ [SuperAdminAIInsights] Response data is empty or invalid status");
        setError("No data received from server.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("❌ [SuperAdminAIInsights] Failed to load:", err);
      console.error("❌ [SuperAdminAIInsights] Error status:", err.response?.status);
      console.error("❌ [SuperAdminAIInsights] Error data:", err.response?.data);
      console.error("❌ [SuperAdminAIInsights] Error message:", err.message);
      console.error("❌ [SuperAdminAIInsights] Full error object:", JSON.stringify(err, null, 2));
      
      // More detailed error message
      let errorMessage = "Could not load AI insights. Please try again.";
      if (err.response?.status === 403) {
        errorMessage = "Access denied. You must be logged in as super_admin.";
      } else if (err.response?.status === 401) {
        errorMessage = "Unauthorized. Please log in again.";
      } else if (err.response?.status === 404) {
        errorMessage = "Endpoint not found. Backend may not be running.";
      } else if (err.code === "ERR_NETWORK" || err.message?.includes("Network Error")) {
        errorMessage = "Network error. Cannot connect to backend server.";
      }
      
      setError(errorMessage);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Only fetch if data is not provided via props
    if (data === undefined) {
      fetchInsights();
      // Refresh every 10 seconds only if not using props
      const interval = setInterval(fetchInsights, 10 * 1000);
      return () => clearInterval(interval);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600 mr-3" />
        <span className="text-slate-600">Loading city-wide AI analysis...</span>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-semibold mb-2">{error || "No data available for AI analysis"}</p>
          <button
            onClick={fetchInsights}
            className="mt-3 inline-flex items-center gap-2 bg-teal-600 text-white hover:bg-teal-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <details className="mt-4 text-left bg-slate-50 rounded-lg p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900">
              Troubleshooting Steps
            </summary>
            <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-slate-600">
              <li>Check browser console (F12) for detailed error logs</li>
              <li>Verify backend server is running on http://localhost:8000</li>
              <li>Ensure you're logged in as <strong>super_admin</strong></li>
              <li>Check Network tab in DevTools for API response details</li>
              <li>Try refreshing the page or logging out and back in</li>
            </ul>
          </details>
        </div>
      </div>
    );
  }

  const summary = insights.city_summary;
  const riskColors: any = {
    low: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", badge: "bg-green-100 text-green-800" },
    medium: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-800" },
    high: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-800" },
    critical: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-800" }
  };

  const getRiskColor = (level: string) => riskColors[level] || riskColors.low;

  return (
    <div className="space-y-6">
      {/* Header with Real-time Indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-teal-600" />
          <h2 className="text-2xl font-bold text-slate-900">🤖 City-Wide AI Strategic Analysis</h2>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
            <span className="text-xs font-semibold text-green-600">Live</span>
            {lastUpdated && (
              <span className="text-xs text-slate-500 ml-2">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={fetchInsights}
          disabled={refreshing}
          className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-600 hover:bg-teal-100 disabled:opacity-50 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Updating..." : "Refresh"}
        </button>
      </div>

      {/* CITY-WIDE DECISION SUPPORT SUMMARY */}
      {insights && (
        <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 rounded-2xl border-2 border-teal-500 overflow-hidden shadow-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-green-600 px-6 py-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">⚡ City-Wide Strategic Decision Hub</h3>
              <p className="text-xs text-green-100 mt-0.5">City-level insights · Barangay priorities · Strategic allocations</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 bg-gradient-to-br from-green-900/60 to-teal-900/60">
            {/* Strategic Priorities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Critical Barangays */}
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-400/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <h4 className="font-bold text-white text-sm">Critical Barangays</h4>
                </div>
                <div className="space-y-2">
                  {insights.critical_barangays && insights.critical_barangays.length > 0 ? (
                    insights.critical_barangays.slice(0, 3).map((brgy, idx) => (
                      <div key={idx} className="text-xs text-red-100">
                        <p className="font-semibold">{idx + 1}. {brgy.barangay_name}</p>
                        <p className="text-[10px] text-red-200">{brgy.cases_needing_action} cases needing action</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-green-100">
                      <p className="font-semibold">✓ No Critical Barangays</p>
                      <p className="text-[10px] text-green-200">City performing well</p>
                    </div>
                  )}
                </div>
              </div>

              {/* City Health Status */}
              <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-5 w-5 text-yellow-400" />
                  <h4 className="font-bold text-white text-sm">City Health Index</h4>
                </div>
                <div className="text-xs text-yellow-100 space-y-1.5">
                  <div>
                    <p className="font-semibold">Overall Risk: {summary.overall_risk_level.toUpperCase()}</p>
                    <p className="text-[10px] text-yellow-200">Score: {summary.overall_risk_score}/100</p>
                  </div>
                  <div className="border-t border-yellow-400/30 pt-1.5">
                    <p className="font-semibold">At-Risk Children: {summary.total_at_risk}</p>
                    <p className="text-[10px] text-yellow-200">Out of {summary.total_children} monitored</p>
                  </div>
                </div>
              </div>

              {/* Program Status */}
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="h-5 w-5 text-blue-400" />
                  <h4 className="font-bold text-white text-sm">City Coverage</h4>
                </div>
                <div className="text-xs text-blue-100 space-y-1">
                  <div className="flex justify-between items-center">
                    <span>Total Children Monitored</span>
                    <span className="font-bold text-blue-300">{summary.total_children}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-blue-400/30">
                    <span>High-Risk Cases</span>
                    <span className="font-bold text-blue-300">{summary.high_risk_cases}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span>Critical (SAM)</span>
                    <span className="font-bold text-blue-300">{summary.critical_cases}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Alert */}
            {summary.critical_cases > 0 && (
              <div className="bg-red-950/50 border border-red-700/50 rounded-lg p-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-red-300">Critical Alert: {summary.critical_cases} SAM Cases City-Wide</p>
                  <p className="text-xs text-red-200 mt-1">
                    Immediate coordinated referrals to health facilities required. Activate city-wide emergency response protocol.
                  </p>
                </div>
              </div>
            )}

            {/* Strategic Recommendations */}
            {insights.recommended_city_interventions && insights.recommended_city_interventions.length > 0 && (
              <div className="bg-teal-950/50 border border-teal-700/50 rounded-lg p-3">
                <p className="text-sm font-bold text-teal-300 mb-2">📋 {insights.recommended_city_interventions.length} Strategic Interventions</p>
                <div className="space-y-1.5">
                  {insights.recommended_city_interventions.slice(0, 3).map((rec, idx) => (
                    <div key={idx} className="text-xs text-teal-200 flex items-start gap-2">
                      <span className="font-bold text-teal-400 flex-shrink-0">{idx + 1}.</span>
                      <span className="line-clamp-1">{rec.title}</span>
                    </div>
                  ))}
                  {insights.recommended_city_interventions.length > 3 && (
                    <p className="text-xs text-teal-300 italic">+ {insights.recommended_city_interventions.length - 3} more recommendations</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* City-Wide Health Overview */}
      <div className={`rounded-xl border-2 p-6 ${getRiskColor(summary.overall_risk_level).bg} ${getRiskColor(summary.overall_risk_level).border}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className={`h-5 w-5 ${getRiskColor(summary.overall_risk_level).text}`} />
              <h3 className="font-bold text-lg text-slate-900">City-Wide Health Status</h3>
            </div>
            <div className={`p-4 rounded-lg ${getRiskColor(summary.overall_risk_level).bg} border ${getRiskColor(summary.overall_risk_level).border}`}>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-slate-900">
                  {summary.overall_risk_level.charAt(0).toUpperCase() + summary.overall_risk_level.slice(1)}
                </span>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(summary.overall_risk_level).badge}`}>
                  Risk Score: {summary.overall_risk_score}
                </span>
              </div>
              <p className="text-sm text-slate-600">Overall nutritional risk level across city</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              <h3 className="font-bold text-lg text-slate-900">City Prevalence Rates</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500 font-semibold">Wasting</p>
                <p className="text-2xl font-bold text-red-600">{summary.city_wasting_rate.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500 font-semibold">Stunting</p>
                <p className="text-2xl font-bold text-orange-600">{summary.city_stunting_rate.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500 font-semibold">Underweight</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.city_underweight_rate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-300">
          <div className="text-center">
            <Users className="h-5 w-5 text-slate-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{summary.total_children}</p>
            <p className="text-xs text-slate-600">Total Children</p>
          </div>
          <div className="text-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-700">{summary.total_at_risk}</p>
            <p className="text-xs text-slate-600">At-Risk</p>
          </div>
          <div className="text-center">
            <AlertCircle className="h-5 w-5 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-700">{summary.high_risk_cases}</p>
            <p className="text-xs text-slate-600">High-Risk</p>
          </div>
          <div className="text-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-700">{summary.critical_cases}</p>
            <p className="text-xs text-slate-600">Critical (SAM)</p>
          </div>
        </div>
      </div>

      {/* Top Concern Barangays */}
      {insights.barangay_rankings && insights.barangay_rankings.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-teal-600" />
            <h3 className="font-bold text-lg text-slate-900">📊 Top Concern Barangays (Risk Ranking)</h3>
          </div>

          <div className="space-y-3">
            {insights.barangay_rankings.slice(0, 5).map((brgy, idx) => (
              <div
                key={idx}
                className={`rounded-lg border-2 p-4 ${
                  brgy.risk_level === "critical"
                    ? "bg-red-50 border-red-200"
                    : brgy.risk_level === "high"
                    ? "bg-orange-50 border-orange-200"
                    : brgy.risk_level === "medium"
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900">#{idx + 1} {brgy.barangay_name}</h4>
                  <span className={`text-xs font-black uppercase px-2 py-1 rounded-full ${
                    brgy.risk_level === "critical"
                      ? "bg-red-200 text-red-800"
                      : brgy.risk_level === "high"
                      ? "bg-orange-200 text-orange-800"
                      : brgy.risk_level === "medium"
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-green-200 text-green-800"
                  }`}>
                    {brgy.risk_level}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">Malnutrition Rate</p>
                    <p className="text-lg font-bold text-slate-900">{brgy.malnutrition_rate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">Critical Cases</p>
                    <p className="text-lg font-bold text-red-700">{brgy.critical_cases}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">At-Risk Children</p>
                    <p className="text-lg font-bold text-yellow-700">{brgy.at_risk_children}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
