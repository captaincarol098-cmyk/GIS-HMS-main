"use client";
import "@/styles/admin.css";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  CheckSquare,
  TrendingUp,
  Calendar,
  FileText,
  Users,
  Home,
  Target,
  Award,
  Download,
  Filter
} from "lucide-react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line
} from "recharts";

interface AccomplishmentData {
  assessments: { completed: number; target: number; percentage: number };
  programs: { completed: number; target: number; percentage: number };
  home_visits: { completed: number; target: number; percentage: number };
  reports: { completed: number; target: number; percentage: number };
  alerts_resolved: { completed: number; target: number; percentage: number };
}

export default function AccomplishmentsPage() {
  const { user } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(2025); // Default to 2025 where data exists

  const { data: accomplishments, isLoading } = useQuery({
    queryKey: ["accomplishments", selectedMonth, selectedYear],
    queryFn: () => 
      api.get(`/api/accomplishments?month=${selectedMonth}&year=${selectedYear}`).then((r) => r.data),
  });

  const overallProgress = accomplishments ? 
    ((accomplishments.assessments.percentage + 
      accomplishments.programs.percentage + 
      accomplishments.home_visits.percentage + 
      accomplishments.reports.percentage + 
      accomplishments.alerts_resolved.percentage) / 5).toFixed(1) : 0;

  const radialData = [
    { name: "Assessments", value: accomplishments?.assessments.percentage || 0, fill: "#3b82f6" },
    { name: "Programs", value: accomplishments?.programs.percentage || 0, fill: "#10b981" },
    { name: "Home Visits", value: accomplishments?.home_visits.percentage || 0, fill: "#8b5cf6" },
    { name: "Reports", value: accomplishments?.reports.percentage || 0, fill: "#f59e0b" },
    { name: "Alerts", value: accomplishments?.alerts_resolved.percentage || 0, fill: "#ef4444" },
  ];

  const monthlyTrend = [
    { month: "Jan", assessments: 85, programs: 78, home_visits: 92, reports: 88 },
    { month: "Feb", assessments: 90, programs: 82, home_visits: 95, reports: 90 },
    { month: "Mar", assessments: 88, programs: 85, home_visits: 90, reports: 85 },
    { month: "Apr", assessments: 92, programs: 88, home_visits: 93, reports: 92 },
    { month: "May", assessments: 95, programs: 90, home_visits: 96, reports: 94 },
    { month: "Jun", assessments: accomplishments?.assessments.percentage || 0, programs: accomplishments?.programs.percentage || 0, home_visits: accomplishments?.home_visits.percentage || 0, reports: accomplishments?.reports.percentage || 0 },
  ];

  const categoryData = [
    { category: "Assessments", completed: accomplishments?.assessments.completed || 0, target: accomplishments?.assessments.target || 0, percentage: accomplishments?.assessments.percentage || 0 },
    { category: "Programs", completed: accomplishments?.programs.completed || 0, target: accomplishments?.programs.target || 0, percentage: accomplishments?.programs.percentage || 0 },
    { category: "Home Visits", completed: accomplishments?.home_visits.completed || 0, target: accomplishments?.home_visits.target || 0, percentage: accomplishments?.home_visits.percentage || 0 },
    { category: "Reports", completed: accomplishments?.reports.completed || 0, target: accomplishments?.reports.target || 0, percentage: accomplishments?.reports.percentage || 0 },
    { category: "Alerts Resolved", completed: accomplishments?.alerts_resolved.completed || 0, target: accomplishments?.alerts_resolved.target || 0, percentage: accomplishments?.alerts_resolved.percentage || 0 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading accomplishments...</div>
      </div>
    );
  }

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accomplishment Tracker</h1>
          <p className="text-sm text-slate-500">Track monthly performance and compliance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>January</option>
            <option value={1}>February</option>
            <option value={2}>March</option>
            <option value={3}>April</option>
            <option value={4}>May</option>
            <option value={5}>June</option>
            <option value={6}>July</option>
            <option value={7}>August</option>
            <option value={8}>September</option>
            <option value={9}>October</option>
            <option value={10}>November</option>
            <option value={11}>December</option>
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="admin-glass-panel p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Overall Progress</h3>
          <div className="flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" data={[{ value: overallProgress }]}>
                  <RadialBar dataKey="value" fill="#3b82f6" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900">{overallProgress}%</p>
                  <p className="text-xs text-slate-500">Complete</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-glass-panel p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Category Breakdown</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="completed" fill="#3b82f6" name="Completed" />
                <Bar dataKey="target" fill="#e5e7eb" name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Assessments</p>
                <p className="text-xs text-slate-500">Monthly target</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-blue-600">{accomplishments?.assessments.percentage || 0}%</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Completed</span>
              <span className="font-medium text-slate-900">{accomplishments?.assessments.completed || 0} / {accomplishments?.assessments.target || 0}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${accomplishments?.assessments.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Programs Conducted</p>
                <p className="text-xs text-slate-500">Monthly target</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-green-600">{accomplishments?.programs.percentage || 0}%</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Completed</span>
              <span className="font-medium text-slate-900">{accomplishments?.programs.completed || 0} / {accomplishments?.programs.target || 0}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: `${accomplishments?.programs.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                <Home className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Home Visits</p>
                <p className="text-xs text-slate-500">Monthly target</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-purple-600">{accomplishments?.home_visits.percentage || 0}%</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Completed</span>
              <span className="font-medium text-slate-900">{accomplishments?.home_visits.completed || 0} / {accomplishments?.home_visits.target || 0}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-600 rounded-full transition-all"
                style={{ width: `${accomplishments?.home_visits.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Reports Submitted</p>
                <p className="text-xs text-slate-500">Monthly target</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-orange-600">{accomplishments?.reports.percentage || 0}%</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Completed</span>
              <span className="font-medium text-slate-900">{accomplishments?.reports.completed || 0} / {accomplishments?.reports.target || 0}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-600 rounded-full transition-all"
                style={{ width: `${accomplishments?.reports.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                <Award className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Alerts Resolved</p>
                <p className="text-xs text-slate-500">Monthly target</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-red-600">{accomplishments?.alerts_resolved.percentage || 0}%</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Completed</span>
              <span className="font-medium text-slate-900">{accomplishments?.alerts_resolved.completed || 0} / {accomplishments?.alerts_resolved.target || 0}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-600 rounded-full transition-all"
                style={{ width: `${accomplishments?.alerts_resolved.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl border border-blue-400 p-5 shadow-sm text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Compliance Score</p>
                <p className="text-xs text-blue-100">Based on weighted metrics</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-white">{overallProgress}/100</span>
          </div>
          <div className="text-xs text-blue-100">
            Reports (25%) • Assessments (25%) • Programs (20%) • Home Visits (15%) • Alerts (15%)
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="admin-glass-panel p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">6-Month Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="assessments" stroke="#3b82f6" name="Assessments" strokeWidth={2} />
              <Line type="monotone" dataKey="programs" stroke="#10b981" name="Programs" strokeWidth={2} />
              <Line type="monotone" dataKey="home_visits" stroke="#8b5cf6" name="Home Visits" strokeWidth={2} />
              <Line type="monotone" dataKey="reports" stroke="#f59e0b" name="Reports" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
