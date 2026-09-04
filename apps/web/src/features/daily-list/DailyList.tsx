import { useState } from 'react';
import type { DailySortBy, DailySortDir } from '@repo/shared';
import { useDaily } from './useDaily.ts';
import { formatCoverage, formatKwh, formatPrice } from '../../lib/format.ts';

const PAGE_SIZE = 50;

type ColumnDef = {
  key: DailySortBy;
  label: string;
  align: 'left' | 'right';
};

function SortIndicator({ active, dir }: { active: boolean; dir: DailySortDir }) {
  const upActive = active && dir === 'asc';
  const downActive = active && dir === 'desc';
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 12"
      className="h-3 w-2 flex-shrink-0"
    >
      <path
        d="M4 0 L8 4 L0 4 Z"
        className={
          upActive ? 'fill-slate-900' : 'fill-slate-400 group-hover:fill-slate-500'
        }
      />
      <path
        d="M4 12 L0 8 L8 8 Z"
        className={
          downActive ? 'fill-slate-900' : 'fill-slate-400 group-hover:fill-slate-500'
        }
      />
    </svg>
  );
}

const COLUMNS: ColumnDef[] = [
  { key: 'date', label: 'Date', align: 'left' },
  { key: 'productionKwh', label: 'Production', align: 'right' },
  { key: 'consumptionKwh', label: 'Consumption', align: 'right' },
  { key: 'averagePriceSntKwh', label: 'Avg price', align: 'right' },
  { key: 'longestNegativePriceStreakHours', label: 'Neg-price streak', align: 'right' },
];

export function DailyList() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<DailySortBy>('date');
  const [sortDir, setSortDir] = useState<DailySortDir>('desc');
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } =
    useDaily(page, PAGE_SIZE, sortBy, sortDir);

  const toggleSort = (key: DailySortBy) => {
    if (key === sortBy) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir(key === 'date' ? 'desc' : 'desc');
    }
    setPage(1);
  };

  if (isPending) {
    return <p className="py-8 text-center text-sm text-slate-500">Loading…</p>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-sm">
        <p className="text-red-600">
          Failed to load: {error instanceof Error ? error.message : String(error)}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isFetching ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    );
  }

  const { data: rows, total, pageSize } = data;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No data.</p>;
  }

  return (
    <div className="space-y-3">
      <div
        className={`overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm transition-opacity ${
          isPlaceholderData ? 'opacity-60' : ''
        }`}
      >
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              {COLUMNS.map((col) => {
                const active = col.key === sortBy;
                const ariaSort: 'ascending' | 'descending' | 'none' = active
                  ? sortDir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none';
                return (
                  <th
                    key={col.key}
                    aria-sort={ariaSort}
                    scope="col"
                    className="p-0"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`group flex w-full items-center gap-1.5 px-4 py-3 font-medium uppercase tracking-wide transition-colors duration-150 ease-out select-none hover:bg-slate-200/70 active:scale-[0.98] ${
                        col.align === 'right' ? 'justify-end' : 'justify-start'
                      } ${active ? 'text-slate-900 bg-slate-200/60' : 'text-slate-600'}`}
                    >
                      <span>{col.label}</span>
                      <SortIndicator active={active} dir={sortDir} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.date} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-slate-700">{row.date}</td>
                <td className="px-4 py-2 text-right">
                  <div>{formatKwh(row.productionKwh)}</div>
                  <div className="text-xs text-slate-400">
                    {formatCoverage(row.productionHoursReported, row.hoursTotal)}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <div>{formatKwh(row.consumptionKwh)}</div>
                  <div className="text-xs text-slate-400">
                    {formatCoverage(row.consumptionHoursReported, row.hoursTotal)}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <div>{formatPrice(row.averagePriceSntKwh)}</div>
                  <div className="text-xs text-slate-400">
                    {formatCoverage(row.priceHoursReported, row.hoursTotal)}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  {row.longestNegativePriceStreakHours > 0
                    ? `${row.longestNegativePriceStreakHours} h`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            « First
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹ Prev
          </button>
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next ›
          </button>
          <button
            type="button"
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Last »
          </button>
        </div>
      </div>
    </div>
  );
}
