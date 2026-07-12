"use client";
import "@/styles/admin.css";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Zap
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area
} from "recharts";
import { NutritionalStatusAnalytics } from "./NutritionalStatusAnalytics";

interface AdminAnalyticsProps {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  expandedForecast: boolean;
  setExpandedForecast: (value: boolean) => void;
  isRefreshing: boolean;
  handleRefresh: () => Promise<void>;
  summary: any;
  childMonitoring: any;
  trendData: any[];
  forecastData: any[];
}

export function AdminAnalytics({
  selectedYear,
  setSelectedYear,
  expandedForecast,
  setExpandedForecast,
  isRefreshing,
  handleRefresh,
  summary,
  childMonitoring,
  trendData,
  forecastData,
}: AdminAnalyticsProps) {
  // Generate year options (2020-2030)
  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i);
  
  const pieData = getPieData(childMonitoring.data);
  const ageData = getAgeData(childMonitoring.data);
  const genderData = getGenderData(childMonitoring.data);
  const totals = getTotals(summary.data);

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="admin-page-header flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            📊 Analytics Dashboard
            <span className="text-lg font-normal text-slate-500">({selectedYear})</span>
          </h1>
          <p className="text-sm mt-1">
            Analyze barangay nutrition data and trends (Real-time • Auto-refresh every 10s)
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-3">
          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="admin-year" className="text-xs font-semibold text-slate-600">
              Year:
            </label>
            <select
              id="admin-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="admin-action-btn-secondary inline-flex items-center gap-2 disabled:opacity-50 px-3 py-2.5 text-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Now"}
          </button>
          <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>May 1 - May 20, 2026</span>
          </div>
        </div>
      </div>

      {/* Main Charts Grid - Barangay Level */}
      <div className="grid gap-6 md:grid-cols-2 auto-rows-max">
        {/* Card 1: Malnutrition Trend (Monthly) */}
        <div className="admin-glass-panel p-5 h-[320px] flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight mb-4">
            Malnutrition Trend (Monthly)
          </h3>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Underweight" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Stunted" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Wasted" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Nutritional Status Distribution */}
        <div className="admin-glass-panel p-5 h-[320px] flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight mb-2">
            Nutritional Status Distribution
          </h3>
          <div className="relative flex-1 min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${v} Children`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-5px]">
              <span className="text-xl font-black text-slate-850">{totals.total.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-0.5 border-t border-slate-100 pt-3 text-center">
            {pieData.map((d) => (
              <div key={d.name}>
                <p className="text-xs font-black" style={{ color: d.color }}>{d.percent}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide truncate mt-0.5">{d.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Age Group Analysis with Multi-Color Bars */}
        <div className="admin-glass-panel p-5 h-auto flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight mb-4">
            Age Group Analysis
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="group" tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={25}>
                  {ageData.map((entry, index) => {
                    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Color Legend */}
          <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-slate-100">
            {ageData.map((item, idx) => {
              const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
              return (
                <div key={item.group} className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[idx] }}></div>
                  </div>
                  <p className="text-[9px] font-bold text-slate-600 truncate">{item.group}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 4: Demographic Breakdown - beside Age Group Analysis */}
        <div className="admin-glass-panel p-5 h-auto flex flex-col justify-between">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight border-b border-slate-100 pb-2.5">
            Demographic Breakdown
          </h3>
          <div className="grid grid-cols-2 items-center flex-1 mt-3">
            <div className="relative h-32 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3.5 pl-2 text-xs font-semibold text-slate-600">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Girls</p>
                <p className="text-sm font-black text-pink-500">
                  {genderData[0]?.value.toLocaleString() || "0"} ({((genderData[0]?.value / (genderData[0]?.value + genderData[1]?.value || 1)) * 100).toFixed(1)}%)
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Boys</p>
                <p className="text-sm font-black text-blue-500">
                  {genderData[1]?.value.toLocaleString() || "0"} ({((genderData[1]?.value / (genderData[0]?.value + genderData[1]?.value || 1)) * 100).toFixed(1)}%)
                </p>
              </div>
              <div className="border-t pt-2 border-slate-100">
                <p className="text-[9px] text-slate-450 font-bold uppercase">Population Scope</p>
                <p className="text-[11px] font-black text-slate-800 mt-0.5">
                  {((genderData[0]?.value || 0) + (genderData[1]?.value || 0)).toLocaleString()} Monitored Children
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Predictive Forecast Chart */}
        <div className="col-span-full admin-glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
              Predictive Forecast Chart (Next 3 Months)
            </h3>
            <button
              onClick={() => setExpandedForecast(!expandedForecast)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {expandedForecast ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>
          </div>

          {expandedForecast && (
            <>
              {/* Forecast Chart */}
              <div className="h-[280px] mb-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" domain={[10, 20]} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="#818cf8" fillOpacity={0.15} name="Upper Bound" />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="#818cf8" fillOpacity={0.15} name="Lower Bound" />
                    <Line type="monotone" dataKey="actual" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4 }} name="Actual Rate" />
                    <Line type="monotone" dataKey="forecast" stroke="#818cf8" strokeDasharray="4 4" strokeWidth={2} dot={false} name="Forecast Rate" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Forecast Confidence Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-amber-900 mb-1">🔄 Real-time Data Updates</h4>
                    <p className="text-[11px] text-amber-800">
                      Analytics and AI insights update every 10 seconds. Interpretations are generated based on current barangay data, WHO standards, and NNC guidelines. Critical alerts activate automatically.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Nutritional Status Analytics Section */}
      <div className="admin-glass-panel p-6 border-l-4 border-l-blue-500">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-extrabold text-slate-900">📊 Nutritional Status Analytics (Operation Timbang)</h2>
        </div>
        <NutritionalStatusAnalytics selectedYear={selectedYear} />
      </div>
    </div>
  );
}

// Helper functions
function getPieData(data: any) {
  if (data?.barangay_summary) {
    const summary_data = data.barangay_summary;
    const total = summary_data.total_children || 1;
    const normal_percent = ((summary_data.normal / total) * 100).toFixed(1);
    const underweight_percent = ((summary_data.underweight / total) * 100).toFixed(1);
    const stunted_percent = ((summary_data.stunted / total) * 100).toFixed(1);
    const wasted_percent = ((summary_data.wasted / total) * 100).toFixed(1);
    const severe_percent = ((summary_data.sam / total) * 100).toFixed(1);

    return [
      { name: "Normal", value: summary_data.normal, color: "#10b981", percent: `${normal_percent}%` },
      { name: "Underweight", value: summary_data.underweight, color: "#fbbf24", percent: `${underweight_percent}%` },
      { name: "Stunted", value: summary_data.stunted, color: "#f97316", percent: `${stunted_percent}%` },
      { name: "Wasted", value: summary_data.wasted, color: "#ef4444", percent: `${wasted_percent}%` },
      { name: "Severe", value: summary_data.sam, color: "#b91c1c", percent: `${severe_percent}%` }
    ];
  }
  return [
    { name: "Normal", value: 1255, color: "#10b981", percent: "51.2%" },
    { name: "Underweight", value: 411, color: "#fbbf24", percent: "16.8%" },
    { name: "Stunted", value: 487, color: "#f97316", percent: "19.9%" },
    { name: "Wasted", value: 198, color: "#ef4444", percent: "8.1%" },
    { name: "Severe", value: 102, color: "#b91c1c", percent: "4.1%" }
  ];
}

function getAgeData(data: any) {
  if (data?.by_age_group) {
    const ageGroupMap = data.by_age_group;
    return [
      { group: "0-12 months", count: ageGroupMap["0-11_months"] || 0 },
      { group: "13-24 months", count: ageGroupMap["12-23_months"] || 0 },
      { group: "25-36 months", count: ageGroupMap["24-35_months"] || 0 },
      { group: "37-48 months", count: ageGroupMap["36-47_months"] || 0 },
      { group: "49-59 months", count: ageGroupMap["48-59_months"] || 0 },
    ];
  }
  return [
    { group: "0-12 months", count: 0 },
    { group: "13-24 months", count: 0 },
    { group: "25-36 months", count: 0 },
    { group: "37-48 months", count: 0 },
    { group: "49-59 months", count: 0 },
  ];
}

function getGenderData(data: any) {
  if (data?.by_sex) {
    const by_sex = data.by_sex;
    return [
      { name: "Girls (Female)", value: by_sex.female || 0, color: "#ec4899" },
      { name: "Boys (Male)", value: by_sex.male || 0, color: "#3b82f6" }
    ];
  }
  return [
    { name: "Girls (Female)", value: 0, color: "#ec4899" },
    { name: "Boys (Male)", value: 0, color: "#3b82f6" }
  ];
}

function getTotals(data: any) {
  const total = data?.total_children || 2453;
  const normal = Math.round(total * 0.512);
  const underweight = Math.round(total * 0.168);
  const stunted = Math.round(total * 0.199);
  const wasted = Math.round(total * 0.081);
  const severe = Math.round(total * 0.041);
  return { total, normal, underweight, stunted, wasted, severe };
}
