import { Link } from '@tanstack/react-router';
import { dayRoute } from '../../router.tsx';
import { useDay } from './useDay.ts';
import { formatCoverage, formatHour, formatKwh, formatPrice } from '../../lib/format.ts';
import { StatCard } from './StatCard.tsx';

export function DayView() {
  const { date } = dayRoute.useParams();
  const { cheapestN } = dayRoute.useSearch();
  const { data, isPending, isError, error, refetch, isFetching } = useDay(date, cheapestN);

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">
        ← Back to list
      </Link>

      <h2 className="text-lg font-semibold font-mono">{date}</h2>

      {isPending && (
        <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
      )}

      {isError && (
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
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Production"
              value={formatKwh(data.summary.productionKwh)}
              sublabel={formatCoverage(
                data.summary.productionHoursReported,
                data.summary.hoursTotal,
              )}
            />
            <StatCard
              label="Consumption"
              value={formatKwh(data.summary.consumptionKwh)}
              sublabel={formatCoverage(
                data.summary.consumptionHoursReported,
                data.summary.hoursTotal,
              )}
            />
            <StatCard
              label="Avg price"
              value={formatPrice(data.summary.averagePriceSntKwh)}
              sublabel={formatCoverage(
                data.summary.priceHoursReported,
                data.summary.hoursTotal,
              )}
            />
            <StatCard
              label="Peaks"
              value={
                data.summary.peakProduction && data.summary.peakConsumption
                  ? `${data.summary.hoursBetweenPeaks}h apart`
                  : '—'
              }
              sublabel={
                data.summary.peakProduction && data.summary.peakConsumption
                  ? `prod ${formatHour(data.summary.peakProduction.hour)} · cons ${formatHour(data.summary.peakConsumption.hour)}`
                  : 'need both peaks'
              }
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">
              Cheapest {cheapestN} hours
            </h3>
            {data.summary.cheapestHours.length === 0 ? (
              <p className="text-sm text-slate-400">No price data.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {data.summary.cheapestHours.map((h) => (
                  <li
                    key={h.hour}
                    className="flex items-baseline justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-slate-700">{formatHour(h.hour)}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatPrice(h.priceSntKwh)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-xs uppercase tracking-wide text-slate-500">
              Hourly data ({data.hours.length} rows)
            </summary>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1 pr-4">Hour</th>
                  <th className="py-1 pr-4 text-right">Production</th>
                  <th className="py-1 pr-4 text-right">Consumption</th>
                  <th className="py-1 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {data.hours.map((h) => (
                  <tr key={h.starttime} className="border-t border-slate-100">
                    <td className="py-1 pr-4 font-mono">{formatHour(h.hour)}</td>
                    <td className="py-1 pr-4 text-right tabular-nums">
                      {formatKwh(h.productionKwh)}
                    </td>
                    <td className="py-1 pr-4 text-right tabular-nums">
                      {formatKwh(h.consumptionKwh)}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {formatPrice(h.priceSntKwh)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </div>
  );
}
