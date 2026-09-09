import { z } from 'zod';

export const dailyStatsRow = z.object({
  date: z.string(),
  productionKwh: z.number().nullable(),
  consumptionKwh: z.number().nullable(),
  averagePriceCentKwh: z.number().nullable(),
  productionHoursReported: z.number().int(),
  consumptionHoursReported: z.number().int(),
  priceHoursReported: z.number().int(),
  hoursTotal: z.number().int(),
  longestNegativePriceStreakHours: z.number().int(),
});

export const dailySortBy = z.enum([
  'date',
  'productionKwh',
  'consumptionKwh',
  'averagePriceCentKwh',
  'longestNegativePriceStreakHours',
]);
export const dailySortDir = z.enum(['asc', 'desc']);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const dailyQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: dailySortBy.default('date'),
  sortDir: dailySortDir.default('desc'),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  q: z.string().trim().min(1).max(64).optional(),
});

export type DailySortBy = z.infer<typeof dailySortBy>;
export type DailySortDir = z.infer<typeof dailySortDir>;

export const dailyResponse = z.object({
  data: z.array(dailyStatsRow),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type DailyStatsRow = z.infer<typeof dailyStatsRow>;
export type DailyQuery = z.infer<typeof dailyQuery>;
export type DailyResponse = z.infer<typeof dailyResponse>;
