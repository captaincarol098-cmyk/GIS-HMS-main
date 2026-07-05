"use client";
import "@/styles/admin.css";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  MapPin,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  CheckCircle,
  ArrowRight,
  Search,
  Filter,
  Download,
  Eye
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

interface PurokData {
  id: number;
  name: string;
  total_records: number;  // Total measurement records (OPT+ count)
  total_children: number;  // Unique children (for reference)
  active_cases: number;
  recovered_cases: number;
  programs_conducted: number;
  risk_level: string;
  risk_score: number;
  prevalence_rate: number;
  population: number;
  trend: string;
}

const RISK_COLORS = {
  low: "#10b981",
  moderate: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444"
};

export default function PurokMonitoringPage() {
  const { user } = useAuthStore();
  const [selectedPurok, setSelectedPurok] = useState<PurokData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  console.log(`[PurokMonitoring] Current year filter: ${yearFilter}`);

  const { data: puroks, isLoading } = useQuery({
    queryKey: ["purok-monitoring", yearFilter],
    queryFn: () => {
      console.log(`[PurokMonitoring] Fetching data for year: ${yearFilter}`);
      return api.get(`/api/purok-monitoring?year=${yearFilter}`).then((r) => {
        console.log(`[PurokMonitoring] Received ${r.data?.length || 0} puroks for year ${yearFilter}`);
        return r.data;
      });
    },
  });

  const filteredPuroks = puroks?.filter((purok: PurokData) => {
    const matchesSearch = purok.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = riskFilter === "all" || purok.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  }) || [];

  const sortedPuroks = [...filteredPuroks].sort((a: PurokData, b: PurokData) => {
    // Sort by risk score descending
    return b.risk_score - a.risk_score;
  });

  const riskDistribution = [
    { name: "Low Risk", value: puroks?.filter((p: PurokData) => p.risk_level === "low").length || 0, color: RISK_COLORS.low },
    { name: "Moderate", value: puroks?.filter((p: PurokData) => p.risk_level === "moderate").length || 0, color: RISK_COLORS.moderate },
    { name: "High Risk", value: puroks?.filter((p: PurokData) => p.risk_level === "high").length || 0, color: RISK_COLORS.high },
    { name: "Critical", value: puroks?.filter((p: PurokData) => p.risk_level === "critical").length || 0, color: RISK_COLORS.critical },
  ];

  const trendData = [
    { month: "Jan", cases: 45, recovered: 30 },
    { month: "Feb", cases: 52, recovered: 35 },
    { month: "Mar", cases: 48, recovered: 40 },
    { month: "Apr", cases: 55, recovered: 45 },
    { month: "May", cases: 50, recovered: 48 },
    { month: "Jun", cases: 42, recovered: 50 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading purok data...</div>
      </div>
    );
  }

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="admin-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purok Monitoring</h1>
          <p className="text-sm">Monitor and manage purok-level malnutrition data</p>
        </div>
        <div className="flex gap-2">
          <button className="admin-action-btn-secondary flex items-center gap-2 px-4 py-2.5 text-xs">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Puroks</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{puroks?.length || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Children</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {puroks?.reduce((sum: number, p: PurokData) => sum + p.total_children, 0) || 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Cases</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {puroks?.reduce((sum: number, p: PurokData) => sum + p.active_cases, 0) || 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Recovered</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {puroks?.reduce((sum: number, p: PurokData) => sum + p.recovered_cases, 0) || 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Purok Risk Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Monthly Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cases" stroke="#ef4444" name="Active Cases" />
                <Line type="monotone" dataKey="recovered" stroke="#10b981" name="Recovered" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Purok Ranking Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Purok Risk Ranking</h3>
            <div className="flex items-center gap-3">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(Number(e.target.value))}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
              >
                <option value={2024}>📅 2024</option>
                <option value={2025}>📅 2025</option>
                <option value={2026}>📅 2026</option>
              </select>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search purok..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Risk Levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Purok Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Level</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Score</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Children</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Cases</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prevalence</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Trend</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedPuroks.map((purok: PurokData, index: number) => (
                <tr key={purok.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                      index === 0 ? "bg-red-100 text-red-700" :
                      index === 1 ? "bg-orange-100 text-orange-700" :
                      index === 2 ? "bg-yellow-100 text-yellow-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{purok.name}</div>
                    <div className="text-xs text-slate-500">Pop: {purok.population}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      purok.risk_level === "critical" ? "bg-red-100 text-red-800" :
                      purok.risk_level === "high" ? "bg-orange-100 text-orange-800" :
                      purok.risk_level === "moderate" ? "bg-yellow-100 text-yellow-800" :
                      "bg-green-100 text-green-800"
                    }`}>
                      {purok.risk_level.charAt(0).toUpperCase() + purok.risk_level.slice(1)} Risk
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-900">{purok.risk_score.toFixed(1)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {purok.total_children}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-red-600">{purok.active_cases}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {purok.prevalence_rate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {purok.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    ) : purok.trend === "down" ? (
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    ) : (
                      <Activity className="h-4 w-4 text-slate-400" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedPurok(purok)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purok Detail Modal */}
      {selectedPurok && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{selectedPurok.name} Details</h2>
              <button
                onClick={() => setSelectedPurok(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Activity className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase">Population</p>
                  <p className="text-lg font-bold text-slate-900">{selectedPurok.population}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase">Total Children</p>
                  <p className="text-lg font-bold text-slate-900">{selectedPurok.total_children}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase">Active Cases</p>
                  <p className="text-lg font-bold text-red-600">{selectedPurok.active_cases}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase">Recovered Cases</p>
                  <p className="text-lg font-bold text-green-600">{selectedPurok.recovered_cases}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase">Programs Conducted</p>
                  <p className="text-lg font-bold text-blue-600">{selectedPurok.programs_conducted}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase">Prevalence Rate</p>
                  <p className="text-lg font-bold text-purple-600">{selectedPurok.prevalence_rate.toFixed(1)}%</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  View Children
                </button>
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                  Schedule Program
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
