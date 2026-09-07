import { sql } from 'kysely';
import type { DayHour, DaySummary } from '@repo/shared';
import { db } from '../db/client.ts';

export interface DayResult {
  hours: DayHour[];
  summary: DaySummary;
}

interface HourRow {
  hour: number;
  starttime: string;
  productionKwh: number | null;
  consumptionKwh: number | null;
  priceSntKwh: number | null;
}

interface AggRow {
  productionKwh: number | null;
  consumptionKwh: number | null;
  averagePriceSntKwh: number | null;
  productionHoursReported: number;
  consumptionHoursReported: number;
  priceHoursReported: number;
  hoursTotal: number;
}

interface PeakRow {
  hour: number;
  valueKwh: number;
}

interface StreakRow {
  len: number;
}

export async function getDayStats(date: string): Promise<DayResult | null> {
  const [hoursResult, aggResult, peakProdResult, peakConsResult, streakResult] = await Promise.all([
    sql<HourRow>`
        SELECT
          EXTRACT(HOUR FROM starttime)::int         AS hour,
          starttime::text                            AS starttime,
          (productionamount * 1000)::float8          AS "productionKwh",
          consumptionamount::float8                  AS "consumptionKwh",
          hourlyprice::float8                        AS "priceSntKwh"
        FROM electricitydata
        WHERE date = ${date}::date
        ORDER BY starttime
      `.execute(db),
    sql<AggRow>`
        SELECT
          (SUM(productionamount) * 1000)::float8 AS "productionKwh",
          SUM(consumptionamount)::float8         AS "consumptionKwh",
          AVG(hourlyprice)::float8               AS "averagePriceSntKwh",
          COUNT(productionamount)::int           AS "productionHoursReported",
          COUNT(consumptionamount)::int          AS "consumptionHoursReported",
          COUNT(hourlyprice)::int                AS "priceHoursReported",
          COUNT(*)::int                          AS "hoursTotal"
        FROM electricitydata
        WHERE date = ${date}::date
      `.execute(db),
    sql<PeakRow>`
        SELECT
          EXTRACT(HOUR FROM starttime)::int       AS hour,
          (productionamount * 1000)::float8       AS "valueKwh"
        FROM electricitydata
        WHERE date = ${date}::date AND productionamount IS NOT NULL
        ORDER BY productionamount DESC, starttime
        LIMIT 1
      `.execute(db),
    sql<PeakRow>`
        SELECT
          EXTRACT(HOUR FROM starttime)::int       AS hour,
          consumptionamount::float8               AS "valueKwh"
        FROM electricitydata
        WHERE date = ${date}::date AND consumptionamount IS NOT NULL
        ORDER BY consumptionamount DESC, starttime
        LIMIT 1
      `.execute(db),
    sql<StreakRow>`
        WITH neg AS (
          SELECT
            starttime,
            ((hourlyprice < 0) IS TRUE) AS is_neg,
            ROW_NUMBER() OVER (ORDER BY starttime)
              - ROW_NUMBER() OVER (
                  PARTITION BY ((hourlyprice < 0) IS TRUE) ORDER BY starttime
                ) AS grp
          FROM electricitydata
          WHERE date = ${date}::date
        ),
        streaks AS (
          SELECT COUNT(*)::int AS len
          FROM neg
          WHERE is_neg
          GROUP BY grp
        )
        SELECT COALESCE(MAX(len), 0)::int AS len FROM streaks
      `.execute(db),
  ]);

  if (hoursResult.rows.length === 0) return null;

  const agg = aggResult.rows[0]!;
  const peakProd = peakProdResult.rows[0] ?? null;
  const peakCons = peakConsResult.rows[0] ?? null;
  const streakLen = streakResult.rows[0]?.len ?? 0;

  const hoursBetweenPeaks = peakProd && peakCons ? Math.abs(peakProd.hour - peakCons.hour) : null;

  return {
    hours: hoursResult.rows,
    summary: {
      ...agg,
      longestNegativePriceStreakHours: streakLen,
      peakConsumption: peakCons,
      peakProduction: peakProd,
      hoursBetweenPeaks,
    },
  };
}
