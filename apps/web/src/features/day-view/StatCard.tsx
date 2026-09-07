import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  testId?: string;
}

export function StatCard({ label, value, sublabel, testId }: StatCardProps) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
    >
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span
        data-testid={testId ? `${testId}-value` : undefined}
        className="text-lg font-semibold text-slate-900 tabular-nums"
      >
        {value}
      </span>
      {sublabel && <span className="text-xs text-slate-400">{sublabel}</span>}
    </div>
  );
}
