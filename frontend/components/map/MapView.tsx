"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polygon, GeoJSON, Popup, useMap } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  CABADBARAN_CENTER,
  CABADBARAN_MAP_CLASS,
  CABADBARAN_MAP_OPTIONS,
  CABADBARAN_MASK,
  EXCLUDED_BARANGAY_NAMES,
  TILE_LAYERS,
  type TileLayerKey,
} from "./cabadbaran";

// ─── Helper: pan/zoom controller ─────────────────────────────────────────────
function MapCenterController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    try {
      if (map) {
        map.setView(center, zoom);
      }
    } catch (err) {
      console.error('[MapCenterController] Error setting view:', err);
    }
  }, [center, zoom, map]);
  return null;
}

// ─── Layer switcher ───────────────────────────────────────────────────────────
function LayerSwitcher({ active, onChange }: { active: TileLayerKey; onChange: (k: TileLayerKey) => void }) {
  return (
    <div className="absolute bottom-8 right-2 z-[1000] flex flex-col gap-1 rounded-lg border border-slate-200 bg-white/90 backdrop-blur-sm p-1 shadow-md">
      {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            active === k ? "bg-teal-600 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type BarangaySeverity = {
  alert_count: number;
  malnutrition_count: number;
  moderate_count: number;
  name: string;
  prevalence_rate: number;
  risk_level: "critical" | "high" | "medium" | "low";
  severe_count: number;
  total_children: number;
  lat?: number;
  lng?: number;
};

// ─── Malnutrition status colours (markers) ───────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  severe_acute_malnutrition:   "#dc2626",
  moderate_acute_malnutrition: "#f97316",
  normal:                      "#22c55e",
};

function getStatusColor(status: string | undefined): string {
  if (!status) return STATUS_COLOR.normal;
  return STATUS_COLOR[status] ?? STATUS_COLOR.normal;
}

// ─── SVG pin marker ───────────────────────────────────────────────────────────
function pinIcon(status: string | undefined) {
  const colour = getStatusColor(status);
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24S24 21 24 12C24 5.4 18.6 0 12 0z"
        fill="${colour}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="#fff" opacity="0.85"/>
    </svg>`
  );
  return new L.Icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [14, 21],
    iconAnchor: [7, 21],
    popupAnchor: [0, -22],
  });
}

// ─── Invisible barangay boundary style ───────────────────────────────────────
const barangayStyle: L.PathOptions = {
  color: "#10b981",
  fillColor: "transparent",
  fillOpacity: 0,
  weight: 1.5,
  opacity: 0.4,
};

// ─── Heatmap Legend tiers ─────────────────────────────────────────────────────
const TIERS = [
  { label: "Low",           range: "0-4 cases",   min: 0,  max: 4,        weight: 0.06, color: "#4ade80", labelColor: "#16a34a" },
  { label: "Low-Moderate",  range: "5-9 cases",   min: 5,  max: 9,        weight: 0.25, color: "#fde047", labelColor: "#ca8a04" },
  { label: "Moderate",      range: "10-14 cases", min: 10, max: 14,       weight: 0.44, color: "#fdba74", labelColor: "#ea580c" },
  { label: "Moderate-High", range: "15-19 cases", min: 15, max: 19,       weight: 0.62, color: "#fb923c", labelColor: "#c2410c" },
  { label: "High",          range: "20-24 cases", min: 20, max: 24,       weight: 0.80, color: "#f87171", labelColor: "#b91c1c" },
  { label: "Very High",     range: "25+ cases",   min: 25, max: Infinity, weight: 1.00, color: "#dc2626", labelColor: "#991b1b" },
];

function getWeight(count: number): number {
  return TIERS.find((t) => count >= t.min && count <= t.max)?.weight ?? 0.06;
}
function getLabelColor(count: number): string {
  return TIERS.find((t) => count >= t.min && count <= t.max)?.labelColor ?? "#16a34a";
}

// ─── IDW interpolation ────────────────────────────────────────────────────────
function idw(lat: number, lng: number, pts: { lat: number; lng: number; w: number }[]): number {
  let num = 0, den = 0;
  for (const p of pts) {
    const d2 = (lat - p.lat) ** 2 + (lng - p.lng) ** 2;
    if (d2 < 1e-10) return p.w;
    const inv = 1 / d2;
    num += inv * p.w;
    den += inv;
  }
  return den > 0 ? num / den : 0;
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function intensityToRGB(t: number): [number, number, number] {
  const tier = TIERS.find((tier) => t <= tier.weight) || TIERS[TIERS.length - 1];
  return hexToRgb(tier.color);
}

// ─── Popup HTML for heatmap labels ───────────────────────────────────────────
// ─── Risk level colour scheme for enhanced display ────────────────────────
function getRiskLevelInfo(riskLevel: string): { bg: string; color: string; icon: string } {
  switch (riskLevel) {
    case "critical":
      return { bg: "#fee2e2", color: "#991b1b", icon: "🔴" };
    case "high":
      return { bg: "#ffedd5", color: "#9a3412", icon: "🟠" };
    case "medium":
      return { bg: "#fef9c3", color: "#713f12", icon: "🟡" };
    default:
      return { bg: "#d1fae5", color: "#065f46", icon: "🟢" };
  }
}

// ─── Calculate NEWS (Nutrition Early Warning System) indicators ──────────────
function buildNewsIndicators(props: BarangaySeverity): {
  undernutritionStatus: string;
  trendIndicator: string;
  alertLevel: string;
} {
  const malnutritionPercentage = props.total_children > 0 ? (props.malnutrition_count / props.total_children) * 100 : 0;
  
  let undernutritionStatus = "LOW";
  if (malnutritionPercentage > 30) undernutritionStatus = "CRITICAL";
  else if (malnutritionPercentage > 20) undernutritionStatus = "HIGH";
  else if (malnutritionPercentage > 10) undernutritionStatus = "MODERATE";
  
  let trendIndicator = "Stable";
  if (props.severe_count > props.moderate_count * 2) trendIndicator = "⚠️ Worsening";
  else if (props.severe_count === 0 && props.moderate_count === 0) trendIndicator = "✓ Improving";
  
  const alertLevel = props.risk_level === "critical" ? "🚨 URGENT ACTION" : props.risk_level === "high" ? "⚠️ HIGH PRIORITY" : "📋 MONITOR";
  
  return { undernutritionStatus, trendIndicator, alertLevel };
}

// ─── Popup HTML for barangay labels with enhanced information ──────────────
function buildPopupHtml(props: BarangaySeverity) {
  const tier = TIERS.find((t) => props.malnutrition_count >= t.min && props.malnutrition_count <= t.max) ?? TIERS[0];
  const riskInfo = getRiskLevelInfo(props.risk_level);
  const newsIndicators = buildNewsIndicators(props);
  const malnutritionPercentage = props.total_children > 0 ? ((props.malnutrition_count / props.total_children) * 100).toFixed(1) : "0";
  const severePercentage = props.total_children > 0 ? ((props.severe_count / props.total_children) * 100).toFixed(1) : "0";
  const moderatePercentage = props.total_children > 0 ? ((props.moderate_count / props.total_children) * 100).toFixed(1) : "0";

  return `
    <div style="padding:14px;width:100%;font-family:system-ui,-apple-system,sans-serif;line-height:1.4;color:#0f172a;background:#fff;">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;border-bottom:2px solid ${riskInfo.bg};padding-bottom:8px;">
        <span style="font-weight:700;font-size:15px;color:#0f172a;">${props.name}</span>
        <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:16px;background:${riskInfo.bg};color:${riskInfo.color};border:1px solid ${riskInfo.color};white-space:nowrap;">
          ${riskInfo.icon} ${props.risk_level.toUpperCase()}
        </span>
      </div>

      <!-- Main Content Grid - Now with better spacing for wider popup -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
        
        <!-- TOP LEFT: Algorithm-Driven Risk Prediction -->
        <div style="border-left:4px solid #0284c7;padding-left:10px;">
          <div style="font-size:10px;font-weight:700;color:#0284c7;text-transform:uppercase;margin-bottom:5px;">🧠 RISK</div>
          <div style="font-size:11px;color:#334155;line-height:1.6;">
            <div style="margin-bottom:3px;"><strong>Class:</strong> ${props.risk_level.toUpperCase()}</div>
            <div style="margin-bottom:3px;"><strong>Confidence:</strong> ${props.malnutrition_count > 5 ? "High" : props.malnutrition_count > 0 ? "Moderate" : "Low"}</div>
            <div style="font-size:10px;"><strong>Trend:</strong> ${props.severe_count > 2 ? "🔴 Worsening" : props.malnutrition_count > 10 ? "🟡 Stable" : "🟢 Improving"}</div>
          </div>
        </div>

        <!-- TOP MIDDLE: Nutrition Early Warning System -->
        <div style="border-left:4px solid #f59e0b;padding-left:10px;">
          <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;margin-bottom:5px;">📊 NEWS</div>
          <div style="font-size:11px;color:#334155;line-height:1.6;">
            <div style="margin-bottom:3px;"><strong>Undernutrition:</strong> <span style="color:${riskInfo.color};font-weight:700;font-size:10px;">${newsIndicators.undernutritionStatus}</span></div>
            <div style="margin-bottom:3px;"><strong>Trend:</strong> ${newsIndicators.trendIndicator}</div>
            <div style="font-size:10px;"><strong>Alert:</strong> ${newsIndicators.alertLevel}</div>
          </div>
        </div>

        <!-- TOP RIGHT: Case Severity -->
        <div style="border-left:4px solid #ef4444;padding-left:10px;">
          <div style="font-size:10px;font-weight:700;color:#7f1d1d;text-transform:uppercase;margin-bottom:5px;">⚠️ SEVERITY</div>
          <div style="font-size:11px;color:#334155;line-height:1.6;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;gap:4px;">
              <span style="font-size:10px;">🔴 SAM:</span>
              <span style="display:flex;gap:3px;align-items:center;">
                <strong style="color:#dc2626;font-size:11px;">${props.severe_count}</strong>
                <span style="font-size:9px;color:#fff;background:#dc2626;padding:2px 4px;border-radius:2px;font-weight:700;">${severePercentage}%</span>
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">
              <span style="font-size:10px;">🟠 MAM:</span>
              <span style="display:flex;gap:3px;align-items:center;">
                <strong style="color:#f97316;font-size:11px;">${props.moderate_count}</strong>
                <span style="font-size:9px;color:#fff;background:#f97316;padding:2px 4px;border-radius:2px;font-weight:700;">${moderatePercentage}%</span>
              </span>
            </div>
          </div>
        </div>

        <!-- BOTTOM LEFT: Coverage & Prevalence -->
        <div style="border-left:4px solid #10b981;padding-left:10px;">
          <div style="font-size:10px;font-weight:700;color:#047857;text-transform:uppercase;margin-bottom:5px;">📋 COVERAGE</div>
          <div style="font-size:11px;color:#334155;line-height:1.7;">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="font-size:10px;">Children Monitored:</span><strong style="font-size:11px;">${props.total_children}</strong></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="font-size:10px;">Cases:</span><strong style="color:${tier.labelColor};font-size:11px;">${props.malnutrition_count}</strong></div>
            <div style="display:flex;justify-content:space-between;"><span style="font-size:10px;">Prevalence Rate:</span><strong style="font-size:11px;">${props.prevalence_rate}%</strong></div>
          </div>
        </div>

        <!-- BOTTOM MIDDLE: Heatmap Intensity -->
        <div style="border-left:4px solid ${tier.color};padding-left:10px;">
          <div style="font-size:10px;font-weight:700;color:${tier.labelColor};text-transform:uppercase;margin-bottom:5px;">🔥 INTENSITY</div>
          <div style="font-size:11px;color:#334155;line-height:1.7;">
            <div style="margin-bottom:3px;"><strong>Intensity Tier:</strong> <span style="background:${tier.color};color:#fff;padding:3px 6px;border-radius:8px;font-size:10px;font-weight:700;">${tier.label}</span></div>
            <div style="margin-bottom:3px;"><strong>Case Range:</strong> <span style="font-size:10px;">${tier.range}</span></div>
            <div style="font-size:10px;"><strong>Status:</strong> 🔴 Monitoring</div>
          </div>
        </div>

        <!-- BOTTOM RIGHT: Summary -->
        <div style="border-left:4px solid #8b5cf6;padding-left:10px;">
          <div style="font-size:10px;font-weight:700;color:#6d28d9;text-transform:uppercase;margin-bottom:5px;">📊 SUMMARY</div>
          <div style="font-size:11px;color:#334155;line-height:1.7;">
            <div style="margin-bottom:3px;"><strong>Total Cases:</strong> <span style="font-weight:700;color:#0f172a;font-size:11px;">${props.malnutrition_count}</span></div>
            <div style="margin-bottom:3px;"><strong>Malnutrition %:</strong> <span style="font-weight:700;color:#0f172a;font-size:11px;">${malnutritionPercentage}%</span></div>
            <div style="font-size:10px;"><strong>Overall Status:</strong> ${props.risk_level === "critical" ? "🔴 Critical" : props.risk_level === "high" ? "🟠 High" : props.risk_level === "medium" ? "🟡 Medium" : "🟢 Low"}</div>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div style="height:2px;background:#e2e8f0;margin-bottom:10px;"></div>

      <!-- Footer: Key Metrics Bar (EXPANDED for wider popup) -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;padding:10px 0;font-size:10px;">
        <div style="text-align:center;padding-right:8px;border-right:1px solid #e2e8f0;">
          <span style="color:#64748b;font-weight:700;display:block;margin-bottom:4px;">👶 Monitored</span>
          <div style="font-weight:700;color:#0f172a;font-size:12px;">${props.total_children}</div>
        </div>
        <div style="text-align:center;padding:0 8px;border-right:1px solid #e2e8f0;">
          <span style="color:#64748b;font-weight:700;display:block;margin-bottom:4px;">⚠️ Cases</span>
          <div style="font-weight:700;color:${tier.labelColor};font-size:12px;">${props.malnutrition_count}</div>
        </div>
        <div style="text-align:center;padding:0 8px;border-right:1px solid #e2e8f0;">
          <span style="color:#64748b;font-weight:700;display:block;margin-bottom:4px;">📈 Prevalence</span>
          <div style="font-weight:700;color:#0f172a;font-size:12px;">${props.prevalence_rate}%</div>
        </div>
        <div style="text-align:center;padding-left:8px;">
          <span style="color:#64748b;font-weight:700;display:block;margin-bottom:4px;">🚨 Risk Level</span>
          <div style="font-weight:700;color:${riskInfo.color};font-size:11px;padding:2px 6px;background:${riskInfo.bg};border-radius:8px;display:inline-block;border:1px solid ${riskInfo.color};">${props.risk_level.toUpperCase()}</div>
        </div>
      </div>
    </div>`;
}

// ─── Geographic bounds for IDW canvas ────────────────────────────────────────
const GEO = { south: 9.07, north: 9.20, west: 125.51, east: 125.65 } as const;

// ─── IDW Canvas heatmap layer (malnutrition intensity) ───────────────────────
function IDWCanvasLayer({ data, showLabels = true }: { data: BarangaySeverity[]; showLabels?: boolean }) {
  const map = useMap();
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const groupRef   = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const pts = data
      .map((b) => b.lat && b.lng ? { lat: b.lat, lng: b.lng, w: getWeight(b.malnutrition_count) } : null)
      .filter(Boolean) as { lat: number; lng: number; w: number }[];

    const CW = 400, CH = 400;
    const raw = document.createElement("canvas");
    raw.width = CW; raw.height = CH;
    const rawCtx = raw.getContext("2d")!;
    const imgData = rawCtx.createImageData(CW, CH);
    const px = imgData.data;
    const latRange = GEO.north - GEO.south;
    const lngRange = GEO.east  - GEO.west;
    const maxRadius = 0.025;

    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CW; x++) {
        const lat = GEO.north - (y / CH) * latRange;
        const lng = GEO.west  + (x / CW) * lngRange;
        let minDist2 = Infinity;
        for (const p of pts) {
          const d2 = (lat - p.lat) ** 2 + (lng - p.lng) ** 2;
          if (d2 < minDist2) minDist2 = d2;
        }
        const minDist = Math.sqrt(minDist2);
        const i = (y * CW + x) * 4;
        if (minDist >= maxRadius) {
          px[i] = px[i+1] = px[i+2] = px[i+3] = 0;
        } else {
          const intensity = idw(lat, lng, pts);
          const [r, g, b] = intensityToRGB(intensity);
          const ratio = minDist / maxRadius;
          const fade = Math.cos(ratio * Math.PI / 2) ** 2;
          px[i] = r; px[i+1] = g; px[i+2] = b;
          px[i+3] = Math.round(fade * 215);
        }
      }
    }
    rawCtx.putImageData(imgData, 0, 0);

    const blurred = document.createElement("canvas");
    blurred.width = CW; blurred.height = CH;
    const bCtx = blurred.getContext("2d")!;
    bCtx.filter = "blur(14px)";
    bCtx.drawImage(raw, 0, 0);

    const overlay = L.imageOverlay(blurred.toDataURL("image/png"), [[GEO.south, GEO.west],[GEO.north, GEO.east]], {
      opacity: 0.82, interactive: false, zIndex: 400,
    });
    overlay.addTo(map);
    overlayRef.current = overlay;

    // Barangay count labels (only if showLabels is true)
    const group = L.layerGroup().addTo(map);
    groupRef.current = group;
    if (showLabels) {
      data.forEach((b) => {
        if (!b.lat || !b.lng) return;
        const lc = getLabelColor(b.malnutrition_count);
        const short = b.name.replace(/^Poblacion\s+/, "Pob. ");
        const icon = L.divIcon({
          className: "",
          iconAnchor: [0, 0],
          html: `<div style="transform:translate(-50%,-50%);text-align:center;pointer-events:auto;cursor:pointer;">
            <div style="font-size:10px;font-weight:900;color:${lc};text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 6px rgba(0,0,0,0.9);line-height:1.1;white-space:nowrap;">${b.malnutrition_count}</div>
            <div style="font-size:7px;font-weight:700;color:#fff;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap;margin-top:1px;">${short}</div>
          </div>`,
        });
        const marker = L.marker([b.lat, b.lng], { icon, interactive: true, zIndexOffset: 700 });
        const popup = L.popup({ closeButton: false, autoClose: true, closeOnClick: false, offset: [0, -8], maxWidth: 400 }).setContent(buildPopupHtml(b));
        marker.bindPopup(popup);
        marker.on("mouseover", () => { 
          marker.openPopup(); 
        });
        marker.on("mouseout", () => { 
          marker.closePopup(); 
        });
        group.addLayer(marker);
      });
    }

    return () => {
      if (overlayRef.current) map.removeLayer(overlayRef.current);
      if (groupRef.current)   map.removeLayer(groupRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, showLabels]);

  return null;
}

// ─── Icon layers display ──────────────────────────────────────────────────────
function IconLayers({
  showHotspots,
  showProgramCoverage,
  showHomeVisits,
  showFacilities,
  showPredictions,
}: {
  showHotspots: boolean;
  showProgramCoverage: boolean;
  showHomeVisits: boolean;
  showFacilities: boolean;
  showPredictions: boolean;
}) {
  return null; // Removed - icons will be displayed in legend instead
}

// ─── Layer icons overlay on barangays ──────────────────────────────────────────
function LayerIconsOverlay({
  showHotspots,
  showProgramCoverage,
  showHomeVisits,
  showFacilities,
  showPredictions,
  barangayList,
}: {
  showHotspots: boolean;
  showProgramCoverage: boolean;
  showHomeVisits: boolean;
  showFacilities: boolean;
  showPredictions: boolean;
  barangayList: BarangaySeverity[];
}) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!barangayList || barangayList.length === 0) return;

    // Remove old markers
    if (groupRef.current) map.removeLayer(groupRef.current);
    groupRef.current = null;

    // Check if any layer is enabled
    const anyLayerEnabled = showHotspots || showProgramCoverage || showHomeVisits || showFacilities || showPredictions;
    if (!anyLayerEnabled) return;

    const group = L.layerGroup().addTo(map);
    groupRef.current = group;

    // Create icons for each barangay
    barangayList.forEach((barangay) => {
      if (!barangay.lat || !barangay.lng) return;

      let icons = [];
      if (showHotspots) icons.push("⚠️");
      if (showProgramCoverage) icons.push("📍");
      if (showHomeVisits) icons.push("🏠");
      if (showFacilities) icons.push("🏥");
      if (showPredictions) icons.push("🧠");

      if (icons.length === 0) return;

      // Create a div icon with all active layer icons (no background)
      const iconHtml = icons.map((icon) => `<span style="margin: 0 1px;">${icon}</span>`).join("");
      
      const divIcon = L.divIcon({
        className: "",
        html: `<div style="
          display: flex;
          gap: 1px;
          font-size: 14px;
          filter: drop-shadow(0 0 2px rgba(0,0,0,0.6));
          line-height: 1;
        ">${iconHtml}</div>`,
        iconSize: [40, 18],
        iconAnchor: [20, 9],
      });

      const marker = L.marker([barangay.lat, barangay.lng], { 
        icon: divIcon, 
        interactive: false,
        zIndexOffset: 500 
      }).addTo(group);
    });

    return () => {
      if (groupRef.current) map.removeLayer(groupRef.current);
      groupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHotspots, showProgramCoverage, showHomeVisits, showFacilities, showPredictions, barangayList]);

  return null;
}

