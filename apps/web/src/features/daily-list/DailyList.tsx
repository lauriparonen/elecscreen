import { useDaily } from './useDaily.ts';
import { formatCoverage, formatKwh, formatPrice } from '../../lib/format.ts';

export function DailyList() {
  const { data, isPending, isError, error } = useDaily();

  if (isPending) {
    return <p className="py-8 text-center text-sm text-slate-500">Loading…</p>;
  }

  if (isError) {
    return (
      <p className="py-8 text-center text-sm text-red-600">
        Failed to load: {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }

  if (data.data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No data.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
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
          {data.data.map((row) => (
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
  );
}
