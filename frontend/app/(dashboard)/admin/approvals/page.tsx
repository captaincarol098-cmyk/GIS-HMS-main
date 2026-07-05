"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  Award,
  FileText,
  Heart,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronRight,
  Clock,
  User,
  MapPin,
  Calendar,
  MessageSquare,
  Loader2
} from "lucide-react";

export default function ProgramApprovalCenter() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"programs" | "reports" | "referrals">("programs");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | "revision" | null>(null);

  // Fetch nutrition programs
  const programsQuery = useQuery({
    queryKey: ["nutrition-programs"],
    queryFn: () => api.get("/api/nutrition-programs/programs").then((r) => r.data),
    refetchInterval: 30_000,
  });

  // Fetch reports
  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: () => api.get("/api/reports").then((r) => r.data),
    refetchInterval: 30_000,
  });

  // Fetch referrals
  const referralsQuery = useQuery({
    queryKey: ["referrals"],
    queryFn: () => api.get("/api/referrals").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const handleAction = async (type: "approve" | "reject" | "revision") => {
    if (!selectedItem) return;
    setActionType(type);
    setShowCommentModal(true);
  };

  const submitAction = async () => {
    if (!selectedItem || !actionType) return;

    try {
      if (activeTab === "programs") {
        const endpoint = `/api/nutrition-programs/programs/${selectedItem.id}/${actionType}`;
        await api.put(endpoint, { comments: comment });
      } else if (activeTab === "referrals") {
        const endpoint = `/api/referrals/${selectedItem.id}/${actionType}`;
        await api.put(endpoint, { notes: comment });
      }

      // Refresh queries
      programsQuery.refetch();
      reportsQuery.refetch();
      referralsQuery.refetch();

      setShowCommentModal(false);
      setSelectedItem(null);
      setComment("");
      setActionType(null);
    } catch (error: any) {
      console.error("Error submitting action:", error);
    }
  };

  const getPendingItems = () => {
    switch (activeTab) {
      case "programs":
        return programsQuery.data?.filter((p: any) => p.approval_status === "pending") || [];
      case "reports":
        return reportsQuery.data?.filter((r: any) => r.status === "submitted") || [];
      case "referrals":
        return referralsQuery.data?.filter((ref: any) => ref.status === "pending") || [];
      default:
        return [];
    }
  };

  const pendingItems = getPendingItems();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="admin-glass-panel flex items-center justify-between p-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Award className="h-6 w-6 text-emerald-500" />
            Program Approval Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve nutrition programs, reports, and intervention referrals
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("programs")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px admin-tab-horizontal ${
            activeTab === "programs"
              ? "active text-emerald-600 bg-emerald-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Heart className="h-4 w-4" />
          Feeding Programs
          {programsQuery.data?.filter((p: any) => p.approval_status === "pending").length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {programsQuery.data.filter((p: any) => p.approval_status === "pending").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px admin-tab-horizontal ${
            activeTab === "reports"
              ? "active text-emerald-600 bg-emerald-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <FileText className="h-4 w-4" />
          Reports
          {reportsQuery.data?.filter((r: any) => r.status === "submitted").length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {reportsQuery.data.filter((r: any) => r.status === "submitted").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("referrals")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px admin-tab-horizontal ${
            activeTab === "referrals"
              ? "active text-emerald-600 bg-emerald-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Heart className="h-4 w-4" />
          Interventions / Referrals
          {referralsQuery.data?.filter((ref: any) => ref.status === "pending").length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {referralsQuery.data.filter((ref: any) => ref.status === "pending").length}
            </span>
          )}
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Items List */}
        <div className="admin-glass-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-extrabold text-slate-800">
              {activeTab === "programs" && "Pending Nutrition Programs"}
              {activeTab === "reports" && "Submitted Reports"}
              {activeTab === "referrals" && "Pending Referrals"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {pendingItems.length} item{pendingItems.length !== 1 ? "s" : ""} awaiting review
            </p>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {programsQuery.isLoading || reportsQuery.isLoading || referralsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
              </div>
            ) : pendingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                <p className="text-sm font-semibold text-slate-700">No pending items</p>
                <p className="text-xs text-slate-500 mt-1">All items have been reviewed</p>
              </div>
            ) : (
              pendingItems.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50/50 ${
                    selectedItem?.id === item.id ? "bg-emerald-50/40 border-l-4 border-emerald-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {activeTab === "programs" && item.name}
                          {activeTab === "reports" && item.title}
                          {activeTab === "referrals" && `Referral for Child #${item.child_id}`}
                        </h3>
                        <span className="bg-yellow-100 text-yellow-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                          Pending
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>
                            {activeTab === "programs" && `Purok ${item.purok_id}`}
                            {activeTab === "reports" && item.barangay_name}
                            {activeTab === "referrals" && item.referred_to}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {activeTab === "programs" && item.frequency}
                            {activeTab === "reports" && new Date(item.period_start).toLocaleDateString()}
                            {activeTab === "referrals" && new Date(item.referred_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{item.description}</p>
                      )}
                      {item.reason && (
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{item.reason}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="admin-glass-panel overflow-hidden">
          {selectedItem ? (
            <>
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-extrabold text-slate-800">Review Details</h2>
              </div>

              <div className="p-5 space-y-4">
                {/* Item Details */}
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name / Title</p>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {activeTab === "programs" && selectedItem.name}
                      {activeTab === "reports" && selectedItem.title}
                      {activeTab === "referrals" && `Referral #${selectedItem.id}`}
                    </p>
                  </div>

                  {activeTab === "programs" && (
                    <>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</p>
                        <p className="text-xs text-slate-700 mt-0.5">{selectedItem.description || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frequency</p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">{selectedItem.frequency}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget</p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">
                            {selectedItem.budget_amount ? `₱${selectedItem.budget_amount.toLocaleString()}` : "N/A"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === "reports" && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report Type</p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">{selectedItem.report_type}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Period</p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">
                            {new Date(selectedItem.period_start).toLocaleDateString()} - {new Date(selectedItem.period_end).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === "referrals" && (
                    <>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason</p>
                        <p className="text-xs text-slate-700 mt-0.5">{selectedItem.reason}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5 capitalize">{selectedItem.priority}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referred To</p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">{selectedItem.referred_to}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedItem.comments && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Existing Comments</p>
                      <p className="text-xs text-slate-700 mt-0.5 bg-slate-50 p-2 rounded">{selectedItem.comments}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => handleAction("approve")}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-extrabold transition-colors shadow-sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction("revision")}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-white text-xs font-extrabold transition-colors shadow-sm"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Return for Revision
                  </button>
                  <button
                    onClick={() => handleAction("reject")}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-red-655 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-xs font-extrabold transition-colors shadow-sm"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">Select an item to review</p>
              <p className="text-xs text-slate-500 mt-1">Choose from the list to view details and take action</p>
            </div>
          )}
        </div>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="admin-modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="admin-modal-content w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {actionType === "approve" && "Add Approval Comments"}
                {actionType === "revision" && "Revision Instructions"}
                {actionType === "reject" && "Rejection Reason"}
              </h3>
            </div>
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter your comments or instructions..."
                className="admin-interactive-input w-full rounded-xl px-3 py-2 text-sm min-h-[120px]"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setComment("");
                  setActionType(null);
                }}
                className="admin-action-btn-secondary px-4 py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                className="admin-action-btn-primary px-4 py-2 rounded-xl text-xs"
              >
                {actionType === "approve" && "Approve"}
                {actionType === "revision" && "Return for Revision"}
                {actionType === "reject" && "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
