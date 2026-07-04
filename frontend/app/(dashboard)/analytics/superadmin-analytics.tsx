"use client";
import "@/styles/admin.css";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Brain,
  Zap
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area
} from "recharts";
import { SuperAdminAIInsightsWidget } from "@/components/dashboard/SuperAdminAIInsightsWidget";

interface SuperAdminAnalyticsProps {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  expandedForecast: boolean;
  setExpandedForecast: (value: boolean) => void;
  isRefreshing: boolean;
  handleRefresh: () => Promise<void>;
  summary: any;
  childMonitoring: any;
  trendData: any[];
  forecastData: any[];
}

export function SuperAdminAnalytics({
  selectedYear,
  setSelectedYear,
  expandedForecast,
  setExpandedForecast,
  isRefreshing,
  handleRefresh,
  summary,
  childMonitoring,
  trendData,
  forecastData,
}: SuperAdminAnalyticsProps) {
  // Generate year options (2020-2030)
  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i);
  
  // City-wide AI Insights Query (different from admin endpoint) with year filter
  const aiInsightsQuery = useQuery({
    queryKey: ["analytics-ai-insights-superadmin", selectedYear],
    queryFn: async () => {
      try {
        console.log("🔍 Fetching SuperAdmin AI Insights from:", `/api/dashboard/superadmin/ai-insights?year=${selectedYear}`);
        const response = await api.get(`/api/dashboard/superadmin/ai-insights?year=${selectedYear}`);
        console.log("✅ SuperAdmin AI Insights Response:", response.data);
        return response.data;
      } catch (error: any) {
        console.error("❌ Failed to fetch SuperAdmin AI insights:", error);
        console.error("Error status:", error.response?.status);
        console.error("Error data:", error.response?.data);
        console.error("Request URL:", error.config?.url);
        console.error("Base URL:", error.config?.baseURL);
        throw error;
      }
    },
    refetchInterval: 10000, // 10 seconds - Real-time
    refetchOnWindowFocus: true,
    staleTime: 5000,
    retry: 2, // Retry twice before showing error
    retryDelay: 1000, // Wait 1 second between retries
  });

  const pieData = getSuperAdminPieData(childMonitoring.data);
  const barangayComparison = getSuperAdminBarangayComparison(childMonitoring.data);
  const cityTotals = getSuperAdminCityTotals(summary.data);

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="admin-page-header flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            📊 City-Wide Analytics Dashboard
            <span className="text-lg font-normal text-slate-500">({selectedYear})</span>
          </h1>
          <p className="text-sm mt-1">
            City-level nutrition data & AI strategic analysis (Real-time • Auto-refresh every 10s)
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-3">
          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="analytics-year" className="text-xs font-semibold text-slate-600">
              Year:
            </label>
            <select
              id="analytics-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="admin-action-btn-secondary inline-flex items-center gap-2 disabled:opacity-50 px-3 py-2.5 text-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Now"}
          </button>
          <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>May 1 - May 20, 2026</span>
          </div>
        </div>
      </div>

      {/* AI INSIGHTS SECTION - City-Wide Strategic Analysis */}
      <div className="admin-glass-panel p-6 border-l-4 border-l-emerald-500">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="h-6 w-6 text-emerald-600" />
          <h2 className="text-lg font-extrabold text-slate-900">🤖 City-Wide AI Strategic Insights</h2>
        </div>
        
        {/* Debugging info - shows backend connection status */}
        {!aiInsightsQuery.data && !aiInsightsQuery.isLoading && !aiInsightsQuery.isError && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-xs text-blue-800">
              🔄 Initializing AI Insights... Check browser console for details.
            </p>
          </div>
        )}
        
        {/* Debug/Error info */}
        {aiInsightsQuery.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900 mb-2">
                  Failed to Load AI Insights
                </p>
                <p className="text-xs text-red-800 mb-2">
                  {(() => {
                    const err = aiInsightsQuery.error as any;
                    if (err?.response?.status === 404) {
                      return "Endpoint not found (404). Backend server may not be running or endpoint not configured.";
                    } else if (err?.response?.status === 403) {
                      return "Access denied (403). You must be logged in as super_admin.";
                    } else if (err?.response?.status === 401) {
                      return "Unauthorized (401). Please log in again.";
                    } else if (err?.code === "ERR_NETWORK") {
                      return "Network error. Cannot connect to backend server.";
                    }
                    return err?.toString() || "Unknown error";
                  })()}
                </p>
                <details className="text-xs text-red-700">
                  <summary className="cursor-pointer font-semibold hover:text-red-900">
                    Troubleshooting Steps
                  </summary>
                  <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                    <li>✅ Check backend server is running: <code className="bg-red-100 px-1 rounded">http://localhost:8000</code></li>
                    <li>✅ Verify you're logged in as <strong>super_admin</strong> (not regular admin)</li>
                    <li>✅ Test endpoint directly: <code className="bg-red-100 px-1 rounded">GET /api/dashboard/superadmin/ai-insights</code></li>
                    <li>✅ Check browser console (F12) for detailed error logs</li>
                    <li>✅ Ensure database has children data with measurements</li>
                    <li>✅ Try refreshing the page or logging out and back in</li>
                  </ul>
                </details>
              </div>
            </div>
          </div>
        )}
        <SuperAdminAIInsightsWidget
          data={aiInsightsQuery.data}
          isLoading={aiInsightsQuery.isLoading}
        />
      </div>

      {/* Main Charts Grid - City Level */}
      <div className="grid gap-6 md:grid-cols-2 auto-rows-max">
        {/* Card 1: City Malnutrition Trend (Monthly) */}
        <div className="admin-glass-panel p-5 h-[320px] flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight mb-4">
            🏙️ City Malnutrition Trend (Monthly)
          </h3>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Underweight" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Stunted" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Wasted" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: City Nutritional Status Distribution */}
        <div className="admin-glass-panel p-5 h-[320px] flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight mb-2">
            🏙️ City Nutritional Status Distribution
          </h3>
          <div className="relative flex-1 min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${v} Children`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-5px]">
              <span className="text-xl font-black text-slate-850">{cityTotals.total.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total City Children</span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-0.5 border-t border-slate-100 pt-3 text-center">
            {pieData.map((d) => (
              <div key={d.name}>
                <p className="text-xs font-black" style={{ color: d.color }}>{d.percent}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide truncate mt-0.5">{d.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Barangay Comparison - Malnutrition Rates */}
        <div className="admin-glass-panel p-5 h-auto flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight mb-4">
            📊 Top 10 Barangay Comparison (Malnutrition Rate)
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barangayComparison}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} stroke="#e2e8f0" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: "#64748b" }} stroke="#e2e8f0" width={175} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="rate" fill="#ef4444" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: City Risk Distribution */}
        <div className="admin-glass-panel p-5 h-auto flex flex-col justify-between">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight border-b border-slate-100 pb-2.5">
            ⚠️ City Risk Classification
          </h3>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Low Risk</p>
              <p className="text-3xl font-black text-green-700">
                {cityTotals.low}
              </p>
              <p className="text-xs text-green-600 mt-1">{((cityTotals.low / cityTotals.total) * 100).toFixed(1)}% of population</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
              <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-1">At Risk</p>
              <p className="text-3xl font-black text-yellow-700">
                {cityTotals.atRisk}
              </p>
              <p className="text-xs text-yellow-600 mt-1">{((cityTotals.atRisk / cityTotals.total) * 100).toFixed(1)}% of population</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-1">High Risk</p>
              <p className="text-3xl font-black text-orange-700">
                {cityTotals.highRisk}
              </p>
              <p className="text-xs text-orange-600 mt-1">{((cityTotals.highRisk / cityTotals.total) * 100).toFixed(1)}% of population</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Critical (SAM)</p>
              <p className="text-3xl font-black text-red-700">
                {cityTotals.critical}
              </p>
              <p className="text-xs text-red-600 mt-1">{((cityTotals.critical / cityTotals.total) * 100).toFixed(1)}% of population</p>
            </div>
          </div>
        </div>

        {/* Card 5: City Predictive Forecast Chart */}
        <div className="col-span-full admin-glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
              🔮 City-Wide Predictive Forecast (Next 3 Months)
            </h3>
            <button
              onClick={() => setExpandedForecast(!expandedForecast)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {expandedForecast ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>
          </div>

          {expandedForecast && (
            <>
              {/* Forecast Chart */}
              <div className="h-[280px] mb-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" domain={[10, 20]} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="#818cf8" fillOpacity={0.15} name="Upper Bound" />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="#818cf8" fillOpacity={0.15} name="Lower Bound" />
                    <Line type="monotone" dataKey="actual" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4 }} name="Actual Rate" />
                    <Line type="monotone" dataKey="forecast" stroke="#818cf8" strokeDasharray="4 4" strokeWidth={2} dot={false} name="Forecast Rate" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Forecast Confidence Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2.5">
                  <Zap className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-blue-900 mb-1">📈 City-Wide Forecast Insights</h4>
                    <p className="text-[11px] text-blue-800">
                      City-wide analytics and AI strategic recommendations update every 10 seconds. Analysis incorporates all barangay data, city health policies, WHO standards, and NNC guidelines. Critical city-wide alerts activate automatically for coordinated response.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Card 6: City Coverage Overview */}
        <div className="col-span-full admin-glass-panel p-5 bg-gradient-to-r from-slate-50 to-blue-50">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight mb-4">
            🏥 City Coverage & Program Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Total Children Monitored</p>
              <p className="text-3xl font-black text-slate-900">{cityTotals.total.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-2">Across all barangays in city</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Unique Barangays</p>
              <p className="text-3xl font-black text-teal-600">{barangayComparison.length}</p>
              <p className="text-xs text-slate-500 mt-2">Coverage areas</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Average Malnutrition Rate</p>
              <p className="text-3xl font-black text-orange-600">
                {(barangayComparison.reduce((sum: number, b: any) => sum + b.rate, 0) / barangayComparison.length).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-2">City average</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Data Freshness</p>
              <p className="text-xl font-black text-green-600">Live</p>
              <p className="text-xs text-slate-500 mt-2">Real-time updates every 10s</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions for SuperAdmin data
function getSuperAdminPieData(data: any) {
  if (data?.barangay_summary) {
    const summary_data = data.barangay_summary;
    const total = summary_data.total_children || 1;
    const normal_percent = ((summary_data.normal / total) * 100).toFixed(1);
    const underweight_percent = ((summary_data.underweight / total) * 100).toFixed(1);
    const stunted_percent = ((summary_data.stunted / total) * 100).toFixed(1);
    const wasted_percent = ((summary_data.wasted / total) * 100).toFixed(1);
    const severe_percent = ((summary_data.sam / total) * 100).toFixed(1);

    return [
      { name: "Normal", value: summary_data.normal, color: "#10b981", percent: `${normal_percent}%` },
      { name: "Underweight", value: summary_data.underweight, color: "#fbbf24", percent: `${underweight_percent}%` },
      { name: "Stunted", value: summary_data.stunted, color: "#f97316", percent: `${stunted_percent}%` },
      { name: "Wasted", value: summary_data.wasted, color: "#ef4444", percent: `${wasted_percent}%` },
      { name: "Severe", value: summary_data.sam, color: "#b91c1c", percent: `${severe_percent}%` }
    ];
  }
  return [
    { name: "Normal", value: 1255, color: "#10b981", percent: "51.2%" },
    { name: "Underweight", value: 411, color: "#fbbf24", percent: "16.8%" },
    { name: "Stunted", value: 487, color: "#f97316", percent: "19.9%" },
    { name: "Wasted", value: 198, color: "#ef4444", percent: "8.1%" },
    { name: "Severe", value: 102, color: "#b91c1c", percent: "4.1%" }
  ];
}

function getSuperAdminBarangayComparison(data: any) {
  // Mock data for now - would come from API in production
  return [
    { name: "Barangay A", rate: 18.5 },
    { name: "Barangay B", rate: 17.2 },
    { name: "Barangay C", rate: 16.8 },
    { name: "Barangay D", rate: 15.9 },
    { name: "Barangay E", rate: 15.3 },
    { name: "Barangay F", rate: 14.7 },
    { name: "Barangay G", rate: 14.2 },
    { name: "Barangay H", rate: 13.8 },
    { name: "Barangay I", rate: 13.1 },
    { name: "Barangay J", rate: 12.9 }
  ];
}

function getSuperAdminCityTotals(data: any) {
  const total = data?.total_children || 2453;
  const normal = Math.round(total * 0.512);
  const low = normal;
  const atRisk = Math.round(total * 0.168); // underweight
  const highRisk = Math.round(total * 0.199); // stunted
  const critical = Math.round(total * 0.081); // wasted + severe

  return { total, low, atRisk, highRisk, critical };
}
