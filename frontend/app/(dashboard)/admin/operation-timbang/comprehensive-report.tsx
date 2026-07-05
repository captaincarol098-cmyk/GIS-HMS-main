"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { RefreshCw, AlertCircle, BarChart3, TrendingUp } from "lucide-react";

interface ComprehensiveReportData {
  year: number;
  period: string;
  timestamp: string;
  summary: {
    total_population: number;
    total_children_measured: number;
    total_barangays: number;
    barangays_with_measurements: number;
    total_below_normal: number;
    below_normal_percentage: number;
    total_above_normal: number;
    above_normal_percentage: number;
    total_normal: number;
  };
  age_groups: {
    [key: string]: {
      total: number;
      below_normal: number;
      above_normal: number;
    };
  };
  nutritional_status: {
    [key: string]: number;
  };
  gender_breakdown: {
    male: number;
    female: number;
  };
  barangay_breakdown: Array<{
    name: string;
    children_count: number;
    below_normal: number;
    above_normal: number;
  }>;
}

export function ComprehensiveReport({ selectedYear }: { selectedYear: number }) {
  const [expandedBarangays, setExpandedBarangays] = useState(false);

  // Fetch comprehensive report
  const reportQuery = useQuery({
    queryKey: ["comprehensive-report", selectedYear],
    queryFn: async () => {
      const response = await api.get(
        `/api/operation-timbang/superadmin/comprehensive-report?year=${selectedYear}`
      );
      return response.data as ComprehensiveReportData;
    },
    refetchInterval: 10_000, // Auto-refresh every 10 seconds
    staleTime: 5_000,
    retry: 2,
  });

  const data = reportQuery.data;

  if (reportQuery.isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="inline-block animate-spin h-8 w-8 text-emerald-600 border-4 border-emerald-200 border-t-emerald-600 rounded-full mb-3"></div>
        <p className="text-slate-600 font-semibold">Loading comprehensive report...</p>
      </div>
    );
  }

  if (reportQuery.isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-900 mb-2">Failed to Load Report</p>
            <p className="text-xs text-red-800 mb-3">
              {(reportQuery.error as any)?.message || "An error occurred"}
            </p>
            <button
              onClick={() => reportQuery.refetch()}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-slate-600 font-semibold">No data available for the selected year</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            📊 Overall Comprehensive Report
          </h2>
          <p className="text-sm text-slate-600 mt-1">{data.period} • Year {data.year}</p>
        </div>
        <button
          onClick={() => reportQuery.refetch()}
          disabled={reportQuery.isLoading}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${reportQuery.isLoading ? "animate-spin" : ""}`} />
          {reportQuery.isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Total Population</p>
          <p className="text-2xl font-black text-blue-900">{data.summary.total_population.toLocaleString()}</p>
          <p className="text-xs text-blue-600 mt-1">All barangays</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">Children Measured</p>
          <p className="text-2xl font-black text-green-900">{data.summary.total_children_measured.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1">0-59 months</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Below Normal</p>
          <p className="text-2xl font-black text-red-900">{data.summary.total_below_normal}</p>
          <p className="text-xs text-red-600 mt-1">{data.summary.below_normal_percentage.toFixed(1)}%</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">Above Normal</p>
          <p className="text-2xl font-black text-orange-900">{data.summary.total_above_normal}</p>
          <p className="text-xs text-orange-600 mt-1">{data.summary.above_normal_percentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-emerald-100 rounded-lg p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-900">Barangay Coverage</h3>
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {data.summary.barangays_with_measurements}/{data.summary.total_barangays}
          </p>
          <p className="text-xs text-slate-600 mt-2">Barangays with measurements</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-bold text-slate-900">Gender Split</h3>
          </div>
          <p className="text-2xl font-black text-purple-600">
            {data.gender_breakdown.male}M / {data.gender_breakdown.female}F
          </p>
          <p className="text-xs text-slate-600 mt-2">Male / Female ratio</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-900">Normal Status</h3>
          </div>
          <p className="text-2xl font-black text-blue-600">{data.summary.total_normal}</p>
          <p className="text-xs text-slate-600 mt-2">Children with normal nutrition</p>
        </div>
      </div>

      {/* Age Groups Breakdown */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mb-4">👥 Age Group Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
                <th className="border border-emerald-700 px-4 py-3 text-left font-bold">Age Group</th>
                <th className="border border-emerald-700 px-4 py-3 text-center font-bold">Total</th>
                <th className="border border-emerald-700 px-4 py-3 text-center font-bold">Below Normal</th>
                <th className="border border-emerald-700 px-4 py-3 text-center font-bold">Above Normal</th>
                <th className="border border-emerald-700 px-4 py-3 text-center font-bold">% Below</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.age_groups).map(([ageKey, counts]: [string, any]) => (
                <tr key={ageKey} className="bg-white hover:bg-slate-50 transition">
                  <td className="border border-slate-200 px-4 py-3 font-semibold text-slate-900">
                    {ageKey} months
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-center font-bold text-slate-900">
                    {counts.total}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-center">
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold text-xs">
                      {counts.below_normal}
                    </span>
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-center">
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-bold text-xs">
                      {counts.above_normal}
                    </span>
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-center font-semibold text-slate-700">
                    {counts.total > 0 ? ((counts.below_normal / counts.total) * 100).toFixed(1) : "0"}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nutritional Status Breakdown */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mb-4">🥗 Nutritional Status Breakdown</h3>
        <div className="grid gap-3 md:grid-cols-5">
          {Object.entries(data.nutritional_status).map(([status, count]: [string, any]) => (
            <div key={status} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xs font-bold text-slate-600 uppercase mb-1 truncate">{status.replace(/_/g, " ")}</p>
              <p className="text-xl font-black text-slate-900">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Barangay Breakdown */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">📍 Barangay Breakdown</h3>
          <button
            onClick={() => setExpandedBarangays(!expandedBarangays)}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
          >
            {expandedBarangays ? "Show Less" : `Show All (${data.barangay_breakdown.length})`}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                <th className="border border-slate-800 px-4 py-3 text-left font-bold">Barangay</th>
                <th className="border border-slate-800 px-4 py-3 text-center font-bold">Children Count</th>
                <th className="border border-slate-800 px-4 py-3 text-center font-bold">Below Normal</th>
                <th className="border border-slate-800 px-4 py-3 text-center font-bold">Above Normal</th>
              </tr>
            </thead>
            <tbody>
              {(expandedBarangays ? data.barangay_breakdown : data.barangay_breakdown.slice(0, 5)).map(
                (barangay, idx) => (
                  <tr key={idx} className="bg-white hover:bg-slate-50 transition">
                    <td className="border border-slate-200 px-4 py-3 font-semibold text-slate-900">
                      {barangay.name}
                    </td>
                    <td className="border border-slate-200 px-4 py-3 text-center font-bold text-slate-900">
                      {barangay.children_count}
                    </td>
                    <td className="border border-slate-200 px-4 py-3 text-center">
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold text-xs">
                        {barangay.below_normal}
                      </span>
                    </td>
                    <td className="border border-slate-200 px-4 py-3 text-center">
                      <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-bold text-xs">
                        {barangay.above_normal}
                      </span>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {!expandedBarangays && data.barangay_breakdown.length > 5 && (
          <p className="text-xs text-slate-500 mt-3">
            Showing 5 of {data.barangay_breakdown.length} barangays
          </p>
        )}
      </div>

      {/* Last Updated */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800 font-semibold">
        ⏱️ Last updated: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
