"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Download, Upload, Search, FileSpreadsheet, TrendingUp, Users, AlertCircle, BarChart3 } from "lucide-react";

interface BarangayOPTData {
  sequence: number;
  barangay_name: string;
  barangay_id: string;
  population: number;
  valid_wfa: number;
  valid_hfa: number;
  valid_wflh: number;
  age_groups: {
    [key: string]: {
      normal: number;
      overweight: number;
      severely_underweight: number;
      underweight: number;
      severely_stunted: number;
      stunted: number;
      tall: number;
      obese: number;
      severely_wasted: number;
      wasted: number;
    };
  };
  indigenous_children: number;
  estimated_preschoolers: number;
  measured_preschoolers: number;
  below_normal: number;
  above_normal: number;
  children_0_23_months: number;
  below_normal_0_23: number;
  total_mothers: number;
  mothers_with_below_normal: number;
  mothers_with_above_normal: number;
}

interface OPTSummary {
  total_barangays: number;
  barangays_with_opt: number;
  coverage_percentage: number;
  total_children_measured: number;
  total_valid_wfa: number;
  total_valid_hfa: number;
  total_valid_wflh: number;
  total_below_normal: number;
  total_above_normal: number;
  indigenous_children: number;
}

export default function SuperAdminOPTPlusPage() {
  const [search, setSearch] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2025); // Default to 2025 where data exists

  // Generate year options (2020-2030)
  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i);

  // Fetch barangay-level OPT Plus data
  const optDataQuery = useQuery({
    queryKey: ["superadmin-opt-plus", selectedYear],
    queryFn: async () => {
      const response = await api.get(`/api/operation-timbang/superadmin/summary?year=${selectedYear}`);
      console.log(`[DEBUG] OPT Plus data for year ${selectedYear}:`, response.data);
      return response.data;
    },
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
  });

  const barangayData: BarangayOPTData[] = optDataQuery.data?.barangays || [];
  const summary: OPTSummary = optDataQuery.data?.summary || {
    total_barangays: 0,
    barangays_with_opt: 0,
    coverage_percentage: 0,
    total_children_measured: 0,
    total_valid_wfa: 0,
    total_valid_hfa: 0,
    total_valid_wflh: 0,
    total_below_normal: 0,
    total_above_normal: 0,
    indigenous_children: 0,
  };

  const filteredData = useMemo(() => {
    if (!search.trim()) return barangayData;
    const q = search.toLowerCase();
    return barangayData.filter((b) => b.barangay_name.toLowerCase().includes(q));
  }, [barangayData, search]);

  const handleExportExcel = async () => {
    try {
      const response = await api.get(`/api/operation-timbang/superadmin/export-excel?year=${selectedYear}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `e-OPT_PLUS_${selectedYear}_Cabadbaran.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export Excel file");
    }
  };

  const handleImportExcel = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.csv";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await api.post("/api/operation-timbang/superadmin/import-excel", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        
        const data = response.data;
        let message = `Import completed!\n\nValidated: ${data.imported} barangays\nErrors: ${data.errors}`;
        
        if (data.error_details && data.error_details.length > 0) {
          message += "\n\nErrors:\n" + data.error_details.join("\n");
        }
        
        if (data.message) {
          message += "\n\n" + data.message;
        }
        
        alert(message);
        optDataQuery.refetch();
      } catch (error: any) {
        console.error("Import error:", error);
        alert(`Import failed: ${error?.response?.data?.detail || error?.message || "Unknown error"}`);
      }
    };
    input.click();
  };

  if (optDataQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading OPT Plus data...</p>
        </div>
      </div>
    );
  }

  if (optDataQuery.isError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-red-600 font-semibold">Failed to load data</p>
          <p className="text-slate-600 mt-2 text-sm">
            {(optDataQuery.error as any)?.response?.data?.detail || "Unknown error"}
          </p>
          <button
            onClick={() => optDataQuery.refetch()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <span>🏥</span>
            <span>Operation Timbang Plus</span>
            <span className="text-lg font-normal text-slate-500">({selectedYear})</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            City-Wide Nutritional Monitoring • e-OPT PLUS Tool Format
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="year-select" className="text-sm font-semibold text-slate-700">
              Year:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleImportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold text-sm"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-semibold uppercase">Total Barangays</p>
              <p className="text-3xl font-bold mt-2">{summary.total_barangays}</p>
              <p className="text-blue-100 text-xs mt-1">
                {summary.barangays_with_opt} with OPT+ ({summary.coverage_percentage.toFixed(0)}% coverage)
              </p>
            </div>
            <BarChart3 className="h-12 w-12 text-blue-200 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-semibold uppercase">Children Measured</p>
              <p className="text-3xl font-bold mt-2">{summary.total_children_measured}</p>
              <p className="text-emerald-100 text-xs mt-1">
                WFA: {summary.total_valid_wfa} • HFA: {summary.total_valid_hfa}
              </p>
            </div>
            <Users className="h-12 w-12 text-emerald-200 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs font-semibold uppercase">Below Normal NS</p>
              <p className="text-3xl font-bold mt-2">{summary.total_below_normal}</p>
              <p className="text-orange-100 text-xs mt-1">
                {summary.total_children_measured > 0
                  ? ((summary.total_below_normal / summary.total_children_measured) * 100).toFixed(1)
                  : 0}% of total measured
              </p>
            </div>
            <AlertCircle className="h-12 w-12 text-orange-200 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs font-semibold uppercase">Indigenous Children</p>
              <p className="text-3xl font-bold mt-2">{summary.indigenous_children}</p>
              <p className="text-purple-100 text-xs mt-1">
                Above Normal: {summary.total_above_normal}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-purple-200 opacity-50" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search barangays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Barangay Data Table - Full e-OPT PLUS Format */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* Multi-row header like Excel */}
              <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                <th rowSpan={3} className="px-2 py-2 text-left font-semibold border border-slate-600 sticky left-0 bg-slate-800 z-20 min-w-[40px]">
                  #
                </th>
                <th rowSpan={3} className="px-3 py-2 text-left font-semibold border border-slate-600 sticky left-[40px] bg-slate-800 z-20 min-w-[140px]">
                  Barangay
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 min-w-[60px]">
                  Valid<br/>WFA
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 min-w-[60px]">
                  Valid<br/>HFA
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 min-w-[60px]">
                  Valid<br/>WFL/H
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 min-w-[70px]">
                  Barangay<br/>Population
                </th>
                <th colSpan={10} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-blue-700">
                  0-5 Months
                </th>
                <th colSpan={10} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-emerald-700">
                  6-11 Months
                </th>
                <th colSpan={10} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-cyan-700">
                  12-23 Months
                </th>
                <th colSpan={10} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-teal-700">
                  24-35 Months
                </th>
                <th colSpan={10} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-indigo-700">
                  36-47 Months
                </th>
                <th colSpan={10} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-purple-700">
                  48-59 Months
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 bg-orange-700 min-w-[50px]">
                  IP<br/>Child
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 min-w-[50px]">
                  Est.<br/>PS
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 min-w-[60px]">
                  Meas.<br/>PS
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 bg-red-700 min-w-[60px]">
                  Below<br/>Normal
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 bg-yellow-700 min-w-[60px]">
                  Above<br/>Normal
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 bg-pink-700 min-w-[60px]">
                  0-23 mos<br/>Children
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 bg-violet-700 min-w-[60px]">
                  Total<br/>M/Cs
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 bg-rose-700 min-w-[60px]">
                  M/Cs<br/>Below N
                </th>
                <th rowSpan={3} className="px-2 py-2 text-center font-semibold border border-slate-600 bg-amber-700 min-w-[60px]">
                  M/Cs<br/>Above N
                </th>
              </tr>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white text-[10px]">
                {/* 0-5 Months subheaders */}
                {["N", "OW", "SUW", "UW", "SS", "S", "T", "Ob", "SW", "W"].map((status, i) => (
                  <th key={`0-5-${i}`} className="px-1 py-1 text-center border border-slate-600 min-w-[32px]">{status}</th>
                ))}
                {/* 6-11 Months subheaders */}
                {["N", "OW", "SUW", "UW", "SS", "S", "T", "Ob", "SW", "W"].map((status, i) => (
                  <th key={`6-11-${i}`} className="px-1 py-1 text-center border border-slate-600 min-w-[32px]">{status}</th>
                ))}
                {/* 12-23 Months subheaders */}
                {["N", "OW", "SUW", "UW", "SS", "S", "T", "Ob", "SW", "W"].map((status, i) => (
                  <th key={`12-23-${i}`} className="px-1 py-1 text-center border border-slate-600 min-w-[32px]">{status}</th>
                ))}
                {/* 24-35 Months subheaders */}
                {["N", "OW", "SUW", "UW", "SS", "S", "T", "Ob", "SW", "W"].map((status, i) => (
                  <th key={`24-35-${i}`} className="px-1 py-1 text-center border border-slate-600 min-w-[32px]">{status}</th>
                ))}
                {/* 36-47 Months subheaders */}
                {["N", "OW", "SUW", "UW", "SS", "S", "T", "Ob", "SW", "W"].map((status, i) => (
                  <th key={`36-47-${i}`} className="px-1 py-1 text-center border border-slate-600 min-w-[32px]">{status}</th>
                ))}
                {/* 48-59 Months subheaders */}
                {["N", "OW", "SUW", "UW", "SS", "S", "T", "Ob", "SW", "W"].map((status, i) => (
                  <th key={`48-59-${i}`} className="px-1 py-1 text-center border border-slate-600 min-w-[32px]">{status}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.map((barangay, index) => {
                const ageGroups = barangay.age_groups || {};
                const getAgeGroupData = (group: string) => ageGroups[group] || {
                  normal: 0, overweight: 0, severely_underweight: 0, underweight: 0,
                  severely_stunted: 0, stunted: 0, tall: 0, obese: 0,
                  severely_wasted: 0, wasted: 0
                };

                return (
                  <tr key={barangay.barangay_id} className="hover:bg-slate-50 transition">
                    <td className="px-2 py-2 font-semibold text-slate-700 text-center border border-slate-200 sticky left-0 bg-white z-10">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-800 border border-slate-200 sticky left-[40px] bg-white z-10">
                      {barangay.barangay_name}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-blue-700 bg-blue-50 border border-slate-200">
                      {barangay.valid_wfa}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-blue-700 bg-blue-50 border border-slate-200">
                      {barangay.valid_hfa}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-blue-700 bg-blue-50 border border-slate-200">
                      {barangay.valid_wflh}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-600 border border-slate-200">
                      {barangay.population.toLocaleString()}
                    </td>

                    {/* 0-5 Months */}
                    {(() => {
                      const data = getAgeGroupData("0-5");
                      return [
                        data.normal, data.overweight, data.severely_underweight, data.underweight,
                        data.severely_stunted, data.stunted, data.tall, data.obese,
                        data.severely_wasted, data.wasted
                      ].map((val, i) => (
                        <td key={`0-5-${i}`} className="px-1 py-2 text-center text-slate-700 border border-slate-200 bg-blue-50/30">
                          {val || 0}
                        </td>
                      ));
                    })()}

                    {/* 6-11 Months */}
                    {(() => {
                      const data = getAgeGroupData("6-11");
                      return [
                        data.normal, data.overweight, data.severely_underweight, data.underweight,
                        data.severely_stunted, data.stunted, data.tall, data.obese,
                        data.severely_wasted, data.wasted
                      ].map((val, i) => (
                        <td key={`6-11-${i}`} className="px-1 py-2 text-center text-slate-700 border border-slate-200 bg-emerald-50/30">
                          {val || 0}
                        </td>
                      ));
                    })()}

                    {/* 12-23 Months */}
                    {(() => {
                      const data = getAgeGroupData("12-23");
                      return [
                        data.normal, data.overweight, data.severely_underweight, data.underweight,
                        data.severely_stunted, data.stunted, data.tall, data.obese,
                        data.severely_wasted, data.wasted
                      ].map((val, i) => (
                        <td key={`12-23-${i}`} className="px-1 py-2 text-center text-slate-700 border border-slate-200 bg-cyan-50/30">
                          {val || 0}
                        </td>
                      ));
                    })()}

                    {/* 24-35 Months */}
                    {(() => {
                      const data = getAgeGroupData("24-35");
                      return [
                        data.normal, data.overweight, data.severely_underweight, data.underweight,
                        data.severely_stunted, data.stunted, data.tall, data.obese,
                        data.severely_wasted, data.wasted
                      ].map((val, i) => (
                        <td key={`24-35-${i}`} className="px-1 py-2 text-center text-slate-700 border border-slate-200 bg-teal-50/30">
                          {val || 0}
                        </td>
                      ));
                    })()}

                    {/* 36-47 Months */}
                    {(() => {
                      const data = getAgeGroupData("36-47");
                      return [
                        data.normal, data.overweight, data.severely_underweight, data.underweight,
                        data.severely_stunted, data.stunted, data.tall, data.obese,
                        data.severely_wasted, data.wasted
                      ].map((val, i) => (
                        <td key={`36-47-${i}`} className="px-1 py-2 text-center text-slate-700 border border-slate-200 bg-indigo-50/30">
                          {val || 0}
                        </td>
                      ));
                    })()}

                    {/* 48-59 Months */}
                    {(() => {
                      const data = getAgeGroupData("48-59");
                      return [
                        data.normal, data.overweight, data.severely_underweight, data.underweight,
                        data.severely_stunted, data.stunted, data.tall, data.obese,
                        data.severely_wasted, data.wasted
                      ].map((val, i) => (
                        <td key={`48-59-${i}`} className="px-1 py-2 text-center text-slate-700 border border-slate-200 bg-purple-50/30">
                          {val || 0}
                        </td>
                      ));
                    })()}

                    <td className="px-2 py-2 text-center font-semibold text-orange-700 bg-orange-50 border border-slate-200">
                      {barangay.indigenous_children}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-600 border border-slate-200">
                      {barangay.estimated_preschoolers}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-600 border border-slate-200">
                      {barangay.measured_preschoolers}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-red-700 bg-red-50 border border-slate-200">
                      {barangay.below_normal}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-yellow-700 bg-yellow-50 border border-slate-200">
                      {barangay.above_normal}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-pink-700 bg-pink-50 border border-slate-200">
                      {barangay.children_0_23_months}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-violet-700 bg-violet-50 border border-slate-200">
                      {barangay.total_mothers}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-rose-700 bg-rose-50 border border-slate-200">
                      {barangay.mothers_with_below_normal}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-amber-700 bg-amber-50 border border-slate-200">
                      {barangay.mothers_with_above_normal}
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={72} className="px-4 py-12 text-center text-slate-500 border border-slate-200">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold">No barangay data found</p>
                    <p className="text-xs mt-1">Try importing an e-OPT PLUS Excel file</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructions Panel */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <FileSpreadsheet className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg">e-OPT PLUS Tool Format</h3>
            <p className="text-sm text-slate-600 mt-2">
              This page displays data in the format used by the Department of Health's Operation Timbang Plus program.
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p><strong>Nutritional Status Indicators:</strong></p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>• <strong>N</strong> = Normal</div>
                <div>• <strong>OW</strong> = Overweight</div>
                <div>• <strong>SUW</strong> = Severely Underweight</div>
                <div>• <strong>UW</strong> = Underweight</div>
                <div>• <strong>SS</strong> = Severely Stunted</div>
                <div>• <strong>S</strong> = Stunted</div>
                <div>• <strong>T</strong> = Tall</div>
                <div>• <strong>Ob</strong> = Obese</div>
                <div>• <strong>SW</strong> = Severely Wasted</div>
                <div>• <strong>W</strong> = Wasted</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
