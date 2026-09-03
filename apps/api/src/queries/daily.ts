import { sql } from 'kysely';
import { db } from '../db/client.ts';

export interface DailyStatsRow {
  date: string;
  productionKwh: number | null;
  consumptionKwh: number | null;
  averagePriceSntKwh: number | null;
  productionHoursReported: number;
  consumptionHoursReported: number;
  priceHoursReported: number;
  hoursTotal: number;
  longestNegativePriceStreakHours: number;
}

export async function getDailyStats(): Promise<DailyStatsRow[]> {
  const result = await sql<DailyStatsRow>`
    WITH agg AS (
      SELECT
        date,
        (SUM(productionamount) * 1000)::float8 AS "productionKwh",
        SUM(consumptionamount)::float8         AS "consumptionKwh",
        AVG(hourlyprice)::float8               AS "averagePriceSntKwh",
        COUNT(productionamount)::int           AS "productionHoursReported",
        COUNT(consumptionamount)::int          AS "consumptionHoursReported",
        COUNT(hourlyprice)::int                AS "priceHoursReported",
        COUNT(*)::int                          AS "hoursTotal"
      FROM electricitydata
      GROUP BY date
    ),
    neg AS (
      SELECT
        date,
        ((hourlyprice < 0) IS TRUE) AS is_neg,
        ROW_NUMBER() OVER (PARTITION BY date ORDER BY starttime)
          - ROW_NUMBER() OVER (
              PARTITION BY date, ((hourlyprice < 0) IS TRUE) ORDER BY starttime
            ) AS grp
      FROM electricitydata
    ),
    streaks AS (
      SELECT date, COUNT(*)::int AS len
      FROM neg
      WHERE is_neg
      GROUP BY date, grp
    ),
    longest AS (
      SELECT date, MAX(len)::int AS len
      FROM streaks
      GROUP BY date
    )
    SELECT
      a.date,
      a."productionKwh",
      a."consumptionKwh",
      a."averagePriceSntKwh",
      a."productionHoursReported",
      a."consumptionHoursReported",
      a."priceHoursReported",
      a."hoursTotal",
      COALESCE(l.len, 0) AS "longestNegativePriceStreakHours"
    FROM agg a
    LEFT JOIN longest l USING (date)
    ORDER BY a.date DESC
  `.execute(db);

  return result.rows;
}
