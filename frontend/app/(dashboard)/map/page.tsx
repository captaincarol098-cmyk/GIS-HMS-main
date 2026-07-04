"use client";
import "@/styles/admin.css";

import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { DynamicMap } from "@/components/map/MapContainer";
import { MapControls } from "@/components/map/MapControls";
import { MapSidebar } from "@/components/map/MapSidebar";

export default function MapPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const title   = isAdmin ? "Purok Map" : "Cabadbaran City Map";
  const subtitle = isAdmin
    ? "Child markers & malnutrition heatmap for your barangay"
    : "All registered children & city-wide malnutrition heatmap";

  // Layer visibility states
  const [showHotspots, setShowHotspots] = useState(true);
  const [showProgramCoverage, setShowProgramCoverage] = useState(true);
  const [showHomeVisits, setShowHomeVisits] = useState(false);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showPredictions, setShowPredictions] = useState(false);

  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 72px)" }}>
      {/* Header */}
      <div className="admin-page-header shrink-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm mt-0.5">{subtitle}</p>
      </div>

      {/* Map + sidebar - fills remaining height */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        {/* Map fills all available height */}
        <section className="relative min-h-0 h-full rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <DynamicMap 
            showHotspots={showHotspots}
            showProgramCoverage={showProgramCoverage}
            showHomeVisits={showHomeVisits}
            showFacilities={showFacilities}
            showPredictions={showPredictions}
          />
        </section>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 overflow-auto">
          <MapControls 
            showHotspots={showHotspots}
            setShowHotspots={setShowHotspots}
            showProgramCoverage={showProgramCoverage}
            setShowProgramCoverage={setShowProgramCoverage}
            showHomeVisits={showHomeVisits}
            setShowHomeVisits={setShowHomeVisits}
            showFacilities={showFacilities}
            setShowFacilities={setShowFacilities}
            showPredictions={showPredictions}
            setShowPredictions={setShowPredictions}
          />
          <MapSidebar />
        </div>
      </div>
    </div>
  );
}
