"use client";
import "@/styles/admin.css";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Panel } from "@/components/ui/Panel";
import { Search, ChevronDown, Check, FileText, Calendar, Plus, RefreshCw, ArrowUpRight, ArrowDownRight, UserCheck } from "lucide-react";

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const logs = useQuery({
    queryKey: ["logs"],
    queryFn: () => api.get("/api/logs").then((r) => r.data),
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/api/users").then((r) => r.data),
    retry: false,
  });

  const barangaysQuery = useQuery({
    queryKey: ["barangays"],
    queryFn: () => api.get("/api/barangays").then((r) => r.data),
  });

  // Helper mapping log actions to human readable elements
  const logMap = useMemo(() => {
    return {
      CREATE_CHILD: {
        title: "Added health entry",
        desc: "Added manual health data for Operation Timbang",
        badge: "data entry",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-100",
        icon: <Plus className="h-4.5 w-4.5 text-blue-500" />,
        iconBg: "bg-blue-100 border-blue-200",
      },
      UPDATE_CHILD: {
        title: "Updated health entry",
        desc: "Modified child record details",
        badge: "data entry",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-100",
        icon: <Plus className="h-4.5 w-4.5 text-blue-500" />,
        iconBg: "bg-blue-100 border-blue-200",
      },
      CREATE_REFERRAL: {
        title: "Created referral",
        desc: "Referred child to health facility for specialized care",
        badge: "referral",
        badgeColor: "bg-red-50 text-red-700 border-red-100",
        icon: <ArrowUpRight className="h-4.5 w-4.5 text-red-500" />,
        iconBg: "bg-red-100 border-red-200",
      },
      UPDATE_REFERRAL_STATUS: {
        title: "Updated referral status",
        desc: "Outcome recorded and referral status updated",
        badge: "referral",
        badgeColor: "bg-red-50 text-red-700 border-red-100",
        icon: <ArrowUpRight className="h-4.5 w-4.5 text-red-500" />,
        iconBg: "bg-red-100 border-red-200",
      },
      RESOLVE_ALERT: {
        title: "Acknowledged alert",
        desc: "Resolved malnutrition or trend warning alert",
        badge: "alert",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-100",
        icon: <UserCheck className="h-4.5 w-4.5 text-amber-500" />,
        iconBg: "bg-amber-100 border-amber-200",
      },
      GENERATE_REPORT: {
        title: "Generated comprehensive report",
        desc: "Generated assessment report for City Health Office",
        badge: "report",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-100",
        icon: <FileText className="h-4.5 w-4.5 text-purple-500" />,
        iconBg: "bg-purple-100 border-purple-200",
      },
      IMPORT: {
        title: "Bulk imported data",
        desc: "Imported children records from Operation Timbang CSV",
        badge: "import",
        badgeColor: "bg-green-50 text-green-700 border-green-100",
        icon: <Plus className="h-4.5 w-4.5 text-green-500" />,
        iconBg: "bg-green-100 border-green-200",
      },
    };
  }, []);

  // Filter logs locally
  const filteredLogs = useMemo(() => {
    const list = logs.data || [];
    return list.filter((log: any) => {
      // Category filter
      const mapped = (logMap as any)[log.action];
      const logBadge = mapped ? mapped.badge : "system";
      if (category !== "all" && logBadge !== category) return false;

      // Search query filter
      if (search) {
        const query = search.toLowerCase();
        const matchesAction = log.action.toLowerCase().includes(query);
        const matchesResource = log.resource_type?.toLowerCase().includes(query);
        const matchesTitle = mapped?.title.toLowerCase().includes(query);
        const matchesDesc = mapped?.desc.toLowerCase().includes(query);
        return matchesAction || matchesResource || matchesTitle || matchesDesc;
      }
      return true;
    });
  }, [logs.data, search, category, logMap]);

  // Format date helper
  function formatLogDate(dateStr: string) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="admin-page-header">
        <h1 className="text-2xl font-bold">Activity Logs</h1>
        <p className="text-sm mt-1">Track all system activities and changes</p>
      </div>

      {/* Filters Panel */}
      <div className="admin-glass-panel p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <ChevronDown className="h-4 w-4" />
          <span>Filters</span>
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Search */}
          <label className="block text-sm">
            <span className="text-slate-500 font-bold block mb-1">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-404" />
              <input
                className="admin-interactive-input w-full rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700"
                placeholder="Search activities.."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>

          {/* Category */}
          <label className="block text-sm">
            <span className="text-slate-500 font-bold block mb-1">Category</span>
            <select
              className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm bg-white text-slate-700"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All Activities</option>
              <option value="data entry">Data Entry</option>
              <option value="referral">Referral</option>
              <option value="alert">Alerts</option>
              <option value="report">Reports</option>
              <option value="import">Imports</option>
            </select>
          </label>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="admin-glass-panel p-5 space-y-5">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Activity Timeline ({filteredLogs.length} entries)
        </h2>

        {logs.isLoading ? (
          <div className="py-8 text-center text-slate-500">Loading activity timeline...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 italic">No activity logs match the filters.</div>
        ) : (
          <div className="relative admin-timeline-line ml-4.5 space-y-6">
            {filteredLogs.map((log: any) => {
              // Map log type details
              const mapped = (logMap as any)[log.action] || {
                title: log.action.replace(/_/g, " ").toLowerCase(),
                desc: `Performed operations on ${log.resource_type || "system"}`,
                badge: "system",
                badgeColor: "bg-slate-50 text-slate-700 border-slate-100",
                icon: <RefreshCw className="h-4 w-4 text-slate-500" />,
                iconBg: "bg-slate-100 border-slate-200",
              };

              // User details
              const userObj = usersQuery.data?.find((u: any) => u.id === log.user_id);
              const username = userObj ? userObj.username : "System";
              const userRole = userObj ? userObj.role.replace(/_/g, " ") : "Admin";
              const brgy = barangaysQuery.data?.find((b: any) => b.id === userObj?.barangay_id);
              const brgyName = brgy ? brgy.name : "City Health Office";

              return (
                <div key={log.id} className="relative pl-7 transition-all duration-200">
                  {/* Timeline icon */}
                  <div className={`absolute -left-4.5 top-0.5 h-9 w-9 rounded-full border flex items-center justify-center ${mapped.iconBg} admin-timeline-node z-10 shrink-0`}>
                    {mapped.icon}
                  </div>

                  {/* Log details card */}
                  <div className="bg-white border border-slate-100 hover:border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-800 text-base leading-tight capitalize">
                        {mapped.title}
                      </h3>
                      <p className="text-sm text-slate-550">{mapped.desc}</p>
                      <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">
                        {formatLogDate(log.created_at)} by <span className="text-slate-600 font-semibold">{username}</span> ({userRole}) • {brgyName}
                      </p>
                    </div>

                    {/* Action Category Badge */}
                    <span className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wider border shrink-0 self-start sm:self-center ${mapped.badgeColor}`}>
                      {mapped.badge}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
