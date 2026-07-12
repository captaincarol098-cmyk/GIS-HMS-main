"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import {
  Zap, AlertTriangle, TrendingUp, Users, Target, Clock, CheckCircle,
  AlertCircle, Loader2, ChevronDown, ChevronUp, Activity, RefreshCw, Sparkles,
  BarChart3, Eye, ShieldAlert, ThumbsUp, ListChecks, Brain
} from "lucide-react";

interface AIInsight {
  barangay_summary: {
    wasting_rate: number;
    stunting_rate: number;
    underweight_rate: number;
    risk_level: string;
    risk_score: number;
    total_children_monitored: number;
    total_at_risk: number;
    critical_cases: number;
    high_risk_cases: number;
  };
  at_risk_children: Array<{
    child_id: string;
    child_name: string;
    age_months: number;
    sex: string;
    current_status: string;
    waz: number;
    haz: number;
    whz: number;
    weight: number;
    height: number;
    risk_score: number;
    risk_level: string;
    risk_color: string;
    risk_factors: string[];
    last_measurement: string;
  }>;
  critical_cases: Array<{
    child_id: string;
    child_name: string;
    age_months: number;
    sex: string;
    current_status: string;
    risk_score: number;
    risk_level: string;
    risk_factors: string[];
    last_measurement: string;
  }>;
  recommended_interventions: Array<{
    type: string;
    priority?: string;
    title: string;
    description: string;
    action_items?: string[];
    expected_outcome?: string;
    child_id?: string;
    child_name?: string;
    current_status?: string;
    interventions?: Array<{
      type: string;
      action: string;
      rationale: string;
      timeline: string;
    }>;
  }>;
  next_steps: {
    immediate: string;
    weekly: string;
    monthly: string;
  };
  barangay_risk_level: string;
  ai_interpretation?: {
    trend_analysis: string;
    forecast_outlook: string;
    critical_alerts: string[];
    positive_indicators: string[];
    action_summary: string;
  };
}

interface Decision {
  id: string;
  timestamp: string;
  type: "critical_alert" | "intervention_triggered" | "trend_change" | "auto_created";
  title: string;
  description: string;
  metrics_source: string[];
  status: "active" | "reviewed" | "actioned";
}

