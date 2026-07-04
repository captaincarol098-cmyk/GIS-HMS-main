"use client";

import { Users, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface BarangayChildData {
  barangay_name: string;
  total_children: number;
  normal: number;
  sam: number;
  mam: number;
  malnutrition_cases: number;
  malnutrition_rate: number;
  risk_level: string;
}

interface ChildMonitoringOverviewData {
  city_total_children: number;
  city_total_normal: number;
  city_total_sam: number;
  city_total_mam: number;
  city_malnutrition_rate: number;
  city_normal_percentage: number;
  by_barangay: BarangayChildData[];
  highest_risk_barangay: string;
  lowest_risk_barangay: string;
  barangays_needing_attention: number;
  gender_distribution: {
    male_percentage: number;
    female_percentage: number;
  };
  age_distribution: {
    "0-11_months": number;
    "12-23_months": number;
    "24-35_months": number;
    "36-47_months": number;
    "48-59_months": number;
  };
}

export function SuperAdminChildMonitoring({ data, isLoading }: { data?: ChildMonitoringOverviewData; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            City-Wide Child Monitoring Overview
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-xs text-slate-400 font-semibold">Loading child data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            City-Wide Child Monitoring Overview
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-xs text-slate-400 font-semibold">No child data available</p>
        </div>
      </div>
    );
  }

  const {
    city_total_children,
    city_total_normal,
    city_total_sam,
    city_total_mam,
    city_malnutrition_rate,
    city_normal_percentage,
    by_barangay,
    highest_risk_barangay,
    lowest_risk_barangay,
    barangays_needing_attention,
    gender_distribution,
    age_distribution
  } = data;

  // Prepare chart data for malnutrition comparison
  const barangayChartData = by_barangay.map(b => ({
    name: b.barangay_name,
    rate: b.malnutrition_rate,
    children: b.total_children,
    cases: b.malnutrition_cases
  }));

  // Color function for risk levels
  const getRiskColor = (rate: number) => {
    if (rate >= 25) return "#ef4444"; // Critical red
    if (rate >= 15) return "#f97316"; // High orange
    if (rate >= 10) return "#fbbf24"; // Medium yellow
    return "#10b981"; // Low green
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            City-Wide Child Monitoring Overview
          </h2>
          {barangays_needing_attention > 0 && (
            <span className="bg-red-50 border border-red-200 text-red-700 text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {barangays_needing_attention} Barangay{barangays_needing_attention > 1 ? 's' : ''} Need Attention
            </span>
          )}
        </div>

        {/* City-Level Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3">
            <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wide mb-1">Total Children</p>
            <p className="text-2xl font-black text-blue-900">{city_total_children.toLocaleString()}</p>
            <p className="text-[9px] text-blue-600 font-semibold mt-1">City-wide</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-3">
            <p className="text-[10px] text-green-700 font-bold uppercase tracking-wide mb-1">Normal Status</p>
            <p className="text-2xl font-black text-green-900">{city_total_normal}</p>
            <p className="text-[9px] text-green-600 font-semibold mt-1">{city_normal_percentage}%</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-3">
            <p className="text-[10px] text-orange-700 font-bold uppercase tracking-wide mb-1">SAM (Severe)</p>
            <p className="text-2xl font-black text-orange-900">{city_total_sam}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-3">
            <p className="text-[10px] text-red-700 font-bold uppercase tracking-wide mb-1">MAM (Moderate)</p>
            <p className="text-2xl font-black text-red-900">{city_total_mam}</p>
          </div>
        </div>

        {/* Malnutrition Rate Overview */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">City-Wide Malnutrition Rate</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{city_malnutrition_rate.toFixed(1)}%</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Based on all {city_total_children.toLocaleString()} children monitored</p>
            </div>
            <BarChart3 className="h-12 w-12 text-slate-300" />
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-green-700 font-bold uppercase tracking-wide">Healthiest Barangay</p>
                <p className="text-lg font-black text-green-900 mt-1">{lowest_risk_barangay}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-30" />
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-red-700 font-bold uppercase tracking-wide">Highest Risk Barangay</p>
                <p className="text-lg font-black text-red-900 mt-1">{highest_risk_barangay}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600 opacity-30" />
            </div>
          </div>
        </div>

        {/* Demographics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <h3 className="text-xs font-bold text-slate-700 mb-2.5 uppercase tracking-wide">By Gender</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Male</span>
                <span className="text-slate-900 font-bold">{gender_distribution.male_percentage}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${gender_distribution.male_percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-slate-600 font-semibold">Female</span>
                <span className="text-slate-900 font-bold">{gender_distribution.female_percentage}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-pink-500" 
                  style={{ width: `${gender_distribution.female_percentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <h3 className="text-xs font-bold text-slate-700 mb-2.5 uppercase tracking-wide">By Age Group</h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">0-11 months:</span>
                <span className="text-slate-900 font-bold">{age_distribution["0-11_months"]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">12-23 months:</span>
                <span className="text-slate-900 font-bold">{age_distribution["12-23_months"]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">24-35 months:</span>
                <span className="text-slate-900 font-bold">{age_distribution["24-35_months"]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">36-47 months:</span>
                <span className="text-slate-900 font-bold">{age_distribution["36-47_months"]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">48-59 months:</span>
                <span className="text-slate-900 font-bold">{age_distribution["48-59_months"]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barangay Comparison Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-extrabold text-slate-800 tracking-tight mb-4">Malnutrition Rate by Barangay</h3>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barangayChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: "#64748b" }} 
                stroke="#e2e8f0"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" label={{ value: 'Rate %', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
                formatter={(value: any) => `${value.toFixed(1)}%`}
              />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {barangayChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getRiskColor(entry.rate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barangay Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-extrabold text-slate-800 tracking-tight mb-4">Child Metrics by Barangay</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Barangay</th>
                <th className="px-3">Total Children</th>
                <th className="px-3">Normal</th>
                <th className="px-3">SAM</th>
                <th className="px-3">MAM</th>
                <th className="px-3">Malnourished Cases</th>
                <th className="px-3 text-right">Malnutrition Rate</th>
                <th className="px-3">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {by_barangay.map((brgy, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-800">{brgy.barangay_name}</td>
                  <td className="px-3 font-semibold text-slate-700">{brgy.total_children.toLocaleString()}</td>
                  <td className="px-3 font-semibold text-green-700">{brgy.normal}</td>
                  <td className="px-3 font-semibold text-red-700">{brgy.sam}</td>
                  <td className="px-3 font-semibold text-orange-700">{brgy.mam}</td>
                  <td className="px-3 font-bold text-slate-800">{brgy.malnutrition_cases}</td>
                  <td className="px-3 text-right font-bold" style={{ color: getRiskColor(brgy.malnutrition_rate) }}>
                    {brgy.malnutrition_rate.toFixed(1)}%
                  </td>
                  <td className="px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                      brgy.risk_level === "critical" 
                        ? "bg-red-50 border-red-200 text-red-700"
                        : brgy.risk_level === "high"
                        ? "bg-orange-50 border-orange-200 text-orange-700"
                        : brgy.risk_level === "moderate"
                        ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                        : "bg-green-50 border-green-200 text-green-700"
                    }`}>
                      {brgy.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
