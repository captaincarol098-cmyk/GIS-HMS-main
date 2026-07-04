'use client';

import React from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
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

interface AlertStatistic {
  type: string;
  count: number;
  responseTime?: string;
  resolutionRate?: number;
}

interface AlertIncidentAnalysisData {
  alertStatistics?: AlertStatistic[];
  responseData?: any[];
  incidents?: any[];
  summary?: string;
}

export function AlertIncidentAnalysis({ data }: { data?: AlertIncidentAnalysisData }) {
  if (!data) {
    return (
      <div className="text-slate-500 italic">
        No alert and incident data available
      </div>
    );
  }

  const alertStats = data.alertStatistics || [
    { type: 'Severe Malnutrition', count: 38, responseTime: '2.4 hrs', resolutionRate: 92 },
    { type: 'Moderate Malnutrition', count: 92, responseTime: '4.2 hrs', resolutionRate: 88 },
    { type: 'At-Risk Cases', count: 156, responseTime: '6.8 hrs', resolutionRate: 82 },
    { type: 'Missed Follow-ups', count: 42, responseTime: '12.5 hrs', resolutionRate: 76 },
  ];

  const responseData = data.responseData || [
    { day: 'Mon', alerts: 24, resolved: 22, pending: 2 },
    { day: 'Tue', alerts: 28, resolved: 26, pending: 2 },
    { day: 'Wed', alerts: 31, resolved: 28, pending: 3 },
    { day: 'Thu', alerts: 26, resolved: 25, pending: 1 },
    { day: 'Fri', alerts: 29, resolved: 27, pending: 2 },
    { day: 'Sat', alerts: 18, resolved: 17, pending: 1 },
  ];

  const incidents = data.incidents || [
    {
      date: 'Dec 15, 2024',
      type: 'Severe Malnutrition Case',
      location: 'Barangay C',
      status: 'Resolved',
      action: 'Referred to hospital, provided supplements',
    },
    {
      date: 'Dec 14, 2024',
      type: 'Missed Immunization',
      location: 'Barangay A',
      status: 'Resolved',
      action: 'Home visit conducted, immunization completed',
    },
    {
      date: 'Dec 13, 2024',
      type: 'Potential Food Shortage',
      location: 'Barangay D',
      status: 'Escalated',
      action: 'Community support program initiated',
    },
  ];

  const totalAlerts = alertStats.reduce((sum, s) => sum + s.count, 0);
  const avgResolutionRate = (
    alertStats.reduce((sum, s) => sum + (s.resolutionRate || 0), 0) / alertStats.length
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{totalAlerts}</p>
          <p className="text-sm text-red-600 mt-1">Total Alerts</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{alertStats.length}</p>
          <p className="text-sm text-blue-600 mt-1">Alert Types</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{avgResolutionRate}%</p>
          <p className="text-sm text-green-600 mt-1">Avg Resolution Rate</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-700">24 hrs</p>
          <p className="text-sm text-purple-600 mt-1">Avg Response Time</p>
        </div>
      </div>

      {/* Alert Response Trend */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Weekly Alert Response Trend</h3>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={responseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="alerts" fill="#ef4444" name="Total Alerts" />
              <Bar dataKey="resolved" fill="#10b981" name="Resolved" />
              <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alert Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Alert Statistics by Type</h3>
        <div className="space-y-3">
          {alertStats.map((alert, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <h4 className="font-semibold text-slate-900">{alert.type}</h4>
                    <p className="text-xs text-slate-600">
                      {alert.count} cases recorded
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                  {alert.count}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {alert.responseTime && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Avg Response: {alert.responseTime}</span>
                  </div>
                )}
                {alert.resolutionRate && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Resolution: {alert.resolutionRate}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Incidents */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Incidents & Response</h3>
        <div className="space-y-3">
          {incidents.map((incident, idx) => (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-900">{incident.type}</p>
                  <p className="text-sm text-slate-600">{incident.date}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    incident.status === 'Resolved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {incident.status}
                </span>
              </div>
              <p className="text-sm text-slate-700 mb-2">
                <span className="font-semibold">Location:</span> {incident.location}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Action:</span> {incident.action}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">Alert Response Performance</h3>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Average alert response time: &lt;24 hours</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Resolution rate above 80% across all alert types</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Early warning system preventing 15+ potential crises</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Real-time notification system ensuring quick response</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
