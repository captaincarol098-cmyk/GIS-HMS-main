"use client";

import { Brain, AlertTriangle, TrendingUp, MapPin, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

interface AtRiskChild {
  child_id: string;
  name: string;
  age_months: number;
  purok_name: string;
  risk_score: number;
  risk_level: string;
  risk_factors: string[];
  status: string;
  waz: number;
  haz: number;
  whz: number;
  last_measured: string;
}

interface Recommendation {
  priority: string;
  category: string;
  title: string;
  description: string;
  action: string;
  affected_children?: number;
  affected_purok?: string;
}

interface AIInsightsData {
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

export function AIInsightsWidget({ data, isLoading }: { data?: AIInsightsData; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Insights & Predictive Forecast Interpretation
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-xs text-slate-400 font-semibold">Generating insights...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.has_insights) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Insights & Predictive Forecast Interpretation
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-semibold">{data?.message || "No insights available"}</p>
          </div>
        </div>
      </div>
    );
  }

  const priorityConfig = {
    urgent: { 
      bg: "bg-red-50 border-red-200", 
      text: "text-red-900", 
      badge: "bg-red-600 text-white", 
      icon: "🚨",
      label: "URGENT"
    },
    high: { 
      bg: "bg-orange-50 border-orange-200", 
      text: "text-orange-900", 
      badge: "bg-orange-600 text-white", 
      icon: "⚠️",
      label: "HIGH PRIORITY"
    },
    medium: { 
      bg: "bg-yellow-50 border-yellow-200", 
      text: "text-yellow-900", 
      badge: "bg-yellow-600 text-white", 
      icon: "📋",
      label: "MEDIUM"
    },
  };

  // Group recommendations by priority
  const urgentRecs = data.recommendations.filter(r => r.priority === "urgent");
  const highRecs = data.recommendations.filter(r => r.priority === "high");
  const mediumRecs = data.recommendations.filter(r => r.priority === "medium");

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-purple-100 pb-3 mb-4">
        <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          AI Insights & Predictive Forecast Interpretation
        </h2>
        <div className="flex items-center gap-2">
          <span className="bg-purple-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase">
            AI-Powered
          </span>
          {data.high_risk_count > 0 && (
            <span className="bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {data.high_risk_count} High Risk
            </span>
          )}
        </div>
      </div>

      {/* At-Risk Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white/80 border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wide mb-1">At Risk</p>
          <p className="text-xl font-black text-slate-900">{data.at_risk_count}</p>
        </div>
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-center">
          <p className="text-[10px] text-red-700 font-bold uppercase tracking-wide mb-1">High Risk</p>
          <p className="text-xl font-black text-red-900">{data.high_risk_count}</p>
        </div>
        <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 text-center">
          <p className="text-[10px] text-orange-700 font-bold uppercase tracking-wide mb-1">Moderate</p>
          <p className="text-xl font-black text-orange-900">{data.moderate_risk_count}</p>
        </div>
      </div>

      {/* Recommendations by Priority */}
      <div className="space-y-3 mb-4">
        {/* Urgent Recommendations */}
        {urgentRecs.length > 0 && (
          <div>
            <h3 className="text-xs font-black text-red-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              🚨 URGENT ACTION REQUIRED ({urgentRecs.length})
            </h3>
            <div className="space-y-2">
              {urgentRecs.map((rec, idx) => (
                <RecommendationCard key={idx} rec={rec} config={priorityConfig.urgent} />
              ))}
            </div>
          </div>
        )}

        {/* High Priority Recommendations */}
        {highRecs.length > 0 && (
          <div>
            <h3 className="text-xs font-black text-orange-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              ⚠️ HIGH PRIORITY ({highRecs.length})
            </h3>
            <div className="space-y-2">
              {highRecs.map((rec, idx) => (
                <RecommendationCard key={idx} rec={rec} config={priorityConfig.high} />
              ))}
            </div>
          </div>
        )}

        {/* Medium Priority Recommendations */}
        {mediumRecs.length > 0 && mediumRecs.length <= 2 && (
          <div>
            <h3 className="text-xs font-black text-yellow-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              📋 MEDIUM PRIORITY ({mediumRecs.length})
            </h3>
            <div className="space-y-2">
              {mediumRecs.map((rec, idx) => (
                <RecommendationCard key={idx} rec={rec} config={priorityConfig.medium} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* At-Risk Children Link */}
      {data.at_risk_children.length > 0 && (
        <div className="bg-white border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-purple-600" />
              Top At-Risk Children
            </h3>
            <Link 
              href="/children" 
              className="text-xs font-bold text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {data.at_risk_children.slice(0, 3).map((child) => (
              <div key={child.child_id} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{child.name}</p>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {child.age_months} months • {child.purok_name}
                    </p>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                    child.risk_level === "high" ? "bg-red-600 text-white" : "bg-orange-500 text-white"
                  }`}>
                    {child.risk_score}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {child.risk_factors.slice(0, 3).map((factor, i) => (
                    <span key={i} className="bg-red-100 text-red-800 font-semibold px-1.5 py-0.5 rounded">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-purple-200 text-center">
        <p className="text-[10px] text-slate-500 font-medium">
          Insights generated on {new Date(data.generated_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

function RecommendationCard({ rec, config }: { rec: Recommendation; config: any }) {
  return (
    <div className={`border ${config.bg} rounded-xl p-3.5`}>
      <div className="flex items-start gap-2.5">
        <span className="text-lg flex-shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className={`text-sm font-bold ${config.text} leading-tight`}>{rec.title}</h4>
            <span className={`${config.badge} text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex-shrink-0`}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-slate-700 font-medium mb-2 leading-relaxed">{rec.description}</p>
          <div className="bg-white/60 border border-slate-200 rounded-lg p-2 text-xs">
            <p className="font-semibold text-slate-800 mb-1">
              <span className="text-slate-600 font-medium">Action: </span>
              {rec.action}
            </p>
            {rec.affected_children && (
              <p className="text-[11px] text-slate-600 font-medium">
                Affects {rec.affected_children} children
              </p>
            )}
            {rec.affected_purok && (
              <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Target: {rec.affected_purok}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
