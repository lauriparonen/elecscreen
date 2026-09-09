import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { dailyResponse, dayResponse, type DailyResponse, type DayResponse } from '@repo/shared';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

/**
 * Fetching through the shared zod schemas is deliberate: every API assertion in
 * the suite doubles as a contract check against the same schemas the server
 * serialises with and the client parses with.
 */
export async function getDaily(
  request: APIRequestContext,
  params: Record<string, string | number> = {},
): Promise<DailyResponse> {
  const res = await request.get(`${API_URL}/api/daily`, { params });
  expect(res.status(), `GET /api/daily ${JSON.stringify(params)}`).toBe(200);
  return dailyResponse.parse(await res.json());
}

export async function getDay(request: APIRequestContext, date: string): Promise<DayResponse> {
  const res = await request.get(`${API_URL}/api/day/${date}`);
  expect(res.status(), `GET /api/day/${date}`).toBe(200);
  return dayResponse.parse(await res.json());
}

/** '719,282,090 kWh' -> 719282090, '12.16 cent/kWh' -> 12.16, '—' -> null. */
export function parseMetric(text: string): number | null {
  const cleaned = text.replace(/,/g, '').replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

/** The '1–50 of 1,371' readout, split into numbers. */
export function parseRange(text: string): {
  from: number;
  to: number;
  total: number;
} {
  const match = /^([\d,]+)–([\d,]+) of ([\d,]+)$/.exec(text.trim());
  if (!match) throw new Error(`unexpected pagination range: ${text}`);
  const [, from, to, total] = match as unknown as [string, string, string, string];
  const num = (s: string) => Number(s.replace(/,/g, ''));
  return { from: num(from), to: num(to), total: num(total) };
}

/** Dates rendered in the first column, top to bottom. */
export async function visibleDates(page: Page): Promise<string[]> {
  const cells = await page.getByTestId('daily-row').locator('td:first-child').allInnerTexts();
  return cells.map((c) => c.trim());
}

export function searchParams(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

/**
 * The dataset is the provided container's snapshot — fixed, so these anchors are
 * stable. Keeping them in one place makes it obvious what to update if the
 * seed data ever changes.
 */
export const FIXTURES = {
  /** Every metric reported for all 24 hours. */
  fullDay: '2024-01-15',
  /** Three consecutive negative-price hours (13, 14, 15). */
  negativeStreakDay: '2024-09-29',
  /** Well inside the seeded range but with no rows. */
  missingDay: '1999-01-01',
  /** Europe/Helsinki autumn DST switch — 24 rows, the repeated local hour is absent. */
  dstAutumnDay: '2023-10-29',
  /** Europe/Helsinki spring DST switch — only 23 rows, local hour 03:00 never happened. */
  dstSpringDay: '2024-03-31',
} as const;
