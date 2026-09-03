import type { FastifyInstance } from 'fastify';
import { dailyResponse } from '@repo/shared';
import { getDailyStats } from '../queries/daily.ts';

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
