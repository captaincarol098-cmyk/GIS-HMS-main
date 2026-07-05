"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { RefreshCw, AlertCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

interface OptAnalyticsData {
  year: number;
  summary: {
    total_children_measured: number;
    total_below_normal: number;
    below_normal_percentage: number;
    total_above_normal: number;
    above_normal_percentage: number;
    total_normal: number;
  };
  nutritional_status_breakdown: {
    wfa: {
      normal: { total: number; boys: number; girls: number; percentage: number };
      overweight: { total: number; boys: number; girls: number; percentage: number };
      underweight: { total: number; boys: number; girls: number; percentage: number };
      severely_underweight: { total: number; boys: number; girls: number; percentage: number };
    };
    hfa: {
      normal: { total: number; boys: number; girls: number; percentage: number };
      tall: { total: number; boys: number; girls: number; percentage: number };
      stunted: { total: number; boys: number; girls: number; percentage: number };
      severely_stunted: { total: number; boys: number; girls: number; percentage: number };
    };
    whz: {
      normal: { total: number; boys: number; girls: number; percentage: number };
      overweight: { total: number; boys: number; girls: number; percentage: number };
      obese: { total: number; boys: number; girls: number; percentage: number };
      moderately_wasted: { total: number; boys: number; girls: number; percentage: number };
      severely_wasted: { total: number; boys: number; girls: number; percentage: number };
    };
  };
  age_group_breakdown: {
    [key: string]: {
      total: number;
      wfa_affected: number;
      hfa_affected: number;
      whz_affected: number;
      percentage_affected: number;
    };
  };
  barangay_rankings: {
    underweight: Array<{ rank: number; barangay: string; coverage: number; prevalence: number; affected: number }>;
    stunting: Array<{ rank: number; barangay: string; coverage: number; prevalence: number; affected: number }>;
    wasting: Array<{ rank: number; barangay: string; coverage: number; prevalence: number; affected: number }>;
  };
}

// Helper function to get severity color and label
function getSeverityInfo(percentage: number): { color: string; bgColor: string; label: string; icon: string } {
  if (percentage >= 15) return { color: "#dc2626", bgColor: "bg-red-50", label: "Critical", icon: "🔴" };
  if (percentage >= 10) return { color: "#ea580c", bgColor: "bg-orange-50", label: "High", icon: "🟠" };
  if (percentage >= 5) return { color: "#eab308", bgColor: "bg-yellow-50", label: "Medium", icon: "🟡" };
  return { color: "#16a34a", bgColor: "bg-green-50", label: "Low", icon: "🟢" };
}

