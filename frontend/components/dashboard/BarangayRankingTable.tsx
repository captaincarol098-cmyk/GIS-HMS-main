import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export function BarangayRankingTable({ rows, label = "Barangay" }: { rows: any[]; label?: string }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b">
          <th className="py-2">{label}</th>
          <th>Wasting%</th>
          <th>Stunting%</th>
          <th>Underweight%</th>
          <th>Risk</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows?.map((r) => {
          const id = r.barangay_id || r.purok_id || r.barangay;
          return (
            <tr key={id} className="border-b last:border-0">
              <td className="py-2 font-medium">{r.barangay}</td>
              <td>{r.wasting_rate}</td>
              <td>{r.stunting_rate}</td>
              <td>{r.underweight_rate}</td>
              <td>
                <Badge tone={r.risk_level}>{r.risk_level}</Badge>
              </td>
              <td>
                <Link className="text-brand" href="/map">
                  View
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

