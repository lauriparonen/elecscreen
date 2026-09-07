import { z } from 'zod';

export const dayParams = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD'),
});

export const dayQuery = z.object({
  cheapestN: z.coerce.number().int().min(1).max(24).default(3),
});

export const dayHour = z.object({
  hour: z.number().int().min(0).max(23),
  starttime: z.string(),
  productionKwh: z.number().nullable(),
  consumptionKwh: z.number().nullable(),
  priceSntKwh: z.number().nullable(),
});

export const dayPeak = z.object({
  hour: z.number().int(),
  valueKwh: z.number(),
});

export const dayCheapest = z.object({
  hour: z.number().int(),
  priceSntKwh: z.number(),
});

export const daySummary = z.object({
  productionKwh: z.number().nullable(),
  consumptionKwh: z.number().nullable(),
  averagePriceSntKwh: z.number().nullable(),
  productionHoursReported: z.number().int(),
  consumptionHoursReported: z.number().int(),
  priceHoursReported: z.number().int(),
  hoursTotal: z.number().int(),
  longestNegativePriceStreakHours: z.number().int(),
  peakConsumption: dayPeak.nullable(),
  peakProduction: dayPeak.nullable(),
  hoursBetweenPeaks: z.number().int().nullable(),
  cheapestHours: z.array(dayCheapest),
});

export const dayResponse = z.object({
  date: z.string(),
  hours: z.array(dayHour),
  summary: daySummary,
});

export type DayHour = z.infer<typeof dayHour>;
export type DaySummary = z.infer<typeof daySummary>;
export type DayResponse = z.infer<typeof dayResponse>;
export type DayQuery = z.infer<typeof dayQuery>;
