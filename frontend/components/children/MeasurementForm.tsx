"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export function MeasurementForm({ childId, onSaved }: { childId: string; onSaved?: () => void }) {
  const [form, setForm] = useState<any>({ child_id: childId, measurement_date: new Date().toISOString().slice(0, 10) });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/api/measurements", form);
    onSaved?.();
  }
  return <form onSubmit={save} className="grid gap-3 md:grid-cols-4"><input type="date" className="rounded border px-3 py-2" value={form.measurement_date} onChange={(e) => setForm({ ...form, measurement_date: e.target.value })} /><input type="number" step="0.1" className="rounded border px-3 py-2" placeholder="Weight kg" onChange={(e) => setForm({ ...form, weight_kg: Number(e.target.value) })} /><input type="number" step="0.1" className="rounded border px-3 py-2" placeholder="Height cm" onChange={(e) => setForm({ ...form, height_cm: Number(e.target.value) })} /><input type="number" step="0.1" className="rounded border px-3 py-2" placeholder="MUAC cm" onChange={(e) => setForm({ ...form, muac_cm: Number(e.target.value) })} /><button className="rounded bg-brand px-4 py-2 font-semibold text-white md:col-span-4">Add Measurement</button></form>;
}