export function OptPlusAnalytics({ selectedYear }: { selectedYear: number }) {
  // Fetch analytics data
  const analyticsQuery = useQuery({
    queryKey: ["opt-plus-analytics", selectedYear],
    queryFn: async () => {
      const response = await api.get(
        `/api/operation-timbang/superadmin/opt-analytics?year=${selectedYear}`
      );
      return response.data as OptAnalyticsData;
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: 2,
  });

  const data = analyticsQuery.data;

  if (analyticsQuery.isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="inline-block animate-spin h-8 w-8 text-emerald-600 border-4 border-emerald-200 border-t-emerald-600 rounded-full mb-3"></div>
        <p className="text-slate-600 font-semibold">Loading analytics...</p>
      </div>
    );
  }

  if (analyticsQuery.isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-900 mb-2">Failed to Load Analytics</p>
            <p className="text-xs text-red-800">{(analyticsQuery.error as any)?.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || (data.summary.total_children_measured === 0 && Object.keys(data.barangay_rankings?.underweight || {}).length === 0)) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8">
        <p className="text-yellow-800 font-semibold mb-3">⚠️ No Data Available for {selectedYear}</p>
        <p className="text-yellow-700 text-sm mb-4">
          The analytics dashboard is looking for measurements with dates in {selectedYear}. 
        </p>
        <div className="bg-white border border-yellow-200 rounded p-4 text-left text-sm text-yellow-900">
          <p className="font-semibold mb-2">To populate this dashboard:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Import Operation Timbang records with measurement dates in {selectedYear}</li>
            <li>Or check if your data was imported with a different year</li>
            <li>Analytics auto-refreshes every 10 seconds once data is available</li>
          </ul>
        </div>
      </div>
    );
  }

  // Calculate affected percentages for each indicator
  const wfaAffected = data.nutritional_status_breakdown.wfa.underweight.percentage + 
                      data.nutritional_status_breakdown.wfa.severely_underweight.percentage +
                      data.nutritional_status_breakdown.wfa.overweight.percentage;
  
  const hfaAffected = data.nutritional_status_breakdown.hfa.stunted.percentage + 
                      data.nutritional_status_breakdown.hfa.severely_stunted.percentage;
  
  const whzAffected = data.nutritional_status_breakdown.whz.moderately_wasted.percentage + 
                      data.nutritional_status_breakdown.whz.severely_wasted.percentage +
                      data.nutritional_status_breakdown.whz.overweight.percentage +
                      data.nutritional_status_breakdown.whz.obese.percentage;

  const wfaSeverity = getSeverityInfo(wfaAffected);
  const hfaSeverity = getSeverityInfo(hfaAffected);
  const whzSeverity = getSeverityInfo(whzAffected);

  // Prepare chart data
  const statusChartData = [
    { name: "Normal", value: data.summary.total_normal, fill: "#10b981" },
    { name: "Below Normal", value: data.summary.total_below_normal, fill: "#ef4444" },
    { name: "Above Normal", value: data.summary.total_above_normal, fill: "#f59e0b" },
  ];

  const wfaChartData = [
    { name: "Normal", value: data.nutritional_status_breakdown.wfa.normal.total, fill: "#10b981" },
    { name: "Overweight", value: data.nutritional_status_breakdown.wfa.overweight.total, fill: "#f59e0b" },
    { name: "Underweight", value: data.nutritional_status_breakdown.wfa.underweight.total, fill: "#f97316" },
    { name: "Severely UW", value: data.nutritional_status_breakdown.wfa.severely_underweight.total, fill: "#dc2626" },
  ];

  const hfaChartData = [
    { name: "Normal", value: data.nutritional_status_breakdown.hfa.normal.total, fill: "#10b981" },
    { name: "Tall", value: data.nutritional_status_breakdown.hfa.tall.total, fill: "#3b82f6" },
    { name: "Stunted", value: data.nutritional_status_breakdown.hfa.stunted.total, fill: "#f97316" },
    { name: "Severely Stunted", value: data.nutritional_status_breakdown.hfa.severely_stunted.total, fill: "#dc2626" },
  ];

  const whzChartData = [
    { name: "Normal", value: data.nutritional_status_breakdown.whz.normal.total, fill: "#10b981" },
    { name: "Overweight", value: data.nutritional_status_breakdown.whz.overweight.total, fill: "#f59e0b" },
    { name: "Obese", value: data.nutritional_status_breakdown.whz.obese.total, fill: "#ea580c" },
    { name: "Wasted", value: data.nutritional_status_breakdown.whz.moderately_wasted.total, fill: "#f97316" },
    { name: "Severely Wasted", value: data.nutritional_status_breakdown.whz.severely_wasted.total, fill: "#dc2626" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          📊 Nutritional Status Analytics
        </h2>
        <button
          onClick={() => analyticsQuery.refetch()}
          disabled={analyticsQuery.isLoading}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${analyticsQuery.isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ===== SECTION 1: KEY METRICS CARDS (Top) ===== */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* WFA Card */}
        <div className={`${wfaSeverity.bgColor} border border-slate-200 rounded-lg p-5 transition-all hover:shadow-md`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Weight for Age (WFA)</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{wfaAffected.toFixed(1)}%</p>
              <p className="text-xs text-slate-600 mt-1">Children affected</p>
            </div>
            <div className="text-4xl">{wfaSeverity.icon}</div>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${Math.min(wfaAffected, 100)}%`, backgroundColor: wfaSeverity.color }}
              />
            </div>
            <span className="text-xs font-bold text-slate-600">{wfaSeverity.label}</span>
          </div>
        </div>

        {/* HFA Card */}
        <div className={`${hfaSeverity.bgColor} border border-slate-200 rounded-lg p-5 transition-all hover:shadow-md`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Height for Age (HFA)</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{hfaAffected.toFixed(1)}%</p>
              <p className="text-xs text-slate-600 mt-1">Children affected</p>
            </div>
            <div className="text-4xl">{hfaSeverity.icon}</div>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${Math.min(hfaAffected, 100)}%`, backgroundColor: hfaSeverity.color }}
              />
            </div>
            <span className="text-xs font-bold text-slate-600">{hfaSeverity.label}</span>
          </div>
        </div>

        {/* WHZ Card */}
        <div className={`${whzSeverity.bgColor} border border-slate-200 rounded-lg p-5 transition-all hover:shadow-md`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Weight for Length/Height (WHZ)</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{whzAffected.toFixed(1)}%</p>
              <p className="text-xs text-slate-600 mt-1">Children affected</p>
            </div>
            <div className="text-4xl">{whzSeverity.icon}</div>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${Math.min(whzAffected, 100)}%`, backgroundColor: whzSeverity.color }}
              />
            </div>
            <span className="text-xs font-bold text-slate-600">{whzSeverity.label}</span>
          </div>
        </div>
      </div>

      {/* ===== SECTION 2: VISUAL CHARTS (Middle) ===== */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Overall Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-extrabold text-slate-800 mb-4">Overall Status Distribution</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${v} children`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WFA Status Breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-extrabold text-slate-800 mb-4">⚖️ Weight for Age Breakdown</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wfaChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `${v} children`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {wfaChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* HFA Status Breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-extrabold text-slate-800 mb-4">📏 Height for Age Breakdown</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hfaChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `${v} children`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {hfaChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WHZ Status Breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-extrabold text-slate-800 mb-4">⚖️ Weight for Length/Height Breakdown</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={whzChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `${v} children`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {whzChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===== SECTION 3: DETAILED TABLES (Bottom) ===== */}

      {/* WFA Detail Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-4">
          <h3 className="font-bold">⚖️ Weight for Age (WFA) - Detailed Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-bold text-slate-900">Status</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Boys</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Girls</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Total</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: "normal", label: "Normal", color: "bg-green-50" },
                { key: "overweight", label: "Overweight", color: "bg-orange-50" },
                { key: "underweight", label: "Underweight", color: "bg-red-50" },
                { key: "severely_underweight", label: "Severely Underweight", color: "bg-red-100" },
              ].map((status) => {
                const statusData = data.nutritional_status_breakdown.wfa[status.key as keyof typeof data.nutritional_status_breakdown.wfa];
                return (
                  <tr key={status.key} className={`${status.color} border-b border-slate-200`}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{status.label}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{statusData.boys}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{statusData.girls}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{statusData.total}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{statusData.percentage.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* HFA Detail Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-4">
          <h3 className="font-bold">📏 Height for Age (HFA) - Detailed Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-bold text-slate-900">Status</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Boys</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Girls</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Total</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: "normal", label: "Normal", color: "bg-green-50" },
                { key: "tall", label: "Tall", color: "bg-blue-50" },
                { key: "stunted", label: "Stunted", color: "bg-orange-50" },
                { key: "severely_stunted", label: "Severely Stunted", color: "bg-red-50" },
              ].map((status) => {
                const statusData = data.nutritional_status_breakdown.hfa[status.key as keyof typeof data.nutritional_status_breakdown.hfa];
                return (
                  <tr key={status.key} className={`${status.color} border-b border-slate-200`}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{status.label}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{statusData.boys}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{statusData.girls}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{statusData.total}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{statusData.percentage.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* WHZ Detail Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-4">
          <h3 className="font-bold">⚖️ Weight for Length/Height (WHZ) - Detailed Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-bold text-slate-900">Status</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Boys</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Girls</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Total</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: "normal", label: "Normal", color: "bg-green-50" },
                { key: "overweight", label: "Overweight", color: "bg-yellow-50" },
                { key: "obese", label: "Obese", color: "bg-orange-50" },
                { key: "moderately_wasted", label: "Moderately Wasted", color: "bg-orange-100" },
                { key: "severely_wasted", label: "Severely Wasted", color: "bg-red-50" },
              ].map((status) => {
                const statusData = data.nutritional_status_breakdown.whz[status.key as keyof typeof data.nutritional_status_breakdown.whz];
                return (
                  <tr key={status.key} className={`${status.color} border-b border-slate-200`}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{status.label}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{statusData.boys}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{statusData.girls}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{statusData.total}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{statusData.percentage.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last Updated */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800 font-semibold">
        ⏱️ Auto-refresh every 10 seconds • Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
