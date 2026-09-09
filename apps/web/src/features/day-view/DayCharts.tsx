import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DayHour } from '@repo/shared';
import { formatHour, formatKwh, formatPrice } from '../../lib/format.ts';

interface DayChartsProps {
  hours: DayHour[];
  cheapestHours: number[];
}

interface PanelProps {
  title: string;
  dataKey: keyof DayHour;
  color: string;
  empty: string;
  hours: DayHour[];
}

function AreaPanel({ title, dataKey, color, empty, hours }: PanelProps) {
  const hasData = hours.some((h) => h[dataKey] !== null);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="mb-1 text-xs uppercase tracking-wide text-slate-500">{title}</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={hours} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="hour"
              tickFormatter={formatHour}
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              interval={2}
            />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} width={54} />
            <Tooltip
              formatter={(v) => formatKwh(Number(v))}
              labelFormatter={(l) => formatHour(Number(l))}
            />
            <Area
              type="monotone"
              dataKey={dataKey as string}
              stroke={color}
              fill={color}
              fillOpacity={0.15}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p className="py-8 text-center text-sm text-slate-400">{empty}</p>
      )}
    </div>
  );
}

function PricePanel({ hours, cheapestHours }: { hours: DayHour[]; cheapestHours: number[] }) {
  const hasData = hours.some((h) => h.priceCentKwh !== null);
  const hasNegative = hours.some((h) => h.priceCentKwh !== null && h.priceCentKwh < 0);
  const cheapestSet = new Set(cheapestHours);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="mb-1 text-xs uppercase tracking-wide text-slate-500">Spot price</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={hours} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="hour"
              tickFormatter={formatHour}
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              interval={2}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              width={54}
              tickFormatter={(v) => String(Number(v).toFixed(1))}
            />
            <Tooltip
              formatter={(v) => formatPrice(Number(v))}
              labelFormatter={(l) => formatHour(Number(l))}
            />
            {hasNegative && (
              <ReferenceLine
                y={0}
                stroke="#dc2626"
                strokeDasharray="2 2"
                label={{ value: '0', fill: '#dc2626', fontSize: 10, position: 'right' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="priceCentKwh"
              stroke="#0f172a"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload, index } = props;
                const key = `dot-${index}`;
                if (cx === undefined || cy === undefined || payload?.priceCentKwh === null) {
                  return <g key={key} />;
                }
                const isCheapest = cheapestSet.has(payload.hour);
                return (
                  <circle
                    key={key}
                    cx={cx}
                    cy={cy}
                    r={isCheapest ? 4.5 : 2}
                    fill={isCheapest ? '#16a34a' : '#0f172a'}
                    stroke={isCheapest ? '#16a34a' : '#0f172a'}
                    strokeWidth={isCheapest ? 1.5 : 1}
                  />
                );
              }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="py-8 text-center text-sm text-slate-400">No price reported this day.</p>
      )}
    </div>
  );
}

export function DayCharts({ hours, cheapestHours }: DayChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <AreaPanel
        title="Production"
        dataKey="productionKwh"
        color="#0f766e"
        empty="No production reported this day."
        hours={hours}
      />
      <AreaPanel
        title="Consumption"
        dataKey="consumptionKwh"
        color="#4338ca"
        empty="No consumption reported this day."
        hours={hours}
      />
      <PricePanel hours={hours} cheapestHours={cheapestHours} />
    </div>
  );
}
