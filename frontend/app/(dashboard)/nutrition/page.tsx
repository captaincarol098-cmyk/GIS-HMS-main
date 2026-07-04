"use client";
import "@/styles/admin.css";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/ui/Panel";
import { Apple, Target, CheckCircle2, TrendingUp, Award, Plus, X, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function NutritionProgramsPage() {
  const { user } = useAuthStore();
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  // Fetch programs with real-time polling
  const programsQuery = useQuery({
    queryKey: ["nutrition-programs"],
    queryFn: () => api.get("/api/nutrition-programs/programs").then((r) => r.data),
    refetchInterval: 3000,
    retry: false,
  });

  // Fetch puroks for the admin's barangay
  const purokQuery = useQuery({
    queryKey: ["puroks", user?.barangay_id],
    queryFn: () => api.get("/api/puroks").then((r) => r.data),
    retry: false,
  });

  // Filter puroks by barangay
  const adminPuroks = useMemo(() => {
    if (!user?.barangay_id || !purokQuery.data) return [];
    return purokQuery.data.filter((p: any) => p.barangay_id === user.barangay_id);
  }, [purokQuery.data, user?.barangay_id]);

  // Filter programs by admin's puroks
  const adminPrograms = useMemo(() => {
    if (!programsQuery.data || !adminPuroks.length) return [];
    const purokIds = adminPuroks.map((p: any) => p.id);
    return programsQuery.data.filter((prog: any) => purokIds.includes(prog.purok_id));
  }, [programsQuery.data, adminPuroks]);

  // Calculate stats by PUROK
  const purokStats = useMemo(() => {
    return adminPuroks.map((purok: any) => {
      const purokPrograms = adminPrograms.filter((p: any) => p.purok_id === purok.id);
      const completed = purokPrograms.filter((p: any) => p.status === "completed").length;
      const ongoing = purokPrograms.filter((p: any) => p.status === "active").length;

      return {
        name: purok.name,
        completed: completed,
        ongoing: ongoing,
        total: purokPrograms.length,
        effectiveness: purokPrograms.length > 0 ? Math.round((completed / purokPrograms.length) * 100) : 0
      };
    });
  }, [adminPuroks, adminPrograms]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = adminPrograms.length;
    const completed = adminPrograms.filter((p: any) => p.status === "completed").length;
    const ongoing = adminPrograms.filter((p: any) => p.status === "active").length;
    const effectiveness = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalEnrolled: adminPrograms.reduce((sum: number, p: any) => sum + (p.sessions?.length || 0), 0),
      completed,
      ongoing,
      effectiveness,
      governmentFunded: adminPrograms.filter((p: any) => p.government_funded).length
    };
  }, [adminPrograms]);

  const overallStatusData = useMemo(() => [
    { name: "Completed", value: stats.completed, color: "#10b981" },
    { name: "Ongoing", value: stats.ongoing, color: "#3b82f6" }
  ], [stats]);

  const pieDataWithPercentages = useMemo(() => {
    const total = stats.completed + stats.ongoing;
    return overallStatusData.map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0
    }));
  }, [overallStatusData, stats]);

  // Program form state
  const [programForm, setProgramForm] = useState({
    name: "",
    description: "",
    purok_id: "",
    frequency: "weekly",
    government_funded: false,
    budget_amount: ""
  });

  // Session form state
  const [sessionForm, setSessionForm] = useState({
    program_id: "",
    purok_id: "",
    session_date: "",
    location: "",
    notes: "",
    participants: [] as any[]
  });

  // Participant form state
  const [participantForm, setParticipantForm] = useState({
    child_id: "",
    name: "",
    age: "",
    height: "",
    weight: "",
    nutritional_status: "normal",
    attended: true,
    notes: ""
  });

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMessage("");

    try {
      await api.post("/api/nutrition-programs/programs", {
        name: programForm.name,
        description: programForm.description,
        purok_id: programForm.purok_id,
        frequency: programForm.frequency,
        government_funded: programForm.government_funded,
        budget_amount: programForm.budget_amount ? parseFloat(programForm.budget_amount) : null
      });

      setFormMessage("✅ Program created successfully!");
      setProgramForm({
        name: "",
        description: "",
        purok_id: "",
        frequency: "weekly",
        government_funded: false,
        budget_amount: ""
      });
      programsQuery.refetch();
      setTimeout(() => {
        setShowProgramForm(false);
        setFormMessage("");
      }, 2000);
    } catch (error: any) {
      console.error("Create program error:", error);
      setFormMessage("❌ Error: " + (error.response?.data?.detail || error.message || "Failed to create program"));
    } finally {
      setFormLoading(false);
    }
  };

  const handleRecordSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMessage("");

    try {
      await api.post(`/api/nutrition-programs/programs/${sessionForm.program_id}/sessions`, {
        purok_id: sessionForm.purok_id,
        session_date: new Date(sessionForm.session_date).toISOString(),
        location: sessionForm.location,
        notes: sessionForm.notes,
        participants: sessionForm.participants
      });

      setFormMessage("✅ Session recorded successfully!");
      setSessionForm({
        program_id: "",
        purok_id: "",
        session_date: "",
        location: "",
        notes: "",
        participants: []
      });
      setParticipantForm({
        child_id: "",
        name: "",
        age: "",
        height: "",
        weight: "",
        nutritional_status: "normal",
        attended: true,
        notes: ""
      });
      programsQuery.refetch();
      setTimeout(() => {
        setShowSessionForm(false);
        setFormMessage("");
      }, 2000);
    } catch (error: any) {
      console.error("Record session error:", error);
      setFormMessage("❌ Error: " + (error.response?.data?.detail || error.message || "Failed to record session"));
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddParticipant = () => {
    setSessionForm({
      ...sessionForm,
      participants: [
        ...sessionForm.participants,
        {
          child_id: participantForm.child_id,
          attended: participantForm.attended,
          notes: participantForm.notes,
          participant_details: {
            name: participantForm.name,
            age: participantForm.age,
            height: participantForm.height,
            weight: participantForm.weight,
            nutritional_status: participantForm.nutritional_status
          }
        }
      ]
    });
    setParticipantForm({
      child_id: "",
      name: "",
      age: "",
      height: "",
      weight: "",
      nutritional_status: "normal",
      attended: true,
      notes: ""
    });
  };

  const handleRemoveParticipant = (index: number) => {
    setSessionForm({
      ...sessionForm,
      participants: sessionForm.participants.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="admin-container space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nutrition Programs</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor supplementary feeding, milk campaigns, and therapeutic rehabilitations - By Purok</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => programsQuery.refetch()}
            className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition"
            title="Real-time update (every 3 seconds)"
          >
            <RefreshCw className="h-4 w-4" /> Live
          </button>
          <button
            onClick={() => setShowProgramForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" /> Create Program
          </button>
          <button
            onClick={() => setShowSessionForm(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <Plus className="h-4 w-4" /> Record Session
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <div className="admin-glass-panel p-4">
          <p className="text-xs font-semibold text-slate-500">Total Enrolled</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{stats.totalEnrolled}</p>
        </div>
        <div className="admin-glass-panel p-4">
          <p className="text-xs font-semibold text-slate-500">Completed</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</p>
        </div>
        <div className="admin-glass-panel p-4">
          <p className="text-xs font-semibold text-slate-500">Ongoing</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.ongoing}</p>
        </div>
        <div className="admin-glass-panel p-4">
          <p className="text-xs font-semibold text-slate-500">Avg. Effectiveness</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">{stats.effectiveness}%</p>
        </div>
      </div>
      {/* Active Programs List */}
      <Panel title={`Active Programs (${adminPrograms.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-3 font-semibold text-slate-700">Program Name</th>
                    <th className="py-3 px-3 font-semibold text-slate-700">Purok</th>
                    <th className="py-3 px-3 font-semibold text-slate-700">Frequency</th>
                    <th className="py-3 px-3 font-semibold text-slate-700">Status</th>
                    <th className="py-3 px-3 font-semibold text-slate-700">Gov Funded</th>
                    <th className="py-3 px-3 font-semibold text-slate-700">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {adminPrograms.length > 0 ? (
                    adminPrograms.map((prog: any) => {
                      const purok = adminPuroks.find((p: any) => p.id === prog.purok_id);
                      return (
                        <tr key={prog.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-3 font-medium text-slate-800">{prog.name}</td>
                          <td className="py-3 px-3 text-slate-700">{purok?.name}</td>
                          <td className="py-3 px-3 capitalize">{prog.frequency}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              prog.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}>
                              {prog.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {prog.government_funded ? <span className="text-green-600">✓</span> : <span className="text-gray-400">✗</span>}
                          </td>
                          <td className="py-3 px-3 text-slate-700">₱{prog.budget_amount?.toLocaleString()}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No programs created yet. Click "Create Program" to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

      {/* Program Creation Modal */}
      {showProgramForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Create Nutrition Program</h2>
              <button onClick={() => setShowProgramForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreateProgram} className="space-y-4">
              <input type="text" placeholder="Program Name" value={programForm.name} onChange={(e) => setProgramForm({...programForm, name: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" required />
              <textarea placeholder="Description" value={programForm.description} onChange={(e) => setProgramForm({...programForm, description: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              <select value={programForm.purok_id} onChange={(e) => setProgramForm({...programForm, purok_id: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" required>
                <option value="">Select Purok</option>
                {adminPuroks.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={programForm.frequency} onChange={(e) => setProgramForm({...programForm, frequency: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={programForm.government_funded} onChange={(e) => setProgramForm({...programForm, government_funded: e.target.checked})} />
                <label>Government Funded</label>
              </div>
              <input type="number" placeholder="Budget Amount" value={programForm.budget_amount} onChange={(e) => setProgramForm({...programForm, budget_amount: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              {formMessage && <p className="text-sm">{formMessage}</p>}
              <button type="submit" disabled={formLoading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Create</button>
            </form>
          </div>
        </div>
      )}

      {/* Record Session Modal */}
      {showSessionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Record Session</h2>
              <button onClick={() => setShowSessionForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleRecordSession} className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <select value={sessionForm.program_id} onChange={(e) => setSessionForm({...sessionForm, program_id: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" required>
                <option value="">Select Program</option>
                {adminPrograms.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={sessionForm.purok_id} onChange={(e) => setSessionForm({...sessionForm, purok_id: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" required>
                <option value="">Select Purok</option>
                {adminPuroks.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="datetime-local" value={sessionForm.session_date} onChange={(e) => setSessionForm({...sessionForm, session_date: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" required />
              <input type="text" placeholder="Location" value={sessionForm.location} onChange={(e) => setSessionForm({...sessionForm, location: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              <textarea placeholder="Notes" value={sessionForm.notes} onChange={(e) => setSessionForm({...sessionForm, notes: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />

              <h3 className="font-semibold mt-4">Add Participants</h3>
              <input type="text" placeholder="Participant Name" value={participantForm.name} onChange={(e) => setParticipantForm({...participantForm, name: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              <input type="number" placeholder="Age (months)" value={participantForm.age} onChange={(e) => setParticipantForm({...participantForm, age: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              <input type="number" placeholder="Height (cm)" step="0.1" value={participantForm.height} onChange={(e) => setParticipantForm({...participantForm, height: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              <input type="number" placeholder="Weight (kg)" step="0.1" value={participantForm.weight} onChange={(e) => setParticipantForm({...participantForm, weight: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              <select value={participantForm.nutritional_status} onChange={(e) => setParticipantForm({...participantForm, nutritional_status: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2">
                <option value="normal">Normal</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
              <button type="button" onClick={handleAddParticipant} className="w-full bg-slate-600 text-white py-2 rounded hover:bg-slate-700">Add Participant</button>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Participants ({sessionForm.participants.length})</h4>
                {sessionForm.participants.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-slate-100 p-2 rounded mb-2">
                    <span>{p.participant_details.name} - {p.participant_details.age}mo</span>
                    <button type="button" onClick={() => handleRemoveParticipant(i)}><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>

              {formMessage && <p className="text-sm">{formMessage}</p>}
              <button type="submit" disabled={formLoading || sessionForm.participants.length === 0} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Record Session</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
