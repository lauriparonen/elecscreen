import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { dayParams, dayQuery, dayResponse, type DayQuery } from '@repo/shared';
import { getDayStats } from '../queries/day.ts';

export async function registerDayRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/day/:date',
    {
      schema: {
        params: dayParams,
        querystring: dayQuery,
        response: {
          200: dayResponse,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (req, reply) => {
      const { date } = req.params as { date: string };
      const { cheapestN } = req.query as DayQuery;
      const result = await getDayStats(date, cheapestN);
      if (!result) {
        reply.code(404);
        return { message: `No data for date ${date}` };
      }
      return { date, ...result };
    },
  );
}
