import type { FastifyInstance } from 'fastify';
import { dailyQuery, dailyResponse } from '@repo/shared';
import { getDailyStats } from '../queries/daily.ts';

export async function registerDailyRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/daily',
    {
      schema: {
        querystring: dailyQuery,
        response: {
          200: dailyResponse,
        },
      },
    },
    async (req) => {
      const { page, pageSize } = req.query as { page: number; pageSize: number };
      const offset = (page - 1) * pageSize;
      const { rows, total } = await getDailyStats(pageSize, offset);
      return { data: rows, page, pageSize, total };
    },
  );
}
