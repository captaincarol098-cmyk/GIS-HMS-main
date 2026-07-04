"use client";
import "@/styles/admin.css";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { ReferralForm } from "@/components/referrals/ReferralForm";
import { Clock, Calendar, CheckCircle2, AlertCircle, X, User, Plus } from "lucide-react";

export default function ReferralsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReferral, setSelectedReferral] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  const q = useQuery({
    queryKey: ["referrals"],
    queryFn: () => api.get("/api/referrals").then((r) => r.data),
  });

  const childrenQuery = useQuery({
    queryKey: ["children"],
    queryFn: () => api.get("/api/children").then((r) => r.data),
  });

  const barangaysQuery = useQuery({
    queryKey: ["barangays"],
    queryFn: () => api.get("/api/barangays").then((r) => r.data),
  });

  // Calculate top card stats
  const stats = useMemo(() => {
    const list = q.data || [];
    const pending = list.filter((r: any) => r.status === "pending").length;
    const scheduled = list.filter((r: any) => r.status === "accepted").length;
    const completed = list.filter((r: any) => r.status === "completed").length;
    const total = list.length;
    return { pending, scheduled, completed, total };
  }, [q.data]);

  // Filter referrals list
  const filteredReferrals = useMemo(() => {
    const list = q.data || [];
    if (statusFilter === "all") return list;
    if (statusFilter === "accepted") return list.filter((r: any) => r.status === "accepted");
    return list.filter((r: any) => r.status === statusFilter);
  }, [q.data, statusFilter]);

  // Handle status updates
  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReferral) return;
    await api.put(`/api/referrals/${selectedReferral.id}/status`, null, {
      params: { status: newStatus, notes: outcomeNotes || undefined },
    });
    setSelectedReferral(null);
    setNewStatus("");
    setOutcomeNotes("");
    q.refetch();
  }

  // Format date helper
  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  }

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Referral System</h1>
          <p className="text-sm text-slate-500 mt-1">Manage referrals to health facilities for specialized care</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors shadow-sm">
          <Plus className="h-4 w-4" />
          Create Referral
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending Card */}
        <div className="admin-glass-panel p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Pending</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.pending}</p>
          </div>
          <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 border border-amber-100">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Scheduled Card */}
        <div className="admin-glass-panel p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Scheduled</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.scheduled}</p>
          </div>
          <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 border border-blue-100">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        {/* Completed Card */}
        <div className="admin-glass-panel p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Completed</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.completed}</p>
          </div>
          <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-green-500 border border-green-100">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Total Card */}
        <div className="admin-glass-panel p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
          </div>
          <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-500 border border-purple-100">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Creation form */}
      {showForm && (
        <Panel title="Create Referral">
          <ReferralForm onSaved={() => {
            q.refetch();
            setShowForm(false);
          }} />
        </Panel>
      )}

      {/* Filter and Queue Section */}
      <div className="admin-glass-panel p-5 space-y-5">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
            Filter by Status
          </label>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Referrals</option>
            <option value="pending">Pending</option>
            <option value="accepted">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Referrals Cards List */}
        <div className="space-y-4">
          {q.isLoading ? (
            <div className="py-8 text-center text-slate-500">Loading referral records...</div>
          ) : filteredReferrals.length === 0 ? (
            <div className="py-8 text-center text-slate-500">No referrals match the current selection.</div>
          ) : (
            filteredReferrals.map((r: any) => {
              const child = childrenQuery.data?.find((c: any) => c.id === r.child_id);
              const brgy = barangaysQuery.data?.find((b: any) => b.id === child?.barangay_id);
              const brgyName = brgy ? brgy.name : "";

              // Format outcome or appointment
              const isCompleted = r.status === "completed";
              const isScheduled = r.status === "accepted";
              const appointmentDate = isScheduled || isCompleted 
                ? formatDate(new Date(new Date(r.referred_at).getTime() + 8 * 24 * 60 * 60 * 1000).toISOString())
                : null;

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left details */}
                    <div className="flex gap-4">
                      <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-800 text-lg leading-tight">
                            {child?.full_name || "Loading Name..."}
                          </h3>
                          <span className="text-xs text-slate-400 font-semibold uppercase">
                            @ {brgyName || "Unknown"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm pt-1">
                          <div>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                              Referred To
                            </span>
                            <span className="font-semibold text-slate-700">{r.referred_to}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                              Created Date
                            </span>
                            <span className="text-slate-600">
                              {formatDate(r.referred_at)} by {brgyName || "System"} Admin
                            </span>
                          </div>
                        </div>
                        <div className="text-sm pt-2">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                            Reason
                          </span>
                          <p className="text-slate-700 italic mt-0.5">{r.reason}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right details */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        {/* Priority Badge */}
                        <Badge tone={r.priority === "emergency" ? "severe_acute_malnutrition" : r.priority === "urgent" ? "moderate_acute_malnutrition" : "normal"}>
                          {r.priority.toUpperCase()}
                        </Badge>
                        {/* Status Badge */}
                        <Badge tone={r.status === "completed" ? "normal" : r.status === "accepted" ? "overweight" : "severe_acute_malnutrition"}>
                          {r.status === "accepted" ? "scheduled" : r.status}
                        </Badge>
                      </div>

                      {appointmentDate && (
                        <div className="text-sm md:text-right mt-1">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                            Appointment
                          </span>
                          <span className="font-bold text-slate-800">{appointmentDate}</span>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setSelectedReferral(r);
                          setNewStatus(r.status);
                          setOutcomeNotes(r.notes || "");
                        }}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100/70 px-3 py-1.5 rounded-lg transition-colors border border-teal-100"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>

                  {/* Outcome Box */}
                  {isCompleted && r.notes && (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-3.5 text-sm text-green-800 leading-relaxed">
                      <span className="font-bold">Outcome: </span>
                      {r.notes}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <form
            onSubmit={handleStatusUpdate}
            className="relative w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 space-y-5"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Update Referral Status</h3>
                <p className="text-xs text-slate-400 mt-0.5">Modify priority/status or log the outcome</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReferral(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="text-slate-500 font-bold block mb-1">Status</span>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-slate-500 font-bold block mb-1">Outcome / Notes</span>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  placeholder="Enter medical findings, treatment, or referral results..."
                  rows={4}
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                />
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedReferral(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
