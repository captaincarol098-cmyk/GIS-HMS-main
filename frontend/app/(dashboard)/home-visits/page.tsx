"use client";
import "@/styles/admin.css";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  Home,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Camera,
  Map,
  FileText,
  Download
} from "lucide-react";

interface HomeVisit {
  id: string;
  child_name: string;
  child_id: string;
  parent_name: string;
  address: string;
  purok: string;
  scheduled_date: string;
  scheduled_time: string;
  assigned_bns: string;
  status: string;
  findings?: string;
  recommendations?: string;
  gps_verified?: boolean;
  photos?: string[];
}

export default function HomeVisitsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedVisit, setSelectedVisit] = useState<HomeVisit | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: visits, isLoading } = useQuery({
    queryKey: ["home-visits"],
    queryFn: () => api.get("/api/home-visits").then((r) => r.data),
  });

  const completeVisitMutation = useMutation({
    mutationFn: (visitId: string) => 
      api.post(`/api/home-visits/${visitId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-visits"] });
    },
  });

  const filteredVisits = visits?.filter((visit: HomeVisit) => {
    const matchesStatus = statusFilter === "all" || visit.status === statusFilter;
    const matchesSearch = 
      visit.child_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.parent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.purok.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "missed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading home visits...</div>
      </div>
    );
  }

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Home Visit Management</h1>
          <p className="text-sm text-slate-500">Schedule and track home visits for malnutrition cases</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Schedule Visit
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Visits</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{visits?.length || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Home className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Scheduled</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {visits?.filter((v: HomeVisit) => v.status === "scheduled").length || 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {visits?.filter((v: HomeVisit) => v.status === "completed").length || 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="admin-glass-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Missed</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {visits?.filter((v: HomeVisit) => v.status === "missed").length || 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by child name, parent, or purok..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Visits List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Child</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned BNS</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">GPS</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredVisits.map((visit: HomeVisit) => (
                <tr key={visit.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{visit.child_name}</div>
                    <div className="text-xs text-slate-500">ID: {visit.child_id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">{visit.parent_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">{visit.address}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {visit.purok}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">{visit.scheduled_date}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {visit.scheduled_time}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">{visit.assigned_bns}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(visit.status)}`}>
                      {visit.status.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {visit.gps_verified ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedVisit(visit)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visit Detail Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Home Visit Details</h2>
              <button
                onClick={() => setSelectedVisit(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Child Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Child Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="text-sm font-medium text-slate-900">{selectedVisit.child_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Child ID</p>
                    <p className="text-sm font-medium text-slate-900">{selectedVisit.child_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Parent</p>
                    <p className="text-sm font-medium text-slate-900">{selectedVisit.parent_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Purok</p>
                    <p className="text-sm font-medium text-slate-900">{selectedVisit.purok}</p>
                  </div>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Schedule</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Date</p>
                    <p className="text-sm font-medium text-slate-900">{selectedVisit.scheduled_date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Time</p>
                    <p className="text-sm font-medium text-slate-900">{selectedVisit.scheduled_time}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Assigned BNS</p>
                    <p className="text-sm font-medium text-slate-900">{selectedVisit.assigned_bns}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedVisit.status)}`}>
                      {selectedVisit.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visit Findings */}
              {selectedVisit.status === "completed" && (
                <>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Visit Findings</h3>
                    <p className="text-sm text-slate-700">{selectedVisit.findings || "No findings recorded"}</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Recommendations</h3>
                    <p className="text-sm text-slate-700">{selectedVisit.recommendations || "No recommendations recorded"}</p>
                  </div>

                  {selectedVisit.photos && selectedVisit.photos.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-slate-900 mb-3">Photos</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedVisit.photos.map((photo, index) => (
                          <div key={index} className="h-24 bg-slate-200 rounded-lg flex items-center justify-center">
                            <Camera className="h-6 w-6 text-slate-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {selectedVisit.status === "scheduled" && (
                  <>
                    <button
                      onClick={() => completeVisitMutation.mutate(selectedVisit.id)}
                      disabled={completeVisitMutation.isPending}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      Complete Visit
                    </button>
                    <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                      <Map className="h-4 w-4 inline mr-1" />
                      Navigate
                    </button>
                  </>
                )}
                <button className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Print Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Schedule Home Visit</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Child</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Select child...</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input type="time" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign BNS</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Select BNS...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Any special instructions..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Schedule Visit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
