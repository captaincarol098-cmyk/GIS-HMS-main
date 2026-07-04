"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";

export function PrevalenceChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <ReferenceLine y={15} stroke="#dc2626" strokeDasharray="4 4" />
        <ReferenceLine y={40} stroke="#d97706" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="wasting" stroke="#dc2626" />
        <Line type="monotone" dataKey="stunting" stroke="#d97706" />
        <Line type="monotone" dataKey="underweight" stroke="#2E7D32" />
      </LineChart>
    </ResponsiveContainer>
  );
}
