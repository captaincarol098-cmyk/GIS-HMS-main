"use client";
import "@/styles/admin.css";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import {
  ClipboardList,
  Search,
  CheckCircle,
  AlertTriangle,
  User,
  Activity,
  Plus,
  Scale,
  Ruler,
  FileText
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export default function AssessmentsPage() {
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [muac, setMuac] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);

  // Queries
  const childrenQuery = useQuery({
    queryKey: ["assessments-children", search],
    queryFn: () =>
      api.get("/api/children", { params: { search: search || undefined } }).then((r) => r.data),
  });

  const childDetailsQuery = useQuery({
    queryKey: ["assessment-child-details", selectedChildId],
    queryFn: () => api.get(`/api/children/${selectedChildId}`).then((r) => r.data),
    enabled: !!selectedChildId,
  });

  const selectedChild = childDetailsQuery.data;

  // Selected child's latest measurement to show in Results
  const latestMeasurement = useMemo(() => {
    if (!selectedChild?.measurements || selectedChild.measurements.length === 0) return null;
    return selectedChild.measurements[0];
  }, [selectedChild]);

  // Chart data
  const growthChartData = useMemo(() => {
    if (!selectedChild?.measurements) return [];
    return [...selectedChild.measurements]
      .reverse()
      .map((m: any) => ({
        date: new Date(m.measurement_date).toLocaleDateString("en-US", { month: "short" }),
        weight: m.weight_kg,
        height: m.height_cm,
      }));
  }, [selectedChild]);

  // Handle Save
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChildId) {
      alert("Please select a child first.");
      return;
    }
    if (!weight || !height) {
      alert("Weight and Height are required.");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/api/measurements", {
        child_id: selectedChildId,
        measurement_date: date,
        weight_kg: Number(weight),
        height_cm: Number(height),
        muac_cm: muac ? Number(muac) : undefined,
        notes: notes || undefined
      });
      
      // Reset form
      setWeight("");
      setHeight("");
      setMuac("");
      setNotes("");
      
      // Refetch queries
      childDetailsQuery.refetch();
      alert("Assessment saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving assessment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-container space-y-6">
      {/* Header */}
      <div className="admin-glass-panel p-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Assessments Module
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Conduct child growth assessments and analyze Z-scores
          </p>
        </div>
      </div>

      {/* Main Dual-Pane Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Input Form (5 cols) */}
        <div className="lg:col-span-5 admin-glass-panel p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight border-b border-slate-100 pb-2.5">
            New Assessment Form
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Child Search & Select */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                Select Child to Assess
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search child by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-none"
                />
              </div>

              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none"
              >
                <option value="">-- Choose Child from list --</option>
                {childrenQuery.data?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.age_months}m, {c.sex})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Measured */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                Date of Measurement
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                required
              />
            </div>

            {/* Weight & Height Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Weight (kg)
                </label>
                <div className="relative">
                  <Scale className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 10.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Height (cm)
                </label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 78.5"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* MUAC Field */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                Mid-Upper Arm Circumference (MUAC cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 12.5"
                value={muac}
                onChange={(e) => setMuac(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
              />
            </div>

            {/* Notes Observations */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                Observations & Notes
              </label>
              <textarea
                rows={3}
                placeholder="Observations regarding appetite, health status, or counseling..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving || !selectedChildId}
              className="admin-action-btn-primary w-full py-2.5 text-xs font-bold disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Assessment Entry"}
            </button>
          </form>
        </div>

        {/* Right: Assessment Results & Progression (7 cols) */}
        <div className="lg:col-span-7 admin-glass-panel p-5 space-y-5">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight border-b border-slate-100 pb-2.5">
            Assessment Results
          </h3>

          {selectedChild ? (
            <div className="space-y-5">
              {/* Basic Selected Info Banner */}
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-extrabold text-slate-800">{selectedChild.full_name}</p>
                  <p className="text-slate-400 font-bold mt-0.5">#{selectedChild.id.substring(0, 8)} • {selectedChild.age_months} months • {selectedChild.sex}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-bold">Latest Assessment</p>
                  <p className="font-extrabold text-slate-700 mt-0.5">{latestMeasurement?.measurement_date || "N/A"}</p>
                </div>
              </div>

              {/* Z-Score Indicators (4 Cards) */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">WHO Z-Score Classifications</p>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {/* WFA Card */}
                  <div className="border border-slate-150 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Weight-for-Age</p>
                    <p className="text-xs font-black text-slate-800 mt-2">
                      {latestMeasurement?.waz ? `WAZ: ${latestMeasurement.waz}` : "N/A"}
                    </p>
                    <div className="mt-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase ${
                        latestMeasurement?.overall_status === "severe_acute_malnutrition" ? "bg-red-50 text-red-600" :
                        latestMeasurement?.overall_status === "moderate_acute_malnutrition" ? "bg-orange-50 text-orange-600" :
                        latestMeasurement ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-400"
                      }`}>
                        {latestMeasurement?.overall_status ? latestMeasurement.overall_status.split("_")[0] : "No Data"}
                      </span>
                    </div>
                  </div>

                  {/* HAZ Card */}
                  <div className="border border-slate-150 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Height-for-Age</p>
                    <p className="text-xs font-black text-slate-800 mt-2">
                      {latestMeasurement?.haz ? `HAZ: ${latestMeasurement.haz}` : "N/A"}
                    </p>
                    <div className="mt-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase ${
                        latestMeasurement?.overall_status === "severe_acute_malnutrition" ? "bg-red-50 text-red-600" :
                        latestMeasurement ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-400"
                      }`}>
                        {latestMeasurement ? "Normal" : "No Data"}
                      </span>
                    </div>
                  </div>

                  {/* WFH Card */}
                  <div className="border border-slate-150 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Weight-for-Height</p>
                    <p className="text-xs font-black text-slate-800 mt-2">
                      {latestMeasurement?.whz ? `WHZ: ${latestMeasurement.whz}` : "N/A"}
                    </p>
                    <div className="mt-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase ${
                        latestMeasurement?.overall_status === "severe_acute_malnutrition" ? "bg-red-50 text-red-600" :
                        latestMeasurement?.overall_status === "moderate_acute_malnutrition" ? "bg-orange-50 text-orange-600" :
                        latestMeasurement ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-400"
                      }`}>
                        {latestMeasurement?.overall_status ? latestMeasurement.overall_status.split("_")[0] : "No Data"}
                      </span>
                    </div>
                  </div>

                  {/* MUAC Card */}
                  <div className="border border-slate-150 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">MUAC Status</p>
                    <p className="text-xs font-black text-slate-800 mt-2">
                      {latestMeasurement?.muac_cm ? `${latestMeasurement.muac_cm} cm` : "N/A"}
                    </p>
                    <div className="mt-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase ${
                        latestMeasurement?.muac_cm && latestMeasurement.muac_cm < 11.5 ? "bg-red-50 text-red-600" :
                        latestMeasurement?.muac_cm && latestMeasurement.muac_cm < 12.5 ? "bg-orange-50 text-orange-655" :
                        latestMeasurement ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-400"
                      }`}>
                        {latestMeasurement?.muac_cm && latestMeasurement.muac_cm < 11.5 ? "SAM" :
                         latestMeasurement?.muac_cm && latestMeasurement.muac_cm < 12.5 ? "MAM" :
                         latestMeasurement ? "Normal" : "No Data"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weight Progression Chart */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2.5">
                  Weight Progression (Growth Chart)
                </p>
                {growthChartData.length > 0 ? (
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={growthChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b" }} stroke="#e2e8f0" />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} stroke="#e2e8f0" />
                        <Tooltip contentStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} name="Weight (kg)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border">
                    No historical measurements available yet.
                  </div>
                )}
              </div>

              {/* Assessment History Table */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                  Assessment History
                </p>
                <div className="overflow-x-auto max-h-[150px] border border-slate-150 rounded-xl">
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
                          <td colSpan={8} className="py-4 text-center text-slate-400 italic">No assessments logged yet.</td>
                        </tr>
                      ) : (
                        selectedChild.measurements.map((m: any) => (
                          <tr key={m.id} className="hover:bg-slate-50/50">
                            <td className="py-2 pl-3 font-bold text-slate-850">{m.measurement_date}</td>
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
          ) : (
            <div className="py-24 text-center bg-slate-50 rounded-2xl border border-slate-150 text-slate-400 text-xs">
              <ClipboardList className="h-10 w-10 text-slate-350 mx-auto mb-2" />
              <p className="font-bold">Select a child from the form list</p>
              <p className="mt-0.5">Choose a child to load status indicators, growth charting, and records.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
