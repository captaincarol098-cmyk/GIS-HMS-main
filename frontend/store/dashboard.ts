import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { UUID } from "crypto";

/**
 * Dashboard State Management
 * 
 * Centralized store for:
 * - Year/date filters across dashboard pages
 * - Selected barangay/purok filters
 * - View preferences (chart types, table sorting, etc.)
 * - Report preferences
 * 
 * Shared across all dashboard components to prevent prop drilling
 * and enable synced filters across pages.
 */

interface DashboardFilters {
  selectedYear: number;
  selectedBarangay: UUID | null;
  selectedPurok: UUID | null;
  selectedChild: UUID | null;
}

interface DashboardPreferences {
  chartType: "line" | "bar" | "area" | "pie";
  sortBy: "prevalence" | "severity" | "name" | "alerts";
  sortOrder: "asc" | "desc";
  showLabels: boolean;
  comparisonMode: boolean;
}

export interface DashboardState {
  // Filters
  filters: DashboardFilters;
  setYear: (year: number) => void;
  setBarangay: (id: UUID | null) => void;
  setPurok: (id: UUID | null) => void;
  setChild: (id: UUID | null) => void;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  resetFilters: () => void;

  // Preferences
  preferences: DashboardPreferences;
  setChartType: (type: "line" | "bar" | "area" | "pie") => void;
  setSortBy: (field: "prevalence" | "severity" | "name" | "alerts") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  setShowLabels: (show: boolean) => void;
  setComparisonMode: (enabled: boolean) => void;
  setPreferences: (prefs: Partial<DashboardPreferences>) => void;

  // Query state
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultFilters: DashboardFilters = {
  selectedYear: new Date().getFullYear(),
  selectedBarangay: null,
  selectedPurok: null,
  selectedChild: null,
};

const defaultPreferences: DashboardPreferences = {
  chartType: "line",
  sortBy: "prevalence",
  sortOrder: "desc",
  showLabels: true,
  comparisonMode: false,
};

export const useDashboardStore = create<DashboardState>()(
  devtools(
    persist(
      (set) => ({
        // Filters
        filters: defaultFilters,
        setYear: (year) =>
          set((state) => ({
            filters: { ...state.filters, selectedYear: year },
          })),
        setBarangay: (id) =>
          set((state) => ({
            filters: { ...state.filters, selectedBarangay: id },
          })),
        setPurok: (id) =>
          set((state) => ({
            filters: { ...state.filters, selectedPurok: id },
          })),
        setChild: (id) =>
          set((state) => ({
            filters: { ...state.filters, selectedChild: id },
          })),
        setFilters: (filters) =>
          set((state) => ({
            filters: { ...state.filters, ...filters },
          })),
        resetFilters: () => set({ filters: defaultFilters }),

        // Preferences
        preferences: defaultPreferences,
        setChartType: (type) =>
          set((state) => ({
            preferences: { ...state.preferences, chartType: type },
          })),
        setSortBy: (field) =>
          set((state) => ({
            preferences: { ...state.preferences, sortBy: field },
          })),
        setSortOrder: (order) =>
          set((state) => ({
            preferences: { ...state.preferences, sortOrder: order },
          })),
        setShowLabels: (show) =>
          set((state) => ({
            preferences: { ...state.preferences, showLabels: show },
          })),
        setComparisonMode: (enabled) =>
          set((state) => ({
            preferences: { ...state.preferences, comparisonMode: enabled },
          })),
        setPreferences: (prefs) =>
          set((state) => ({
            preferences: { ...state.preferences, ...prefs },
          })),

        // Query state
        isLoading: false,
        error: null,
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
      }),
      {
        name: "dashboard-store",
        partialize: (state) => ({
          filters: state.filters,
          preferences: state.preferences,
        }),
      }
    )
  )
);

/**
 * Hook to get current dashboard filters as query params
 * Useful for passing to API endpoints
 */
export function useDashboardQueryParams() {
  const filters = useDashboardStore((state) => state.filters);
  
  return {
    year: filters.selectedYear,
    barangay_id: filters.selectedBarangay,
    purok_id: filters.selectedPurok,
    child_id: filters.selectedChild,
  };
}

/**
 * Hook to get current dashboard sort preferences
 */
export function useDashboardSort() {
  const preferences = useDashboardStore((state) => state.preferences);
  
  return {
    sortBy: preferences.sortBy,
    sortOrder: preferences.sortOrder,
  };
}
