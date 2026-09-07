import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { z } from 'zod';
import { dailySortBy, dailySortDir } from '@repo/shared';
import { RootLayout } from './routes/RootLayout.tsx';
import { DailyList } from './features/daily-list/DailyList.tsx';
import { DayView } from './features/day-view/DayView.tsx';

const listSearchSchema = z.object({
  page: z.number().int().min(1).catch(1).default(1),
  pageSize: z.number().int().min(1).max(200).catch(50).default(50),
  sortBy: dailySortBy.catch('date').default('date'),
  sortDir: dailySortDir.catch('desc').default('desc'),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  q: z.string().min(1).max(64).optional().catch(undefined),
});

export type ListSearch = z.infer<typeof listSearchSchema>;

const daySearchSchema = z.object({
  cheapestN: z.number().int().min(1).max(24).catch(3).default(3),
});

export type DaySearch = z.infer<typeof daySearchSchema>;

const rootRoute = createRootRoute({
  component: () => (
    <RootLayout>
      <Outlet />
    </RootLayout>
  ),
});

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DailyList,
  validateSearch: listSearchSchema,
});

export const dayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/day/$date',
  component: DayView,
  validateSearch: daySearchSchema,
  parseParams: (raw) => ({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .parse(raw.date),
  }),
});

const routeTree = rootRoute.addChildren([indexRoute, dayRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
