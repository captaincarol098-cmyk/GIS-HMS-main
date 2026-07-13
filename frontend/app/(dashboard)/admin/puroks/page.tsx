"use client";

export const dynamic = 'force-dynamic';

import "@/styles/admin.css";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin, Users, Plus, Search, Eye, Edit3, Archive, RotateCcw,
  X, Save, Loader2, Home, Activity, AlertTriangle,
  BarChart3, User, Phone, StickyNote, Download, Shield, BookUser, House
} from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { useAuthStore } from "@/store/auth";

type TabId = "list" | "add" | "edit" | "detail" | "children" | "programs" | "home-visits" | "assessments" | "activity";

export default function PurokManagementPage() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<any>(null);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  // Defer searchParams to client-side only
  useEffect(() => {
    try {
      const sp = new URL(window.location.href).searchParams;
      setSearchParams(sp);
    } catch (e) {
      // Fallback - still in SSR
    }
  }, []);

  const isSuper = user?.role === "super_admin";

  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("list");
  const [showArchiveModal, setShowArchiveModal] = useState<string | null>(null);
  const [barangayFilter, setBarangayFilter] = useState("");
  const [showPurokModal, setShowPurokModal] = useState(false);
  const [purokModalTab, setPurokModalTab] = useState<"overview" | "children" | "programs" | "home-visits" | "assessments" | "analytics" | "activity">("overview");

  // Defer useSearchParams to useEffect to avoid hydration mismatch
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    // Handle any search params if needed
  }, []);

  // Calculate barangayId early, before it's used in queries
  const barangayId = isSuper ? barangayFilter || undefined : user?.barangay_id;

  const puroksQ = useQuery({
    queryKey: ["puroks", "archived"],
    queryFn: () => api.get("/api/puroks?archived=true").then(r => r.data),
  });
  const childrenQ = useQuery({
    queryKey: ["children-admin", barangayId],
    queryFn: () => api.get("/api/children", {
      params: barangayId ? { barangay_id: barangayId } : {}
    }).then(r => r.data),
    retry: false,
  });
  const purokStatsQ = useQuery({
    queryKey: ["purok-stats", barangayId, yearFilter],
    queryFn: async () => {
      // Fetch stats for all puroks (or filtered by barangay) with year filter
      const purokList = await api.get("/api/puroks?archived=true", {
        params: barangayId ? { barangay_id: barangayId } : {}
      }).then(r => r.data);
      const statsPromises = purokList.map((p: any) =>
        api.get(`/api/puroks/${p.id}/stats?year=${yearFilter}`).then(r => ({ purok_id: p.id, stats: r.data })).catch(() => ({ purok_id: p.id, stats: {} }))
      );
      const results = await Promise.all(statsPromises);
      return results;
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: 1,
  });
  const barangaysQ = useQuery({
    queryKey: ["barangays"],
    queryFn: () => api.get("/api/barangays").then(r => r.data),
  });

  // Auto-open purok details modal if selected parameter is in URL
  useEffect(() => {
    if (!searchParams) return; // Guard against null searchParams
    const selectedPurokId = searchParams.get("selected");
    if (selectedPurokId && puroksQ.data) {
      const matchingPurok = puroksQ.data.find((p: any) => p.id === selectedPurokId);
      if (matchingPurok) {
        setSelectedId(selectedPurokId);
        setShowPurokModal(true);
        setPurokModalTab("overview");
      }
    }
  }, [searchParams, puroksQ.data]);

  const barangayMap = useMemo(() => {
    const m: Record<string, string> = {};
    (barangaysQ.data || []).forEach((b: any) => { m[b.id] = b.name; });
    return m;
  }, [barangaysQ.data]);

  const createMutation = useMutation({
    mutationFn: ({ data, bId }: { data: any; bId: string }) => api.post(`/api/puroks?barangay_id=${bId}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["puroks"] }); setTab("list"); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/api/puroks/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["puroks"] }); setTab("list"); },
  });
  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/puroks/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["puroks"] }); setShowArchiveModal(null); },
  });
  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/puroks/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["puroks"] }),
  });

  const defaultForm = { name: "", code: "", leader: "", population: 0, contact_number: "", notes: "", assigned_bns: "", assigned_health_worker: "", household_count: 0 };
  const [form, setForm] = useState(defaultForm);
  const [formBarangayId, setFormBarangayId] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const filteredPuroks = useMemo(() => {
    let data = puroksQ.data || [];
    if (barangayId) data = data.filter((p: any) => p.barangay_id === barangayId);
    if (statusFilter === "active") data = data.filter((p: any) => !p.is_archived);
    else if (statusFilter === "archived") data = data.filter((p: any) => p.is_archived);
    return data;
  }, [puroksQ.data, barangayId, statusFilter]);

  const enrichPurok = (p: any) => {
    const pc = (childrenQ.data || []).filter((c: any) => c.purok_id === p.id);
    
    // Get stats from the API query (already filtered by year)
    const statsEntry = (purokStatsQ.data || []).find((s: any) => s.purok_id === p.id);
    const stats = statsEntry?.stats || {};
    
    // Use stats from API if available, otherwise fall back to 0
    const activeCasesCount = stats.active_cases || 0;
    const risk = stats.risk_level || "low";
    
    // Count total measurement records (not just unique children)
    const totalMeasurements = pc.reduce((sum: number, c: any) => sum + (c.measurements?.length || 0), 0);
    
    return { 
      ...p, 
      child_count: pc.length,              // Unique children (for reference)
      total_records: totalMeasurements,    // Measurement records (OPT+ count)
      active_cases: activeCasesCount, 
      risk_level: risk, 
      barangay_name: barangayMap[p.barangay_id] || "" 
    };
  };

  const rows = useMemo(() => filteredPuroks.map(enrichPurok), [filteredPuroks, childrenQ.data, barangayMap, purokStatsQ.data]);
  const filteredRows = useMemo(() => {
    let r = rows;
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((row: any) => row.name.toLowerCase().includes(q) || row.code.toLowerCase().includes(q));
    if (riskFilter !== "all") r = r.filter((row: any) => row.risk_level === riskFilter);
    return r;
  }, [rows, search, riskFilter]);

  const selectedPurokDetailQ = useQuery({
    queryKey: ["purok-detail", selectedId],
    queryFn: () => api.get(`/api/puroks/${selectedId}`).then(r => r.data),
    enabled: !!selectedId && showPurokModal,
  });
  const selectedChildrenQ = useQuery({
    queryKey: ["purok-children", selectedId],
    queryFn: () => api.get(`/api/puroks/${selectedId}/children`).then(r => r.data),
    enabled: showPurokModal && (purokModalTab === "children" || purokModalTab === "overview") && !!selectedId,
  });
  const selectedProgramsQ = useQuery({
    queryKey: ["purok-programs", selectedId],
    queryFn: () => api.get(`/api/puroks/${selectedId}/programs`).then(r => r.data),
    enabled: showPurokModal && purokModalTab === "programs" && !!selectedId,
  });
  const selectedVisitsQ = useQuery({
    queryKey: ["purok-home-visits", selectedId],
    queryFn: () => api.get(`/api/puroks/${selectedId}/home-visits`).then(r => r.data),
    enabled: showPurokModal && purokModalTab === "home-visits" && !!selectedId,
  });
  const selectedAssessmentsQ = useQuery({
    queryKey: ["purok-assessments", selectedId],
    queryFn: () => api.get(`/api/puroks/${selectedId}/assessments`).then(r => r.data),
    enabled: showPurokModal && purokModalTab === "assessments" && !!selectedId,
  });
  const selectedLogsQ = useQuery({
    queryKey: ["purok-activity-logs", selectedId],
    queryFn: () => api.get(`/api/puroks/${selectedId}/activity-logs`).then(r => r.data),
    enabled: showPurokModal && (purokModalTab === "activity" || purokModalTab === "overview") && !!selectedId,
  });

  // ─── Add/Edit Form ──────
  if (tab === "add" || (tab === "edit" && editId)) return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tab === "add" ? "Add New Purok" : "Edit Purok"}</h1>
        <button onClick={() => { setTab("list"); setEditId(null); }} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"><X className="h-4 w-4" /> Cancel</button>
      </div>
      <Panel>
        {tab === "add" && (
          <div className="mb-4">
            {isSuper ? (
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Barangay *</label>
                <select className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm bg-white" value={formBarangayId} onChange={e => setFormBarangayId(e.target.value)} required>
                  <option value="">Select barangay...</option>
                  {(barangaysQ.data || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select></div>
            ) : (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">Barangay: <span className="font-semibold">{(barangaysQ.data || []).find((b: any) => b.id === user?.barangay_id)?.name}</span></div>
            )}
          </div>
        )}
        <form onSubmit={(e) => {
          e.preventDefault();
          if (tab === "add") {
            const bId = isSuper ? formBarangayId : user?.barangay_id;
            if (!bId) return;
            createMutation.mutate({ data: form, bId }, { onSuccess: () => setForm(defaultForm) });
          } else if (editId) {
            updateMutation.mutate({ id: editId, data: form });
          }
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Purok Name *</label>
              <input className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Code</label>
              <input className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Purok Leader</label>
              <input className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.leader} onChange={e => setForm({ ...form, leader: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Estimated Population</label>
              <input type="number" className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.population} onChange={e => setForm({ ...form, population: +e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Contact Number</label>
              <input className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Household Count</label>
              <input type="number" className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.household_count} onChange={e => setForm({ ...form, household_count: +e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Assigned BNS</label>
              <input className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.assigned_bns} onChange={e => setForm({ ...form, assigned_bns: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Health Worker</label>
              <input className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.assigned_health_worker} onChange={e => setForm({ ...form, assigned_health_worker: e.target.value })} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setTab("list"); setEditId(null); }} className="admin-action-btn-secondary px-4 py-2 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="admin-action-btn-primary flex items-center gap-2 px-4 py-2 text-sm rounded-lg disabled:opacity-50">
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" /> {tab === "add" ? "Create Purok" : "Update Purok"}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );

  const totalChildren = rows.reduce((s: number, p: any) => s + (p.child_count || 0), 0);  // Use child_count (unique children)
  const totalActiveCases = rows.reduce((s: number, p: any) => s + p.active_cases, 0);

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="admin-page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Purok Management & Monitoring</h1>
          {isSuper ? (
            <p className="text-sm mt-1">Unified management of puroks, children monitoring, assessments, and home visits</p>
          ) : (
            <p className="text-sm mt-1">Manage puroks, monitor children, track assessments and home visits in <span className="font-bold text-white">{(barangaysQ.data || []).find((b: any) => b.id === user?.barangay_id)?.name || ""}</span></p>
          )}
        </div>
        <button onClick={() => { setTab("add"); setForm(defaultForm); setFormBarangayId(""); }} className="admin-action-btn-secondary flex items-center gap-2 px-3 py-2.5 text-xs">
          <Plus className="h-4 w-4" /> Add Purok
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="admin-glass-panel p-4"><p className="text-xs text-slate-500 font-semibold">Total Puroks</p><p className="text-2xl font-bold mt-1">{filteredPuroks.length}</p></div>
        <div className="admin-glass-panel p-4"><p className="text-xs text-slate-500 font-semibold">Total Children</p><p className="text-2xl font-bold mt-1">{totalChildren}</p></div>
        <div className="admin-glass-panel p-4"><p className="text-xs text-slate-500 font-semibold">Active Cases</p><p className="text-2xl font-bold mt-1 text-amber-600">{totalActiveCases}</p></div>
        <div className="admin-glass-panel p-4"><p className="text-xs text-slate-500 font-semibold">Households</p><p className="text-2xl font-bold mt-1">{rows.reduce((s: number, p: any) => s + (p.household_count || 0), 0)}</p></div>
        <div className="admin-glass-panel p-4">
          {isSuper ? (
            <select className="admin-interactive-input w-full text-sm rounded px-2 py-1 bg-white font-semibold" value={barangayFilter} onChange={e => setBarangayFilter(e.target.value)}>
              <option value="">All Barangays</option>
              {(barangaysQ.data || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          ) : (
            <div><p className="text-xs text-slate-500 font-semibold">Barangay</p><p className="text-lg font-bold mt-1 truncate">{(barangaysQ.data || []).find((b: any) => b.id === user?.barangay_id)?.name || ""}</p></div>
          )}
        </div>
      </div>

      {/* Purok Table */}
      <Panel title="Purok List" action={
        <div className="flex gap-2 items-center flex-wrap">
          <select className="admin-interactive-input text-xs rounded px-2 py-1 bg-white font-semibold" value={yearFilter} onChange={e => setYearFilter(Number(e.target.value))} title="Filter by Year">
            <option value={2024}>📅 2024</option>
            <option value={2025}>📅 2025</option>
            <option value={2026}>📅 2026</option>
          </select>
          <select className="admin-interactive-input text-xs rounded px-2 py-1 bg-white font-semibold" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
            <option value="all">All Risk</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select className="admin-interactive-input text-xs rounded px-2 py-1 bg-white font-semibold" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input className="admin-interactive-input pl-8 pr-3 py-1.5 rounded text-sm w-48 font-medium" placeholder="Search purok..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="admin-table text-left text-sm">
            <thead>
              <tr>
                <th className="admin-table-header text-left py-3 pr-2">Purok Name</th>
                {isSuper && <th className="admin-table-header text-left py-3 pr-2">Barangay</th>}
                <th className="admin-table-header text-center py-3 pr-2">Population</th>
                <th className="admin-table-header text-center py-3 pr-2">HH Count</th>
                <th className="admin-table-header text-center py-3 pr-2">Children</th>
                <th className="admin-table-header text-center py-3 pr-2">Active</th>
                <th className="admin-table-header text-left py-3 pr-2">Risk Level</th>
                <th className="admin-table-header text-left py-3 pr-2">BNS</th>
                <th className="admin-table-header text-left py-3 pr-2">Status</th>
                <th className="admin-table-header text-left py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((p: any) => (
                <tr key={p.id} className={`admin-table-row ${p.is_archived ? "opacity-60" : ""}`}>
                  <td className="admin-table-cell py-3 pr-2 font-semibold text-slate-805">{p.name}</td>
                  {isSuper && <td className="admin-table-cell py-3 pr-2 text-sm text-slate-600 font-medium">{p.barangay_name}</td>}
                  <td className="admin-table-cell py-3 pr-2 text-center">{p.population || "-"}</td>
                  <td className="admin-table-cell py-3 pr-2 text-center font-bold text-slate-700">{p.household_count || "0"}</td>
                  <td className="admin-table-cell py-3 pr-2 text-center"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">{p.child_count}</span></td>
                  <td className="admin-table-cell py-3 pr-2 text-center">{p.active_cases > 0 ? <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-semibold">{p.active_cases}</span> : <span className="text-slate-400">0</span>}</td>
                  <td className="admin-table-cell py-3 pr-2"><Badge tone={p.risk_level}>{p.risk_level}</Badge></td>
                  <td className="admin-table-cell py-3 pr-2 text-xs text-slate-600 font-medium">{p.assigned_bns || "-"}</td>
                  <td className="admin-table-cell py-3 pr-2">{p.is_archived ? <Badge tone="error">Archived</Badge> : <Badge tone="success">Active</Badge>}</td>
                  <td className="admin-table-cell py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setSelectedId(p.id); setShowPurokModal(true); setPurokModalTab("overview"); }} className="admin-action-btn-secondary p-1.5 rounded" title="View"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => { setEditId(p.id); setForm({ name: p.name, code: p.code || "", leader: p.leader || "", population: p.population || 0, contact_number: p.contact_number || "", notes: p.notes || "", assigned_bns: p.assigned_bns || "", assigned_health_worker: p.assigned_health_worker || "", household_count: p.household_count || 0 }); setTab("edit"); }} className="admin-action-btn-secondary p-1.5 rounded text-blue-600" title="Edit"><Edit3 className="h-4 w-4" /></button>
                      {p.is_archived ? (
                        <button onClick={() => restoreMutation.mutate(p.id)} className="admin-action-btn-secondary p-1.5 rounded text-green-600" title="Restore"><RotateCcw className="h-4 w-4" /></button>
                      ) : (
                        <button onClick={() => setShowArchiveModal(p.id)} className="admin-action-btn-secondary p-1.5 rounded text-red-600" title="Archive"><Archive className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr><td colSpan={isSuper ? 10 : 9} className="py-8 text-center text-slate-400">No puroks found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ─── Purok Detail Modal ─── */}
      {showPurokModal && selectedId && (
        <div className="admin-modal-overlay fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 pb-6 overflow-y-auto" onClick={() => { setShowPurokModal(false); setSelectedId(null); }}>
          <div className="admin-modal-content relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 bg-slate-50/50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <MapPin className="h-6 w-6 text-emerald-600" />
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">{selectedPurokDetailQ.data?.name || "Purok Detail"}</h2>
                  <p className="text-xs text-slate-500 font-medium">Code: {selectedPurokDetailQ.data?.code || "N/A"} &middot; Barangay: {barangayMap[selectedPurokDetailQ.data?.barangay_id || ""] || "N/A"}</p>
                </div>
              </div>
              <button onClick={() => { setShowPurokModal(false); setSelectedId(null); }} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex gap-1 px-6 pt-3 border-b border-slate-200 bg-white sticky top-[73px] z-10">
              {(["overview", "children", "programs", "home-visits", "assessments", "analytics", "activity"] as const).map((st) => (
                <button key={st} onClick={() => setPurokModalTab(st)}
                  className={`px-4 py-2 text-xs font-bold capitalize rounded-t-lg border-b-2 transition-colors admin-tab-horizontal ${
                    purokModalTab === st ? "active text-blue-700 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}>
                  {st === "overview" && "📊 Overview"}{st === "children" && "👶 Children"}{st === "programs" && "📋 Programs"}{st === "home-visits" && "🏠 Home Visits"}{st === "assessments" && "📏 Assessments"}{st === "analytics" && "📈 Analytics"}{st === "activity" && "📝 Activity"}
                </button>
              ))}
            </div>

            <div className="p-6 max-h-[65vh] overflow-y-auto">
              {/* ─── OVERVIEW ─── */}
              {purokModalTab === "overview" && selectedPurokDetailQ.data && (
                <div className="admin-container space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="admin-glass-panel p-4 bg-blue-50/40 border-blue-200"><p className="text-[10px] text-blue-650 font-bold uppercase">Children</p><p className="text-2xl font-black text-blue-800 mt-1">{selectedPurokDetailQ.data.child_count || 0}</p></div>
                    <div className="admin-glass-panel p-4 bg-red-50/40 border-red-200"><p className="text-[10px] text-red-650 font-bold uppercase">Active Cases</p><p className="text-2xl font-black text-red-700 mt-1">{selectedPurokDetailQ.data.active_cases || 0}</p></div>
                    <div className="admin-glass-panel p-4 bg-purple-50/40 border-purple-200"><p className="text-[10px] text-purple-650 font-bold uppercase">Households</p><p className="text-2xl font-black text-purple-800 mt-1">{selectedPurokDetailQ.data.household_count || 0}</p></div>
                    <div className="admin-glass-panel p-4 bg-amber-50/40 border-amber-200"><p className="text-[10px] text-amber-650 font-bold uppercase">Risk Level</p><div className="mt-1"><Badge tone={selectedPurokDetailQ.data.risk_level || "low"}>{selectedPurokDetailQ.data.risk_level || "low"}</Badge></div></div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="admin-glass-panel p-4"><p className="text-[10px] text-slate-500 font-bold uppercase">Population</p><p className="text-lg font-bold text-slate-800 mt-0.5">{selectedPurokDetailQ.data.population || "N/A"}</p></div>
                    <div className="admin-glass-panel p-4"><p className="text-[10px] text-slate-500 font-bold uppercase">Leader</p><p className="text-lg font-bold text-slate-800 mt-0.5 truncate">{selectedPurokDetailQ.data.leader || "N/A"}</p></div>
                    <div className="admin-glass-panel p-4"><p className="text-[10px] text-slate-500 font-bold uppercase">BNS</p><p className="text-lg font-bold text-slate-800 mt-0.5 truncate">{selectedPurokDetailQ.data.assigned_bns || "N/A"}</p></div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="admin-glass-panel p-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Purok Information</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm font-medium">
                        <div><span className="text-slate-400">Code:</span> <span className="font-semibold ml-1">{selectedPurokDetailQ.data.code || "N/A"}</span></div>
                        <div><span className="text-slate-400">Contact:</span> <span className="font-semibold ml-1">{selectedPurokDetailQ.data.contact_number || "N/A"}</span></div>
                        <div><span className="text-slate-400">Health Worker:</span> <span className="font-semibold ml-1">{selectedPurokDetailQ.data.assigned_health_worker || "N/A"}</span></div>
                        <div><span className="text-slate-400">Notes:</span> <span className="font-semibold ml-1">{selectedPurokDetailQ.data.notes || "None"}</span></div>
                      </div>
                    </div>
                    <div className="admin-glass-panel p-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Nutrition Status</h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-green-50/50 border border-green-100 rounded-lg"><p className="text-[10px] text-green-600 font-bold">Normal</p><p className="text-lg font-black text-green-700">{(selectedPurokDetailQ.data.child_count || 0) - (selectedPurokDetailQ.data.active_cases || 0)}</p></div>
                        <div className="p-2 bg-amber-50/50 border border-amber-100 rounded-lg"><p className="text-[10px] text-amber-600 font-bold">At Risk</p><p className="text-lg font-black text-amber-700">{selectedPurokDetailQ.data.active_cases || 0}</p></div>
                        <div className="p-2 bg-red-50/50 border border-red-100 rounded-lg"><p className="text-[10px] text-red-600 font-bold">Critical</p><p className="text-lg font-black text-red-700">{selectedPurokDetailQ.data.active_cases > 3 ? selectedPurokDetailQ.data.active_cases : 0}</p></div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Children + Activity preview */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="admin-glass-panel p-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Recent Children</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(selectedChildrenQ.data || []).slice(0, 5).length === 0 ? <p className="text-xs text-slate-400">No children data</p> : (selectedChildrenQ.data || []).slice(0, 5).map((c: any) => (
                          <div key={c.id} className="flex items-start gap-2 text-xs">
                            <Users className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0"><p className="font-semibold text-slate-700 truncate">{c.name}</p><p className="text-slate-450 font-medium">{c.sex} &middot; {c.age}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="admin-glass-panel p-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Recent Activity</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(selectedLogsQ.data || []).slice(0, 5).length === 0 ? <p className="text-xs text-slate-400">No recent activity</p> : (selectedLogsQ.data || []).slice(0, 5).map((log: any) => (
                          <div key={log.id} className="flex items-start gap-2 text-xs">
                            <Activity className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0"><p className="font-semibold text-slate-700 truncate">{log.action}</p><p className="text-slate-450 font-medium">{log.user} &middot; {new Date(log.timestamp).toLocaleString()}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Export */}
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      try {
                        const r = await api.get(`/api/puroks/${selectedId}/export`);
                        const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url; a.download = `purok-${selectedPurokDetailQ.data?.code || selectedId.slice(0,8)}-profile.json`; a.click();
                        URL.revokeObjectURL(url);
                      } catch {}
                    }} className="admin-action-btn-secondary flex items-center gap-2 px-3 py-2.5 text-xs"><Download className="h-4 w-4" /> Export JSON</button>
                    <button onClick={() => setPurokModalTab("children")} className="admin-action-btn-secondary flex items-center gap-2 px-3 py-2.5 text-xs"><Users className="h-4 w-4" /> View All Children</button>
                    <button onClick={() => setPurokModalTab("activity")} className="admin-action-btn-secondary flex items-center gap-2 px-3 py-2.5 text-xs"><Activity className="h-4 w-4" /> View Activity</button>
                  </div>
                </div>
              )}

              {/* ─── CHILDREN ─── */}
              {purokModalTab === "children" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Registered Children in {selectedPurokDetailQ.data?.name}</h3>
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="admin-table text-left text-sm">
                      <thead><tr>
                        <th className="admin-table-header text-left pl-4">Name</th>
                        <th className="admin-table-header text-left">Age</th>
                        <th className="admin-table-header text-left">Sex</th>
                        <th className="admin-table-header text-left">Status</th>
                        <th className="admin-table-header text-left pr-4">Latest Assessment</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedChildrenQ.data || []).length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-slate-400 font-medium">No children</td></tr> : (selectedChildrenQ.data || []).map((c: any) => (
                          <tr key={c.id} className="admin-table-row">
                            <td className="admin-table-cell pl-4 font-semibold text-slate-800">{c.name}</td>
                            <td className="admin-table-cell font-medium text-slate-700">{c.age}</td>
                            <td className="admin-table-cell capitalize font-medium">{c.sex}</td>
                            <td className="admin-table-cell"><Badge tone={c.nutritional_status === "normal" ? "success" : c.nutritional_status === "moderate_acute_malnutrition" || c.nutritional_status === "underweight" ? "warning" : "error"}>{c.nutritional_status}</Badge></td>
                            <td className="admin-table-cell pr-4 text-xs text-slate-500 font-bold">{c.latest_assessment ? new Date(c.latest_assessment).toLocaleDateString() : "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── PROGRAMS ─── */}
              {purokModalTab === "programs" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Program History</h3>
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="admin-table text-left text-sm">
                      <thead><tr>
                        <th className="admin-table-header text-left pl-4">Program</th>
                        <th className="admin-table-header text-left">Frequency</th>
                        <th className="admin-table-header text-left">Status</th>
                        <th className="admin-table-header text-left pr-4">Start Date</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedProgramsQ.data || []).length === 0 ? <tr><td colSpan={4} className="py-6 text-center text-slate-400 font-medium">No programs</td></tr> : (selectedProgramsQ.data || []).map((p: any) => (
                          <tr key={p.id} className="admin-table-row">
                            <td className="admin-table-cell pl-4 font-semibold text-slate-800">{p.name}</td>
                            <td className="admin-table-cell capitalize font-medium">{p.frequency}</td>
                            <td className="admin-table-cell"><Badge tone={p.status === "active" ? "success" : p.status === "completed" ? "info" : "normal"}>{p.status}</Badge></td>
                            <td className="admin-table-cell pr-4 text-xs text-slate-500 font-bold">{new Date(p.start_date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── HOME VISITS ─── */}
              {purokModalTab === "home-visits" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Home Visit Records</h3>
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="admin-table text-left text-sm">
                      <thead><tr>
                        <th className="admin-table-header text-left pl-4">Child</th>
                        <th className="admin-table-header text-left">Status</th>
                        <th className="admin-table-header text-left">Scheduled</th>
                        <th className="admin-table-header text-left">Findings</th>
                        <th className="admin-table-header text-left pr-4">Created</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedVisitsQ.data || []).length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-slate-400 font-medium">No home visits</td></tr> : (selectedVisitsQ.data || []).map((v: any) => (
                          <tr key={v.id} className="admin-table-row">
                            <td className="admin-table-cell pl-4 font-semibold text-slate-800">{v.child_name}</td>
                            <td className="admin-table-cell"><Badge tone={v.status === "completed" ? "success" : v.status === "in_progress" ? "warning" : "normal"}>{v.status}</Badge></td>
                            <td className="admin-table-cell text-xs font-bold">{v.scheduled_date ? new Date(v.scheduled_date).toLocaleDateString() : "N/A"}</td>
                            <td className="admin-table-cell text-xs text-slate-500 max-w-[200px] truncate">{v.findings || "—"}</td>
                            <td className="admin-table-cell pr-4 text-xs text-slate-500 font-bold">{new Date(v.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── CHILD MONITORING ASSESSMENTS ─── */}
              {purokModalTab === "assessments" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800">Child Monitoring Assessments</h3>
                    <div className="text-xs text-slate-500 font-bold">{(selectedAssessmentsQ.data || []).length} assessments</div>
                  </div>
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="admin-table text-left text-sm">
                      <thead><tr>
                        <th className="admin-table-header text-left pl-4">Child</th>
                        <th className="admin-table-header text-left">Household</th>
                        <th className="admin-table-header text-left">Weight</th>
                        <th className="admin-table-header text-left">Height</th>
                        <th className="admin-table-header text-left">Status</th>
                        <th className="admin-table-header text-left">Assessment Date</th>
                        <th className="admin-table-header text-left pr-4">Assessor</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedAssessmentsQ.data || []).length === 0 ? <tr><td colSpan={7} className="py-6 text-center text-slate-400 font-medium">No assessments recorded</td></tr> : (selectedAssessmentsQ.data || []).map((a: any) => (
                          <tr key={a.id} className="admin-table-row">
                            <td className="admin-table-cell pl-4 font-semibold text-slate-800">{a.child_name}</td>
                            <td className="admin-table-cell text-xs">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-[10px] font-semibold">
                                <House className="h-3 w-3" /> {a.household_number || "—"}
                              </span>
                            </td>
                            <td className="admin-table-cell text-xs font-bold">{a.weight || "—"} kg</td>
                            <td className="admin-table-cell text-xs font-bold">{a.height || "—"} cm</td>
                            <td className="admin-table-cell">
                              <Badge tone={a.nutritional_status === "normal" ? "success" : a.nutritional_status === "moderate_acute_malnutrition" ? "warning" : a.nutritional_status === "severe_acute_malnutrition" ? "error" : "normal"}>
                                {(a.nutritional_status || "normal").replace(/_/g, " ").toUpperCase()}
                              </Badge>
                            </td>
                            <td className="admin-table-cell text-xs text-slate-500 font-bold">{a.assessment_date ? new Date(a.assessment_date).toLocaleDateString() : "N/A"}</td>
                            <td className="admin-table-cell pr-4 text-xs text-slate-600 font-medium">{a.assessor_name || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── ANALYTICS ─── */}
              {purokModalTab === "analytics" && selectedPurokDetailQ.data && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-800">📈 Purok Analytics</h3>
                  
                  {/* Nutritional Status Distribution */}
                  <div className="admin-glass-panel p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Nutritional Status Distribution</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-black text-green-700">{selectedPurokDetailQ.data.nutrition_status?.normal || 0}</div>
                        <div className="text-xs text-green-600 font-semibold mt-1">Normal</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-black text-amber-700">{selectedPurokDetailQ.data.nutrition_status?.at_risk || 0}</div>
                        <div className="text-xs text-amber-600 font-semibold mt-1">At Risk</div>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-black text-red-700">{selectedPurokDetailQ.data.nutrition_status?.critical || 0}</div>
                        <div className="text-xs text-red-600 font-semibold mt-1">Critical</div>
                      </div>
                    </div>
                  </div>

                  {/* Demographics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="admin-glass-panel p-4">
                      <h4 className="text-sm font-bold text-slate-700 mb-3">Age Distribution</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">0-6 months</span>
                          <span className="font-bold text-slate-800">{selectedPurokDetailQ.data.age_distribution?.['0-6'] || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">6-24 months</span>
                          <span className="font-bold text-slate-800">{selectedPurokDetailQ.data.age_distribution?.['6-24'] || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">24-59 months</span>
                          <span className="font-bold text-slate-800">{selectedPurokDetailQ.data.age_distribution?.['24-59'] || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="admin-glass-panel p-4">
                      <h4 className="text-sm font-bold text-slate-700 mb-3">Gender Distribution</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">👦 Male</span>
                          <span className="font-bold text-blue-700">{selectedPurokDetailQ.data.gender_distribution?.male || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">👧 Female</span>
                          <span className="font-bold text-pink-700">{selectedPurokDetailQ.data.gender_distribution?.female || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Program Coverage */}
                  <div className="admin-glass-panel p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Program Coverage</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-xs text-blue-600 font-semibold mb-1">Active Programs</div>
                        <div className="text-2xl font-black text-blue-700">{selectedPurokDetailQ.data.program_stats?.active || 0}</div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <div className="text-xs text-emerald-600 font-semibold mb-1">Completed Programs</div>
                        <div className="text-2xl font-black text-emerald-700">{selectedPurokDetailQ.data.program_stats?.completed || 0}</div>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="text-xs text-purple-600 font-semibold mb-1">Home Visits (This Month)</div>
                        <div className="text-2xl font-black text-purple-700">{selectedPurokDetailQ.data.home_visit_stats?.this_month || 0}</div>
                      </div>
                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                        <div className="text-xs text-teal-600 font-semibold mb-1">Assessment Coverage</div>
                        <div className="text-2xl font-black text-teal-700">{selectedPurokDetailQ.data.assessment_stats?.coverage_percent || 0}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Indicators */}
                  <div className="admin-glass-panel p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Performance Indicators</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">Monitoring Coverage</span>
                          <span className="font-bold text-slate-800">{selectedPurokDetailQ.data.performance?.monitoring_coverage || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{width: `${selectedPurokDetailQ.data.performance?.monitoring_coverage || 0}%`}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">Program Participation</span>
                          <span className="font-bold text-slate-800">{selectedPurokDetailQ.data.performance?.program_participation || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-emerald-600 h-2 rounded-full" style={{width: `${selectedPurokDetailQ.data.performance?.program_participation || 0}%`}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">Recovery Rate</span>
                          <span className="font-bold text-slate-800">{selectedPurokDetailQ.data.performance?.recovery_rate || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{width: `${selectedPurokDetailQ.data.performance?.recovery_rate || 0}%`}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── ACTIVITY ─── */}
              {purokModalTab === "activity" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Activity History</h3>
                  {selectedLogsQ.isLoading ? <div className="py-8 text-center text-slate-500">Loading...</div> : (
                    <div className="space-y-2">
                      {(selectedLogsQ.data || []).length === 0 ? <div className="py-6 text-center text-slate-400 font-medium">No recent activity</div> : (selectedLogsQ.data || []).map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 border border-slate-150 rounded-lg bg-white text-sm shadow-sm hover:shadow transition-all">
                          <Activity className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0"><p className="font-semibold text-slate-850">{log.action}</p>{log.details?.description && <p className="text-xs text-slate-500 font-medium">{log.details.description}</p>}<p className="text-xs text-slate-400 mt-0.5 font-bold">{log.user} &middot; {new Date(log.timestamp).toLocaleString()}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="admin-modal-overlay fixed inset-0 flex items-center justify-center z-50">
          <div className="admin-modal-content bg-white rounded-xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-800">Archive Purok?</h3>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-6">This will archive the purok and all associated data will be hidden. You can restore it later.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowArchiveModal(null)} className="admin-action-btn-secondary px-4 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={() => archiveMutation.mutate(showArchiveModal)} disabled={archiveMutation.isPending} className="admin-action-btn-primary flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 text-white disabled:opacity-50">
                {archiveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
