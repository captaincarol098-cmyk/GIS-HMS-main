"use client";
import "@/styles/admin.css";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  Zap,
  Users,
  Activity,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Heart,
  FileText,
  Home,
  Target,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";

interface Activity {
  id: string;
  type: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
  location?: string;
}

interface LiveStatus {
  online_users: number;
  active_activities: number;
  ongoing_programs: number;
  pending_alerts: number;
  sync_status: "online" | "offline";
  last_sync: string;
}

export default function RealtimeMonitoringPage() {
  const { user } = useAuthStore();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["realtime-activities"],
    queryFn: () => api.get("/api/realtime/activities", { timeout: 5000 }).then((r) => r.data),
    refetchInterval: autoRefresh ? 15000 : false, // Increase to 15s (was 10s)
    staleTime: 5000, // Cache for 5 seconds
    retry: 1, // Only retry once
    retryDelay: 1000,
  });

  const { data: liveStatus } = useQuery({
    queryKey: ["realtime-status"],
    queryFn: () => api.get("/api/realtime/status", { timeout: 5000 }).then((r) => r.data),
    refetchInterval: autoRefresh ? 15000 : false, // Increase to 15s (was 5s)
    staleTime: 5000, // Cache for 5 seconds
    retry: 1, // Only retry once
    retryDelay: 1000,
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "assessment":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "program":
        return <Target className="h-4 w-4 text-green-500" />;
      case "home_visit":
        return <Home className="h-4 w-4 text-purple-500" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "intervention":
        return <Heart className="h-4 w-4 text-pink-500" />;
      default:
        return <Activity className="h-4 w-4 text-slate-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (activitiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading real-time data...</div>
      </div>
    );
  }

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="admin-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Real-Time Monitoring Center</h1>
          <p className="text-sm">Live activity feed and system status</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Live" : "Paused"}
          </button>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            liveStatus?.sync_status === "online" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {liveStatus?.sync_status === "online" ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {liveStatus?.sync_status === "online" ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {/* Live Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Online Users</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{liveStatus?.online_users || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Active now
          </div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Activities</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{liveStatus?.active_activities || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">Ongoing operations</div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ongoing Programs</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{liveStatus?.ongoing_programs || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">Programs in progress</div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending Alerts</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{liveStatus?.pending_alerts || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
              <Bell className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Requires attention
          </div>
        </div>
      </div>

      {/* Sync Status */}
      <div className="admin-glass-panel p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${liveStatus?.sync_status === "online" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-sm font-medium text-slate-900">
              {liveStatus?.sync_status === "online" ? "Real-time Sync Connected" : "Sync Disconnected"}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Last sync: {liveStatus?.last_sync || "Never"}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="admin-glass-panel">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Real-Time Activity Feed</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Activity className="h-3 w-3" />
              Auto-refreshing every 15s
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
          {activities?.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm">No recent activities</p>
            </div>
          ) : (
            activities?.map((activity: Activity) => (
              <div key={activity.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                      <span className="text-xs text-slate-500 shrink-0">{formatTime(activity.timestamp)}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{activity.details}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {activity.user}
                      </span>
                      {activity.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {activity.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">Assessments Today</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {activities?.filter((a: Activity) => a.type === "assessment").length || 0}
          </p>
        </div>

        <div className="bg-green-50 rounded-xl border border-green-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Target className="h-5 w-5 text-green-600" />
            <span className="text-sm font-semibold text-green-900">Programs Conducted</span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {activities?.filter((a: Activity) => a.type === "program").length || 0}
          </p>
        </div>

        <div className="bg-purple-50 rounded-xl border border-purple-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Home className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">Home Visits</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {activities?.filter((a: Activity) => a.type === "home_visit").length || 0}
          </p>
        </div>
      </div>
    </div>
  );
}
