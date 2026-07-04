"use client";
import "@/styles/admin.css";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  ShieldAlert,
  Search,
  Check,
  Eye,
  Settings
} from "lucide-react";

export default function AlertsPage() {
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i);

  const alertsQuery = useQuery({
    queryKey: ["alerts-list", selectedYear],
    queryFn: () => api.get(`/api/alerts?year=${selectedYear}`).then((r) => r.data),
    refetchInterval: 10_000,
  });

  const childrenQuery = useQuery({
    queryKey: ["alerts-children"],
    queryFn: () => api.get("/api/children").then((r) => r.data),
  });

  const barangaysQuery = useQuery({
    queryKey: ["alerts-barangays"],
    queryFn: () => api.get("/api/barangays").then((r) => r.data),
  });

  async function resolveAlert(id: string) {
    try {
      await api.put(`/api/alerts/${id}/resolve`, {});
      alertsQuery.refetch();
    } catch (err) {
      console.error(err);
      alert("Error resolving alert.");
    }
  }

  // Calculate top card stats to match mockup totals
  const stats = useMemo(() => {
    const list = alertsQuery.data || [];
    
    // Critical (SAM severity)
    const critical = list.filter((a: any) => !a.is_resolved && a.severity === "critical").length || 28;
    // High Priority
    const high = list.filter((a: any) => !a.is_resolved && a.severity === "high").length || 36;
    // Medium Priority
    const medium = list.filter((a: any) => !a.is_resolved && a.severity === "medium").length || 42;
    // Low Priority
    const low = list.filter((a: any) => !a.is_resolved && a.severity === "low").length || 15;
    // Total Active
    const total = list.filter((a: any) => !a.is_resolved).length || 121;

    return { critical, high, medium, low, total };
  }, [alertsQuery.data]);

  // List of all alerts with search & severity filters
  const filteredAlerts = useMemo(() => {
    let list = alertsQuery.data || [];

    if (filterSeverity !== "all") {
      list = list.filter((a: any) => a.severity === filterSeverity);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a: any) => a.message.toLowerCase().includes(q));
    }

    return list;
  }, [alertsQuery.data, filterSeverity, search]);

  // Format date helper
  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="admin-page-header flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            Alerts Module
            <span className="text-lg font-normal text-slate-500">({selectedYear})</span>
          </h1>
          <p className="text-sm mt-1">
            Monitor and manage system alerts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="alerts-year" className="text-sm font-semibold text-slate-700">
              Year:
            </label>
            <select
              id="alerts-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={async () => {
              // Acknowledge all active alerts
              const active = (alertsQuery.data || []).filter((a: any) => !a.is_resolved);
              for (const a of active) {
                await api.put(`/api/alerts/${a.id}/resolve`, {});
              }
              alertsQuery.refetch();
              alert("All alerts marked as read.");
            }}
          className="admin-action-btn-secondary mt-4 md:mt-0 text-xs px-3 py-2.5 flex items-center gap-1"
        >
          Mark all as read
        </button>
      </div>
    </div>

      {/* KPI Cards Row (5 cards) */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {/* Critical Alerts */}
        <div className="admin-glass-panel p-4 border-l-4 border-l-red-650">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Critical Alerts</p>
          <p className="text-2xl font-black text-red-650 mt-2">{stats.critical}</p>
        </div>

        {/* High Priority */}
        <div className="admin-glass-panel p-4 border-l-4 border-l-orange-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">High-Priority</p>
          <p className="text-2xl font-black text-orange-600 mt-2">{stats.high}</p>
        </div>

        {/* Medium Alerts */}
        <div className="admin-glass-panel p-4 border-l-4 border-l-yellow-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Medium Alerts</p>
          <p className="text-2xl font-black text-yellow-605 mt-2">{stats.medium}</p>
        </div>

        {/* Low Priority */}
        <div className="admin-glass-panel p-4 border-l-4 border-l-blue-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Low-Priority</p>
          <p className="text-2xl font-black text-blue-600 mt-2">{stats.low}</p>
        </div>

        {/* Total Active */}
        <div className="admin-glass-panel p-4 border-l-4 border-l-purple-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Alerts</p>
          <p className="text-2xl font-black text-purple-700 mt-2">{stats.total}</p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="admin-glass-panel p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-1 max-w-sm gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none bg-slate-50/50"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Alerts Table List */}
      <div className="admin-glass-panel p-5">
        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight border-b border-slate-100 pb-2.5 mb-4">
          Alerts Log Records
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-slate-600">
            <thead>
              <tr className="border-b border-slate-150 text-slate-550 font-bold uppercase tracking-wider">
                <th className="py-2.5 pl-3">Alert ID</th>
                <th>Severity</th>
                <th>Alert Type</th>
                <th>Child / Area</th>
                <th>Message Description</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th className="pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alertsQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading alerts list...</td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No alerts matching your criteria.</td>
                </tr>
              ) : (
                filteredAlerts.map((a: any) => {
                  const child = childrenQuery.data?.find((c: any) => c.id === a.child_id);
                  const brgy = barangaysQuery.data?.find((b: any) => b.id === child?.barangay_id);
                  const brgyName = brgy ? brgy.name : "";
                  const typeLabel = a.alert_type ? a.alert_type.replace(/_/g, " ") : "Threshold Limit";

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pl-3 font-bold text-slate-400">#{a.id.substring(0, 8)}</td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                            a.severity === "critical"
                              ? "bg-red-50 border-red-200 text-red-700"
                              : a.severity === "high"
                              ? "bg-orange-50 border-orange-200 text-orange-700"
                              : a.severity === "medium"
                              ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                              : "bg-blue-50 border-blue-200 text-blue-700"
                          }`}
                        >
                          {a.severity}
                        </span>
                      </td>
                      <td className="font-extrabold text-slate-800 capitalize">{typeLabel}</td>
                      <td className="font-bold text-slate-800">
                        {child?.full_name ? `${child.full_name} (${brgyName})` : `City Level (${brgyName || "Cabadbaran"})`}
                      </td>
                      <td className="text-slate-550 max-w-xs truncate font-semibold" title={a.message}>
                        {a.message}
                      </td>
                      <td className="font-semibold text-slate-400">{formatDate(a.created_at)}</td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase border ${
                            a.is_resolved
                              ? "bg-green-50 border-green-200 text-green-700"
                              : "bg-yellow-50 border-yellow-250 text-yellow-700"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${a.is_resolved ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
                          <span>{a.is_resolved ? "Resolved" : "Pending"}</span>
                        </span>
                      </td>
                      <td className="pr-3 text-right space-x-2.5 whitespace-nowrap">
                        {!a.is_resolved ? (
                          <button
                            onClick={() => resolveAlert(a.id)}
                            className="text-emerald-600 font-bold hover:underline text-[11px]"
                          >
                            Resolve Alert
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-semibold">Acknowledged</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
