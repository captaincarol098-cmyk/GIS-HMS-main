'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import { AlertTriangle, TrendingDown } from 'lucide-react';

interface BarangayData {
  name: string;
  totalChildren: number;
  normal: number;
  atRisk: number;
  severe: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  complianceRate: number;
}

interface BarangayComparativeAnalysisData {
  barangays?: BarangayData[];
  riskStratification?: any;
  topRiskBarangays?: string[];
}

const getRiskColor = (level: string) => {
  switch (level) {
    case 'Low':
      return 'bg-green-100 text-green-800';
    case 'Medium':
      return 'bg-amber-100 text-amber-800';
    case 'High':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

const getRiskBgColor = (level: string) => {
  switch (level) {
    case 'Low':
      return '#d1fae5';
    case 'Medium':
      return '#fef3c7';
    case 'High':
      return '#fee2e2';
    default:
      return '#f1f5f9';
  }
};

export function BarangayComparativeAnalysis({
  data,
}: {
  data?: BarangayComparativeAnalysisData;
}) {
  if (!data) {
    return (
      <div className="text-slate-500 italic">
        No barangay comparative data available
      </div>
    );
  }

  const barangays = data.barangays || [
    {
      name: 'Barangay A',
      totalChildren: 95,
      normal: 78,
      atRisk: 14,
      severe: 3,
      riskScore: 35,
      riskLevel: 'Medium' as const,
      complianceRate: 92,
    },
    {
      name: 'Barangay B',
      totalChildren: 112,
      normal: 102,
      atRisk: 8,
      severe: 2,
      riskScore: 18,
      riskLevel: 'Low' as const,
      complianceRate: 95,
    },
    {
      name: 'Barangay C',
      totalChildren: 78,
      normal: 58,
      atRisk: 15,
      severe: 5,
      riskScore: 62,
      riskLevel: 'High' as const,
      complianceRate: 78,
    },
    {
      name: 'Barangay D',
      totalChildren: 89,
      normal: 72,
      atRisk: 12,
      severe: 5,
      riskScore: 48,
      riskLevel: 'Medium' as const,
      complianceRate: 85,
    },
    {
      name: 'Barangay E',
      totalChildren: 105,
      normal: 95,
      atRisk: 8,
      severe: 2,
      riskScore: 22,
      riskLevel: 'Low' as const,
      complianceRate: 93,
    },
  ];

  const riskScatterData = barangays.map((b) => ({
    name: b.name,
    riskScore: b.riskScore,
    complianceRate: b.complianceRate,
    atRiskCount: b.atRisk + b.severe,
  }));

  const malnutritionData = barangays.map((b) => ({
    name: b.name.replace('Barangay ', 'Brgy '),
    Normal: b.normal,
    AtRisk: b.atRisk,
    Severe: b.severe,
  }));

  return (
    <div className="space-y-6">
      {/* Risk Stratification Overview */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Risk Stratification</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-700">
              {barangays.filter((b) => b.riskLevel === 'Low').length}
            </p>
            <p className="text-sm text-green-600">Low Risk Barangays</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">
              {barangays.filter((b) => b.riskLevel === 'Medium').length}
            </p>
            <p className="text-sm text-amber-600">Medium Risk Barangays</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-700">
              {barangays.filter((b) => b.riskLevel === 'High').length}
            </p>
            <p className="text-sm text-red-600">High Risk Barangays</p>
          </div>
        </div>
      </div>

      {/* Malnutrition Status by Barangay */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Nutritional Status Distribution by Barangay
        </h3>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={malnutritionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Normal" fill="#10b981" />
              <Bar dataKey="AtRisk" fill="#f59e0b" />
              <Bar dataKey="Severe" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk vs Compliance Scatter */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Risk Score vs Compliance Rate
        </h3>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="riskScore" name="Risk Score" type="number" />
              <YAxis dataKey="complianceRate" name="Compliance Rate (%)" type="number" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Barangays" data={riskScatterData} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barangay Details Table */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Barangay Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Barangay</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">
                  Total Children
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Normal</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">At Risk</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Severe</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Risk Level</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {barangays.map((barangay) => (
                <tr key={barangay.name} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{barangay.name}</td>
                  <td className="px-4 py-3 text-center text-slate-700">
                    {barangay.totalChildren}
                  </td>
                  <td className="px-4 py-3 text-center text-green-600 font-semibold">
                    {barangay.normal}
                  </td>
                  <td className="px-4 py-3 text-center text-amber-600 font-semibold">
                    {barangay.atRisk}
                  </td>
                  <td className="px-4 py-3 text-center text-red-600 font-semibold">
                    {barangay.severe}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(
                        barangay.riskLevel
                      )}`}
                    >
                      {barangay.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700">
                    {barangay.complianceRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* High Risk Alert */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900 mb-2">High-Risk Barangays Requiring Attention</h4>
            <ul className="space-y-1 text-red-800 text-sm">
              {barangays
                .filter((b) => b.riskLevel === 'High')
                .map((b) => (
                  <li key={b.name} className="flex gap-2">
                    <span>•</span>
                    <span>
                      {b.name} - Risk Score: {b.riskScore}, At-Risk Children: {b.atRisk + b.severe}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
