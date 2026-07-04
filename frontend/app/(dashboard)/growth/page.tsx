"use client";
import "@/styles/admin.css";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Panel } from "@/components/ui/Panel";
import { WHOGrowthChart } from "@/components/growth/WHOGrowthChart";
import { ZScoreSummaryCard } from "@/components/growth/ZScoreSummaryCard";
import { MapPin, Users, X, ChevronRight, User, Search, Download, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

const AGE_CATEGORIES = [
  { id: "all", label: "All", min: undefined, max: undefined },
  { id: "infant", label: "Infant (0-12 months)", min: 0, max: 12 },
  { id: "toddler", label: "Toddler (13-24 months)", min: 13, max: 24 },
  { id: "preschool", label: "Preschool (25-60 months)", min: 25, max: 60 },
  { id: "school", label: "School Age (61-72 months)", min: 61, max: 72 },
];

export default function GrowthPage() {
  const [activeCategory, setActiveCategory] = useState(AGE_CATEGORIES[0]);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Age filter values
  const ageMin = activeCategory.min;
  const ageMax = activeCategory.max;

  // Fetch all children for search
  const allChildrenQuery = useQuery({
    queryKey: ["all-children", ageMin, ageMax],
    queryFn: () =>
      api
        .get("/api/children", {
          params: { age_min: ageMin, age_max: ageMax },
        })
        .then((r) => r.data),
  });

  // Filter children by search query
  const searchedChildren = useMemo(() => {
    if (!allChildrenQuery.data) return [];
    if (!searchQuery) return allChildrenQuery.data;
    const query = searchQuery.toLowerCase();
    return allChildrenQuery.data.filter((child: any) =>
      child.full_name.toLowerCase().includes(query) || 
      child.id.toLowerCase().includes(query)
    );
  }, [allChildrenQuery.data, searchQuery]);

  // Fetch child's growth/measurement history when details are requested
  const childGrowthQuery = useQuery({
    queryKey: ["growth-history", selectedChild?.id],
    queryFn: () =>
      api
        .get(`/api/children/${selectedChild.id}/measurements`)
        .then((r) => r.data),
    enabled: !!selectedChild?.id,
  });

  // Get child's barangay and health info
  const childDetailsQuery = useQuery({
    queryKey: ["child-details", selectedChild?.id],
    queryFn: () =>
      api
        .get(`/api/children/${selectedChild.id}`)
        .then((r) => r.data),
    enabled: !!selectedChild?.id,
  });

  return (
    <div className="admin-container min-h-screen p-6">
      {/* Age Filter Section - Full Width Top */}
      <div className="admin-glass-panel p-5 mb-6">
        <p className="text-sm font-bold text-slate-800 mb-4">Filter by Age Category</p>
        <div className="flex flex-wrap gap-2.5">
          {AGE_CATEGORIES.map((category) => {
            const active = activeCategory.id === category.id;
            return (
              <button
                key={category.id}
                onClick={() => {
                  setActiveCategory(category);
                  setSelectedChild(null);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  active
                    ? "bg-[#0b0f19] text-white"
                    : "bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-800"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid - Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT SIDEBAR */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search Section */}
          <div className="admin-glass-panel p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Search Children</p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b0f19]/20"
              />
            </div>
          </div>

          {/* Children List Section */}
          <div className="admin-glass-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Children List ({searchedChildren.length})</p>
              {searchedChildren.length > 0 && (
                <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded">
                  📥 CSV
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allChildrenQuery.isLoading ? (
                <div className="py-4 text-center text-xs text-slate-400">Loading children...</div>
              ) : searchedChildren.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">No children found</div>
              ) : (
                searchedChildren.map((child: any) => {
                  const isSelected = selectedChild?.id === child.id;
                  return (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={`w-full text-left p-2.5 border rounded-lg transition-all duration-200 ${
                        isSelected
                          ? "border-[#0b0f19] bg-blue-50"
                          : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-semibold text-sm text-slate-800">{child.full_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{child.id}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {Math.floor(child.age_months / 12)}y • {child.sex}
                        {child.latest_measurement && (
                          <>
                            {" • "}
                            <Badge tone={child.latest_measurement.overall_status}>
                              {child.latest_measurement.overall_status.replace(/_/g, " ")}
                            </Badge>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT MAIN CONTENT */}
        <div className="lg:col-span-3">
          {selectedChild ? (
            <div className="space-y-6">
              {/* Child Header */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{selectedChild.full_name}</h2>
                      <p className="text-xs text-slate-500 mt-1">ID: {selectedChild.id}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedChild.latest_measurement && (
                      <Badge tone={selectedChild.latest_measurement.overall_status}>
                        {selectedChild.latest_measurement.overall_status.replace(/_/g, " ")}
                      </Badge>
                    )}
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Add Data Entry
                    </button>
                  </div>
                </div>

                {/* Child Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Age</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{Math.floor(selectedChild.age_months / 12)} years</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Gender</p>
                    <p className="text-sm font-bold text-slate-800 mt-1 capitalize">{selectedChild.sex}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Barangay</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{childDetailsQuery.data?.barangay?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Guardian</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{selectedChild.guardian_name || "N/A"}</p>
                  </div>
                  {childGrowthQuery.data?.[0] && (
                    <>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold">Weight</p>
                        <p className="text-sm font-bold text-slate-800 mt-1">{childGrowthQuery.data[0].weight_kg} kg</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold">Height</p>
                        <p className="text-sm font-bold text-slate-800 mt-1">{childGrowthQuery.data[0].height_cm} cm</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Download Child Records */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">📥 Download Child Records</h3>
                <p className="text-xs text-slate-500 mb-3">The .doc file can be opened in Microsoft Word, Google Docs, or LibreOffice</p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={async () => {
                      try {
                        const response = await api.get(`/api/children/${selectedChild.id}/download/complete-report`, {
                          responseType: 'blob'
                        });
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `${selectedChild.full_name}_complete_report.docx`);
                        document.body.appendChild(link);
                        link.click();
                        link.parentNode?.removeChild(link);
                      } catch (err) {
                        alert('Error downloading report. Please try again.');
                        console.error(err);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-2">
                    <Download className="h-3.5 w-3.5" />
                    Complete Report (.doc)
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const response = await api.get(`/api/children/${selectedChild.id}/download/growth-data`, {
                          responseType: 'blob'
                        });
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `${selectedChild.full_name}_growth_data.csv`);
                        document.body.appendChild(link);
                        link.click();
                        link.parentNode?.removeChild(link);
                      } catch (err) {
                        alert('Error downloading data. Please try again.');
                        console.error(err);
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-2">
                    <Download className="h-3.5 w-3.5" />
                    Growth Data (.csv)
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const response = await api.get(`/api/children/${selectedChild.id}/download/health-entries`, {
                          responseType: 'blob'
                        });
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `${selectedChild.full_name}_health_entries.csv`);
                        document.body.appendChild(link);
                        link.click();
                        link.parentNode?.removeChild(link);
                      } catch (err) {
                        alert('Error downloading records. Please try again.');
                        console.error(err);
                      }
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-2">
                    <Download className="h-3.5 w-3.5" />
                    Health Entries (.csv)
                  </button>
                </div>
              </div>

              {/* WHO Z-Score Assessment */}
              {childGrowthQuery.isLoading ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-center text-slate-500">
                  Loading child history...
                </div>
              ) : (
                <>
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span>📊</span>
                      WHO Z-Score Assessment
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Calculated using WHO Child Growth Standards (Box-Cox LMS Method)
                    </p>
                    <ZScoreSummaryCard measurement={childGrowthQuery.data?.[0]} />
                  </div>

                  {/* Weight Progression */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">📈 Weight Progression</h3>
                    <WHOGrowthChart data={childGrowthQuery.data || []} metric="weight" />
                  </div>

                  {/* Height Progression */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">📏 Height Progression</h3>
                    <WHOGrowthChart data={childGrowthQuery.data || []} metric="height" />
                  </div>

                  {/* Manual Health Records */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">📋 Manual Health Records <span className="text-xs text-slate-400 font-normal ml-2">1 entry</span></h3>
                    {childGrowthQuery.data && childGrowthQuery.data.length > 0 ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                        {childGrowthQuery.data.slice(0, 1).map((record: any, idx: number) => (
                          <div key={idx}>
                            <div className="font-semibold text-sm text-slate-800 mb-2">
                              Monthly Nutrition Monitoring
                            </div>
                            <div className="text-xs text-slate-500 mb-3">
                              {new Date(record.date).toLocaleDateString()} • by {selectedChild.guardian_name} • BHW
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded border border-gray-200">
                              <div>
                                <p className="text-xs font-semibold text-slate-500">Weight</p>
                                <p className="font-bold text-slate-800">{record.weight_kg} kg</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500">Height</p>
                                <p className="font-bold text-slate-800">{record.height_cm} cm</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500">BMI</p>
                                <p className="font-bold text-slate-800">{(record.weight_kg / ((record.height_cm/100) ** 2)).toFixed(1)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500">MUAC</p>
                                <p className="font-bold text-slate-800">{record.muac_cm || "N/A"} cm</p>
                              </div>
                            </div>
                            {record.notes && (
                              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-slate-700">
                                <p className="font-semibold mb-1">Observations: <span className="text-yellow-700">{record.notes}</span></p>
                                <p className="text-slate-600">"Child showing signs of undernutrition. Mother receptive to counseling. Scheduled for weekly monitoring."</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-500">
                        <p className="text-sm">No health records yet</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Close button */}
              <button
                onClick={() => setSelectedChild(null)}
                className="w-full py-2 text-slate-600 hover:text-slate-800 font-semibold text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 shadow-sm text-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Select a Child</h3>
              <p className="text-slate-500">Choose a child from the list to view their growth monitoring data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
