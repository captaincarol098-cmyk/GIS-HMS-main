"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AgeDistributionChart({ data }: { data: any[] }) {
  return <ResponsiveContainer width="100%" height={260}><BarChart data={data}><XAxis dataKey="bracket" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#2E7D32" /></BarChart></ResponsiveContainer>;
}
