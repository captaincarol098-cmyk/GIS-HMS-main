"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Plus, Search, Eye, Edit3, Archive, UserPlus,
  X, Save, RotateCcw, Download, FileText, Activity,
  Loader2, CheckCircle, AlertTriangle, Users, BarChart3, Clock, Shield
} from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { useAuthStore } from "@/store/auth";

type TabId = "list" | "add" | "edit" | "assign-admin";

export default function BarangayManagementPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && user.role !== "super_admin") router.push("/dashboard");
  }, [user, router]);

  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tab, setTab] = useState<TabId>("list");
  const [showArchiveModal, setShowArchiveModal] = useState<string | null>(null);
  const [detailBarangayId, setDetailBarangayId] = useState<string | null>(null);
  const [modalSubTab, setModalSubTab] = useState<"overview" | "puroks" | "activity" | "login" | "reports">("overview");

  const barangaysQ = useQuery({ queryKey: ["barangays"], queryFn: () => api.get("/api/barangays?archived=true").then(r => r.data) });
  const puroksQ = useQuery({ queryKey: ["puroks"], queryFn: () => api.get("/api/puroks?archived=true").then(r => r.data) });
  const childrenQ = useQuery({ queryKey: ["children-admin"], queryFn: () => api.get("/api/children").then(r => r.data), retry: false });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: () => api.get("/api/users").then(r => r.data), retry: false });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/barangays", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["barangays"] }); setTab("list"); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/api/barangays/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["barangays"] }); setTab("list"); },
  });
  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/barangays/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["barangays"] }); setShowArchiveModal(null); },
  });
  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/barangays/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["barangays"] }),
  });
  const assignAdminMutation = useMutation({
    mutationFn: ({ barangay_id, user_id }: { barangay_id: string; user_id: string }) => api.put(`/api/barangays/${barangay_id}/assign-admin`, { user_id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["barangays"] }); queryClient.invalidateQueries({ queryKey: ["users"] }); setTab("list"); },
  });

  const [form, setForm] = useState({ name: "", code: "", population_count: 0, captain: "", nutrition_scholar: "", contact_number: "", address: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [assignBrgyId, setAssignBrgyId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");

  const barangays = useMemo(() => {
    let data = barangaysQ.data || [];
    if (statusFilter === "active") data = data.filter((b: any) => !b.is_archived);
    else if (statusFilter === "archived") data = data.filter((b: any) => b.is_archived);
    return data;
  }, [barangaysQ.data, statusFilter]);

  const enrichBarangay = (b: any) => {
    const bp = (puroksQ.data || []).filter((p: any) => p.barangay_id === b.id);
    const bc = (childrenQ.data || []).filter((c: any) => c.barangay_id === b.id);
    const admin = (usersQ.data || []).find((u: any) => u.barangay_id === b.id);
    const active = bc.filter((c: any) => {
      const m = c.measurements?.length ? c.measurements[c.measurements.length - 1] : null;
      return m && ["severe_acute_malnutrition", "moderate_acute_malnutrition"].includes(m.overall_status);
    }).length;
    const risk = active > 20 ? "critical" : active > 10 ? "high" : active > 5 ? "moderate" : "low";
    return { ...b, purok_count: bp.length, child_count: bc.length, active_cases: active, risk_level: risk, assigned_admin: admin };
  };

  const rows = useMemo(() => barangays.map(enrichBarangay), [barangays, puroksQ.data, childrenQ.data, usersQ.data]);
  const filteredRows = useMemo(() => {
    let r = rows;
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((row: any) => row.name.toLowerCase().includes(q) || row.code.toLowerCase().includes(q) || row.assigned_admin?.username?.toLowerCase().includes(q));
    if (riskFilter !== "all") r = r.filter((row: any) => row.risk_level === riskFilter);
    return r;
  }, [rows, search, riskFilter]);

  const detailBarangay = useMemo(() => {
    if (!detailBarangayId) return null;
    return rows.find((r: any) => r.id === detailBarangayId) || null;
  }, [detailBarangayId, rows]);

  const selectedStatsQ = useQuery({
    queryKey: ["barangay-stats", detailBarangayId],
    queryFn: () => api.get(`/api/barangays/${detailBarangayId}/stats`).then(r => r.data),
    enabled: !!detailBarangayId && modalSubTab === "overview",
  });
  const selectedReportsQ = useQuery({
    queryKey: ["barangay-reports", detailBarangayId],
    queryFn: () => api.get(`/api/barangays/${detailBarangayId}/reports`).then(r => r.data),
    enabled: !!detailBarangayId && modalSubTab === "reports",
  });
  const selectedLogsQ = useQuery({
    queryKey: ["barangay-logs", detailBarangayId],
    queryFn: () => api.get(`/api/barangays/${detailBarangayId}/activity-logs`).then(r => r.data),
    enabled: !!detailBarangayId && (modalSubTab === "activity" || modalSubTab === "overview"),
  });
  const selectedLoginQ = useQuery({
    queryKey: ["barangay-login-history", detailBarangayId],
    queryFn: () => api.get(`/api/barangays/${detailBarangayId}/login-history`).then(r => r.data),
    enabled: !!detailBarangayId && (modalSubTab === "login" || modalSubTab === "overview"),
  });

  // ─── Add / Edit Form ──────
  if (tab === "add" || (tab === "edit" && editId)) return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tab === "add" ? "Add New Barangay" : "Edit Barangay"}</h1>
        <button onClick={() => { setTab("list"); setEditId(null); }} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"><X className="h-4 w-4" /> Cancel</button>
      </div>
      <Panel>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (tab === "add") createMutation.mutate(form, { onSuccess: () => setForm({ name: "", code: "", population_count: 0, captain: "", nutrition_scholar: "", contact_number: "", address: "" }) });
          else if (editId) updateMutation.mutate({ id: editId, data: form });
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Barangay Name *</label>
              <input className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Barangay Code *</label>
              <input className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Barangay Captain</label>
              <input className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.captain} onChange={e => setForm({ ...form, captain: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Nutrition Scholar</label>
              <input className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.nutrition_scholar} onChange={e => setForm({ ...form, nutrition_scholar: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Contact Number</label>
              <input className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Population</label>
              <input type="number" className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.population_count} onChange={e => setForm({ ...form, population_count: +e.target.value })} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
            <input className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setTab("list"); setEditId(null); }} className="admin-action-btn-secondary px-4 py-2 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="admin-action-btn-primary flex items-center gap-2 px-4 py-2 text-sm rounded-lg disabled:opacity-50">
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" /> {tab === "add" ? "Create Barangay" : "Update Barangay"}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );

  // ─── Assign Admin Form ──────
  if (tab === "assign-admin") return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assign Barangay Admin</h1>
        <button onClick={() => setTab("list")} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"><X className="h-4 w-4" /> Cancel</button>
      </div>
      <Panel>
        <form onSubmit={(e) => { e.preventDefault(); assignAdminMutation.mutate({ barangay_id: assignBrgyId, user_id: assignUserId }); }} className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Select Barangay *</label>
            <select className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm bg-white" value={assignBrgyId} onChange={e => setAssignBrgyId(e.target.value)} required>
              <option value="">-- Select --</option>
              {rows.filter((r: any) => !r.is_archived).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Select User *</label>
            <select className="admin-interactive-input w-full rounded-lg px-3 py-2 text-sm bg-white" value={assignUserId} onChange={e => setAssignUserId(e.target.value)} required>
              <option value="">-- Select Admin --</option>
              {(usersQ.data || []).filter((u: any) => u.role === "admin" && u.is_active).map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.email}) — {u.account_status === "locked" ? "🔒 Locked" : u.account_status === "inactive" ? "💤 Inactive" : "✅ Active"}
                </option>
              ))}
            </select></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setTab("list")} className="admin-action-btn-secondary px-4 py-2 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={assignAdminMutation.isPending} className="admin-action-btn-primary flex items-center gap-2 px-4 py-2 text-sm rounded-lg disabled:opacity-50">
              {assignAdminMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <UserPlus className="h-4 w-4" /> Assign Admin
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="admin-glass-panel flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Barangay Management</h1>
          <p className="text-sm text-slate-505 font-medium mt-1">Manage all barangays in Cabadbaran City and assign administrators</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setTab("add"); setForm({ name: "", code: "", population_count: 0, captain: "", nutrition_scholar: "", contact_number: "", address: "" }); }} className="admin-action-btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-sm">
            <Plus className="h-4 w-4" /> Add Barangay
          </button>
          <button onClick={() => setTab("assign-admin")} className="admin-action-btn-primary flex items-center gap-2 px-3 py-2 rounded-lg text-sm">
            <UserPlus className="h-4 w-4" /> Assign Admin
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="admin-glass-panel p-4"><p className="text-xs text-slate-500 font-semibold">Total Barangays</p><p className="text-2xl font-bold mt-1">{rows.length}</p></div>
        <div className="admin-glass-panel p-4"><p className="text-xs text-slate-500 font-semibold">With Admin</p><p className="text-2xl font-bold mt-1">{rows.filter((r: any) => r.assigned_admin).length}</p></div>
        <div className="admin-glass-panel p-4"><p className="text-xs text-slate-500 font-semibold">Total Puroks</p><p className="text-2xl font-bold mt-1">{(puroksQ.data || []).length}</p></div>
        <div className="admin-glass-panel p-4"><p className="text-xs text-slate-500 font-semibold">Active Cases</p><p className="text-2xl font-bold mt-1 text-amber-600">{rows.reduce((s: number, r: any) => s + r.active_cases, 0)}</p></div>
        <div className="admin-glass-panel p-4"><p className="text-xs text-slate-500 font-semibold">Total Children</p><p className="text-2xl font-bold mt-1">{(childrenQ.data || []).length}</p></div>
      </div>

      {/* Barangay Table */}
      <Panel title="Barangay List" action={
        <div className="flex gap-2 items-center">
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
            <input className="admin-interactive-input pl-8 pr-3 py-1.5 rounded text-sm w-48 font-medium" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="admin-table text-left text-sm">
            <thead>
              <tr>
                <th className="admin-table-header text-left py-3 pr-2">Code</th>
                <th className="admin-table-header text-left py-3 pr-2">Barangay Name</th>
                <th className="admin-table-header text-left py-3 pr-2">Assigned Admin</th>
                <th className="admin-table-header text-center py-3 pr-2">Puroks</th>
                <th className="admin-table-header text-center py-3 pr-2">Children</th>
                <th className="admin-table-header text-center py-3 pr-2">Active</th>
                <th className="admin-table-header text-left py-3 pr-2">Risk Level</th>
                <th className="admin-table-header text-left py-3 pr-2">Status</th>
                <th className="admin-table-header text-left py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row: any) => (
                <tr key={row.id} className={`admin-table-row ${row.is_archived ? "opacity-60" : ""}`}>
                  <td className="admin-table-cell py-3 pr-2 font-mono text-xs">{row.code}</td>
                  <td className="admin-table-cell py-3 pr-2 font-semibold text-slate-800">{row.name}</td>
                  <td className="admin-table-cell py-3 pr-2 font-medium">
                    {row.assigned_admin ? (
                      <span>{row.assigned_admin.username} <span className="text-[10px] text-slate-400">({row.assigned_admin.account_status || "active"})</span></span>
                    ) : <span className="text-slate-400 italic">Unassigned</span>}
                  </td>
                  <td className="admin-table-cell py-3 pr-2 text-center"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">{row.purok_count}</span></td>
                  <td className="admin-table-cell py-3 pr-2 text-center"><span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-semibold">{row.child_count}</span></td>
                  <td className="admin-table-cell py-3 pr-2 text-center">
                    {row.active_cases > 0 ? <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-semibold">{row.active_cases}</span> : <span className="text-slate-400">0</span>}
                  </td>
                  <td className="admin-table-cell py-3 pr-2"><Badge tone={row.risk_level}>{row.risk_level}</Badge></td>
                  <td className="admin-table-cell py-3 pr-2">{row.is_archived ? <Badge tone="error">Archived</Badge> : <Badge tone="success">Active</Badge>}</td>
                  <td className="admin-table-cell py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setDetailBarangayId(row.id); setModalSubTab("overview"); }} className="admin-action-btn-secondary p-1.5 rounded" title="View"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => { setEditId(row.id); setForm({ name: row.name, code: row.code, population_count: row.population_count, captain: row.captain || "", nutrition_scholar: row.nutrition_scholar || "", contact_number: row.contact_number || "", address: row.address || "" }); setTab("edit"); }} className="admin-action-btn-secondary p-1.5 rounded text-blue-600" title="Edit"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => { setAssignBrgyId(row.id); setAssignUserId(""); setTab("assign-admin"); }} className="admin-action-btn-secondary p-1.5 rounded text-purple-600" title="Assign Admin"><UserPlus className="h-4 w-4" /></button>
                      {row.is_archived ? (
                        <button onClick={() => restoreMutation.mutate(row.id)} className="admin-action-btn-secondary p-1.5 rounded text-green-600" title="Restore"><RotateCcw className="h-4 w-4" /></button>
                      ) : (
                        <button onClick={() => setShowArchiveModal(row.id)} className="admin-action-btn-secondary p-1.5 rounded text-red-600" title="Archive"><Archive className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ─── Barangay Detail Modal ─── */}
      {detailBarangayId && detailBarangay && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 pb-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" onClick={() => setDetailBarangayId(null)}>
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-blue-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{detailBarangay.name}</h2>
                  <p className="text-xs text-slate-500">Code: {detailBarangay.code} &middot; {detailBarangay.population_count || "N/A"} population</p>
                </div>
              </div>
              <button onClick={() => setDetailBarangayId(null)} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex gap-1 px-6 pt-3 border-b border-slate-200 bg-white sticky top-[73px] z-10">
              {(["overview", "puroks", "activity", "login", "reports"] as const).map((st) => (
                <button key={st} onClick={() => setModalSubTab(st)}
                  className={`px-4 py-2 text-xs font-bold capitalize rounded-t-lg border-b-2 transition-colors ${
                    modalSubTab === st ? "border-blue-600 text-blue-700 bg-blue-50" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}>
                  {st === "overview" && "📊 Overview"}
                  {st === "puroks" && "📍 Puroks"}
                  {st === "activity" && "📋 Activity"}
                  {st === "login" && "🔐 Login History"}
                  {st === "reports" && "📄 Reports"}
                </button>
              ))}
            </div>

              {/* ─── OVERVIEW TAB ─── */}
              {modalSubTab === "overview" && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="admin-glass-panel p-4 bg-blue-50/40 border-blue-200"><p className="text-[10px] text-blue-650 font-bold uppercase">Children</p><p className="text-2xl font-black text-blue-800 mt-1">{detailBarangay.child_count}</p></div>
                    <div className="admin-glass-panel p-4 bg-red-50/40 border-red-200"><p className="text-[10px] text-red-650 font-bold uppercase">Active Cases</p><p className="text-2xl font-black text-red-700 mt-1">{detailBarangay.active_cases}</p></div>
                    <div className="admin-glass-panel p-4 bg-purple-50/40 border-purple-200"><p className="text-[10px] text-purple-650 font-bold uppercase">Puroks</p><p className="text-2xl font-black text-purple-800 mt-1">{detailBarangay.purok_count}</p></div>
                    <div className="admin-glass-panel p-4 bg-amber-50/40 border-amber-200"><p className="text-[10px] text-amber-650 font-bold uppercase">Risk Level</p><div className="mt-1"><Badge tone={detailBarangay.risk_level}>{detailBarangay.risk_level}</Badge></div></div>
                    <div className="admin-glass-panel p-4 bg-green-50/40 border-green-200"><p className="text-[10px] text-green-650 font-bold uppercase">Admin</p><p className="text-sm font-bold text-green-800 mt-1 truncate">{detailBarangay.assigned_admin?.username || "Unassigned"}</p></div>
                  </div>

                  {/* Stats from API */}
                  {selectedStatsQ.data && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="admin-glass-panel p-3"><p className="text-[10px] text-slate-500 font-bold uppercase">Stunting Rate</p><p className="text-lg font-bold text-slate-800 mt-0.5">{selectedStatsQ.data.prevalence?.stunting?.toFixed(1) || "0"}%</p></div>
                      <div className="admin-glass-panel p-3"><p className="text-[10px] text-slate-500 font-bold uppercase">Wasting Rate</p><p className="text-lg font-bold text-slate-800 mt-0.5">{selectedStatsQ.data.prevalence?.wasting?.toFixed(1) || "0"}%</p></div>
                      <div className="admin-glass-panel p-3"><p className="text-[10px] text-slate-500 font-bold uppercase">Underweight Rate</p><p className="text-lg font-bold text-slate-800 mt-0.5">{selectedStatsQ.data.prevalence?.underweight?.toFixed(1) || "0"}%</p></div>
                      <div className="admin-glass-panel p-3"><p className="text-[10px] text-slate-500 font-bold uppercase">Pending Referrals</p><p className="text-lg font-bold text-slate-800 mt-0.5">{selectedStatsQ.data.pending_referrals_count || 0}</p></div>
                    </div>
                  )}

                  {/* Two-column info + admin */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 admin-glass-panel p-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Barangay Information</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm font-medium">
                        <div><span className="text-slate-400">Captain:</span> <span className="font-semibold text-slate-850 ml-1">{detailBarangay.captain || "N/A"}</span></div>
                        <div><span className="text-slate-400">Nutrition Scholar:</span> <span className="font-semibold text-slate-855 ml-1">{detailBarangay.nutrition_scholar || "N/A"}</span></div>
                        <div><span className="text-slate-400">Contact:</span> <span className="font-semibold text-slate-855 ml-1">{detailBarangay.contact_number || "N/A"}</span></div>
                        <div><span className="text-slate-400">Address:</span> <span className="font-semibold text-slate-855 ml-1">{detailBarangay.address || "N/A"}</span></div>
                      </div>
                    </div>
                    <div className="admin-glass-panel p-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Assigned Admin</h4>
                      {detailBarangay.assigned_admin ? (
                        <div>
                          <p className="font-semibold text-sm">{detailBarangay.assigned_admin.username}</p>
                          <p className="text-xs text-slate-500">{detailBarangay.assigned_admin.email}</p>
                          <p className="mt-1"><Badge tone={detailBarangay.assigned_admin.account_status === "active" ? "success" : detailBarangay.assigned_admin.account_status === "locked" ? "error" : "warning"}>{detailBarangay.assigned_admin.account_status || "active"}</Badge></p>
                        </div>
                      ) : <p className="text-sm text-slate-400 italic">No admin assigned</p>}
                    </div>
                  </div>

                  {/* Recent Activity + Login History quick preview */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="admin-glass-panel p-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Recent Activity</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(selectedLogsQ.data || []).slice(0, 5).length === 0 ? <p className="text-xs text-slate-400">No recent activity</p> : (selectedLogsQ.data || []).slice(0, 5).map((log: any) => (
                          <div key={log.id} className="flex items-start gap-2 text-xs">
                            <Activity className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0"><p className="font-medium text-slate-700 truncate">{log.action}</p><p className="text-slate-450">{log.user} &middot; {new Date(log.timestamp).toLocaleString()}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="admin-glass-panel p-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Login History</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(selectedLoginQ.data || []).slice(0, 5).length === 0 ? <p className="text-xs text-slate-400">No login history</p> : (selectedLoginQ.data || []).slice(0, 5).map((log: any) => (
                          <div key={log.id} className="flex items-start gap-2 text-xs">
                            <Shield className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0"><p className="font-medium text-slate-700">{log.user} {log.ip_address ? `(${log.ip_address})` : ""}</p><p className="text-slate-450">{log.action} &middot; {new Date(log.timestamp).toLocaleString()}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Export button only */}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={async () => {
                      try {
                        const r = await api.get(`/api/barangays/${detailBarangay.id}/export`);
                        const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url; a.download = `barangay-${detailBarangay.code}-profile.json`; a.click();
                        URL.revokeObjectURL(url);
                      } catch {}
                    }} className="admin-action-btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-sm"><Download className="h-4 w-4" /> Export JSON</button>
                  </div>
                </div>
              )}

              {/* ─── PUROKS TAB ─── */}
              {modalSubTab === "puroks" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Puroks under {detailBarangay.name}</h3>
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="admin-table text-left text-sm">
                      <thead>
                        <tr>
                          <th className="admin-table-header text-left pl-4">Purok</th>
                          <th className="admin-table-header text-left">Code</th>
                          <th className="admin-table-header text-left">Children</th>
                          <th className="admin-table-header text-left">Leader</th>
                          <th className="admin-table-header text-left pr-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(puroksQ.data || []).filter((p: any) => p.barangay_id === detailBarangay.id).map((p: any) => (
                          <tr key={p.id} className="admin-table-row">
                            <td className="admin-table-cell pl-4 font-semibold text-slate-800">{p.name}</td>
                            <td className="admin-table-cell text-slate-500 font-mono">{p.code}</td>
                            <td className="admin-table-cell text-slate-750 font-bold">{(childrenQ.data || []).filter((c: any) => c.purok_id === p.id).length}</td>
                            <td className="admin-table-cell text-slate-500">{p.leader || "N/A"}</td>
                            <td className="admin-table-cell pr-4">{p.is_archived ? <Badge tone="error">Archived</Badge> : <Badge tone="success">Active</Badge>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── ACTIVITY LOGS TAB ─── */}
              {modalSubTab === "activity" && (
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

              {/* ─── LOGIN HISTORY TAB ─── */}
              {modalSubTab === "login" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Login History — Admins</h3>
                  {selectedLoginQ.isLoading ? <div className="py-8 text-center text-slate-500">Loading...</div> : (
                    <div className="space-y-2">
                      {(selectedLoginQ.data || []).length === 0 ? <div className="py-6 text-center text-slate-400 font-medium">No login history found</div> : (selectedLoginQ.data || []).map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 border border-slate-150 rounded-lg bg-white text-sm shadow-sm hover:shadow transition-all">
                          <Shield className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0"><p className="font-semibold text-slate-850">{log.user} {log.ip_address ? `from ${log.ip_address}` : ""}</p><p className="text-xs text-slate-500 font-medium">{log.action}</p><p className="text-xs text-slate-400 mt-0.5 font-bold">{new Date(log.timestamp).toLocaleString()}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── REPORTS TAB ─── */}
              {modalSubTab === "reports" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Submitted Reports</h3>
                  {selectedReportsQ.isLoading ? <div className="py-8 text-center text-slate-500">Loading...</div> : (
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="admin-table text-left text-sm">
                        <thead>
                          <tr>
                            <th className="admin-table-header text-left pl-4">Title</th>
                            <th className="admin-table-header text-left">Type</th>
                            <th className="admin-table-header text-left">Submitted By</th>
                            <th className="admin-table-header text-left">Status</th>
                            <th className="admin-table-header text-left pr-4">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedReportsQ.data || []).length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-slate-400 font-medium">No reports submitted yet</td></tr> : (selectedReportsQ.data || []).map((r: any) => (
                            <tr key={r.id} className="admin-table-row">
                              <td className="admin-table-cell pl-4 font-semibold text-slate-800">{r.title}</td>
                              <td className="admin-table-cell"><Badge tone="info">{r.report_type}</Badge></td>
                              <td className="admin-table-cell text-slate-700 font-medium">{r.created_by}</td>
                              <td className="admin-table-cell"><Badge tone={r.status === "approved" ? "success" : r.status === "submitted" ? "warning" : "normal"}>{r.status}</Badge></td>
                              <td className="admin-table-cell pr-4 text-xs text-slate-500 font-bold">{new Date(r.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="admin-modal-overlay fixed inset-0 flex items-center justify-center z-50">
          <div className="admin-modal-content bg-white rounded-xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-800">Archive Barangay?</h3>
            </div>
            <p className="text-sm text-slate-505 font-medium mb-6">This will archive the barangay and all associated data will be hidden. You can restore it later.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowArchiveModal(null)} className="admin-action-btn-secondary px-4 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={() => archiveMutation.mutate(showArchiveModal)} disabled={archiveMutation.isPending} className="admin-action-btn-primary flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 text-white disabled:opacity-50 hover:bg-red-750">
                {archiveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
