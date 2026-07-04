import { create } from "zustand";

type Filters = {
  barangayId?: string;
  indicator: "wasting" | "stunting" | "underweight";
  dateFrom?: string;
  dateTo?: string;
  setFilter: (patch: Partial<Omit<Filters, "setFilter">>) => void;
};

export const useFilters = create<Filters>((set) => ({
  indicator: "wasting",
  setFilter: (patch) => set(patch),
}));