export default function BarangayAIInsights() {
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [expandedIntervention, setExpandedIntervention] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const prevInsightsRef = useRef<AIInsight | null>(null);

  // Generate automatic decisions based on metrics changes
  const generateAutomaticDecisions = (newInsights: AIInsight, prevInsights: AIInsight | null) => {
    const newDecisions: Decision[] = [];
    const now = new Date();

    // Critical cases alert
    if (newInsights.barangay_summary.critical_cases > 0) {
      newDecisions.push({
        id: `critical-${now.getTime()}`,
        timestamp: now.toISOString(),
        type: "critical_alert",
        title: `🚨 ${newInsights.barangay_summary.critical_cases} Critical Case(s) Detected`,
        description: `Immediate action required: ${newInsights.barangay_summary.critical_cases} child(ren) with severe malnutrition (SAM) need urgent referral to health facility.`,
        metrics_source: ["critical_cases", "risk_score"],
        status: "active"
      });
    }

    // High wasting rate alert
    if (newInsights.barangay_summary.wasting_rate > 15) {
      newDecisions.push({
        id: `wasting-${now.getTime()}`,
        timestamp: now.toISOString(),
        type: "critical_alert",
        title: `⚠️ High Wasting Rate: ${newInsights.barangay_summary.wasting_rate.toFixed(1)}%`,
        description: "Wasting rate exceeds 15% threshold. Escalate supplementary feeding program and emergency nutrition support.",
        metrics_source: ["wasting_rate"],
        status: "active"
      });
    }

    // Stunting rate alert
    if (newInsights.barangay_summary.stunting_rate > 30) {
      newDecisions.push({
        id: `stunting-${now.getTime()}`,
        timestamp: now.toISOString(),
        type: "critical_alert",
        title: `⚠️ High Stunting Rate: ${newInsights.barangay_summary.stunting_rate.toFixed(1)}%`,
        description: "Stunting rate exceeds 30% threshold. Launch behavioral change communication and long-term nutrition interventions.",
        metrics_source: ["stunting_rate"],
        status: "active"
      });
    }

    // High at-risk children
    if (newInsights.barangay_summary.total_at_risk > 100) {
      newDecisions.push({
        id: `at-risk-${now.getTime()}`,
        timestamp: now.toISOString(),
        type: "intervention_triggered",
        title: `📊 High At-Risk Population: ${newInsights.barangay_summary.total_at_risk} Children`,
        description: "Over 100 children are at-risk. Recommend targeted interventions across barangay programs.",
        metrics_source: ["total_at_risk"],
        status: "active"
      });
    }

    // Trend change detection
    if (prevInsights) {
      const wastingChange = newInsights.barangay_summary.wasting_rate - prevInsights.barangay_summary.wasting_rate;
      if (Math.abs(wastingChange) > 2) {
        newDecisions.push({
          id: `trend-wasting-${now.getTime()}`,
          timestamp: now.toISOString(),
          type: "trend_change",
          title: `📈 Wasting Rate ${wastingChange > 0 ? "Increased" : "Decreased"}: ${wastingChange > 0 ? "+" : ""}${wastingChange.toFixed(1)}%`,
          description: `Significant wasting trend change detected. ${wastingChange > 0 ? "Strengthen interventions" : "Continue current program - showing improvement"}.`,
          metrics_source: ["wasting_rate"],
          status: "reviewed"
        });
      }

      const stunningChange = newInsights.barangay_summary.stunting_rate - prevInsights.barangay_summary.stunting_rate;
      if (Math.abs(stunningChange) > 2) {
        newDecisions.push({
          id: `trend-stunting-${now.getTime()}`,
          timestamp: now.toISOString(),
          type: "trend_change",
          title: `📈 Stunting Rate ${stunningChange > 0 ? "Increased" : "Decreased"}: ${stunningChange > 0 ? "+" : ""}${stunningChange.toFixed(1)}%`,
          description: `Stunting showing significant change. Monitor child growth velocity and feeding practices.`,
          metrics_source: ["stunting_rate"],
          status: "reviewed"
        });
      }
    }

    // Intervention recommendations as decisions
    newInsights.recommended_interventions.forEach((rec, idx) => {
      if (rec.priority === "critical") {
        newDecisions.push({
          id: `intervention-${idx}-${now.getTime()}`,
          timestamp: now.toISOString(),
          type: "intervention_triggered",
          title: rec.title,
          description: rec.description,
          metrics_source: [rec.type || "recommended_interventions"],
          status: "active"
        });
      }
    });

    return newDecisions;
  };

  const fetchInsights = async () => {
    try {
      setRefreshing(true);
      const response = await api.get("/api/dashboard/admin/ai-insights");
      if (response.data?.has_insights) {
        // Generate automatic decisions based on current vs previous insights
        const autoDecisions = generateAutomaticDecisions(response.data, prevInsightsRef.current);
        
        // Merge new decisions with existing (keep last 10)
        setDecisions(prev => [...autoDecisions, ...prev].slice(0, 10));
        
        setInsights(response.data);
        prevInsightsRef.current = response.data;
        setLastUpdated(new Date());
      }
      setError(null);
    } catch (err: any) {
      console.error("Failed to load AI insights:", err);
      setError("Could not load AI insights. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    // Real-time update: refresh every 10 seconds instead of 5 minutes
    const interval = setInterval(fetchInsights, 10 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600 mr-3" />
        <span className="text-slate-600">Loading AI insights...</span>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600">{error || "No data available for AI analysis"}</p>
        </div>
      </div>
    );
  }

  const summary = insights.barangay_summary;
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
          <h2 className="text-2xl font-bold text-slate-900">🤖 Decision Support & Recommendations</h2>
          <div className="flex items-center gap-1.5 ml-auto">
            <Activity className="h-4 w-4 text-green-600 animate-pulse" />
            <span className="text-xs font-semibold text-green-600">Active</span>
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

      {/* DECISION SUPPORT SUMMARY - NEW PROMINENT SECTION */}
      {insights && (
        <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 rounded-2xl border-2 border-teal-500 overflow-hidden shadow-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-green-600 px-6 py-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">⚡ Decision Support Hub</h3>
              <p className="text-xs text-green-100 mt-0.5">OPT Plus rule-based classification · Prevalence analysis · Recommendation engine</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 bg-gradient-to-br from-green-900/60 to-teal-900/60">
            {/* Action Priority Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Immediate Actions */}
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-400/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <h4 className="font-bold text-white text-sm">Immediate Actions</h4>
                </div>
                <div className="space-y-2">
                  {insights.barangay_summary.critical_cases > 0 && (
                    <div className="text-xs text-red-100">
                      <p className="font-semibold">🚨 {insights.barangay_summary.critical_cases} SAM Case(s)</p>
                      <p className="text-[10px] text-red-200">Refer to MNT within 24 hours</p>
                    </div>
                  )}
                  {insights.barangay_summary.wasting_rate > 15 && (
                    <div className="text-xs text-orange-100 border-t border-orange-400/30 pt-2">
                      <p className="font-semibold">Wasting: {insights.barangay_summary.wasting_rate.toFixed(1)}%</p>
                      <p className="text-[10px] text-orange-200">Emergency feeding program needed</p>
                    </div>
                  )}
                  {insights.barangay_summary.critical_cases === 0 && insights.barangay_summary.wasting_rate <= 15 && (
                    <div className="text-xs text-green-100">
                      <p className="font-semibold">✓ No Emergency Cases</p>
                      <p className="text-[10px] text-green-200">Continue monitoring</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Weekly Priorities */}
              <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-yellow-400" />
                  <h4 className="font-bold text-white text-sm">Weekly Focus</h4>
                </div>
                <div className="text-xs text-yellow-100 space-y-1.5">
                  <div>
                    <p className="font-semibold">Monitor {insights.barangay_summary.total_at_risk} At-Risk Children</p>
                    <p className="text-[10px] text-yellow-200">Weekly measurements & check-ins</p>
                  </div>
                  {insights.barangay_summary.stunting_rate > 20 && (
                    <div className="border-t border-yellow-400/30 pt-1.5">
                      <p className="font-semibold">Stunting: {insights.barangay_summary.stunting_rate.toFixed(1)}%</p>
                      <p className="text-[10px] text-yellow-200">BCC campaigns underway</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Program Status */}
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="h-5 w-5 text-blue-400" />
                  <h4 className="font-bold text-white text-sm">Program Status</h4>
                </div>
                <div className="text-xs text-blue-100 space-y-1">
                  <div className="flex justify-between items-center">
                    <span>Children Monitored</span>
                    <span className="font-bold text-blue-300">{insights.barangay_summary.total_children_monitored}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-blue-400/30">
                    <span>Risk Level</span>
                    <span className="font-bold text-blue-300 uppercase">{insights.barangay_summary.risk_level}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span>Risk Score</span>
                    <span className="font-bold text-blue-300">{insights.barangay_summary.risk_score}/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Decision Buttons */}
            {insights.critical_cases && insights.critical_cases.length > 0 && (
              <div className="bg-red-950/50 border border-red-700/50 rounded-lg p-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-red-300">Critical Decision: SAM Cases Detected</p>
                  <p className="text-xs text-red-200 mt-1">
                    {insights.critical_cases.length} child(ren) have severe acute malnutrition and require immediate referral to health facility for Medical Nutrition Therapy (MNT).
                  </p>
                </div>
              </div>
            )}

            {/* Recommendation Priority */}
            {insights.recommended_interventions && insights.recommended_interventions.length > 0 && (
              <div className="bg-teal-950/50 border border-teal-700/50 rounded-lg p-3">
                <p className="text-sm font-bold text-teal-300 mb-2">📋 {insights.recommended_interventions.length} Recommended Interventions</p>
                <div className="space-y-1.5">
                  {insights.recommended_interventions.slice(0, 3).map((rec, idx) => (
                    <div key={idx} className="text-xs text-teal-200 flex items-start gap-2">
                      <span className="font-bold text-teal-400 flex-shrink-0">{idx + 1}.</span>
                      <span className="line-clamp-1">{rec.title || rec.type}</span>
                    </div>
                  ))}
                  {insights.recommended_interventions.length > 3 && (
                    <p className="text-xs text-teal-300 italic">+ {insights.recommended_interventions.length - 3} more recommendations below</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Automatic Decisions Panel */}
      {decisions.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-lg text-blue-900">⚡ System-Generated Recommendations & Alerts</h3>
            <span className="ml-auto inline-block px-2.5 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
              {decisions.filter(d => d.status === "active").length} Active
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {decisions.map((decision) => (
              <div
                key={decision.id}
                className={`rounded-lg border p-3 transition-all ${
                  decision.status === "active"
                    ? decision.type === "critical_alert"
                      ? "bg-red-50 border-red-200 shadow-sm"
                      : decision.type === "intervention_triggered"
                      ? "bg-orange-50 border-orange-200 shadow-sm"
                      : "bg-blue-50 border-blue-200"
                    : "bg-slate-50 border-slate-200 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {decision.type === "critical_alert" && (
                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      {decision.type === "intervention_triggered" && (
                        <Target className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      )}
                      {decision.type === "trend_change" && (
                        <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      )}
                      <p className="text-sm font-bold text-slate-900">{decision.title}</p>
                    </div>
                    <p className="text-xs text-slate-700 ml-6">{decision.description}</p>
                    <div className="flex items-center gap-2 mt-2 ml-6">
                      <span className="text-[10px] text-slate-500 font-semibold">Metrics:</span>
                      <div className="flex gap-1 flex-wrap">
                        {decision.metrics_source.map((m) => (
                          <span key={m} className="text-[9px] bg-white px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${
                    decision.status === "active"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {decision.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barangay Health Overview */}
      <div className={`rounded-xl border-2 p-6 ${getRiskColor(summary.risk_level).bg} ${getRiskColor(summary.risk_level).border}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className={`h-5 w-5 ${getRiskColor(summary.risk_level).text}`} />
              <h3 className="font-bold text-lg text-slate-900">Barangay Health Status</h3>
            </div>
            <div className={`p-4 rounded-lg ${getRiskColor(summary.risk_level).bg} border ${getRiskColor(summary.risk_level).border}`}>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-slate-900">
                  {summary.risk_level.charAt(0).toUpperCase() + summary.risk_level.slice(1)}
                </span>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(summary.risk_level).badge}`}>
                  Risk Score: {summary.risk_score}
                </span>
              </div>
              <p className="text-sm text-slate-600">Overall nutritional risk level in barangay</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              <h3 className="font-bold text-lg text-slate-900">Prevalence Rates</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500 font-semibold">Wasting</p>
                <p className="text-2xl font-bold text-red-600">{summary.wasting_rate.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500 font-semibold">Stunting</p>
                <p className="text-2xl font-bold text-orange-600">{summary.stunting_rate.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500 font-semibold">Underweight</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.underweight_rate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-300">
          <div className="text-center">
            <Users className="h-5 w-5 text-slate-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{summary.total_children_monitored}</p>
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

      {/* Critical Cases */}
      {insights.critical_cases && insights.critical_cases.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-700" />
            <h3 className="font-bold text-lg text-red-900">🚨 Critical Cases</h3>
          </div>
          <div className="space-y-3">
            {insights.critical_cases.map((child, idx) => (
              <div
                key={child.child_id}
                className="bg-white rounded-lg p-4 border border-red-200 cursor-pointer hover:shadow-md transition"
                onClick={() => setExpandedChild(expandedChild === child.child_id ? null : child.child_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{idx + 1}. {child.child_name}</p>
                    <p className="text-sm text-slate-600">Age: {child.age_months} months | Risk: {child.risk_score}</p>
                    <div className="flex gap-2 mt-2">
                      {child.risk_factors.map((factor, i) => (
                        <span key={i} className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                  {expandedChild === child.child_id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>

                {expandedChild === child.child_id && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                    <p className="text-sm"><span className="font-semibold">Status:</span> {child.current_status.replace(/_/g, " ").toUpperCase()}</p>
                    <p className="text-sm"><span className="font-semibold">Last Measured:</span> {new Date(child.last_measurement).toLocaleDateString()}</p>
                    <p className="text-sm text-red-700 font-semibold mt-3">⚠️ Immediate action: Refer to health facility for MNT</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {insights.recommended_interventions && insights.recommended_interventions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-teal-600" />
            <h3 className="font-bold text-lg text-slate-900">📋 Recommended Interventions</h3>
          </div>

          <div className="space-y-4">
            {insights.recommended_interventions.map((intervention, idx) => (
              <div
                key={idx}
                className={`rounded-lg border-2 p-4 cursor-pointer hover:shadow-md transition ${
                  intervention.priority === "critical"
                    ? "bg-red-50 border-red-200"
                    : intervention.priority === "high"
                    ? "bg-orange-50 border-orange-200"
                    : "bg-blue-50 border-blue-200"
                }`}
                onClick={() => setExpandedIntervention(expandedIntervention === idx ? null : idx)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {intervention.priority === "critical" ? (
                        <AlertTriangle className="h-4 w-4 text-red-700" />
                      ) : intervention.priority === "high" ? (
                        <AlertCircle className="h-4 w-4 text-orange-700" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-blue-700" />
                      )}
                      <h4 className="font-bold text-slate-900">{intervention.title}</h4>
                    </div>
                    <p className="text-sm text-slate-700">{intervention.description}</p>
                  </div>
                  {expandedIntervention === idx ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>

                {expandedIntervention === idx && (
                  <div className="mt-4 pt-4 border-t border-slate-300 space-y-3">
                    {intervention.action_items && (
                      <div>
                        <p className="text-sm font-semibold text-slate-900 mb-2">Action Items:</p>
                        <ul className="space-y-1 text-sm text-slate-700">
                          {intervention.action_items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-teal-600 font-bold">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {insights.next_steps && (
        <div className="bg-teal-50 rounded-xl border-2 border-teal-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-teal-700" />
            <h3 className="font-bold text-lg text-teal-900">⏱️ Timeline</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-teal-200">
              <p className="text-xs text-teal-600 font-bold uppercase mb-2">Today</p>
              <p className="text-sm text-slate-700">{insights.next_steps.immediate}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-teal-200">
              <p className="text-xs text-teal-600 font-bold uppercase mb-2">Weekly</p>
              <p className="text-sm text-slate-700">{insights.next_steps.weekly}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-teal-200">
              <p className="text-xs text-teal-600 font-bold uppercase mb-2">Monthly</p>
              <p className="text-sm text-slate-700">{insights.next_steps.monthly}</p>
            </div>
          </div>
        </div>
      )}

      {/* At-Risk Children Table */}
      {insights.at_risk_children && insights.at_risk_children.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-teal-600" />
            <h3 className="font-bold text-lg text-slate-900">👥 At-Risk Children (Top 10)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 px-3 font-bold text-slate-900">#</th>
                  <th className="text-left py-2 px-3 font-bold text-slate-900">Name</th>
                  <th className="text-center py-2 px-3 font-bold text-slate-900">Age</th>
                  <th className="text-center py-2 px-3 font-bold text-slate-900">WAZ</th>
                  <th className="text-center py-2 px-3 font-bold text-slate-900">HAZ</th>
                  <th className="text-center py-2 px-3 font-bold text-slate-900">WHZ</th>
                  <th className="text-center py-2 px-3 font-bold text-slate-900">Risk</th>
                </tr>
              </thead>
              <tbody>
                {insights.at_risk_children.map((child, idx) => (
                  <tr key={child.child_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold">{idx + 1}</td>
                    <td className="py-3 px-3 text-slate-900">{child.child_name}</td>
                    <td className="py-3 px-3 text-center">{child.age_months}m</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">{child.waz.toFixed(2)}</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">{child.haz.toFixed(2)}</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">{child.whz.toFixed(2)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${getRiskColor(child.risk_level).badge}`}>
                        {child.risk_level.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Interpretation - Forecast & Trends */}
      {insights.ai_interpretation && (
        <div className="rounded-2xl overflow-hidden border border-emerald-800 shadow-lg">
          {/* Section Header */}
          <div
            className="px-6 py-5 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)" }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-base text-white tracking-tight">Trend Analysis & Prevalence Insights</h3>
              <p className="text-xs text-emerald-200 mt-0.5">Rule-based classification · OPT Plus standards · Prevalence analysis</p>
            </div>
          </div>

          <div className="bg-white p-5 space-y-4">

            {/* Trend Analysis */}
            {insights.ai_interpretation.trend_analysis && (
              <div className="rounded-xl border border-purple-100 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 bg-purple-50 border-b border-purple-100">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-600">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-bold text-purple-900">Trend Analysis</h4>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-slate-700 leading-relaxed">{insights.ai_interpretation.trend_analysis}</p>
                </div>
              </div>
            )}

            {/* Forecast Outlook */}
            {insights.ai_interpretation.forecast_outlook && (
              <div className="rounded-xl border border-indigo-100 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-bold text-indigo-900">3-Month Forecast Outlook</h4>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-slate-700 leading-relaxed">{insights.ai_interpretation.forecast_outlook}</p>
                </div>
              </div>
            )}

            {/* Critical Alerts */}
            {insights.ai_interpretation.critical_alerts && insights.ai_interpretation.critical_alerts.length > 0 && (
              <div className="rounded-xl border border-red-200 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border-b border-red-200">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-600">
                    <ShieldAlert className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-bold text-red-900">Critical Alerts</h4>
                  <span className="ml-auto text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">
                    {insights.ai_interpretation.critical_alerts.length}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <ul className="space-y-2">
                    {insights.ai_interpretation.critical_alerts.map((alert: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-red-700">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-black mt-0.5">{idx + 1}</span>
                        <span className="leading-relaxed">{alert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Positive Indicators */}
            {insights.ai_interpretation.positive_indicators && insights.ai_interpretation.positive_indicators.length > 0 && (
              <div className="rounded-xl border border-green-200 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 bg-green-50 border-b border-green-200">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-green-600">
                    <ThumbsUp className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-bold text-green-900">Positive Indicators</h4>
                  <span className="ml-auto text-xs font-bold bg-green-600 text-white px-2 py-0.5 rounded-full">
                    {insights.ai_interpretation.positive_indicators.length}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <ul className="space-y-2">
                    {insights.ai_interpretation.positive_indicators.map((indicator: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-green-700">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{indicator}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Action Summary */}
            {insights.ai_interpretation.action_summary && (
              <div className="rounded-xl border border-blue-200 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border-b border-blue-200">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600">
                    <ListChecks className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-bold text-blue-900">Recommended Action Summary</h4>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-blue-800 font-medium leading-relaxed">{insights.ai_interpretation.action_summary}</p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs text-slate-600">
        <p>
          💡 <strong>About:</strong> Recommendations using OPT Plus rule-based classification and prevalence analysis. Decision support implements 6-step process based on nutritional status and malnutrition prevalence thresholds.
        </p>
      </div>
    </div>
  );
}
