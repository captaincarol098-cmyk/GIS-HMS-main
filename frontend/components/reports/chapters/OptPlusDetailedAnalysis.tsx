'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface OptPlusReportData {
  province?: string;
  region?: string;
  municipality?: string;
  psgc?: string;
  total_population?: number;
  children_0_59_months?: number;
  coverage_percentage?: number;
  total_wfa?: number;
  total_hfa?: number;
  total_wflh?: number;
  age_group_data?: Array<{
    age_group: string;
    count: number;
  }>;
  gender_breakdown?: {
    male?: number;
    female?: number;
  };
  summary?: {
    undernutrition_0_59?: number;
    overweight_0_59?: number;
    undernutrition_0_23?: number;
    overweight_0_23?: number;
  };
  period?: {
    year?: number;
    month?: number;
    start_date?: string;
    end_date?: string;
  };
}

const INDICATOR_COLORS = {
  WAZ: '#3b82f6',
  HAZ: '#8b5cf6',
  WHZ: '#f97316',
};

export function OptPlusDetailedAnalysis({ data }: { data?: OptPlusReportData }) {
  if (!data) {
    return (
      <div className="text-slate-500 italic">
        No Operation Timbang Plus data available
      </div>
    );
  }

  const childrenMonitored = data.children_0_59_months || 0;
  const coverage = data.coverage_percentage || 0;
  const maleMale = data.gender_breakdown?.male || 0;
  const female = data.gender_breakdown?.female || 0;
  const undernutrition0_59 = data.summary?.undernutrition_0_59 || 0;
  const overweight0_59 = data.summary?.overweight_0_59 || 0;
  const undernutrition0_23 = data.summary?.undernutrition_0_23 || 0;
  const overweight0_23 = data.summary?.overweight_0_23 || 0;

  const ageGroupData = data.age_group_data?.map((ag) => ({
    age_group: ag.age_group,
    count: ag.count,
  })) || [];

  const genderData = [
    { name: 'Male', value: maleMale, color: '#3b82f6' },
    { name: 'Female', value: female, color: '#ec4899' },
  ];

  const indicatorCoverage = [
    { indicator: 'Weight-for-Age (WAZ)', measured: data.total_wfa || 0, color: INDICATOR_COLORS.WAZ },
    { indicator: 'Height-for-Age (HAZ)', measured: data.total_hfa || 0, color: INDICATOR_COLORS.HAZ },
    { indicator: 'Weight-for-Length/Height (WHZ)', measured: data.total_wflh || 0, color: INDICATOR_COLORS.WHZ },
  ];

  const nutritionStatus = [
    { label: 'Undernutrition (0-59m)', value: undernutrition0_59, color: '#ef4444' },
    { label: 'Overweight (0-59m)', value: overweight0_59, color: '#eab308' },
    { label: 'Undernutrition (0-23m)', value: undernutrition0_23, color: '#991b1b' },
    { label: 'Overweight (0-23m)', value: overweight0_23, color: '#ca8a04' },
  ];

  const genderComparison = [
    { gender: 'Male', percentage: maleMale > 0 ? ((maleMale / (maleMale + female)) * 100).toFixed(1) : 0 },
    { gender: 'Female', percentage: female > 0 ? ((female / (maleMale + female)) * 100).toFixed(1) : 0 },
  ];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const periodMonth = data.period?.month ? monthNames[data.period.month - 1] : 'Current';
  const periodYear = data.period?.year || new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Operation Timbang Plus - Reporting Period: {periodMonth} {periodYear}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Children Monitored (0-59m)</p>
            <p className="text-3xl font-bold text-blue-600">{childrenMonitored.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-2">Ages 0 to 59 months</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Coverage Rate</p>
            <p className="text-3xl font-bold text-green-600">{coverage.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-2">Expected vs. Measured</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Location</p>
            <p className="text-lg font-bold text-purple-600">{data.municipality || 'N/A'}</p>
            <p className="text-xs text-slate-500 mt-2">{data.region || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Gender Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Gender Distribution</h3>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={genderData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Gender Breakdown Table</h3>
          <div className="space-y-3">
            {genderComparison.map((item, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-slate-900">{item.gender}</span>
                  <span className="text-lg font-bold text-blue-600">{item.percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.gender === 'Male' ? '#3b82f6' : '#ec4899',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Age Group Distribution */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Children Distribution by Age Group</h3>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ageGroupData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="age_group" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" name="Children Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Nutritional Status Overview */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Nutritional Status Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nutritionStatus.map((status, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">{status.label}</p>
                  <p className="text-2xl font-bold mt-1">{status.value.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {((status.value / Math.max(childrenMonitored, 1)) * 100).toFixed(1)}% of total
                  </p>
                </div>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: status.color + '20', borderLeft: `4px solid ${status.color}` }}
                >
                  <span className="font-bold text-sm" style={{ color: status.color }}>
                    {((status.value / Math.max(childrenMonitored, 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Measurement Indicator Coverage */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Anthropometric Measurement Coverage</h3>
        <div className="space-y-3">
          {indicatorCoverage.map((indicator, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-slate-900">{indicator.indicator}</p>
                  <p className="text-sm text-slate-600 mt-1">{indicator.measured.toLocaleString()} children measured</p>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-sm font-bold"
                  style={{ backgroundColor: indicator.color + '20', color: indicator.color }}
                >
                  {((indicator.measured / Math.max(childrenMonitored, 1)) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${(indicator.measured / Math.max(childrenMonitored, 1)) * 100}%`,
                    backgroundColor: indicator.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Findings */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Key Operational Findings</h3>
        <ul className="space-y-2 text-slate-700 text-sm">
          <li className="flex gap-2">
            <span className="text-amber-600 font-bold">•</span>
            <span>
              {childrenMonitored.toLocaleString()} children aged 0-59 months were assessed in {periodMonth} {periodYear}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-600 font-bold">•</span>
            <span>Coverage rate of {coverage.toFixed(1)}% indicates monitoring progress against expected population</span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-600 font-bold">•</span>
            <span>
              {undernutrition0_59} children ({((undernutrition0_59 / Math.max(childrenMonitored, 1)) * 100).toFixed(1)}%) show signs of undernutrition
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-600 font-bold">•</span>
            <span>
              Younger cohort (0-23m) with {undernutrition0_23} undernourished children requires intensified interventions
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-600 font-bold">•</span>
            <span>Gender distribution shows {genderComparison[0].percentage}% male and {genderComparison[1].percentage}% female participation</span>
          </li>
        </ul>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Operational Recommendations</h3>
        <ul className="space-y-2 text-slate-700 text-sm">
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>Continue regular OPT Plus activities to maintain monitoring momentum</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>Target barangays with lower coverage to ensure comprehensive data collection</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>Focus nutrition programs on 0-23 month cohort showing higher undernutrition rates</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>Ensure all three anthropometric indicators (WAZ, HAZ, WHZ) are consistently measured</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>Maintain balanced gender participation in OPT Plus activities</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
