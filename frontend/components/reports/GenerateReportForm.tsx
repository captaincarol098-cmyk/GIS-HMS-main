"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export function GenerateReportForm({ onSaved }: { onSaved?: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<any>({ report_type: "monthly", period_start: today, period_end: today });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/api/reports/generate", form);
    onSaved?.();
  }
  return <form onSubmit={save} className="grid gap-3 md:grid-cols-5"><input className="rounded border px-3 py-2" placeholder="Title" onChange={(e) => setForm({ ...form, title: e.target.value })} /><select className="rounded border px-3 py-2" onChange={(e) => setForm({ ...form, report_type: e.target.value })}><option>monthly</option><option>quarterly</option><option>annual</option><option>custom</option></select><input type="date" className="rounded border px-3 py-2" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /><input type="date" className="rounded border px-3 py-2" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /><button className="rounded bg-brand px-4 py-2 text-white">Generate</button></form>;
}
