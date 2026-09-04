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

export const dailyQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const dailyResponse = z.object({
  data: z.array(dailyStatsRow),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type DailyStatsRow = z.infer<typeof dailyStatsRow>;
export type DailyQuery = z.infer<typeof dailyQuery>;
export type DailyResponse = z.infer<typeof dailyResponse>;
