export function RiskLevelBadge({ level }: { level?: string }) {
  const color = level === "critical" ? "bg-red-600" : level === "high" ? "bg-orange-500" : level === "medium" ? "bg-yellow-500 text-slate-900" : "bg-green-600";
  return <div className={`inline-flex rounded px-4 py-2 text-sm font-bold uppercase text-white ${color}`}>{level || "low"}</div>;
}
