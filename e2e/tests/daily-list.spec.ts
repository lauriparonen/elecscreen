import { expect, test } from '@playwright/test';
import { getDaily, parseMetric, parseRange, searchParams, visibleDates } from './helpers.ts';

test.describe('daily statistics list', () => {
  test('renders a page of days that matches the API', async ({ page, request }) => {
    const api = await getDaily(request, {
      page: 1,
      pageSize: 50,
      sortBy: 'date',
      sortDir: 'desc',
    });

    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Electricity — daily statistics' })).toBeVisible();
    await expect(page.getByTestId('daily-table')).toBeVisible();

    const rows = page.getByTestId('daily-row');
    await expect(rows).toHaveCount(api.data.length);
    expect(await visibleDates(page)).toEqual(api.data.map((r) => r.date));

    const range = parseRange(await page.getByTestId('pagination-range').innerText());
    expect(range).toEqual({ from: 1, to: api.data.length, total: api.total });
  });

  test('shows every required metric, with coverage, for the newest day', async ({
    page,
    request,
  }) => {
    const api = await getDaily(request, {
      page: 1,
      pageSize: 1,
      sortBy: 'date',
      sortDir: 'desc',
    });
    const expected = api.data[0]!;

    await page.goto('/?pageSize=1');

    const cells = page.getByTestId('daily-row').first().locator('td');
    await expect(cells.nth(0)).toHaveText(expected.date);

    const production = await cells.nth(1).innerText();
    expect(parseMetric(production.split('\n')[0]!)).toBe(
      expected.productionKwh === null ? null : Math.round(expected.productionKwh),
    );
    expect(production).toContain(`${expected.productionHoursReported}/${expected.hoursTotal} h`);

    const price = await cells.nth(3).innerText();
    expect(price.split('\n')[0]).toContain('cent/kWh');
    expect(price).toContain(`${expected.priceHoursReported}/${expected.hoursTotal} h`);

    const streak = await cells.nth(4).innerText();
    expect(streak.trim()).toBe(
      expected.longestNegativePriceStreakHours > 0
        ? `${expected.longestNegativePriceStreakHours} h`
        : '—',
    );
  });

  test('a day with no consumption reported shows a dash, not a zero', async ({ page, request }) => {
    // The seed data carries no consumption before ~2023; rendering those days as
    // 0 kWh would be a lie, so the UI shows an em dash plus 0/24 h coverage.
    const api = await getDaily(request, {
      pageSize: 1,
      sortBy: 'date',
      sortDir: 'asc',
      dateFrom: '2022-01-01',
      dateTo: '2022-01-31',
    });
    const day = api.data[0]!;
    expect(day.consumptionKwh, 'fixture assumption').toBeNull();

    await page.goto(`/?q=${day.date}`);

    const consumption = page.getByTestId('daily-row').first().locator('td').nth(2);
    await expect(consumption).toContainText('—');
    await expect(consumption).toContainText(`0/${day.hoursTotal} h`);
  });

  test('clicking a column header sorts and reflects it in the URL', async ({ page, request }) => {
    await page.goto('/');
    const firstDesc = (await visibleDates(page))[0]!;

    await page.getByRole('button', { name: 'Date' }).click();

    await expect.poll(() => searchParams(page.url()).get('sortDir')).toBe('asc');
    expect(searchParams(page.url()).get('sortBy')).toBe('date');
    await expect(page.getByRole('columnheader', { name: 'Date' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    const ascApi = await getDaily(request, {
      pageSize: 50,
      sortBy: 'date',
      sortDir: 'asc',
    });
    await expect.poll(async () => (await visibleDates(page))[0]).toBe(ascApi.data[0]!.date);
    expect(ascApi.data[0]!.date).not.toBe(firstDesc);
  });

  test('sorting by production orders the rendered values', async ({ page }) => {
    await page.goto('/?pageSize=10');
    await page.getByRole('button', { name: 'Production' }).click();

    await expect.poll(() => searchParams(page.url()).get('sortBy')).toBe('productionKwh');

    await expect
      .poll(async () => {
        const rendered = await page
          .getByTestId('daily-row')
          .locator('td:nth-child(2)')
          .allInnerTexts();
        const values = rendered.map((t) => parseMetric(t.split('\n')[0]!) ?? -Infinity);
        return values.every((v, i) => i === 0 || v <= values[i - 1]!);
      })
      .toBe(true);
  });

  test('pagination moves through the set and disables its edges', async ({ page, request }) => {
    await page.goto('/?pageSize=10');

    await expect(page.getByRole('button', { name: '« First' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '‹ Prev' })).toBeDisabled();

    const firstPageDates = await visibleDates(page);

    await page.getByRole('button', { name: 'Next ›' }).click();

    await expect.poll(() => searchParams(page.url()).get('page')).toBe('2');
    expect(parseRange(await page.getByTestId('pagination-range').innerText()).from).toBe(11);

    // The table keeps the previous page on screen while the next one loads
    // (keepPreviousData), so wait for the rows themselves to turn over.
    const expected = await getDaily(request, {
      page: 2,
      pageSize: 10,
      sortBy: 'date',
      sortDir: 'desc',
    });
    await expect
      .poll(async () => (await visibleDates(page)).join(','))
      .toBe(expected.data.map((r) => r.date).join(','));

    const secondPageDates = await visibleDates(page);
    expect(secondPageDates.filter((d) => firstPageDates.includes(d))).toEqual([]);

    await expect(page.getByRole('button', { name: '‹ Prev' })).toBeEnabled();

    await page.getByRole('button', { name: 'Last »' }).click();
    await expect(page.getByRole('button', { name: 'Next ›' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '« First' })).toBeEnabled();
  });

  test('search narrows the list and Clear restores it', async ({ page }) => {
    await page.goto('/');
    const fullTotal = parseRange(await page.getByTestId('pagination-range').innerText()).total;

    await page.getByLabel('Search date').fill('2024-09');

    await expect.poll(() => searchParams(page.url()).get('q')).toBe('2024-09');
    await expect
      .poll(async () => parseRange(await page.getByTestId('pagination-range').innerText()).total)
      .toBe(30);

    const dates = await visibleDates(page);
    expect(dates.every((d) => d.startsWith('2024-09'))).toBe(true);

    await page.getByRole('button', { name: 'Clear' }).click();

    await expect.poll(() => searchParams(page.url()).get('q')).toBeNull();
    await expect
      .poll(async () => parseRange(await page.getByTestId('pagination-range').innerText()).total)
      .toBe(fullTotal);
  });

  test('a search with no matches shows the empty state', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Search date').fill('1999-01');

    await expect(page.getByTestId('empty-state')).toHaveText('No days match these filters.');
    await expect(page.getByTestId('daily-table')).toBeHidden();
  });

  test('the date range filter bounds the list', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('From').fill('2024-01-01');
    await page.getByLabel('To').fill('2024-01-07');

    await expect.poll(() => searchParams(page.url()).get('dateTo')).toBe('2024-01-07');
    await expect(page.getByTestId('daily-row')).toHaveCount(7);

    const dates = await visibleDates(page);
    expect([...dates].sort()).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
      '2024-01-04',
      '2024-01-05',
      '2024-01-06',
      '2024-01-07',
    ]);
  });

  test('list state is shareable — a deep link restores page, sort and filters', async ({
    page,
    request,
  }) => {
    const api = await getDaily(request, {
      page: 3,
      pageSize: 10,
      sortBy: 'date',
      sortDir: 'asc',
    });

    await page.goto('/?page=3&pageSize=10&sortBy=date&sortDir=asc');

    await expect(page.getByTestId('daily-row')).toHaveCount(10);
    expect(await visibleDates(page)).toEqual(api.data.map((r) => r.date));
    expect(parseRange(await page.getByTestId('pagination-range').innerText())).toEqual({
      from: 21,
      to: 30,
      total: api.total,
    });
    await expect(page.getByRole('columnheader', { name: 'Date' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  test('garbage search params fall back to defaults instead of crashing', async ({ page }) => {
    await page.goto('/?page=abc&pageSize=9999&sortBy=nope&sortDir=sideways');

    await expect(page.getByTestId('daily-table')).toBeVisible();
    await expect(page.getByTestId('daily-row').first()).toBeVisible();
  });
});
