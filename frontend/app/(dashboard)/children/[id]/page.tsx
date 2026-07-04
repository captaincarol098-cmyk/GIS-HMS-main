"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { MeasurementForm } from "@/components/children/MeasurementForm";

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({ queryKey: ["child", id], queryFn: () => api.get(`/api/children/${id}`).then((r) => r.data) });
  const child = q.data;
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">{child?.full_name || "Child"}</h1><Panel><div className="grid gap-2 md:grid-cols-4"><p>Age: {child?.age_months}m</p><p>Sex: {child?.sex}</p><p>Guardian: {child?.guardian_name}</p><p>Contact: {child?.contact_number}</p></div></Panel><Panel title="Add Measurement"><MeasurementForm childId={id} onSaved={() => q.refetch()} /></Panel><Panel title="Measurement History"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2">Date</th><th>Weight</th><th>Height</th><th>WAZ</th><th>HAZ</th><th>WHZ</th><th>Status</th></tr></thead><tbody>{child?.measurements?.map((m: any) => <tr key={m.id} className="border-b last:border-0"><td className="py-2">{m.measurement_date}</td><td>{m.weight_kg}</td><td>{m.height_cm}</td><td>{m.waz}</td><td>{m.haz}</td><td>{m.whz}</td><td><Badge tone={m.overall_status}>{m.overall_status}</Badge></td></tr>)}</tbody></table></Panel><Panel title="Active Alerts">{child?.active_alerts?.map((a: any) => <p key={a.id} className="mb-2 rounded bg-red-50 p-2 text-sm text-red-700">{a.message}</p>) || "No active alerts"}</Panel></div>;
}
