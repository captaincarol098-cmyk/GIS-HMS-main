"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const TOP_COUNT = 5;

export function CriticalBarangaysChart({ rows, label = "Barangay" }: { rows?: any[]; label?: string }) {
  const critical = (rows ?? [])
    .filter((r) => r.risk_level === "critical")
    .sort((a, b) => b.wasting_rate - a.wasting_rate)
    .slice(0, TOP_COUNT)
    .map((r) => ({
      barangay: r.barangay,
      wasting: r.wasting_rate,
      stunting: r.stunting_rate,
      underweight: r.underweight_rate,
    }));

  if (!critical.length) {
    return <p className="text-sm text-muted">No {label.toLowerCase()}s are currently at critical risk level.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">Top {TOP_COUNT} {label.toLowerCase()}s with critical wasting prevalence.</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={critical} margin={{ left: 0, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="barangay" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={72} />
          <YAxis unit="%" />
          <Tooltip formatter={(value: number) => `${value}%`} />
          <Legend />
          <Bar dataKey="wasting" name="Wasting" fill="#dc2626" />
          <Bar dataKey="stunting" name="Stunting" fill="#d97706" />
          <Bar dataKey="underweight" name="Underweight" fill="#2E7D32" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

