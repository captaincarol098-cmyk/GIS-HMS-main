"use client";
import "@/styles/admin.css";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  Target,
  Users,
  QrCode,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  Download,
  Upload,
  Scan,
  Play,
  Pause,
  Save,
  FileText
} from "lucide-react";

interface Program {
  id: string;
  name: string;
  type: string;
  date: string;
  time: string;
  location: string;
  status: string;
  registered_children: number;
  total_children: number;
}

interface Child {
  id: string;
  name: string;
  age: number;
  sex: string;
  qr_code: string;
  attended: boolean;
  check_in_time?: string;
}

export default function ProgramActivitiesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [activeTab, setActiveTab] = useState<"programs" | "attendance" | "registration" | "report" | "interventions" | "accomplishments">("programs");
  const [searchQuery, setSearchQuery] = useState("");
  const [scanMode, setScanMode] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  // Form state for creating program
  const [programForm, setProgramForm] = useState({
    name: "",
    type: "",
    date: "",
    time: "",
    location: "",
    description: ""
  });

  // Form state for registering participant
  const [participantForm, setParticipantForm] = useState({
    child_name: "",
    birth_date: "",
    sex: "male",
    weight: "",
    height: "",
    guardian_name: "",
    guardian_contact: "",
    address: "",
    notes: ""
  });

  const { data: programs, isLoading: programsLoading, error: programsError } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      try {
        console.log("Fetching programs...");
        const response = await api.get("/api/programs");
        console.log("Programs response:", response.data);
        return response.data;
      } catch (error: any) {
        console.error("Error fetching programs:", error);
        console.error("Error response:", error.response?.data);
        console.error("Error status:", error.response?.status);
        throw error;
      }
    },
    retry: 1,
  });

  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ["program-children", selectedProgram?.id],
    queryFn: () => api.get(`/api/programs/${selectedProgram?.id}/children`).then((r) => r.data),
    enabled: !!selectedProgram && activeTab === "attendance",
  });

  const checkInMutation = useMutation({
    mutationFn: (childId: number) => 
      api.post(`/api/programs/${selectedProgram?.id}/check-in`, { child_id: childId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-children"] });
    },
  });

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMessage("");

    try {
      await api.post("/api/programs", {
        name: programForm.name,
        type: programForm.type,
        date: programForm.date,
        time: programForm.time,
        location: programForm.location,
        description: programForm.description,
        status: "scheduled"
      });

      setFormMessage("✅ Program created successfully!");
      setProgramForm({
        name: "",
        type: "",
        date: "",
        time: "",
        location: "",
        description: ""
      });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setTimeout(() => {
        setShowCreateModal(false);
        setFormMessage("");
      }, 2000);
    } catch (error: any) {
      console.error("Create program error:", error);
      setFormMessage("❌ Error: " + (error.response?.data?.detail || error.message || "Failed to create program"));
    } finally {
      setFormLoading(false);
    }
  };

  const handleRegisterParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMessage("");

    try {
      // Register participant with child data
      const response = await api.post(`/api/programs/${selectedProgram?.id}/register`, {
        child_name: participantForm.child_name,
        birth_date: participantForm.birth_date,
        sex: participantForm.sex,
        weight: parseFloat(participantForm.weight),
        height: parseFloat(participantForm.height),
        guardian_name: participantForm.guardian_name,
        guardian_contact: participantForm.guardian_contact,
        address: participantForm.address,
        notes: participantForm.notes
      });

      setFormMessage("✅ Participant registered successfully!");
      setParticipantForm({
        child_name: "",
        birth_date: "",
        sex: "male",
        weight: "",
        height: "",
        guardian_name: "",
        guardian_contact: "",
        address: "",
        notes: ""
      });
      queryClient.invalidateQueries({ queryKey: ["program-children", selectedProgram?.id] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setTimeout(() => {
        setShowRegistrationModal(false);
        setFormMessage("");
      }, 2000);
    } catch (error: any) {
      console.error("Register participant error:", error);
      setFormMessage("❌ Error: " + (error.response?.data?.detail || error.message || "Failed to register participant"));
    } finally {
      setFormLoading(false);
    }
  };

  const filteredChildren = children?.filter((child: Child) => 
    child.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
    child.qr_code.toLowerCase().includes(manualSearch.toLowerCase())
  ) || [];

  const handleCheckIn = (childId: number) => {
    checkInMutation.mutate(childId);
  };

  const handleQRScan = (qrCode: string) => {
    const child = children?.find((c: Child) => c.qr_code === qrCode);
    if (child && !child.attended) {
      handleCheckIn(child.id);
    }
  };

  if (programsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading programs...</div>
      </div>
    );
  }

  if (programsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500">Error loading programs</div>
        <div className="text-sm text-slate-600">
          {programsError instanceof Error ? programsError.message : "Unknown error"}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="admin-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Program Activities & Interventions</h1>
          <p className="text-sm">Manage programs, track interventions with dual budget allocations (CHO + Barangay), and monitor accomplishments</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="admin-action-btn-emerald flex items-center gap-2 px-4 py-2.5 text-xs text-white"
        >
          <Plus className="h-4 w-4" />
          Create Program
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("programs")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "programs"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Programs
          </button>
          <button
            onClick={() => setActiveTab("registration")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "registration"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            disabled={!selectedProgram}
          >
            Registration
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "attendance"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            disabled={!selectedProgram}
          >
            Attendance
          </button>
          <button
            onClick={() => setActiveTab("interventions")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "interventions"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Interventions (CHO + Barangay Budget)
          </button>
          <button
            onClick={() => setActiveTab("accomplishments")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "accomplishments"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Accomplishments
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "report"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            disabled={!selectedProgram}
          >
            Report
          </button>
        </nav>
      </div>

      {activeTab === "programs" && (
        <>
          {/* Program Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="admin-glass-panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Programs</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{programs?.length || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="admin-glass-panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Today</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {programs?.filter((p: Program) => p.status === "active").length || 0}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                  <Play className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="admin-glass-panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Beneficiaries</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {programs?.reduce((sum: number, p: Program) => sum + p.registered_children, 0) || 0}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="admin-glass-panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">This Month</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">12</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Programs List */}
          <div className="admin-glass-panel">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Program Schedule</h3>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search programs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {programs?.filter((p: Program) => 
                p.name.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((program: Program) => (
                <div
                  key={program.id}
                  className={`p-6 hover:bg-slate-50 cursor-pointer transition-colors ${
                    selectedProgram?.id === program.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                  }`}
                  onClick={() => setSelectedProgram(program)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                        program.status === "active" ? "bg-green-100" :
                        program.status === "completed" ? "bg-blue-100" :
                        "bg-slate-100"
                      }`}>
                        {program.status === "active" ? (
                          <Play className="h-6 w-6 text-green-600" />
                        ) : program.status === "completed" ? (
                          <CheckCircle className="h-6 w-6 text-blue-600" />
                        ) : (
                          <Clock className="h-6 w-6 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{program.name}</h4>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {program.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {program.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {program.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">
                        {program.registered_children} / {program.total_children}
                      </div>
                      <div className="text-xs text-slate-500">Registered</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === "registration" && selectedProgram && (
        <div className="space-y-6">
          {/* Registration Header */}
          <div className="admin-glass-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedProgram.name}</h2>
                <p className="text-sm">Register participants for this program</p>
              </div>
              <button 
                onClick={() => setShowRegistrationModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                Register Participant
              </button>
            </div>
          </div>

          {/* Registered Participants List */}
          <div className="admin-glass-panel">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Registered Participants</h3>
                <div className="text-sm text-slate-500">
                  Total: {children?.length || 0} participants
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200 max-h-[500px] overflow-y-auto">
              {childrenLoading ? (
                <div className="p-8 text-center text-slate-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Loading participants...
                </div>
              ) : children && children.length > 0 ? (
                children.map((child: Child) => (
                  <div key={child.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                          {child.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{child.name}</p>
                          <p className="text-xs text-slate-500">
                            {child.age} years old • {child.sex} • QR: {child.qr_code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {child.attended ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            Attended
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                            Registered
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No participants registered yet</p>
                  <p className="text-xs mt-1">Click "Register Participant" to add children to this program</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "attendance" && selectedProgram && (
        <div className="space-y-6">
          {/* Attendance Header */}
          <div className="admin-glass-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedProgram.name}</h2>
                <p className="text-sm">{selectedProgram.date} • {selectedProgram.time} • {selectedProgram.location}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {children?.filter((c: Child) => c.attended).length || 0}
                  </p>
                  <p className="text-xs text-slate-500">Checked In</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {children?.length || 0}
                  </p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Modes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setScanMode(true)}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <QrCode className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900">QR Scan</p>
                <p className="text-xs text-slate-500">Scan child QR code</p>
              </div>
            </button>

            <button
              onClick={() => setScanMode(false)}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Search className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900">Manual Search</p>
                <p className="text-xs text-slate-500">Search by name or QR</p>
              </div>
            </button>

            <button className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Upload className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900">Import Data</p>
                <p className="text-xs text-slate-500">Bulk import attendance</p>
              </div>
            </button>
          </div>

          {/* QR Scan Mode */}
          {scanMode && (
            <div className="admin-glass-panel p-6">
              <div className="text-center">
                <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <Scan className="h-16 w-16 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm">Point camera at QR code</p>
                  </div>
                </div>
                <button
                  onClick={() => setScanMode(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                >
                  Cancel Scan
                </button>
              </div>
            </div>
          )}

          {/* Manual Search Mode */}
          {!scanMode && (
            <div className="admin-glass-panel">
              <div className="p-6 border-b border-slate-200">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search child by name or QR code..."
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
                {filteredChildren.map((child: Child) => (
                  <div key={child.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{child.name}</p>
                        <p className="text-xs text-slate-500">
                          {child.age} yrs • {child.sex} • QR: {child.qr_code}
                        </p>
                      </div>
                    </div>
                    {child.attended ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-xs font-medium">{child.check_in_time}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCheckIn(Number(child.id))}
                        disabled={checkInMutation.isPending}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        Check In
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "report" && selectedProgram && (
        <div className="space-y-6">
          <div className="admin-glass-panel p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Program Completion Report</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs text-slate-500 uppercase">Program Name</p>
                <p className="text-sm font-semibold text-slate-900">{selectedProgram.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Date & Time</p>
                <p className="text-sm font-semibold text-slate-900">{selectedProgram.date} • {selectedProgram.time}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Location</p>
                <p className="text-sm font-semibold text-slate-900">{selectedProgram.location}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Attendance Rate</p>
                <p className="text-sm font-semibold text-slate-900">
                  {((children?.filter((c: Child) => c.attended).length || 0) / (children?.length || 1) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="admin-action-btn-emerald flex items-center gap-2 px-4 py-2.5 text-xs text-white">
                <Download className="h-4 w-4" />
                Download PDF
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                <FileText className="h-4 w-4" />
                Download Excel
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300">
                <Save className="h-4 w-4" />
                Save Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegistrationModal && selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Register Participant</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedProgram.name}</p>
              </div>
              <button 
                onClick={() => {
                  setShowRegistrationModal(false);
                  setFormMessage("");
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterParticipant} className="space-y-4">
              {/* Child Information Section */}
              <div className="bg-blue-50/50 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Child Information
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Child's Full Name *
                    </label>
                    <input
                      type="text"
                      value={participantForm.child_name}
                      onChange={(e) => setParticipantForm({...participantForm, child_name: e.target.value})}
                      placeholder="e.g., Juan Dela Cruz"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Birth Date *
                    </label>
                    <input
                      type="date"
                      value={participantForm.birth_date}
                      onChange={(e) => setParticipantForm({...participantForm, birth_date: e.target.value})}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Sex *
                    </label>
                    <select
                      value={participantForm.sex}
                      onChange={(e) => setParticipantForm({...participantForm, sex: e.target.value})}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Measurement Section */}
              <div className="bg-green-50/50 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" />
                  Nutritional Measurement
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={participantForm.weight}
                      onChange={(e) => setParticipantForm({...participantForm, weight: e.target.value})}
                      placeholder="e.g., 12.5"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Height (cm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={participantForm.height}
                      onChange={(e) => setParticipantForm({...participantForm, height: e.target.value})}
                      placeholder="e.g., 95.0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Guardian Information Section */}
              <div className="bg-purple-50/50 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Guardian Information
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Guardian Name *
                    </label>
                    <input
                      type="text"
                      value={participantForm.guardian_name}
                      onChange={(e) => setParticipantForm({...participantForm, guardian_name: e.target.value})}
                      placeholder="e.g., Maria Dela Cruz"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={participantForm.guardian_contact}
                      onChange={(e) => setParticipantForm({...participantForm, guardian_contact: e.target.value})}
                      placeholder="e.g., 09123456789"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Address
                    </label>
                    <input
                      type="text"
                      value={participantForm.address}
                      onChange={(e) => setParticipantForm({...participantForm, address: e.target.value})}
                      placeholder="e.g., Purok 1, Poblacion"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  value={participantForm.notes}
                  onChange={(e) => setParticipantForm({...participantForm, notes: e.target.value})}
                  placeholder="Any additional observations or notes..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formMessage && (
                <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  formMessage.includes("✅") 
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}>
                  {formMessage}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegistrationModal(false);
                    setFormMessage("");
                  }}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? "Registering..." : "Register Participant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Program Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-lg font-extrabold text-slate-800">Create New Program</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Program Name *
                </label>
                <input
                  type="text"
                  value={programForm.name}
                  onChange={(e) => setProgramForm({...programForm, name: e.target.value})}
                  placeholder="e.g., Vitamin A Supplementation Program"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Program Type *
                </label>
                <select
                  value={programForm.type}
                  onChange={(e) => setProgramForm({...programForm, type: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select type...</option>
                  <option value="Feeding Program">Feeding Program</option>
                  <option value="Vitamin Supplementation">Vitamin Supplementation</option>
                  <option value="Deworming">Deworming</option>
                  <option value="Health Screening">Health Screening</option>
                  <option value="Nutrition Education">Nutrition Education</option>
                  <option value="Growth Monitoring">Growth Monitoring</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={programForm.date}
                    onChange={(e) => setProgramForm({...programForm, date: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={programForm.time}
                    onChange={(e) => setProgramForm({...programForm, time: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Location *
                </label>
                <input
                  type="text"
                  value={programForm.location}
                  onChange={(e) => setProgramForm({...programForm, location: e.target.value})}
                  placeholder="e.g., Barangay Hall, Poblacion"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  value={programForm.description}
                  onChange={(e) => setProgramForm({...programForm, description: e.target.value})}
                  placeholder="Additional program details..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-slate-400 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formMessage && (
                <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  formMessage.includes("✅") 
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}>
                  {formMessage}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? "Creating..." : "Create Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
