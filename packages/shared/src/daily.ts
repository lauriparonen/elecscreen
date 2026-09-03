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

export const dailyResponse = z.object({
  data: z.array(dailyStatsRow),
});

export type DailyStatsRow = z.infer<typeof dailyStatsRow>;
export type DailyResponse = z.infer<typeof dailyResponse>;
