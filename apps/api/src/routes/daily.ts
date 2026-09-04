import type { FastifyInstance } from 'fastify';
import { dailyQuery, dailyResponse, type DailyQuery } from '@repo/shared';
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
      const { page, pageSize, sortBy, sortDir } = req.query as DailyQuery;
      const offset = (page - 1) * pageSize;
      const { rows, total } = await getDailyStats(pageSize, offset, sortBy, sortDir);
      return { data: rows, page, pageSize, total };
    },
  );
}
