import { sql, type RawBuilder } from 'kysely';
import type { DailySortBy, DailySortDir, DailyStatsRow } from '@repo/shared';
import { db } from '../db/client.ts';

export interface DailyFilters {
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}

export interface DailyPage {
  rows: DailyStatsRow[];
  total: number;
}

const SORT_COLUMN: Record<DailySortBy, string> = {
  date: 'a.date',
  productionKwh: 'a."productionKwh"',
  consumptionKwh: 'a."consumptionKwh"',
  averagePriceSntKwh: 'a."averagePriceSntKwh"',
  longestNegativePriceStreakHours: 'COALESCE(l.len, 0)',
};

function buildWhere(f: DailyFilters): RawBuilder<unknown> {
  const parts: RawBuilder<unknown>[] = [];
  if (f.dateFrom) parts.push(sql`date >= ${f.dateFrom}::date`);
  if (f.dateTo) parts.push(sql`date <= ${f.dateTo}::date`);
  if (f.q) parts.push(sql`date::text ILIKE ${'%' + f.q + '%'}`);
  if (parts.length === 0) return sql`TRUE`;
  return parts.reduce((acc, p, i) => (i === 0 ? p : sql`${acc} AND ${p}`));
}

export async function getDailyStats(
  limit: number,
  offset: number,
  sortBy: DailySortBy,
  sortDir: DailySortDir,
  filters: DailyFilters,
): Promise<DailyPage> {
  const where = buildWhere(filters);
  const sortCol = sql.raw(SORT_COLUMN[sortBy]);
  const dir = sql.raw(sortDir === 'asc' ? 'ASC' : 'DESC');

  const [rowsResult, totalResult] = await Promise.all([
    sql<DailyStatsRow>`
      WITH filtered AS (
        SELECT * FROM electricitydata WHERE ${where}
      ),
      agg AS (
        SELECT
          date,
          (SUM(productionamount) * 1000)::float8 AS "productionKwh",
          SUM(consumptionamount)::float8         AS "consumptionKwh",
          AVG(hourlyprice)::float8               AS "averagePriceSntKwh",
          COUNT(productionamount)::int           AS "productionHoursReported",
          COUNT(consumptionamount)::int          AS "consumptionHoursReported",
          COUNT(hourlyprice)::int                AS "priceHoursReported",
          COUNT(*)::int                          AS "hoursTotal"
        FROM filtered
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
        FROM filtered
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
      ORDER BY ${sortCol} ${dir} NULLS LAST, a.date DESC
      LIMIT ${limit} OFFSET ${offset}
    `.execute(db),
    sql<{ total: number }>`
      SELECT COUNT(DISTINCT date)::int AS total
      FROM electricitydata
      WHERE ${where}
    `.execute(db),
  ]);

  return {
    rows: rowsResult.rows,
    total: totalResult.rows[0]?.total ?? 0,
  };
}
