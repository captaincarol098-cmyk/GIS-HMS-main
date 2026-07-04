'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Award, AlertCircle } from 'lucide-react';

interface BarangayComplianceData {
  complianceData?: any[];
  radarData?: any[];
  summary?: string;
}

export function BarangayComplianceEvaluation({
  data,
}: {
  data?: BarangayComplianceData;
}) {
  if (!data) {
    return (
      <div className="text-slate-500 italic">
        No compliance evaluation data available
      </div>
    );
  }

  const complianceData = data.complianceData || [
    {
      barangay: 'Barangay A',
      programAccess: 95,
      monthlyReporting: 92,
      referralFollowUp: 89,
      immunizationRate: 91,
      growthMonitoring: 88,
      overallScore: 91,
    },
    {
      barangay: 'Barangay B',
      programAccess: 92,
      monthlyReporting: 90,
      referralFollowUp: 87,
      immunizationRate: 89,
      growthMonitoring: 85,
      overallScore: 89,
    },
    {
      barangay: 'Barangay C',
      programAccess: 78,
      monthlyReporting: 75,
      referralFollowUp: 72,
      immunizationRate: 74,
      growthMonitoring: 68,
      overallScore: 73,
    },
    {
      barangay: 'Barangay D',
      programAccess: 85,
      monthlyReporting: 82,
      referralFollowUp: 80,
      immunizationRate: 83,
      growthMonitoring: 78,
      overallScore: 82,
    },
    {
      barangay: 'Barangay E',
      programAccess: 88,
      monthlyReporting: 86,
      referralFollowUp: 84,
      immunizationRate: 87,
      growthMonitoring: 82,
      overallScore: 85,
    },
  ];

  const radarData = data.radarData || [
    { metric: 'Program Access', value: 87 },
    { metric: 'Data Reporting', value: 85 },
    { metric: 'Referral Follow-up', value: 82 },
    { metric: 'Immunization', value: 84 },
    { metric: 'Growth Monitoring', value: 80 },
  ];

  const summary = data.summary || 
    `Compliance evaluation reveals strong adherence to nutrition programs in most barangays, with an average overall compliance score of 84%. Leading barangays (A and B) demonstrate exceptional compliance across all metrics. Areas requiring support are identified for targeted capacity building and resource allocation.`;

  const barChartData = complianceData.map((b) => ({
    name: b.barangay.replace('Barangay ', 'B'),
    'Overall Score': b.overallScore,
    'Program Access': b.programAccess,
    'Growth Monitoring': b.growthMonitoring,
  }));

  const highPerformers = complianceData.filter((b) => b.overallScore >= 88);
  const needsSupport = complianceData.filter((b) => b.overallScore < 80);
  const avgScore = (
    complianceData.reduce((sum, b) => sum + b.overallScore, 0) / complianceData.length
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-slate-700 leading-relaxed">{summary}</p>
      </div>

      {/* Overall Performance */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
          <p className="text-2xl font-bold text-blue-600">{avgScore}%</p>
          <p className="text-sm text-slate-600 mt-1">Average Compliance</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
          <p className="text-2xl font-bold text-green-600">{highPerformers.length}</p>
          <p className="text-sm text-slate-600 mt-1">High Performers</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
          <p className="text-2xl font-bold text-amber-600">{needsSupport.length}</p>
          <p className="text-sm text-slate-600 mt-1">Need Support</p>
        </div>
      </div>

      {/* Compliance by Indicator */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Compliance by Indicator (Average)
        </h3>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Compliance %"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barangay Comparison */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Barangay Compliance Scores
        </h3>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Overall Score" fill="#3b82f6" />
              <Bar dataKey="Program Access" fill="#10b981" />
              <Bar dataKey="Growth Monitoring" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Compliance Table */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Detailed Compliance Metrics</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Barangay</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Program Access</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Monthly Report</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Referral Follow-up</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Immunization</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Growth Monitor</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Overall</th>
              </tr>
            </thead>
            <tbody>
              {complianceData.map((item) => (
                <tr
                  key={item.barangay}
                  className={`border-b border-slate-200 hover:bg-slate-50 ${
                    item.overallScore >= 88
                      ? 'bg-green-50'
                      : item.overallScore < 80
                      ? 'bg-red-50'
                      : ''
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.barangay}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{item.programAccess}%</td>
                  <td className="px-4 py-3 text-center text-slate-700">{item.monthlyReporting}%</td>
                  <td className="px-4 py-3 text-center text-slate-700">{item.referralFollowUp}%</td>
                  <td className="px-4 py-3 text-center text-slate-700">{item.immunizationRate}%</td>
                  <td className="px-4 py-3 text-center text-slate-700">{item.growthMonitoring}%</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        item.overallScore >= 88
                          ? 'bg-green-100 text-green-800'
                          : item.overallScore >= 80
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.overallScore}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Classification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {highPerformers.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex gap-2 mb-3">
              <Award className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-900">High Performers</h4>
            </div>
            <ul className="space-y-1 text-green-800 text-sm">
              {highPerformers.map((b) => (
                <li key={b.barangay} className="flex justify-between">
                  <span>{b.barangay}</span>
                  <span className="font-bold">{b.overallScore}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {needsSupport.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h4 className="font-semibold text-amber-900">Need Support</h4>
            </div>
            <ul className="space-y-1 text-amber-800 text-sm">
              {needsSupport.map((b) => (
                <li key={b.barangay} className="flex justify-between">
                  <span>{b.barangay}</span>
                  <span className="font-bold">{b.overallScore}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Recommendations</h3>
        <ul className="space-y-2 text-slate-700 text-sm">
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>
              Recognize and learn from high-performing barangays through peer exchange
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>
              Provide intensive technical assistance to barangays below 80% compliance
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>
              Strengthen data management systems to improve monthly reporting compliance
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>
              Implement incentive programs for sustained high compliance achievement
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