// ─── Main unified component ───────────────────────────────────────────────────
export function MapView({
  showHotspots = true,
  showProgramCoverage = true,
  showHomeVisits = false,
  showFacilities = true,
  showPredictions = false,
}: {
  showHotspots?: boolean;
  showProgramCoverage?: boolean;
  showHomeVisits?: boolean;
  showFacilities?: boolean;
  showPredictions?: boolean;
}) {
  const { user } = useAuthStore();
  const [tileKey, setTileKey] = useState<TileLayerKey>("Default");
  const tile = TILE_LAYERS[tileKey];
  const [heatmapOn, setHeatmapOn] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Child markers (coloured pins) ─────────────────────────────────────────
  const { data: markersData } = useQuery({
    queryKey: ["map-markers", user?.id],
    queryFn: () => api.get("/api/maps/child-markers").then((r) => r.data),
    enabled: !!user?.id,
  });

  // ── Barangay/purok choropleth (used for heatmap data + boundaries) ─────────
  const { data: barangaysData } = useQuery({
    queryKey: ["barangay-choropleth", user?.id],
    queryFn: () => api.get("/api/maps/barangay-choropleth").then((r) => r.data),
    enabled: !!user?.id,
  });

  const markers = useMemo(() =>
    (markersData ?? []).filter((m: any) => m.lat && m.lng),
    [markersData]
  );

  const filteredBarangaysData = useMemo(() => {
    if (!barangaysData) return null;
    return {
      ...barangaysData,
      features: (barangaysData.features ?? []).filter(
        (f: any) => !EXCLUDED_BARANGAY_NAMES.has(f.properties?.name)
      ),
    };
  }, [barangaysData]);

  // List used for IDW heatmap
  const barangayList: BarangaySeverity[] = useMemo(() =>
    (filteredBarangaysData?.features?.map((f: any) => f.properties) ?? []),
    [filteredBarangaysData]
  );

  // Dynamic centre — admin zooms to their barangay/purok
  const mapCenter = useMemo((): [number, number] => {
    if (user?.role === "admin" && filteredBarangaysData?.features?.length > 0) {
      const first = filteredBarangaysData.features[0];
      const lat = first.properties?.lat;
      const lng = first.properties?.lng;
      if (lat && lng) return [lat, lng];
    }
    return CABADBARAN_CENTER as [number, number];
  }, [user, filteredBarangaysData]);

  const mapZoom = user?.role === "admin" ? 15 : 13;

  // Ensure container has proper dimensions before map initializes
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn('[MapView] Container not yet properly sized, map may fail to initialize');
      }
    }
  }, []);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "100%" }}>

      {/* Layer switcher */}
      <LayerSwitcher active={tileKey} onChange={setTileKey} />

      <MapContainer {...CABADBARAN_MAP_OPTIONS} className={CABADBARAN_MAP_CLASS} style={{ height: "100%", width: "100%" }}>
        <MapCenterController center={mapCenter} zoom={mapZoom} />
        <TileLayer key={tileKey} attribution={tile.attribution} url={tile.url} />

        {/* Barangay boundaries with hover popups */}
        {filteredBarangaysData && (
          <GeoJSON
            key={JSON.stringify(filteredBarangaysData)}
            data={filteredBarangaysData}
            style={() => barangayStyle}
            onEachFeature={(feature, layer) => {
              if (feature.properties?.name) {
                layer.bindTooltip(feature.properties.name, {
                  permanent: true,
                  direction: "center",
                  className: "barangay-label",
                });
              }
              const props = feature.properties as BarangaySeverity;
              // Use buildPopupHtml to ensure consistent enhanced information
              const popupContent = buildPopupHtml(props);
              layer.bindPopup(popupContent, { 
                closeButton: true, 
                autoClose: true,
                maxWidth: 700,
                minWidth: 550,
                className: "map-popup",
              });
              layer.on({
                mouseover: (e) => {
                  const target = e.target as L.Polygon;
                  target.openPopup();
                  target.setStyle({ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.2, weight: 2 });
                },
                mouseout: (e) => {
                  const target = e.target as L.Polygon;
                  target.closePopup();
                  target.setStyle(barangayStyle);
                },
                click: (e) => {
                  const target = e.target as L.Polygon;
                  target.openPopup();
                },
              });
            }}
          />
        )}

        {/* Dark mask outside city */}
        <Polygon
          positions={CABADBARAN_MASK}
          pathOptions={{ color: "transparent", fillColor: "#1e293b", fillOpacity: 0.65 }}
          interactive={false}
        />

        {/* Child pin markers — visible based on layer settings */}
        {(showProgramCoverage || showHomeVisits || !heatmapOn) && markers.map((m: any) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={pinIcon(m.overall_status)}>
            <Popup>
              <strong className="block text-slate-800">{m.name}</strong>
              <span className="text-xs font-semibold" style={{ color: getStatusColor(m.overall_status) }}>
                {(m.overall_status ?? "normal").replace(/_/g, " ")}
              </span>
              <br />
              <span className="text-xs text-slate-500">
                Age: {m.age_months} months
                <br />
                Last measured: {m.last_measured}
              </span>
            </Popup>
          </Marker>
        ))}

        {/* IDW heatmap overlay — only when toggle is ON AND showHotspots is true */}
        {heatmapOn && showHotspots && barangayList.length > 0 && (
          <IDWCanvasLayer data={barangayList} showLabels={showHotspots} />
        )}

        {/* Layer icons overlay on barangays */}
        <LayerIconsOverlay
          showHotspots={showHotspots}
          showProgramCoverage={showProgramCoverage}
          showHomeVisits={showHomeVisits}
          showFacilities={showFacilities}
          showPredictions={showPredictions}
          barangayList={barangayList}
        />
      </MapContainer>

      {/* ── Heatmap toggle button (inside map panel) ── */}
      <button
        onClick={() => setHeatmapOn(!heatmapOn)}
        className={`absolute bottom-4 left-4 z-[999] flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border shadow-lg transition-all ${
          heatmapOn
            ? "bg-red-600 text-white border-red-500 hover:bg-red-700"
            : "bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${heatmapOn ? "bg-white animate-pulse" : "bg-slate-400"}`} />
        {heatmapOn ? "🔴 Heatmap ON" : "⚫ Heatmap OFF"}
      </button>

      {/* ── Marker legend (bottom-left, above toggle when heatmap off) ── */}
      {!heatmapOn && (
        <div className="absolute bottom-16 left-4 z-[999] flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-2.5 text-xs shadow-md backdrop-blur-sm">
          <p className="font-semibold text-slate-700">Nutritional Status</p>
          <span className="flex items-center gap-2 text-slate-600"><span className="h-3 w-3 rounded-full bg-red-600" />Severe Acute Malnutrition</span>
          <span className="flex items-center gap-2 text-slate-600"><span className="h-3 w-3 rounded-full bg-orange-500" />Moderate Acute Malnutrition</span>
          <span className="flex items-center gap-2 text-slate-600"><span className="h-3 w-3 rounded-full bg-green-500" />Normal / No Data</span>
        </div>
      )}

      {/* ── Heatmap legend (shown only when ON) ── */}
      {heatmapOn && (
        <div className="absolute bottom-16 left-4 z-[999] flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-2.5 text-xs shadow-md backdrop-blur-sm max-w-[200px]">
          <p className="font-semibold text-slate-700">Malnutrition Intensity</p>
          {TIERS.map((tier) => (
            <span key={tier.label} className="flex items-center gap-2 text-slate-600">
              <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: tier.color }} />
              {tier.label} <span className="text-slate-400">({tier.range})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
