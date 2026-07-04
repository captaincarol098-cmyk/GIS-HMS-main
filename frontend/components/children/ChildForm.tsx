"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function ChildForm({ onSaved }: { onSaved?: () => void }) {
  const [barangays, setBarangays] = useState<any[]>([]);
  const [puroks, setPuroks] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ sex: "female", latitude: 9.1833, longitude: 125.5333 });
  useEffect(() => { api.get("/api/barangays").then((r) => setBarangays(r.data)); }, []);
  useEffect(() => { if (form.barangay_id) api.get(`/api/puroks?barangay_id=${form.barangay_id}`).then((r) => setPuroks(r.data)); }, [form.barangay_id]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/api/children", form);
    onSaved?.();
  }
  const input = "rounded border border-slate-300 px-3 py-2";
  return <form onSubmit={save} className="grid gap-3 md:grid-cols-2"><input className={input} placeholder="Full name" onChange={(e) => setForm({ ...form, full_name: e.target.value })} /><input type="date" className={input} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /><select className={input} onChange={(e) => setForm({ ...form, sex: e.target.value })}><option value="female">Female</option><option value="male">Male</option></select><input className={input} placeholder="Guardian" onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} /><input className={input} placeholder="Contact" onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /><select className={input} onChange={(e) => setForm({ ...form, barangay_id: e.target.value })}><option>Barangay</option>{barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><select className={input} onChange={(e) => setForm({ ...form, purok_id: e.target.value })}><option>Purok</option>{puroks.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input className={input} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} /><input className={input} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} /><button className="rounded bg-brand px-4 py-2 font-semibold text-white md:col-span-2">Save Child</button></form>;
}
