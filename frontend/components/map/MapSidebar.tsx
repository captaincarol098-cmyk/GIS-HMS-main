"use client";

import { useAuthStore } from "@/store/auth";

export function MapSidebar() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800 text-sm">Map Legend</h2>
        <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">Child Markers</p>
      </div>

      <div className="space-y-2.5 text-xs text-slate-600">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full bg-red-600 shrink-0 shadow-sm" />
          <div>
            <p className="font-medium text-slate-800">Severe Acute Malnutrition</p>
            <p className="text-[10px] text-slate-400">SAM — critical nutritional status</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full bg-orange-500 shrink-0 shadow-sm" />
          <div>
            <p className="font-medium text-slate-800">Moderate Acute Malnutrition</p>
            <p className="text-[10px] text-slate-400">MAM — moderate nutritional status</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full bg-green-500 shrink-0 shadow-sm" />
          <div>
            <p className="font-medium text-slate-800">Normal / No Data</p>
            <p className="text-[10px] text-slate-400">Healthy or not yet measured</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <p className="text-[11px] font-semibold text-slate-700 mb-1">Heatmap Toggle</p>
        <p className="text-[10px] leading-relaxed text-slate-500">
          Use the <strong>🔴 Heatmap ON/OFF</strong> button in the map to overlay malnutrition intensity by area using IDW interpolation.
        </p>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <p className="text-[10px] leading-relaxed text-slate-500">
          {isAdmin
            ? "Pins represent children registered in your barangay, grouped by purok."
            : "Pins represent registered children across all Cabadbaran City barangays."}
        </p>
      </div>
    </aside>
  );
}
