import { expect, test } from '@playwright/test';
import { API_URL, FIXTURES, getDaily, getDay } from './helpers.ts';

test.describe('API contract', () => {
  test('health check responds', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  test('/api/daily returns schema-valid rows and echoes paging', async ({ request }) => {
    // getDaily parses through the shared zod schema, so an off-contract
    // response fails here rather than silently reaching the UI.
    const body = await getDaily(request, { page: 1, pageSize: 10 });

    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
    expect(body.data).toHaveLength(10);
    expect(body.total).toBeGreaterThan(1000);

    for (const row of body.data) {
      expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row.hoursTotal).toBeGreaterThan(0);
      // A metric can be null, but then nothing was reported for it that day.
      if (row.productionKwh === null) expect(row.productionHoursReported).toBe(0);
      if (row.consumptionKwh === null) expect(row.consumptionHoursReported).toBe(0);
      if (row.averagePriceSntKwh === null) expect(row.priceHoursReported).toBe(0);
      expect(row.longestNegativePriceStreakHours).toBeLessThanOrEqual(row.hoursTotal);
    }
  });

  test('pages do not overlap and cover the whole set', async ({ request }) => {
    const first = await getDaily(request, { page: 1, pageSize: 25 });
    const second = await getDaily(request, { page: 2, pageSize: 25 });

    const firstDates = first.data.map((r) => r.date);
    const secondDates = second.data.map((r) => r.date);

    expect(second.data).toHaveLength(25);
    expect(firstDates.filter((d) => secondDates.includes(d))).toEqual([]);
    expect(second.total).toBe(first.total);
  });

  test('sorting by date works in both directions', async ({ request }) => {
    const asc = await getDaily(request, { pageSize: 5, sortBy: 'date', sortDir: 'asc' });
    const desc = await getDaily(request, {
      pageSize: 5,
      sortBy: 'date',
      sortDir: 'desc',
    });

    const ascDates = asc.data.map((r) => r.date);
    expect([...ascDates].sort()).toEqual(ascDates);

    const descDates = desc.data.map((r) => r.date);
    expect([...descDates].sort().reverse()).toEqual(descDates);

    expect(ascDates[0]! < descDates[0]!).toBe(true);
  });

  test('sorting by a metric puts null days last', async ({ request }) => {
    const body = await getDaily(request, {
      pageSize: 200,
      sortBy: 'consumptionKwh',
      sortDir: 'asc',
    });

    const values = body.data.map((r) => r.consumptionKwh);
    const firstNull = values.indexOf(null);
    const reported = firstNull === -1 ? values : values.slice(0, firstNull);

    // Non-null values ascend, and once nulls start they never stop.
    expect(reported.every((v) => v !== null)).toBe(true);
    for (let i = 1; i < reported.length; i += 1) {
      expect(reported[i]!).toBeGreaterThanOrEqual(reported[i - 1]!);
    }
    if (firstNull !== -1) {
      expect(values.slice(firstNull).every((v) => v === null)).toBe(true);
    }
  });

  test('date range filter bounds the result and the total', async ({ request }) => {
    const body = await getDaily(request, {
      dateFrom: '2024-01-01',
      dateTo: '2024-01-07',
      pageSize: 50,
      sortBy: 'date',
      sortDir: 'asc',
    });

    expect(body.total).toBe(7);
    expect(body.data.map((r) => r.date)).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
      '2024-01-04',
      '2024-01-05',
      '2024-01-06',
      '2024-01-07',
    ]);
  });

  test('search matches on the date text', async ({ request }) => {
    const body = await getDaily(request, { q: '2024-09', pageSize: 50 });

    expect(body.total).toBe(30);
    expect(body.data.every((r) => r.date.startsWith('2024-09'))).toBe(true);
  });

  test('invalid query parameters are rejected with 400', async ({ request }) => {
    for (const query of ['sortBy=bogus', 'pageSize=0', 'page=-1', 'dateFrom=nope']) {
      const res = await request.get(`${API_URL}/api/daily?${query}`);
      expect(res.status(), query).toBe(400);
    }
  });

  test('/api/day/:date hours reconcile with the summary', async ({ request }) => {
    const body = await getDay(request, FIXTURES.fullDay);
    const { hours, summary } = body;

    expect(body.date).toBe(FIXTURES.fullDay);
    expect(hours).toHaveLength(summary.hoursTotal);
    expect(hours.map((h) => h.hour)).toEqual([...hours.map((h) => h.hour)].sort((a, b) => a - b));

    const sum = (pick: (h: (typeof hours)[number]) => number | null) =>
      hours.reduce((acc, h) => acc + (pick(h) ?? 0), 0);

    expect(summary.productionKwh!).toBeCloseTo(
      sum((h) => h.productionKwh),
      0,
    );
    expect(summary.consumptionKwh!).toBeCloseTo(
      sum((h) => h.consumptionKwh),
      0,
    );
    expect(summary.averagePriceSntKwh!).toBeCloseTo(
      sum((h) => h.priceSntKwh) / summary.priceHoursReported,
      5,
    );

    // Peaks point at the actual maximum hours.
    const maxProduction = Math.max(...hours.map((h) => h.productionKwh ?? -Infinity));
    const maxConsumption = Math.max(...hours.map((h) => h.consumptionKwh ?? -Infinity));
    expect(summary.peakProduction!.valueKwh).toBeCloseTo(maxProduction, 3);
    expect(summary.peakConsumption!.valueKwh).toBeCloseTo(maxConsumption, 3);
    expect(summary.hoursBetweenPeaks).toBe(
      Math.abs(summary.peakProduction!.hour - summary.peakConsumption!.hour),
    );
  });

  test('negative-price streak counts only consecutive negative hours', async ({ request }) => {
    const { hours, summary } = await getDay(request, FIXTURES.negativeStreakDay);

    // Recompute the gaps-and-islands result in JS and compare with the SQL one.
    let longest = 0;
    let run = 0;
    for (const h of hours) {
      run = h.priceSntKwh !== null && h.priceSntKwh < 0 ? run + 1 : 0;
      longest = Math.max(longest, run);
    }

    expect(longest).toBeGreaterThan(0);
    expect(summary.longestNegativePriceStreakHours).toBe(longest);
  });

  test('a day with no rows is a 404, a malformed date is a 400', async ({ request }) => {
    const missing = await request.get(`${API_URL}/api/day/${FIXTURES.missingDay}`);
    expect(missing.status()).toBe(404);

    const malformed = await request.get(`${API_URL}/api/day/not-a-date`);
    expect(malformed.status()).toBe(400);
  });

  test('DST days are not 24 hours long and are reported at their real length', async ({
    request,
  }) => {
    // Spring forward: local 03:00 never happens, so the day has 23 rows. Any
    // code that divides a day into a fixed 24 buckets breaks here.
    const spring = await getDay(request, FIXTURES.dstSpringDay);
    expect(spring.hours).toHaveLength(23);
    expect(spring.summary.hoursTotal).toBe(23);
    expect(spring.hours.map((h) => h.hour)).not.toContain(3);
    expect(spring.summary.productionHoursReported).toBeLessThanOrEqual(23);

    // Autumn: the repeated hour is not duplicated in the source, so 24 rows.
    const autumn = await getDay(request, FIXTURES.dstAutumnDay);
    expect(autumn.hours).toHaveLength(24);
    expect(autumn.summary.hoursTotal).toBe(24);

    // The daily list must report the same lengths — coverage is relative to the
    // day's actual hour count, never a hardcoded 24.
    const listed = await getDaily(request, {
      dateFrom: FIXTURES.dstSpringDay,
      dateTo: FIXTURES.dstSpringDay,
    });
    expect(listed.data[0]!.hoursTotal).toBe(23);
  });
});
