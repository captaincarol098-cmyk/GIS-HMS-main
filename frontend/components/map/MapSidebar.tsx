"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ChevronDown } from "lucide-react";

export function MapSidebar() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const [barangayParam, setBarangayParam] = useState<string | null>(null);
  const [expandedPuroks, setExpandedPuroks] = useState<Set<string>>(new Set());

  // Defer searchParams access to client-side only
  useEffect(() => {
    try {
      const params = new URL(window.location.href).searchParams;
      setBarangayParam(params.get("barangay"));
    } catch (e) {
      // SSR fallback
    }
  }, []);

  // Fetch puroks for the focused barangay
  const { data: puroksData } = useQuery({
    queryKey: ["puroks-for-barangay", barangayParam],
    queryFn: () => {
      if (!barangayParam) return null;
      const decodedName = decodeURIComponent(barangayParam);
      // Fetch puroks for this barangay
      return api.get(`/api/puroks?barangay_name=${encodeURIComponent(decodedName)}`).then(r => r.data).catch(() => null);
    },
    enabled: !!barangayParam,
  });

  // Fetch children for the focused barangay
  const { data: childrenData } = useQuery({
    queryKey: ["children-for-barangay", barangayParam],
    queryFn: () => {
      if (!barangayParam) return null;
      const decodedName = decodeURIComponent(barangayParam);
      // This endpoint needs to be created or we fetch all and filter
      return api.get(`/api/children?barangay_name=${encodeURIComponent(decodedName)}`).then(r => r.data).catch(() => []);
    },
    enabled: !!barangayParam,
  });

  const togglePurok = (purokId: string) => {
    const newExpanded = new Set(expandedPuroks);
    if (newExpanded.has(purokId)) {
      newExpanded.delete(purokId);
    } else {
      newExpanded.add(purokId);
    }
    setExpandedPuroks(newExpanded);
  };

  const puroks = puroksData || [];
  const children = childrenData || [];

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4 overflow-y-auto">
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

      {/* Show puroks list when focused on a barangay */}
      {barangayParam && puroks.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <h3 className="font-semibold text-slate-800 text-xs mb-2">Puroks in {decodeURIComponent(barangayParam)}</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {puroks.map((purok: any) => {
              const purokChildren = children.filter((c: any) => c.purok_id === purok.id);
              const isExpanded = expandedPuroks.has(purok.id);
              return (
                <div key={purok.id} className="bg-slate-50 rounded border border-slate-200 p-2">
                  <button
                    onClick={() => togglePurok(purok.id)}
                    className="w-full flex items-center justify-between hover:bg-slate-100 rounded p-1 text-left"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-800">{purok.name}</p>
                      <p className="text-[10px] text-slate-500">{purokChildren.length} children</p>
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isExpanded && purokChildren.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                      {purokChildren.slice(0, 5).map((child: any) => (
                        <div key={child.id} className="text-[9px] text-slate-600 pl-2 py-0.5 border-l border-slate-300">
                          <p className="font-medium text-slate-700">{child.name}</p>
                          <p className="text-slate-500">{child.overall_status || "No measurement"}</p>
                        </div>
                      ))}
                      {purokChildren.length > 5 && (
                        <p className="text-[9px] text-slate-400 pl-2 py-0.5">+{purokChildren.length - 5} more</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
