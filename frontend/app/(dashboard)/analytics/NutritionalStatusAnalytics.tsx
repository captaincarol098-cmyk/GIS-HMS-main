"use client";
import "@/styles/analytics.css";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertCircle, TrendingDown, Users } from "lucide-react";

interface NutritionalStatusAnalyticsProps {
  selectedYear: number;
}

export function NutritionalStatusAnalytics({ selectedYear }: NutritionalStatusAnalyticsProps) {
  const analyticsQuery = useQuery({
    queryKey: ["nutritional-status-analytics", selectedYear],
    queryFn: async () => {
      const response = await api.get(`/api/operation-timbang/superadmin/opt-analytics?year=${selectedYear}`);
      console.log("Analytics Response:", response.data);
      return response.data;
    },
    refetchInterval: 15000,
    staleTime: 10000,
    retry: 2,
  });

  if (analyticsQuery.isLoading) {
    return (
      <div className="admin-glass-panel p-8 text-center">
        <div className="inline-flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
        <p className="text-sm text-slate-600 mt-4">Loading Nutritional Status...</p>
      </div>
    );
  }

  if (analyticsQuery.isError) {
    return (
      <div className="admin-glass-panel p-6 bg-red-50 border border-red-200">
        <AlertCircle className="h-5 w-5 text-red-600 inline mr-2" />
        <span className="text-sm font-bold text-red-900">Failed to Load Data</span>
      </div>
    );
  }

  const data = analyticsQuery.data || {};
  const nb = data.nutritional_status_breakdown || {};
  const wfa = nb.wfa || {};
  const hfa = nb.hfa || {};
  const whz = nb.whz || {};
  const summary = data.summary || {};

  const total = summary.total_children_measured || 0;
  const underweight = (wfa.underweight?.total || 0) + (wfa.severely_underweight?.total || 0);
  const stunted = (hfa.stunted?.total || 0) + (hfa.severely_stunted?.total || 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="stat-card">
          <div className="flex justify-between items-center">
            <div>
              <span className="stat-value">{total}</span>
              <p className="stat-label">Total Children</p>
            </div>
            <Users className="h-8 w-8 text-emerald-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-center">
            <div>
              <span className="stat-value text-red-600">{(summary.below_normal_percentage || 0).toFixed(1)}%</span>
              <p className="stat-label">Malnourished %</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-center">
            <div>
              <span className="stat-value text-amber-600">{underweight}</span>
              <p className="stat-label">Underweight</p>
            </div>
            <TrendingDown className="h-8 w-8 text-amber-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-center">
            <div>
              <span className="stat-value text-orange-600">{stunted}</span>
              <p className="stat-label">Stunted</p>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="chart-container h-64">
          <h3 className="chart-title text-xs mb-2">⚖️ Weight-for-Age</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: "Normal", value: wfa.normal?.total || 0, fill: "#10b981" },
                  { name: "UW", value: wfa.underweight?.total || 0, fill: "#f59e0b" },
                  { name: "Severe", value: wfa.severely_underweight?.total || 0, fill: "#ef4444" },
                ]}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
              >
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container h-64">
          <h3 className="chart-title text-xs mb-2">📏 Height-for-Age</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: "Normal", value: hfa.normal?.total || 0, fill: "#10b981" },
                  { name: "Stunted", value: hfa.stunted?.total || 0, fill: "#f59e0b" },
                  { name: "Severe", value: hfa.severely_stunted?.total || 0, fill: "#ef4444" },
                ]}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
              >
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container h-64">
          <h3 className="chart-title text-xs mb-2">📊 Weight-for-Height</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: "Normal", value: whz.normal?.total || 0, fill: "#10b981" },
                { name: "OW", value: whz.overweight?.total || 0, fill: "#3b82f6" },
                { name: "Wasted", value: whz.moderately_wasted?.total || 0, fill: "#f59e0b" },
                { name: "Severe", value: whz.severely_wasted?.total || 0, fill: "#ef4444" },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="chart-container bg-emerald-50/80 border-emerald-200">
        <h3 className="chart-title text-emerald-900 text-sm mb-3">💡 Insights</h3>
        <div className="text-xs space-y-2 text-emerald-950 font-medium">
          <p><strong>Underweight:</strong> {total > 0 ? ((underweight / total) * 100).toFixed(1) : 0}% of measured children</p>
          <p><strong>Stunted:</strong> {total > 0 ? ((stunted / total) * 100).toFixed(1) : 0}% of measured children</p>
          <p><strong>Wasted:</strong> {total > 0 ? (((whz.moderately_wasted?.total || 0) + (whz.severely_wasted?.total || 0)) / total * 100).toFixed(1) : 0}% of measured children</p>
        </div>
      </div>
    </div>
  );
}
