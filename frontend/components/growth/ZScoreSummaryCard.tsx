import { Badge } from "@/components/ui/Badge";

export function ZScoreSummaryCard({ measurement }: { measurement: any }) {
  if (!measurement) return null;
  return <div className="grid gap-3 md:grid-cols-3">{["waz", "haz", "whz"].map((k) => <div key={k} className="rounded border bg-white p-3"><p className="text-sm font-semibold uppercase">{k}</p><p className="text-2xl font-bold">{measurement[k]}</p><Badge tone={measurement[`${k}_status`]}>{measurement[`${k}_status`]}</Badge></div>)}</div>;
}
