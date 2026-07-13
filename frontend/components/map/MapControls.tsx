"use client";

import { Layers, MapPin, Home, Building, AlertTriangle, Brain } from "lucide-react";

type HeatmapColorMode = "red-yellow-green" | "blue-purple" | "fire" | "ocean" | "cool";

interface MapControlsProps {
  showHotspots: boolean;
  setShowHotspots: (value: boolean) => void;
  showProgramCoverage: boolean;
  setShowProgramCoverage: (value: boolean) => void;
  showHomeVisits: boolean;
  setShowHomeVisits: (value: boolean) => void;
  showFacilities: boolean;
  setShowFacilities: (value: boolean) => void;
  showPredictions: boolean;
  setShowPredictions: (value: boolean) => void;
  heatmapOn?: boolean;
  heatmapColorMode?: HeatmapColorMode;
  setHeatmapColorMode?: (value: HeatmapColorMode) => void;
  showHeatmapColorSelector?: boolean;
}

export function MapControls({
  showHotspots,
  setShowHotspots,
  showProgramCoverage,
  setShowProgramCoverage,
  showHomeVisits,
  setShowHomeVisits,
  showFacilities,
  setShowFacilities,
  showPredictions,
  setShowPredictions,
  heatmapOn = false,
  heatmapColorMode = "red-yellow-green",
  setHeatmapColorMode,
  showHeatmapColorSelector = false,
}: MapControlsProps) {
  const colorModeOptions: { value: HeatmapColorMode; label: string }[] = [
    { value: "red-yellow-green", label: "🔴 Red-Yellow-Green" },
    { value: "blue-purple", label: "🔵 Blue-Purple" },
    { value: "fire", label: "🔥 Fire" },
    { value: "ocean", label: "🌊 Ocean" },
    { value: "cool", label: "❄️ Cool" },
  ];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-slate-600" />
        <p className="font-semibold text-slate-800">Map Layers</p>
      </div>

      <div className="space-y-2">
        {/* Malnutrition Hotspots */}
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs font-medium text-slate-700">Malnutrition Hotspots</span>
          </div>
          <input
            type="checkbox"
            checked={showHotspots}
            onChange={(e) => setShowHotspots(e.target.checked)}
            className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
          />
        </label>

        {/* Program Coverage */}
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium text-slate-700">Program Coverage</span>
          </div>
          <input
            type="checkbox"
            checked={showProgramCoverage}
            onChange={(e) => setShowProgramCoverage(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
          />
        </label>

        {/* Home Visit Coverage */}
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <Home className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-medium text-slate-700">Home Visit Coverage</span>
          </div>
          <input
            type="checkbox"
            checked={showHomeVisits}
            onChange={(e) => setShowHomeVisits(e.target.checked)}
            className="rounded text-green-600 focus:ring-green-500 h-4 w-4"
          />
        </label>

        {/* Health Facilities */}
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <Building className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-xs font-medium text-slate-700">Health Facilities</span>
          </div>
          <input
            type="checkbox"
            checked={showFacilities}
            onChange={(e) => setShowFacilities(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
          />
        </label>

        {/* Risk Prediction Layer */}
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs font-medium text-slate-700">Risk Predictions (30d)</span>
          </div>
          <input
            type="checkbox"
            checked={showPredictions}
            onChange={(e) => setShowPredictions(e.target.checked)}
            className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4"
          />
        </label>
      </div>

      {/* Heatmap Color Mode Selector (shown when heatmap is ON or Heatmap tile layer is active) */}
      {(heatmapOn || showHeatmapColorSelector) && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Heatmap Color Mode
          </label>
          <div className="space-y-1.5">
            {colorModeOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="heatmap-color-mode"
                  value={option.value}
                  checked={heatmapColorMode === option.value}
                  onChange={(e) => setHeatmapColorMode?.(e.target.value as HeatmapColorMode)}
                  className="rounded-full text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
                />
                <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 font-medium">Map views are fixed to the city boundary area.</p>
      </div>
    </div>
  );
}
