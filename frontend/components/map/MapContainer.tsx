"use client";

import dynamic from "next/dynamic";

type HeatmapColorMode = "red-yellow-green" | "blue-purple" | "fire" | "ocean" | "cool";

interface DynamicMapProps {
  showHotspots: boolean;
  showProgramCoverage: boolean;
  showHomeVisits: boolean;
  showFacilities: boolean;
  showPredictions: boolean;
  focusBarangay?: string | null;
  heatmapColorMode?: HeatmapColorMode;
  heatmapOn?: boolean;
  setHeatmapOn?: (value: boolean) => void;
}

// Use the full-featured MapView for both admin and superadmin
// MapView automatically adapts based on user role
export const DynamicMap = dynamic(
  () => import("./MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ height: "100%", width: "100%" }}
        className="grid place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-sm"
      >
        Loading map…
      </div>
    ),
  }
) as React.ComponentType<DynamicMapProps>;
