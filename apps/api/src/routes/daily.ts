import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDailyStats } from '../queries/daily.ts';

const dailyStatsRow = z.object({
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

const dailyResponse = z.object({
  data: z.array(dailyStatsRow),
});

export async function registerDailyRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/daily',
    {
      schema: {
        response: {
          200: dailyResponse,
        },
      },
    },
    async () => {
      const rows = await getDailyStats();
      return { data: rows };
    },
  );
}
