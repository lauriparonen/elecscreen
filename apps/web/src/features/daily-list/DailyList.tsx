import { useState } from 'react';
import { useDaily } from './useDaily.ts';
import { formatCoverage, formatKwh, formatPrice } from '../../lib/format.ts';

const PAGE_SIZE = 50;

export function DailyList() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } =
    useDaily(page, PAGE_SIZE);

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
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Production</th>
              <th className="px-4 py-3 font-medium text-right">Consumption</th>
              <th className="px-4 py-3 font-medium text-right">Avg price</th>
              <th className="px-4 py-3 font-medium text-right">Neg-price streak</th>
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
