'use client';

import React from 'react';
import { CheckCircle, Target, Users, Calendar } from 'lucide-react';
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
} from 'recharts';

interface ProgramMetric {
  name: string;
  target: number;
  accomplished: number;
  unit: string;
  status: 'on-track' | 'at-risk' | 'completed';
}

interface ProgramActivity {
  name: string;
  startDate: string;
  endDate: string;
  participants: number;
  output: string;
  status: string;
}

interface ProgramAccomplishmentData {
  metrics?: ProgramMetric[];
  activities?: ProgramActivity[];
  monthlyProgress?: any[];
  summary?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'on-track':
      return 'bg-blue-100 text-blue-800';
    case 'at-risk':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

export function ProgramAccomplishmentAnalysis({
  data,
}: {
  data?: ProgramAccomplishmentData;
}) {
  if (!data) {
    return (
      <div className="text-slate-500 italic">
        No program accomplishment data available
      </div>
    );
  }

  const metrics = data.metrics || [
    {
      name: 'Growth Monitoring Sessions',
      target: 480,
      accomplished: 467,
      unit: 'sessions',
      status: 'on-track' as const,
    },
    {
      name: 'Nutrition Education Programs',
      target: 52,
      accomplished: 52,
      unit: 'programs',
      status: 'completed' as const,
    },
    {
      name: 'Health Workers Trained',
      target: 85,
      accomplished: 85,
      unit: 'workers',
      status: 'completed' as const,
    },
    {
      name: 'Community Mobilization Activities',
      target: 156,
      accomplished: 142,
      unit: 'activities',
      status: 'on-track' as const,
    },
    {
      name: 'Micronutrient Supplementation',
      target: 1200,
      accomplished: 1089,
      unit: 'children',
      status: 'on-track' as const,
    },
    {
      name: 'Referrals to Specialists',
      target: 45,
      accomplished: 48,
      unit: 'referrals',
      status: 'completed' as const,
    },
  ];

  const activities = data.activities || [
    {
      name: 'Infant and Young Child Feeding (IYCF) Program',
      startDate: 'Jan 2024',
      endDate: 'Dec 2024',
      participants: 284,
      output: 'Training modules developed and 4 sessions conducted',
      status: 'On-going',
    },
    {
      name: 'Supplementary Feeding Program (SFP)',
      startDate: 'Feb 2024',
      endDate: 'Dec 2024',
      participants: 312,
      output: 'Weekly meals provided to 312 malnourished children',
      status: 'On-going',
    },
    {
      name: 'School-Based Nutrition Program',
      startDate: 'Mar 2024',
      endDate: 'Nov 2024',
      participants: 456,
      output: 'Nutrition lessons integrated in 8 schools',
      status: 'Completed',
    },
    {
      name: 'Community Health Worker Capacity Building',
      startDate: 'Apr 2024',
      endDate: 'Jun 2024',
      participants: 85,
      output: '85 health workers trained on nutrition protocols',
      status: 'Completed',
    },
  ];

  const monthlyProgressData = data.monthlyProgress || [
    { month: 'Jan', target: 40, accomplished: 38, refferals: 3 },
    { month: 'Feb', target: 40, accomplished: 39, refferals: 4 },
    { month: 'Mar', target: 40, accomplished: 40, refferals: 3 },
    { month: 'Apr', target: 40, accomplished: 39, refferals: 5 },
    { month: 'May', target: 40, accomplished: 41, refferals: 4 },
    { month: 'Jun', target: 40, accomplished: 40, refferals: 4 },
  ];

  const totalAccomplished = metrics.reduce((sum, m) => sum + m.accomplished, 0);
  const totalTarget = metrics.reduce((sum, m) => sum + m.target, 0);
  const overallPercentage = ((totalAccomplished / totalTarget) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-slate-700 leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* Overall Performance */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{overallPercentage}%</p>
            <p className="text-sm text-slate-600 mt-1">Overall Accomplishment</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{metrics.filter(m => m.status === 'completed').length}</p>
            <p className="text-sm text-slate-600 mt-1">Targets Completed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{activities.length}</p>
            <p className="text-sm text-slate-600 mt-1">Active Programs</p>
          </div>
        </div>
      </div>

      {/* Monthly Progress Chart */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Progress Trend</h3>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyProgressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#94a3b8"
                strokeDasharray="5 5"
                name="Target"
              />
              <Line type="monotone" dataKey="accomplished" stroke="#3b82f6" name="Accomplished" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Key Program Metrics</h3>
        <div className="space-y-3">
          {metrics.map((metric, idx) => {
            const percentage = ((metric.accomplished / metric.target) * 100).toFixed(1);
            const isCompleted = metric.status === 'completed';
            const isAtRisk = metric.status === 'at-risk';

            return (
              <div
                key={idx}
                className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {isCompleted && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {!isCompleted && <Target className="w-5 h-5 text-blue-600" />}
                    <div>
                      <p className="font-semibold text-slate-900">{metric.name}</p>
                      <p className="text-xs text-slate-500">{metric.unit}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                      metric.status
                    )}`}
                  >
                    {percentage}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isCompleted
                        ? 'bg-green-500'
                        : isAtRisk
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, percentage as any)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-2">
                  <span>{metric.accomplished} accomplished</span>
                  <span>{metric.target} target</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Program Activities */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Program Activities</h3>
        <div className="space-y-3">
          {activities.map((activity, idx) => (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-slate-900">{activity.name}</h4>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    activity.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {activity.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2 text-xs">
                <div className="flex items-center gap-1 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {activity.startDate} - {activity.endDate}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <Users className="w-4 h-4" />
                  <span>{activity.participants} participants</span>
                </div>
              </div>
              <p className="text-sm text-slate-700">{activity.output}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
