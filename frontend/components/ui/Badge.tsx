export function Badge({ children, tone = "normal" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold status-${tone} severity-${tone}`}>{children}</span>;
}
