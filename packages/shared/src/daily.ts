import { z } from 'zod';

export const dailyStatsRow = z.object({
  date: z.string(),
  productionKwh: z.number().nullable(),
  consumptionKwh: z.number().nullable(),
  averagePriceSntKwh: z.number().nullable(),
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
  'averagePriceSntKwh',
  'longestNegativePriceStreakHours',
]);
export const dailySortDir = z.enum(['asc', 'desc']);

export const dailyQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: dailySortBy.default('date'),
  sortDir: dailySortDir.default('desc'),
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
