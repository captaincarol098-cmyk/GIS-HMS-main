"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function ReferralForm({ onSaved }: { onSaved?: () => void }) {
  const [children, setChildren] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ priority: "routine" });
  useEffect(() => { api.get("/api/children").then((r) => setChildren(r.data)); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/api/referrals", form);
    onSaved?.();
  }
  return <form onSubmit={save} className="grid gap-3 md:grid-cols-5"><select className="rounded border px-3 py-2" onChange={(e) => setForm({ ...form, child_id: e.target.value })}><option>Child</option>{children.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select><input className="rounded border px-3 py-2" placeholder="Facility" onChange={(e) => setForm({ ...form, referred_to: e.target.value })} /><input className="rounded border px-3 py-2" placeholder="Reason" onChange={(e) => setForm({ ...form, reason: e.target.value })} /><select className="rounded border px-3 py-2" onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>routine</option><option>urgent</option><option>emergency</option></select><button className="rounded bg-brand px-4 py-2 text-white">Create</button></form>;
}
