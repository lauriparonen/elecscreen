import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
}

export function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-lg font-semibold text-slate-900 tabular-nums">{value}</span>
      {sublabel && <span className="text-xs text-slate-400">{sublabel}</span>}
    </div>
  );
}
