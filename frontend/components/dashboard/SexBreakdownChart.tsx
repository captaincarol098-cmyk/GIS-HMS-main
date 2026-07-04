"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SexBreakdown = {
  male?: Record<string, number>;
  female?: Record<string, number>;
};

export function SexBreakdownChart({ data }: { data?: SexBreakdown }) {
  const rows = [
    {
      indicator: "Wasting",
      Male: data?.male?.wasting ?? 0,
      Female: data?.female?.wasting ?? 0,
    },
    {
      indicator: "Stunting",
      Male: data?.male?.stunting ?? 0,
      Female: data?.female?.stunting ?? 0,
    },
    {
      indicator: "Underweight",
      Male: data?.male?.underweight ?? 0,
      Female: data?.female?.underweight ?? 0,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="indicator" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="Male" fill="#2E7D32" />
        <Bar dataKey="Female" fill="#f97316" />
      </BarChart>
    </ResponsiveContainer>
  );
}
