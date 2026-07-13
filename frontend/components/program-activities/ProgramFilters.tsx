'use client';

import { Search, XCircle } from 'lucide-react';

interface ProgramFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  selectedCount: number;
  onBulkDelete?: () => void;
}

export function ProgramFilters({
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterType,
  setFilterType,
  filterMonth,
  setFilterMonth,
  showFilters,
  setShowFilters,
  selectedCount,
  onBulkDelete,
}: ProgramFiltersProps) {
  const hasActiveFilters = filterStatus !== "all" || filterType !== "all" || filterMonth !== "all";

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
          >
            <Search className="h-4 w-4" />
            {hasActiveFilters ? "Filters (Active)" : "Filters"}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-xs font-medium text-slate-700 mb-2 block">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-xs font-medium text-slate-700 mb-2 block">Program Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="Feeding Program">Feeding Program</option>
                <option value="Vitamin Supplementation">Vitamin Supplementation</option>
                <option value="Deworming">Deworming</option>
                <option value="Health Screening">Health Screening</option>
                <option value="Nutrition Education">Nutrition Education</option>
                <option value="Growth Monitoring">Growth Monitoring</option>
                <option value="Operation Timbang Plus">Operation Timbang Plus</option>
              </select>
            </div>

            {/* Month Filter */}
            <div>
              <label className="text-xs font-medium text-slate-700 mb-2 block">Timeline</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Dates</option>
                <option value="upcoming">Upcoming</option>
                <option value="current">This Month</option>
                <option value="past">Past</option>
              </select>
            </div>

            {/* Reset Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterStatus("all");
                  setFilterType("all");
                  setFilterMonth("all");
                  setSearchQuery("");
                }}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search programs by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {selectedCount > 0 && onBulkDelete && (
          <button
            onClick={onBulkDelete}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors whitespace-nowrap"
          >
            <XCircle className="h-4 w-4" />
            Delete ({selectedCount})
          </button>
        )}
      </div>
    </>
  );
}
