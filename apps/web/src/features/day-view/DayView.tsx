import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { dayRoute } from '../../router.tsx';
import { useDay } from './useDay.ts';
import { formatCoverage, formatHour, formatKwh, formatPrice } from '../../lib/format.ts';
import { StatCard } from './StatCard.tsx';
import { DayCharts } from './DayCharts.tsx';

const CHEAPEST_OPTIONS = [1, 3, 5, 10] as const;

export function DayView() {
  const { date } = dayRoute.useParams();
  const { cheapestN } = dayRoute.useSearch();
  const navigate = dayRoute.useNavigate();
  const { data, isPending, isError, error, refetch, isFetching } = useDay(date);

  const cheapestHours = useMemo(() => {
    if (!data) return [];
    return data.hours
      .filter((h): h is typeof h & { priceSntKwh: number } => h.priceSntKwh !== null)
      .sort((a, b) => a.priceSntKwh - b.priceSntKwh)
      .slice(0, cheapestN)
      .map((h) => ({ hour: h.hour, priceSntKwh: h.priceSntKwh }));
  }, [data, cheapestN]);

  const setCheapestN = (n: number) => {
    navigate({ search: { cheapestN: n } });
  };

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">
        ← Back to list
      </Link>

      <h2 className="text-lg font-semibold font-mono">{date}</h2>

      {isPending && <p className="py-8 text-center text-sm text-slate-500">Loading…</p>}

      {isError && (
        <div className="flex flex-col items-center gap-3 py-8 text-sm">
          <p data-testid="day-error" className="text-red-600">
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
              testId="stat-production"
              label="Production"
              value={formatKwh(data.summary.productionKwh)}
              sublabel={formatCoverage(
                data.summary.productionHoursReported,
                data.summary.hoursTotal,
              )}
            />
            <StatCard
              testId="stat-consumption"
              label="Consumption"
              value={formatKwh(data.summary.consumptionKwh)}
              sublabel={formatCoverage(
                data.summary.consumptionHoursReported,
                data.summary.hoursTotal,
              )}
            />
            <StatCard
              testId="stat-price"
              label="Avg price"
              value={formatPrice(data.summary.averagePriceSntKwh)}
              sublabel={formatCoverage(data.summary.priceHoursReported, data.summary.hoursTotal)}
            />
            <StatCard
              testId="stat-peaks"
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

          <DayCharts hours={data.hours} cheapestHours={cheapestHours.map((h) => h.hour)} />

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wide text-slate-500">
                Cheapest {cheapestN} hours
              </h3>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <span>Show</span>
                <select
                  data-testid="cheapest-n"
                  aria-label="Number of cheapest hours to show"
                  value={cheapestN}
                  onChange={(e) => setCheapestN(Number(e.target.value))}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 shadow-sm outline-none transition-colors duration-150 ease-out focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  {CHEAPEST_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {cheapestHours.length === 0 ? (
              <p className="text-sm text-slate-400">No price data.</p>
            ) : (
              <ul data-testid="cheapest-hours" className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {cheapestHours.map((h) => (
                  <li
                    key={h.hour}
                    data-testid="cheapest-hour"
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
            <table data-testid="hourly-table" className="mt-3 w-full text-sm">
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
                  <tr
                    key={h.starttime}
                    data-testid="hourly-row"
                    className="border-t border-slate-100"
                  >
                    <td className="py-1 pr-4 font-mono">{formatHour(h.hour)}</td>
                    <td className="py-1 pr-4 text-right tabular-nums">
                      {formatKwh(h.productionKwh)}
                    </td>
                    <td className="py-1 pr-4 text-right tabular-nums">
                      {formatKwh(h.consumptionKwh)}
                    </td>
                    <td className="py-1 text-right tabular-nums">{formatPrice(h.priceSntKwh)}</td>
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
