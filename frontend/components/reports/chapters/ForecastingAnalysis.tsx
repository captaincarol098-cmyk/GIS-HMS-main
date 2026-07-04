'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ForecastingAnalysisData {
  trends?: any[];
  seasonalPatterns?: string[];
  projections?: any[];
  risks?: any[];
}

export function ForecastingAnalysis({ data }: { data?: ForecastingAnalysisData }) {
  if (!data) {
    return (
      <div className="text-slate-500 italic">
        No forecasting data available
      </div>
    );
  }

  const trends = data.trends || [
    { month: 'Jul', historical: 82, forecast: 81 },
    { month: 'Aug', historical: 80, forecast: 80 },
    { month: 'Sep', historical: 78, forecast: 78 },
    { month: 'Oct', historical: 76, forecast: 75 },
    { month: 'Nov', historical: 74, forecast: 72 },
    { month: 'Dec', historical: 72, forecast: 70 },
    { month: 'Jan', forecast: 68 },
    { month: 'Feb', forecast: 67 },
    { month: 'Mar', forecast: 69 },
    { month: 'Apr', forecast: 71 },
    { month: 'May', forecast: 74 },
    { month: 'Jun', forecast: 77 },
  ];

  const caseProjections = data.projections || [
    { quarter: 'Q1', projected: 285, confidence: '90%' },
    { quarter: 'Q2', projected: 312, confidence: '85%' },
    { quarter: 'Q3', projected: 298, confidence: '80%' },
    { quarter: 'Q4', projected: 265, confidence: '75%' },
  ];

  const seasonalPatterns = data.seasonalPatterns || [
    'Nutrition status typically declines during lean months (May-August)',
    'Improvement observed post-harvest season (September-January)',
    'Higher malnutrition rates correlate with increased food prices',
    'School year transitions impact nutritional interventions',
  ];

  const risks = data.risks || [
    {
      risk: 'Climate-related food shortage',
      probability: 'Medium',
      impact: 'High',
      mitigation: 'Strengthen household food security programs',
    },
    {
      risk: 'Disease outbreaks affecting nutrition',
      probability: 'Low',
      impact: 'High',
      mitigation: 'Maintain health surveillance systems',
    },
    {
      risk: 'Funding interruptions',
      probability: 'Low',
      impact: 'Medium',
      mitigation: 'Diversify funding sources',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Trend Forecast */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Nutritional Status Trend Forecast
        </h3>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <defs>
                <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis label={{ value: 'Status Score', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="historical"
                stroke="#3b82f6"
                name="Historical"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#f59e0b"
                name="Forecast"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-600 mt-2">
          Trend shows potential decline through early 2025, with recovery expected mid-year.
        </p>
      </div>

      {/* Quarterly Case Projections */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quarterly Case Projections</h3>
        <div className="grid grid-cols-4 gap-3">
          {caseProjections.map((projection) => (
            <div
              key={projection.quarter}
              className="bg-white p-4 rounded-lg border border-slate-200 text-center"
            >
              <p className="text-2xl font-bold text-blue-600">{projection.projected}</p>
              <p className="text-sm text-slate-600 mt-1">{projection.quarter}</p>
              <p className="text-xs text-slate-500">
                Confidence: {projection.confidence}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonal Patterns */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Seasonal Patterns</h3>
        <div className="space-y-2">
          {seasonalPatterns.map((pattern, idx) => (
            <div
              key={idx}
              className="flex gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200"
            >
              <TrendingDown className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <span className="text-slate-700">{pattern}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Assessment */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Risk Assessment & Mitigation</h3>
        <div className="space-y-3">
          {risks.map((risk, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-lg border border-slate-200"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-slate-900">{risk.risk}</h4>
                <div className="flex gap-2 text-xs">
                  <span
                    className={`px-2 py-1 rounded font-semibold ${
                      risk.probability === 'High'
                        ? 'bg-red-100 text-red-800'
                        : risk.probability === 'Medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {risk.probability} Prob
                  </span>
                  <span
                    className={`px-2 py-1 rounded font-semibold ${
                      risk.impact === 'High'
                        ? 'bg-red-100 text-red-800'
                        : risk.impact === 'Medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {risk.impact} Impact
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Mitigation:</span> {risk.mitigation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-purple-900 mb-3">Forecasting Insights</h3>
        <ul className="space-y-2 text-purple-800 text-sm">
          <li className="flex gap-2">
            <span className="font-bold">•</span>
            <span>Expected 12% decline in nutritional status during lean season</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">•</span>
            <span>Seasonal interventions should be intensified in May-August period</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">•</span>
            <span>Recovery trend projected from March 2025 onwards</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">•</span>
            <span>Preventive measures now can reduce Q1 2025 caseload by 15-20%</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
