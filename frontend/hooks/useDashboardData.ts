"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { UUID } from "crypto";

/**
 * Dashboard Data Hooks
 * 
 * Centralized data fetching with:
 * - Query caching across components
 * - Automatic deduplication of requests
 * - Consistent error handling
 * - Loading states
 */

interface DashboardSummary {
  total_children: number;
  active_cases: number;
  severe_cases: number;
  programs_conducted_today: number;
  reports_submitted_today: number;
  active_alerts: number;
  barangays_online: number;
  barangays_need_attention: number;
  normal_count: number;
  underweight_count: number;
  stunted_count: number;
  wasted_count: number;
  severe_count: number;
}

interface PrevalenceTrend {
  period: string;
  wasting_rate: number;
  stunting_rate: number;
  underweight_rate: number;
  sam_count: number;
  mam_count: number;
}

interface BarangayComparison {
  name: string;
  prevalence_rate: number;
  wasting_rate: number;
  stunting_rate: number;
  underweight_rate: number;
  total_children: number;
  malnutrition_count: number;
  alert_count: number;
}

/**
 * Fetch Dashboard Summary
 * Combines all dashboard cards and stats
 */
export function useDashboardSummary(
  barangay_id?: UUID | null,
  year?: number
) {
  return useQuery({
    queryKey: ["dashboard", "summary", barangay_id, year],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (barangay_id) params.append("barangay_id", String(barangay_id));
      if (year) params.append("year", String(year));
      
      const response = await api.get<DashboardSummary>(
        `/api/dashboard/summary?${params}`
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}

/**
 * Fetch Prevalence Trends
 * Used for trend charts
 */
export function usePrevalenceTrend(
  barangay_id?: UUID | null,
  months: number = 12
) {
  return useQuery({
    queryKey: ["dashboard", "prevalence-trend", barangay_id, months],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("months", String(months));
      if (barangay_id) params.append("barangay_id", String(barangay_id));
      
      const response = await api.get<PrevalenceTrend[]>(
        `/api/dashboard/prevalence-trend?${params}`
      );
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000,    // 20 minutes
  });
}

/**
 * Fetch Age Distribution Data
 */
export function useAgeDistribution(barangay_id?: UUID | null) {
  return useQuery({
    queryKey: ["dashboard", "age-distribution", barangay_id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (barangay_id) params.append("barangay_id", String(barangay_id));
      
      const response = await api.get<any>(
        `/api/dashboard/age-distribution?${params}`
      );
      return response.data;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch Barangay Comparison Data
 */
export function useBarangayComparison() {
  return useQuery({
    queryKey: ["dashboard", "barangay-comparison"],
    queryFn: async () => {
      const response = await api.get<BarangayComparison[]>(
        "/api/dashboard/barangay-comparison"
      );
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });
}

/**
 * Fetch Multiple Dashboard Data in Parallel
 * Reduces waterfall requests on page load
 */
export function useDashboardComprehensive(
  barangay_id?: UUID | null,
  year?: number,
  includeComparison: boolean = false
) {
  const queries = [
    {
      queryKey: ["dashboard", "summary", barangay_id, year],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (barangay_id) params.append("barangay_id", String(barangay_id));
        if (year) params.append("year", String(year));
        
        const response = await api.get<DashboardSummary>(
          `/api/dashboard/summary?${params}`
        );
        return response.data;
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    {
      queryKey: ["dashboard", "prevalence-trend", barangay_id, 12],
      queryFn: async () => {
        const params = new URLSearchParams();
        params.append("months", String(12));
        if (barangay_id) params.append("barangay_id", String(barangay_id));
        
        const response = await api.get<PrevalenceTrend[]>(
          `/api/dashboard/prevalence-trend?${params}`
        );
        return response.data;
      },
      staleTime: 10 * 60 * 1000,
      gcTime: 20 * 60 * 1000,
    },
    {
      queryKey: ["dashboard", "age-distribution", barangay_id],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (barangay_id) params.append("barangay_id", String(barangay_id));
        
        const response = await api.get<any>(
          `/api/dashboard/age-distribution?${params}`
        );
        return response.data;
      },
      staleTime: 15 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  ];

  if (includeComparison) {
    queries.push({
      queryKey: ["dashboard", "barangay-comparison"],
      queryFn: async () => {
        const response = await api.get<BarangayComparison[]>(
          "/api/dashboard/barangay-comparison"
        );
        return response.data;
      },
      staleTime: 10 * 60 * 1000,
      gcTime: 20 * 60 * 1000,
    });
  }

  const results = useQueries({ queries });

  return {
    summary: results[0],
    trend: results[1],
    ageDistribution: results[2],
    comparison: includeComparison ? results[3] : undefined,
    isLoading: results.some((r) => r.isLoading),
    error: results.find((r) => r.error)?.error,
  };
}

/**
 * Fetch Map Data (heatmap + markers)
 */
export function useMapData(barangay_id?: UUID | null) {
  return useQuery({
    queryKey: ["maps", "data", barangay_id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (barangay_id) params.append("barangay_id", String(barangay_id));
      
      const response = await api.get<any>(
        `/api/maps/heatmap-points?${params}`
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch GeoJSON Choropleth Data
 */
export function useChoroplethData() {
  return useQuery({
    queryKey: ["maps", "barangay-choropleth"],
    queryFn: async () => {
      const response = await api.get<any>(
        "/api/maps/barangay-choropleth"
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
