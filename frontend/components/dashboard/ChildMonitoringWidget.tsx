"use client";

import { Users, TrendingUp, MapPin, AlertTriangle } from "lucide-react";
import { BarangayRankingTable } from "./BarangayRankingTable";

interface PurokBreakdown {
  purok_id: string;
  purok_name: string;
  total_records: number;  // Total measurement records (OPT+ count)
  total_children: number;  // Unique children
  normal: number;
  sam: number;
  mam: number;
  malnutrition_cases: number;
  malnutrition_rate: number;
  wasting_rate: number;
  stunting_rate: number;
  risk_level: string;
}

interface ChildMonitoringData {
  barangay_summary: {
    total_records: number;  // Total measurement records (OPT+ count)
    total_children: number;  // Unique children (for reference)
    normal: number;
    sam: number;
    mam: number;
    overweight: number;
    underweight: number;
    stunted: number;
    wasted: number;
    normal_percentage: number;
    malnutrition_percentage: number;
  };
  by_sex: {
    male: number;
    female: number;
    male_percentage: number;
  };
  by_age_group: {
    "0-11_months": number;
    "12-23_months": number;
    "24-35_months": number;
    "36-47_months": number;
    "48-59_months": number;
    "60+_months": number;
  };
  purok_breakdown: PurokBreakdown[];
  high_risk_puroks: PurokBreakdown[];
  puroks_needing_attention: number;
}

export function ChildMonitoringWidget({ data, isLoading }: { data?: ChildMonitoringData; isLoading: boolean }) {
  if (isLoading) {
    return (
    <div className="admin-glass-panel p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            Child Monitoring Summary
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-xs text-slate-400 font-semibold">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
    <div className="admin-glass-panel p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            Child Monitoring Summary
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-xs text-slate-400 font-semibold">No data available</p>
        </div>
      </div>
    );
  }

  const { barangay_summary, by_sex, by_age_group, purok_breakdown, high_risk_puroks, puroks_needing_attention } = data;

  // Transform purok_breakdown for BarangayRankingTable component (reuse existing component)
  const purokRows = purok_breakdown.map((p, idx) => ({
    rank: idx + 1,
    name: p.purok_name,
    barangay: p.purok_name, // For compatibility with existing table component
    riskLevel: p.risk_level,
    riskScore: p.malnutrition_rate.toFixed(1),
    totalChildren: p.total_children,  // Use total_children (unique children)
    total_children: p.total_children,  // Use total_children
    malnutritionCases: p.malnutrition_cases,
    prevalence: `${p.malnutrition_rate.toFixed(1)}%`,
    wasting_rate: p.wasting_rate,
    stunting_rate: p.stunting_rate,
    trend: p.malnutrition_rate > 15 ? "up" : "down",
    risk_level: p.risk_level,
  }));

  return (
    <div className="admin-glass-panel p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <Users className="h-5 w-5 text-teal-600" />
          Child Monitoring Summary
        </h2>
        {puroks_needing_attention > 0 && (
          <span className="bg-red-50 border border-red-200 text-red-700 text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {puroks_needing_attention} Purok{puroks_needing_attention > 1 ? 's' : ''} Need Attention
          </span>
        )}
      </div>

      {/* Barangay Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3">
          <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wide mb-1">Total Children</p>
          <p className="text-2xl font-black text-blue-900">{barangay_summary.total_children}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-3">
          <p className="text-[10px] text-green-700 font-bold uppercase tracking-wide mb-1">Normal</p>
          <p className="text-2xl font-black text-green-900">{barangay_summary.normal}</p>
          <p className="text-[10px] text-green-700 font-bold">{barangay_summary.normal_percentage}%</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-3">
          <p className="text-[10px] text-red-700 font-bold uppercase tracking-wide mb-1">SAM</p>
          <p className="text-2xl font-black text-red-900">{barangay_summary.sam}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-3">
          <p className="text-[10px] text-orange-700 font-bold uppercase tracking-wide mb-1">MAM</p>
          <p className="text-2xl font-black text-orange-900">{barangay_summary.mam}</p>
        </div>
      </div>

      {/* Demographics: Sex & Age */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* By Sex */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <h3 className="text-xs font-bold text-slate-700 mb-2.5 uppercase tracking-wide">By Sex</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-semibold">Male</span>
              <span className="text-slate-900 font-bold">{by_sex.male} ({by_sex.male_percentage}%)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-semibold">Female</span>
              <span className="text-slate-900 font-bold">{by_sex.female} ({(100 - by_sex.male_percentage).toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* By Age Group */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <h3 className="text-xs font-bold text-slate-700 mb-2.5 uppercase tracking-wide">By Age Group</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">0-11m:</span>
              <span className="text-slate-900 font-bold">{by_age_group["0-11_months"]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">12-23m:</span>
              <span className="text-slate-900 font-bold">{by_age_group["12-23_months"]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">24-35m:</span>
              <span className="text-slate-900 font-bold">{by_age_group["24-35_months"]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">36-47m:</span>
              <span className="text-slate-900 font-bold">{by_age_group["36-47_months"]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">48-59m:</span>
              <span className="text-slate-900 font-bold">{by_age_group["48-59_months"]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">60+m:</span>
              <span className="text-slate-900 font-bold">{by_age_group["60+_months"]}</span>
            </div>
          </div>
        </div>
      </div>



      {/* Purok Breakdown Table */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-slate-500" />
          Purok-by-Purok Breakdown
        </h3>
        {purokRows.length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <BarangayRankingTable rows={purokRows} label="Purok" />
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">No purok data available</p>
        )}
      </div>
    </div>
  );
}
