'use client';

import React from 'react';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';

interface KPIData {
  label: string;
  value: string | number;
  unit?: string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  status?: 'positive' | 'negative' | 'neutral';
}

interface ExecutiveSummaryData {
  summary?: string;
  kpis?: KPIData[];
  highlights?: string[];
  keyMessages?: string[];
}

const StatCard = ({ kpi }: { kpi: KPIData }) => {
  const isPositive = kpi.status === 'positive';
  const statusColor = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
      <p className="text-sm text-slate-600 mb-2">{kpi.label}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-slate-900">
            {kpi.value}
          </p>
          {kpi.unit && <p className="text-xs text-slate-500">{kpi.unit}</p>}
        </div>
        {kpi.change !== undefined && (
          <div className={`flex items-center gap-1 ${bgColor} px-2 py-1 rounded ${statusColor}`}>
            {kpi.trend === 'up' && <ArrowUp className="w-4 h-4" />}
            {kpi.trend === 'down' && <ArrowDown className="w-4 h-4" />}
            <span className="text-sm font-semibold">{Math.abs(kpi.change)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export function ExecutiveSummary({ data }: { data?: ExecutiveSummaryData }) {
  if (!data) {
    return (
      <div className="text-slate-500 italic">
        No executive summary data available
      </div>
    );
  }

  const defaultKPIs: KPIData[] = [
    {
      label: 'Total Children Monitored',
      value: '1,245',
      unit: 'children',
      change: 8,
      trend: 'up',
      status: 'positive',
    },
    {
      label: 'Nutritional Status',
      value: '87%',
      unit: 'normal range',
      change: 5,
      trend: 'up',
      status: 'positive',
    },
    {
      label: 'At-Risk Children',
      value: '156',
      unit: 'children',
      change: 12,
      trend: 'down',
      status: 'positive',
    },
    {
      label: 'Program Coverage',
      value: '92%',
      unit: 'target reached',
      change: 3,
      trend: 'up',
      status: 'positive',
    },
  ];

  const kpis = data.kpis || defaultKPIs;
  const highlights = data.highlights || [
    'Successfully monitored nutritional status of 1,245 children across all barangays',
    'Achieved 92% program coverage, exceeding the 85% target',
    'Identified and referred 156 at-risk children for intervention',
    'Implemented 42 targeted nutrition programs with 89% compliance rate',
  ];
  const keyMessages = data.keyMessages || [
    'Overall nutritional status has improved by 5% compared to the previous period',
    'Geographic hotspots identified in 3 barangays require intensified interventions',
    'Early warning system detected 23 potential nutrition-related incidents',
    'Intervention effectiveness rate stands at 78%, indicating strong program impact',
  ];

  return (
    <div className="space-y-6">
      {/* Executive Summary Text */}
      {data.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-slate-700 leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* KPI Dashboard */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Key Performance Indicators</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <StatCard key={idx} kpi={kpi} />
          ))}
        </div>
      </div>

      {/* Highlights */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Key Highlights</h3>
        <ul className="space-y-2">
          {highlights.map((highlight, idx) => (
            <li key={idx} className="flex gap-3 text-slate-700">
              <div className="flex-shrink-0 w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Key Messages */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Key Messages</h3>
        <ul className="space-y-2">
          {keyMessages.map((message, idx) => (
            <li key={idx} className="flex gap-3 text-slate-700">
              <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>{message}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
