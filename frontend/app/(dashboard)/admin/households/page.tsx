"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Plus, Search, Edit3, Trash2, X, Home, Users, Phone, MapPin, StickyNote, Loader2 } from "lucide-react";

export default function HouseholdsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isSuper = user?.role === "super_admin";

  const [search, setSearch] = useState("");
  const [purokFilter, setPurokFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const defaultForm = { purok_id: "", household_no: "", head_name: "", address: "", contact_number: "", member_count: 0, latitude: undefined as number | undefined, longitude: undefined as number | undefined, notes: "" };
  const [form, setForm] = useState(defaultForm);

  const householdsQ = useQuery({
    queryKey: ["households", purokFilter],
    queryFn: () => api.get("/api/households", { params: purokFilter ? { purok_id: purokFilter } : {} }).then(r => r.data),
  });

  const puroksQ = useQuery({
    queryKey: ["puroks-list"],
    queryFn: () => api.get("/api/puroks").then(r => r.data),
  });

  const barangaysQ = useQuery({
    queryKey: ["barangays"],
    queryFn: () => api.get("/api/barangays").then(r => r.data),
  });

  const purokMap = useMemo(() => {
    const m: Record<string, { name: string; barangay_id: string }> = {};
    (puroksQ.data || []).forEach((p: any) => { m[p.id] = { name: p.name, barangay_id: p.barangay_id }; });
    return m;
  }, [puroksQ.data]);

  const barangayMap = useMemo(() => {
    const m: Record<string, string> = {};
    (barangaysQ.data || []).forEach((b: any) => { m[b.id] = b.name; });
    return m;
  }, [barangaysQ.data]);

  const filteredHouseholds = useMemo(() => {
    let data = householdsQ.data || [];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((h: any) => h.head_name.toLowerCase().includes(q) || h.household_no.toLowerCase().includes(q));
    }
    return data;
  }, [householdsQ.data, search]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/households", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["households"] }); setShowForm(false); setForm(defaultForm); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/api/households/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["households"] }); setShowForm(false); setEditingId(null); setForm(defaultForm); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/households/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["households"] }); setDeleteConfirmId(null); },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function handleEdit(h: any) {
    setEditingId(h.id);
    setForm({
      purok_id: h.purok_id || "",
      household_no: h.household_no || "",
      head_name: h.head_name || "",
      address: h.address || "",
      contact_number: h.contact_number || "",
      member_count: h.member_count || 0,
      latitude: h.latitude,
      longitude: h.longitude,
      notes: h.notes || "",
    });
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="admin-glass-panel flex flex-col md:flex-row md:items-center md:justify-between p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Home className="h-5 w-5 text-emerald-600" />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Household Management</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium">Register and manage households within puroks</p>
        </div>
        <button
          id="add-household-btn"
          onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(true); }}
          className="admin-action-btn-primary mt-4 md:mt-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Household</span>
        </button>
      </div>

      {/* ─── Stats Strip ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="admin-glass-panel p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Households</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{(householdsQ.data || []).length}</p>
        </div>
        <div className="admin-glass-panel p-4">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Filtered</p>
          <p className="text-2xl font-black text-blue-800 mt-1">{filteredHouseholds.length}</p>
        </div>
        <div className="admin-glass-panel p-4">
          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Total Members</p>
          <p className="text-2xl font-black text-purple-800 mt-1">
            {(filteredHouseholds as any[]).reduce((acc: number, h: any) => acc + (h.member_count || 0), 0)}
          </p>
        </div>
        <div className="admin-glass-panel p-4">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Puroks</p>
          <p className="text-2xl font-black text-emerald-800 mt-1">{(puroksQ.data || []).length}</p>
        </div>
      </div>

      {/* ─── Main List Card ─── */}
      <div className="admin-glass-panel p-5 space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Households List</h3>
          <div className="flex gap-3 flex-wrap">
            {isSuper && (
              <select
                id="purok-filter-select"
                className="admin-interactive-input rounded-lg px-3 py-2 text-xs"
                value={purokFilter}
                onChange={e => setPurokFilter(e.target.value)}
              >
                <option value="">All Puroks</option>
                {(puroksQ.data || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} — {barangayMap[p.barangay_id] || ""}</option>
                ))}
              </select>
            )}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                id="household-search-input"
                className="admin-interactive-input w-full rounded-lg pl-9 pr-3 py-2 text-xs"
                placeholder="Search household or head name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="admin-table text-left text-xs font-medium text-slate-600">
            <thead>
              <tr>
                <th className="admin-table-header text-left pl-4">Household No.</th>
                <th className="admin-table-header text-left">Head Name</th>
                <th className="admin-table-header text-left">Purok</th>
                <th className="admin-table-header text-left">Barangay</th>
                <th className="admin-table-header text-left">Members</th>
                <th className="admin-table-header text-left">Contact</th>
                <th className="admin-table-header text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {householdsQ.isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                  <div className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading households…</div>
                </td></tr>
              ) : filteredHouseholds.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400 font-medium">No households found.</td></tr>
              ) : (
                filteredHouseholds.map((h: any) => {
                  const purokInfo = purokMap[h.purok_id] || {} as any;
                  return (
                    <tr key={h.id} className="admin-table-row">
                      <td className="admin-table-cell pl-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-extrabold border border-emerald-100">
                          <Home className="h-3 w-3" /> {h.household_no}
                        </span>
                      </td>
                      <td className="admin-table-cell font-bold text-slate-800">{h.head_name}</td>
                      <td className="admin-table-cell font-medium text-slate-600">{purokInfo.name || "N/A"}</td>
                      <td className="admin-table-cell font-medium text-slate-600">{barangayMap[purokInfo.barangay_id] || "N/A"}</td>
                      <td className="admin-table-cell">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          <Users className="h-3.5 w-3.5 text-slate-400" />{h.member_count}
                        </span>
                      </td>
                      <td className="admin-table-cell font-medium text-slate-500">{h.contact_number || "—"}</td>
                      <td className="admin-table-cell pr-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleEdit(h)}
                          className="inline-flex p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(h.id)}
                          className="inline-flex p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 border border-red-100 hover:border-red-200 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Add / Edit Modal ─── */}
      {showForm && (
        <div className="admin-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm); }}>
          <form onSubmit={handleSubmit} className="admin-modal-content relative w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 md:p-8 space-y-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">{editingId ? "Edit Household" : "Add Household"}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{editingId ? "Update household details" : "Register a new household"}</p>
              </div>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm); }} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Purok</label>
                <select required className="admin-interactive-input w-full rounded-lg px-3 py-2 text-xs" value={form.purok_id} onChange={e => setForm({...form, purok_id: e.target.value})}>
                  <option value="">Select Purok</option>
                  {(puroksQ.data || []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} — {barangayMap[p.barangay_id] || ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Household No.</label>
                <input type="text" required className="admin-interactive-input w-full rounded-lg px-3 py-2 text-xs" placeholder="e.g. HH-001" value={form.household_no} onChange={e => setForm({...form, household_no: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Head Name</label>
                <input type="text" required className="admin-interactive-input w-full rounded-lg px-3 py-2 text-xs" placeholder="Full name" value={form.head_name} onChange={e => setForm({...form, head_name: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Address</label>
                <input type="text" className="admin-interactive-input w-full rounded-lg px-3 py-2 text-xs" placeholder="Street / Sitio" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Contact Number</label>
                <input type="text" className="admin-interactive-input w-full rounded-lg px-3 py-2 text-xs" placeholder="09xx-xxx-xxxx" value={form.contact_number} onChange={e => setForm({...form, contact_number: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Member Count</label>
                <input type="number" min="0" className="admin-interactive-input w-full rounded-lg px-3 py-2 text-xs" value={form.member_count} onChange={e => setForm({...form, member_count: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Latitude</label>
                <input type="number" step="any" className="admin-interactive-input w-full rounded-lg px-3 py-2 text-xs" placeholder="Optional" value={form.latitude ?? ""} onChange={e => setForm({...form, latitude: e.target.value ? parseFloat(e.target.value) : undefined})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Longitude</label>
                <input type="number" step="any" className="admin-interactive-input w-full rounded-lg px-3 py-2 text-xs" placeholder="Optional" value={form.longitude ?? ""} onChange={e => setForm({...form, longitude: e.target.value ? parseFloat(e.target.value) : undefined})} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Notes</label>
                <textarea className="admin-interactive-input w-full rounded-lg px-3 py-2 text-xs" rows={2} placeholder="Optional notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm); }} className="admin-action-btn-secondary px-4 py-2 rounded-lg text-xs font-bold">Cancel</button>
              <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="admin-action-btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50">
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingId ? "Update" : "Create"} Household
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deleteConfirmId && (
        <div className="admin-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="admin-modal-content bg-white rounded-xl border border-slate-100 p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-50 rounded-full">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Household?</h3>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-5">This action cannot be undone. The household and all associated records will be permanently removed.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="admin-action-btn-secondary px-4 py-2 rounded-lg text-xs font-bold">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId!)}
                disabled={deleteMutation.isPending}
                className="admin-action-btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-red-600 text-white disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}