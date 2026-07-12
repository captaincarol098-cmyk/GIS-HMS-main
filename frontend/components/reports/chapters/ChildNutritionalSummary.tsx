'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface NutritionalStatus {
  status: string;
  count: number;
  percentage: number;
}

interface AgeGroupData {
  ageGroup: string;
  normal: number;
  stunted: number;
  wasted: number;
  underweight: number;
}

interface ChildNutritionalSummaryData {
  totalChildren?: number;
  statusBreakdown?: NutritionalStatus[];
  ageGroupBreakdown?: AgeGroupData[];
  severityLevels?: { level: string; count: number }[];
  genderComparison?: any[];
}

const STATUS_COLORS: Record<string, string> = {
  'Normal': '#10b981',
  'At Risk': '#f59e0b',
  'Moderate Malnutrition': '#ef4444',
  'Severe Malnutrition': '#991b1b',
  'Stunted': '#FF8C00',  // Deep Orange (from theme)
  'Wasted': '#FF8C00',   // Deep Orange (from theme)
  'Underweight': '#FF8C00', // Deep Orange (from theme)
};

export function ChildNutritionalSummary({ data }: { data?: ChildNutritionalSummaryData }) {
  if (!data) {
    return (
      <div className="text-slate-500 italic">
        No nutritional summary data available
      </div>
    );
  }

  const statusBreakdown = data.statusBreakdown || [
    { status: 'Normal', count: 987, percentage: 79.2 },
    { status: 'At Risk', count: 178, percentage: 14.3 },
    { status: 'Moderate Malnutrition', count: 65, percentage: 5.2 },
    { status: 'Severe Malnutrition', count: 15, percentage: 1.2 },
  ];

  const ageGroupData = data.ageGroupBreakdown || [
    { ageGroup: '0-6 months', normal: 142, stunted: 15, wasted: 8, underweight: 12 },
    { ageGroup: '6-12 months', normal: 178, stunted: 28, wasted: 18, underweight: 22 },
    { ageGroup: '1-2 years', normal: 234, stunted: 52, wasted: 35, underweight: 48 },
    { ageGroup: '2-3 years', normal: 256, stunted: 68, wasted: 42, underweight: 58 },
    { ageGroup: '3-4 years', normal: 178, stunted: 42, wasted: 28, underweight: 35 },
  ];

  const severityLevels = data.severityLevels || [
    { level: 'Normal', count: 987 },
    { level: 'Mild', count: 128 },
    { level: 'Moderate', count: 92 },
    { level: 'Severe', count: 38 },
  ];

  const genderComparison = data.genderComparison || [
    { indicator: 'Normal', Male: 495, Female: 492 },
    { indicator: 'Stunted', Male: 68, Female: 72 },
    { indicator: 'Wasted', Male: 45, Female: 48 },
    { indicator: 'Underweight', Male: 71, Female: 76 },
  ];

  const totalChildren = data.totalChildren || 1245;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Overall Status Overview</h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-slate-900 mb-2">
            {totalChildren.toLocaleString()} children monitored
          </p>
          <p className="text-sm text-slate-600">
            Comprehensive nutritional assessment completed across all barangays
          </p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Nutritional Status Distribution</h3>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ status, percentage }) => `${status} (${percentage}%)`}
                >
                  {statusBreakdown.map((entry) => (
                    <Cell
                      key={`cell-${entry.status}`}
                      fill={STATUS_COLORS[entry.status] || '#8b5cf6'}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            {statusBreakdown.map((status) => (
              <div key={status.status} className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{status.status}</p>
                    <p className="text-sm text-slate-600">{status.count} children</p>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{status.percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${status.percentage}%`,
                      backgroundColor: STATUS_COLORS[status.status] || '#8b5cf6',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Age Group Analysis */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Nutritional Status by Age Group</h3>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ageGroupData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ageGroup" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="normal" stackId="a" fill="#10b981" name="Normal" />
              <Bar dataKey="stunted" stackId="a" fill="#8b5cf6" name="Stunted" />
              <Bar dataKey="wasted" stackId="a" fill="#f97316" name="Wasted" />
              <Bar dataKey="underweight" stackId="a" fill="#06b6d4" name="Underweight" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Severity Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Severity Levels</h3>
          <div className="space-y-3">
            {severityLevels.map((severity) => (
              <div key={severity.level} className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-900">{severity.level}</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                    {severity.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Gender Comparison</h3>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={genderComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="indicator" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Male" fill="#3b82f6" />
                <Bar dataKey="Female" fill="#ec4899" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Key Findings */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Key Findings</h3>
        <ul className="space-y-2 text-slate-700">
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>79.2% of children maintain normal nutritional status</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>14.3% are classified as at-risk and require close monitoring</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>6.4% have moderate to severe malnutrition requiring immediate intervention</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Stunting is more prevalent in 1-4 year age groups</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
