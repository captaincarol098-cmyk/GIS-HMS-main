"use client";
import "@/styles/admin.css";
import "@/styles/analytics.css";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { AdminAnalytics } from "./admin-analytics";
import { SuperAdminAnalytics } from "./superadmin-analytics";

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedForecast, setExpandedForecast] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(2025); // Default to 2025 where data exists

  // Real-time queries with 10-second refresh interval and year filtering
  const summary = useQuery({
    queryKey: ["analytics-summary", selectedYear],
    queryFn: () => api.get(`/api/dashboard/summary?year=${selectedYear}`).then((r) => r.data),
    refetchInterval: 10000, // 10 seconds - Real-time
    refetchOnWindowFocus: true,
    staleTime: 5000, // 5 seconds
  });

  const childMonitoring = useQuery({
    queryKey: ["child-monitoring", selectedYear],
    queryFn: () => api.get(`/api/dashboard/child-monitoring?year=${selectedYear}`).then((r) => r.data),
    refetchInterval: 10000, // 10 seconds - Real-time
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      summary.refetch(),
      childMonitoring.refetch(),
    ]);
    setIsRefreshing(false);
  };

  // Malnutrition Trend Data (static for now, could be made real-time with historical API data)
  const trendData = [
    { month: "Dec", Underweight: 480, Stunted: 520, Wasted: 250 },
    { month: "Jan", Underweight: 460, Stunted: 505, Wasted: 230 },
    { month: "Feb", Underweight: 430, Stunted: 495, Wasted: 210 },
    { month: "Mar", Underweight: 445, Stunted: 512, Wasted: 220 },
    { month: "Apr", Underweight: 420, Stunted: 490, Wasted: 205 },
    { month: "May", Underweight: 412, Stunted: 487, Wasted: 198 }
  ];

  // Line Chart Data: 3-Month Forecast (Confidence limits)
  const forecastData = [
    { name: "Mar", actual: 18.0 },
    { name: "Apr", actual: 17.2 },
    { name: "May", actual: 16.5, forecast: 16.5, upper: 16.5, lower: 16.5 },
    { name: "Jun", forecast: 15.8, upper: 16.9, lower: 14.7 },
    { name: "Jul", forecast: 15.0, upper: 16.5, lower: 13.5 },
    { name: "Aug", forecast: 14.2, upper: 16.2, lower: 12.2 }
  ];

  // Show SuperAdmin Analytics if user is super_admin, otherwise show Admin Analytics
  const isSuperAdmin = user?.role === "super_admin";

  if (isSuperAdmin) {
    return (
      <SuperAdminAnalytics
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        expandedForecast={expandedForecast}
        setExpandedForecast={setExpandedForecast}
        isRefreshing={isRefreshing}
        handleRefresh={handleRefresh}
        summary={summary}
        childMonitoring={childMonitoring}
        trendData={trendData}
        forecastData={forecastData}
      />
    );
  }

  return (
    <AdminAnalytics
      selectedYear={selectedYear}
      setSelectedYear={setSelectedYear}
      expandedForecast={expandedForecast}
      setExpandedForecast={setExpandedForecast}
      isRefreshing={isRefreshing}
      handleRefresh={handleRefresh}
      summary={summary}
      childMonitoring={childMonitoring}
      trendData={trendData}
      forecastData={forecastData}
    />
  );
}
