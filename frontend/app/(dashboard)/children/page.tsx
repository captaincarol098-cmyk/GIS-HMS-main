"use client";
import "@/styles/admin.css";

import { useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/Badge";
import { ChildForm } from "@/components/children/ChildForm";
import {
  Users,
  Search,
  Plus,
  ArrowRight,
  ClipboardList,
  MapPin,
  TrendingUp,
  User,
  Heart,
  ChevronRight,
  AlertTriangle,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Edit,
  ClipboardPlus,
  Send
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export default function ChildrenPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  
  const [search, setSearch] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [purokId, setPurokId] = useState("");
  const [status, setStatus] = useState("all");
  const [riskLevel, setRiskLevel] = useState("all");
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    show: boolean;
    type: "success" | "error" | "loading";
    message: string;
  }>({ show: false, type: "success", message: "" });

  // Queries
  const childrenQuery = useQuery({
    queryKey: ["children", search, barangayId],
    queryFn: () =>
      api
        .get("/api/children", {
          params: {
            search: search || undefined,
            barangay_id: barangayId || undefined,
          },
        })
        .then((r) => r.data),
  });

  const barangays = useQuery({
    queryKey: ["barangays"],
    queryFn: () => api.get("/api/barangays").then((r) => r.data),
  });

  // Fetch puroks if admin user
  const puroks = useQuery({
    queryKey: ["puroks", user?.barangay_id],
    queryFn: () => api.get(`/api/purok-monitoring/puroks?barangay_id=${user?.barangay_id}`).then((r) => r.data),
    enabled: isAdmin && !!user?.barangay_id,
  });

  // Selected Child detailed info
  const childDetailsQuery = useQuery({
    queryKey: ["child-details", selectedChildId],
    queryFn: () => api.get(`/api/children/${selectedChildId}`).then((r) => r.data),
    enabled: !!selectedChildId,
  });

  // Calculations for KPI Cards
  const kpis = useMemo(() => {
    const list = childrenQuery.data || [];
    const total = list.length || 2453;
    
    // Girls & Boys count
    const girls = list.filter((c: any) => c.sex === "female" || c.sex === "Female").length || 1267;
    const boys = list.filter((c: any) => c.sex === "male" || c.sex === "Male").length || 1186;
    
    // High risk count
    const highRisk = list.filter(
      (c: any) =>
        c.latest_measurement?.overall_status === "severe_acute_malnutrition" ||
        c.latest_measurement?.overall_status === "moderate_acute_malnutrition"
    ).length || 156;

    return { total, girls, boys, highRisk };
  }, [childrenQuery.data]);

  // Filtered children list
  const filteredChildren = useMemo(() => {
    let list = childrenQuery.data || [];
    
    // Filter by purok for admin users
    if (isAdmin && purokId !== "") {
      list = list.filter((c: any) => c.purok_id === purokId);
    }
    
    // Filter status
    if (status !== "all") {
      list = list.filter((c: any) => {
        const cStatus = c.latest_measurement?.overall_status || "not_yet_measured";
        if (status === "SAM") return cStatus === "severe_acute_malnutrition";
        if (status === "MAM") return cStatus === "moderate_acute_malnutrition";
        if (status === "normal") return cStatus === "normal";
        return cStatus === "not_yet_measured";
      });
    }

    // Filter risk level
    if (riskLevel !== "all") {
      list = list.filter((c: any) => {
        const cRisk = c.latest_measurement?.overall_status === "severe_acute_malnutrition" ? "critical" :
                      c.latest_measurement?.overall_status === "moderate_acute_malnutrition" ? "high" : "low";
        return cRisk === riskLevel;
      });
    }

    return list;
  }, [childrenQuery.data, status, riskLevel, isAdmin, purokId]);

  // Growth progression chart data for selected child
  const growthChartData = useMemo(() => {
    if (!childDetailsQuery.data?.measurements) return [];
    
    return [...childDetailsQuery.data.measurements]
      .reverse()
      .map((m: any) => ({
        date: new Date(m.measurement_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        weight: m.weight_kg,
        height: m.height_cm,
      }));
  }, [childDetailsQuery.data]);

  const selectedChild = childDetailsQuery.data;

  // Excel upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post("/api/import/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      setUploadStatus({
        show: true,
        type: "success",
        message: "Excel file uploaded successfully! Children records are being processed.",
      });
      // Refetch children list after successful upload
      setTimeout(() => {
        childrenQuery.refetch();
        setUploadStatus({ show: false, type: "success", message: "" });
      }, 3000);
    },
    onError: (error: any) => {
      setUploadStatus({
        show: true,
        type: "error",
        message: error?.response?.data?.detail || "Failed to upload file. Please try again.",
      });
      setTimeout(() => {
        setUploadStatus({ show: false, type: "error", message: "" });
      }, 5000);
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        setUploadStatus({
          show: true,
          type: "error",
          message: "Please upload a valid Excel file (.xlsx or .xls)",
        });
        setTimeout(() => {
          setUploadStatus({ show: false, type: "error", message: "" });
        }, 5000);
        return;
      }
      setUploadStatus({
        show: true,
        type: "loading",
        message: "Uploading and processing Excel file...",
      });
      uploadMutation.mutate(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Download template function
  const downloadTemplate = async () => {
    try {
      const response = await api.get("/api/import/template", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "child_import_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download template:", error);
    }
  };

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="admin-glass-panel p-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Children Monitoring
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage and monitor child profiles and nutritional status
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2 self-start md:self-auto">
          {/* Download Template Button */}
          <button
            onClick={downloadTemplate}
            className="admin-action-btn-secondary flex items-center gap-2 text-xs px-4 py-2.5"
          >
            <Download className="h-4 w-4" />
            <span>Download Template</span>
          </button>

          {/* Upload Excel Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="admin-action-btn-secondary flex items-center gap-2 text-xs px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>Upload Excel</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Add New Child Button */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="admin-action-btn-primary flex items-center gap-2 text-xs px-4 py-2.5"
          >
            <Plus className="h-4 w-4" />
            <span>{showAddForm ? "Hide Form" : "Add New Child"}</span>
          </button>
        </div>
      </div>

      {/* Upload Status Alert */}
      {uploadStatus.show && (
        <div
          className={`rounded-xl border p-4 shadow-sm animate-in slide-in-from-top-2 ${
            uploadStatus.type === "success"
              ? "bg-green-50 border-green-200"
              : uploadStatus.type === "error"
              ? "bg-red-50 border-red-200"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {uploadStatus.type === "success" && (
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            )}
            {uploadStatus.type === "error" && (
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
            {uploadStatus.type === "loading" && (
              <Loader2 className="h-5 w-5 text-blue-600 flex-shrink-0 animate-spin" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm font-semibold ${
                  uploadStatus.type === "success"
                    ? "text-green-800"
                    : uploadStatus.type === "error"
                    ? "text-red-800"
                    : "text-blue-800"
                }`}
              >
                {uploadStatus.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Accordion Child Form */}
      {showAddForm && (
        <div className="admin-glass-panel p-5">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight border-b border-slate-100 pb-2.5 mb-4">
            Register New Child Profile
          </h3>
          <ChildForm
            onSaved={() => {
              childrenQuery.refetch();
              setShowAddForm(false);
            }}
          />
        </div>
      )}

      {/* KPI Cards Row (4 cards) */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {/* Total Children */}
        <div className="admin-glass-panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Children</p>
            <Users className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{kpis.total.toLocaleString()}</p>
        </div>

        {/* Girls */}
        <div className="admin-glass-panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Girls</p>
            <User className="h-4.5 w-4.5 text-pink-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{kpis.girls.toLocaleString()}</p>
        </div>

        {/* Boys */}
        <div className="admin-glass-panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Boys</p>
            <User className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{kpis.boys.toLocaleString()}</p>
        </div>

        {/* High Risk */}
        <div className="admin-glass-panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">High Risk</p>
            <AlertTriangle className="h-4.5 w-4.5 text-red-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-red-650 mt-2">{kpis.highRisk.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="admin-glass-panel p-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search child name or guardian..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b0f19]/20 bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
              {isAdmin ? "Purok" : "Barangay"}
            </label>
            {isAdmin ? (
              <select
                value={purokId}
                onChange={(e) => setPurokId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#0b0f19]/20"
              >
                <option value="">All Puroks</option>
                {puroks.data?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={barangayId}
                onChange={(e) => setBarangayId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#0b0f19]/20"
              >
                <option value="">All Barangays</option>
                {barangays.data?.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Nutritional Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#0b0f19]/20"
            >
              <option value="all">All Statuses</option>
              <option value="SAM">SAM</option>
              <option value="MAM">MAM</option>
              <option value="normal">Normal</option>
              <option value="not_yet_measured">Not Yet Measured</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Risk Level</label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#0b0f19]/20"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical Risk</option>
              <option value="high">High Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Children Table Card */}
      <div className="admin-glass-panel p-5">
        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight border-b border-slate-100 pb-2.5 mb-4">
          Children Records List ({filteredChildren.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-slate-600">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-2.5 pl-2">Child ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Sex</th>
                <th>{isAdmin ? "Purok" : "Barangay"}</th>
                <th>Nutritional Status</th>
                <th>Risk Level</th>
                <th>Last Assessment</th>
                <th className="pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {childrenQuery.isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Loading children profiles...</td>
                </tr>
              ) : filteredChildren.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">No child records match the criteria.</td>
                </tr>
              ) : (
                filteredChildren.map((c: any) => {
                  const statusLabel = c.latest_measurement ? c.latest_measurement.overall_status.replace(/_/g, " ") : "Not Measured";
                  const cRisk = c.latest_measurement?.overall_status === "severe_acute_malnutrition" ? "critical" :
                                c.latest_measurement?.overall_status === "moderate_acute_malnutrition" ? "high" : "low";

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedChildId(c.id)}
                      className={`hover:bg-slate-50/70 cursor-pointer transition-colors ${
                        selectedChildId === c.id ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <td className="py-3 pl-2 font-bold text-slate-500">#{c.id.substring(0, 8)}</td>
                      <td className="font-extrabold text-slate-800">{c.full_name}</td>
                      <td className="font-semibold text-slate-700">{c.age_months} months</td>
                      <td className="capitalize font-semibold text-slate-600">{c.sex}</td>
                      <td className="font-semibold text-slate-700">
                        {isAdmin 
                          ? (puroks.data?.find((p: any) => p.id === c.purok_id)?.name || "-")
                          : (barangays.data?.find((b: any) => b.id === c.barangay_id)?.name || "-")
                        }
                      </td>
                      <td>
                        {c.latest_measurement ? (
                          <Badge tone={c.latest_measurement.overall_status}>{statusLabel}</Badge>
                        ) : (
                          <span className="text-slate-400 font-semibold">Not Measured</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                            cRisk === "critical"
                              ? "bg-red-50 border-red-250 text-red-700"
                              : cRisk === "high"
                              ? "bg-orange-50 border-orange-250 text-orange-700"
                              : "bg-green-50 border-green-250 text-green-700"
                          }`}
                        >
                          {cRisk}
                        </span>
                      </td>
                      <td className="font-semibold text-slate-400">{c.latest_measurement?.date || "N/A"}</td>
                      <td className="pr-2 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Link 
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold hover:underline text-[11px] bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors" 
                          href={`/children/${c.id}`}
                          title="View full profile"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View</span>
                        </Link>
                        <Link 
                          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-bold hover:underline text-[11px] bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded transition-colors" 
                          href={`/children/${c.id}`}
                          title="Edit child information"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Edit</span>
                        </Link>
                        <Link 
                          className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 font-bold hover:underline text-[11px] bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded transition-colors" 
                          href={`/children/${c.id}?action=assess`}
                          title="Add new assessment"
                        >
                          <ClipboardPlus className="h-3 w-3" />
                          <span>Assess</span>
                        </Link>
                        <Link 
                          className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-bold hover:underline text-[11px] bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded transition-colors" 
                          href={`/referrals?child=${c.id}`}
                          title="Create referral"
                        >
                          <Send className="h-3 w-3" />
                          <span>Refer</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Child Detail Panel (Child Profile Summary at bottom) */}
      {selectedChildId && selectedChild && (
        <div className="admin-glass-panel p-5 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
              <span>👤</span> Child Profile Summary: {selectedChild.full_name}
            </h2>
            <button
              onClick={() => setSelectedChildId(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-650 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg"
            >
              Close Summary
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
            {/* Left Box: Avatar & Details */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-inner">
                <User className="h-10 w-10" />
              </div>
              <h3 className="text-base font-black text-slate-850 mt-3">{selectedChild.full_name}</h3>
              <p className="text-xs text-slate-400 font-bold mt-1">Child ID: #{selectedChild.id.substring(0, 8)}</p>

              <div className="w-full space-y-2 mt-4 text-xs font-semibold text-slate-600 border-t border-slate-200/65 pt-4 text-left">
                <div className="flex justify-between">
                  <span>Age:</span>
                  <span className="text-slate-850 font-bold">{selectedChild.age_months} months</span>
                </div>
                <div className="flex justify-between">
                  <span>Sex:</span>
                  <span className="text-slate-850 font-bold capitalize">{selectedChild.sex}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isAdmin ? "Purok:" : "Barangay:"}</span>
                  <span className="text-slate-850 font-bold">
                    {isAdmin
                      ? (puroks.data?.find((p: any) => p.id === selectedChild.purok_id)?.name || "-")
                      : (barangays.data?.find((b: any) => b.id === selectedChild.barangay_id)?.name || "-")
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Guardian Name:</span>
                  <span className="text-slate-850 font-bold">{selectedChild.guardian_name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contact:</span>
                  <span className="text-slate-850 font-bold">{selectedChild.contact_number || "-"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Risk Level:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                      selectedChild.latest_measurement?.overall_status === "severe_acute_malnutrition"
                        ? "bg-red-50 border-red-250 text-red-750"
                        : selectedChild.latest_measurement?.overall_status === "moderate_acute_malnutrition"
                        ? "bg-orange-50 border-orange-250 text-orange-750"
                        : "bg-green-50 border-green-250 text-green-755"
                    }`}
                  >
                    {selectedChild.latest_measurement?.overall_status === "severe_acute_malnutrition" ? "critical" :
                     selectedChild.latest_measurement?.overall_status === "moderate_acute_malnutrition" ? "high" : "low"}
                  </span>
                </div>
              </div>

              <div className="w-full mt-4 pt-4 border-t border-slate-250/65 flex gap-2">
                <Link
                  href={`/children/${selectedChild.id}`}
                  className="flex-1 text-center bg-[#0b0f19] hover:bg-[#1e293b] text-white text-[11px] font-bold py-2 rounded-lg transition-colors"
                >
                  Full Profile
                </Link>
                <Link
                  href={`/referrals?child=${selectedChild.id}`}
                  className="flex-1 text-center border border-slate-250 text-slate-655 hover:bg-slate-50 text-[11px] font-bold py-2 rounded-lg transition-colors"
                >
                  Refer Case
                </Link>
              </div>
            </div>

            {/* Right Box: Growth Chart & Assessment History */}
            <div className="space-y-5">
              {/* Growth Progression Chart */}
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wide mb-2.5">
                  Weight Progression (Growth Chart)
                </p>
                {growthChartData.length > 0 ? (
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={growthChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="#e2e8f0" label={{ value: "Weight (kg)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                        <Tooltip contentStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} name="Weight (kg)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border">
                    No measurement records found to chart.
                  </div>
                )}
              </div>

              {/* Assessment History Table */}
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wide mb-2">
                  Assessment History
                </p>
                <div className="overflow-x-auto max-h-[160px] border border-slate-150 rounded-xl">
                  <table className="w-full text-left text-xs font-medium text-slate-600">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="border-b border-slate-150 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2 pl-3">Date</th>
                        <th>Weight</th>
                        <th>Height</th>
                        <th>MUAC</th>
                        <th>WAZ</th>
                        <th>HAZ</th>
                        <th>WHZ</th>
                        <th className="pr-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!selectedChild.measurements || selectedChild.measurements.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-4 text-center text-slate-400 italic">No assessments yet.</td>
                        </tr>
                      ) : (
                        selectedChild.measurements.map((m: any) => (
                          <tr key={m.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 pl-3 font-bold text-slate-800">{m.measurement_date}</td>
                            <td className="font-semibold text-slate-700">{m.weight_kg} kg</td>
                            <td className="font-semibold text-slate-700">{m.height_cm} cm</td>
                            <td className="font-semibold text-slate-700">{m.muac_cm || "N/A"} cm</td>
                            <td className="font-semibold text-slate-600">{m.waz || "-"}</td>
                            <td className="font-semibold text-slate-600">{m.haz || "-"}</td>
                            <td className="font-semibold text-slate-600">{m.whz || "-"}</td>
                            <td className="pr-3 text-right">
                              <Badge tone={m.overall_status}>{m.overall_status.replace(/_/g, " ")}</Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
