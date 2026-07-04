"use client";

import { AlertTriangle, ClipboardCheck, MapPin, Users, Weight } from "lucide-react";

export function StatsCards({ data }: { data: any }) {
  const cards = [
    ["Total Children", data?.total_children ?? 0, Users],
    ["Critical Barangays", data?.critical_barangays_count ?? 0, MapPin],
    ["Measured This Month", data?.total_measured_this_month ?? 0, Weight],
    ["Active Alerts", Object.values(data?.active_alerts_count ?? {}).reduce((a: any, b: any) => a + b, 0), AlertTriangle],
    ["Pending Referrals", data?.pending_referrals_count ?? 0, ClipboardCheck],
  ];
  return <div className="grid gap-4 md:grid-cols-5">{cards.map(([label, value, Icon]) => <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><Icon className="mb-3 h-5 w-5 text-brand" /><p className="text-sm text-muted">{label as string}</p><p className="text-2xl font-semibold">{value as number}</p></div>)}</div>;
}
