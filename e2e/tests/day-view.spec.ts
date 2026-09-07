import { expect, test, type Page } from '@playwright/test';
import { FIXTURES, getDay, parseMetric, searchParams } from './helpers.ts';

/** Chart panels render an SVG only when the metric has data that day. */
function chartPanels(page: Page) {
  return page.locator('svg.recharts-surface');
}

test.describe('single day view', () => {
  test('is reachable from the list and shows the required stats', async ({ page, request }) => {
    await page.goto('/');
    const firstDate = (
      await page.getByTestId('daily-row').first().locator('td').first().innerText()
    ).trim();

    await page.getByRole('link', { name: firstDate }).click();

    await expect(page).toHaveURL(new RegExp(`/day/${firstDate}`));
    await expect(page.getByRole('heading', { name: firstDate })).toBeVisible();

    const api = await getDay(request, firstDate);

    await expect(page.getByTestId('stat-production')).toBeVisible();
    await expect(page.getByTestId('stat-consumption')).toBeVisible();
    await expect(page.getByTestId('stat-price')).toBeVisible();
    await expect(page.getByTestId('stat-peaks')).toBeVisible();

    expect(parseMetric(await page.getByTestId('stat-production-value').innerText())).toBe(
      api.summary.productionKwh === null ? null : Math.round(api.summary.productionKwh),
    );
  });

  test('summary cards, peaks and hourly table match the API', async ({ page, request }) => {
    const api = await getDay(request, FIXTURES.fullDay);
    await page.goto(`/day/${FIXTURES.fullDay}`);

    expect(parseMetric(await page.getByTestId('stat-consumption-value').innerText())).toBe(
      Math.round(api.summary.consumptionKwh!),
    );
    expect(parseMetric(await page.getByTestId('stat-price-value').innerText())).toBe(
      Number(api.summary.averagePriceSntKwh!.toFixed(2)),
    );

    // "Hour of max consumption / production and the difference between them".
    await expect(page.getByTestId('stat-peaks-value')).toHaveText(
      `${api.summary.hoursBetweenPeaks}h apart`,
    );
    await expect(page.getByTestId('stat-peaks')).toContainText(
      `prod ${String(api.summary.peakProduction!.hour).padStart(2, '0')}:00`,
    );
    await expect(page.getByTestId('stat-peaks')).toContainText(
      `cons ${String(api.summary.peakConsumption!.hour).padStart(2, '0')}:00`,
    );

    await page.getByText(`Hourly data (${api.hours.length} rows)`).click();
    await expect(page.getByTestId('hourly-row')).toHaveCount(api.hours.length);
  });

  test('renders one chart panel per reported metric', async ({ page }) => {
    await page.goto(`/day/${FIXTURES.fullDay}`);

    await expect(page.getByRole('heading', { name: 'Spot price' })).toBeVisible();
    // Production, consumption and price all reported on this day.
    await expect(chartPanels(page)).toHaveCount(3);
  });

  test('omits the chart for a metric with no data and says so', async ({ page, request }) => {
    // Early days in the seed have production and price but no consumption.
    const api = await getDay(request, '2022-01-15');
    expect(api.summary.consumptionHoursReported, 'fixture assumption').toBe(0);

    await page.goto('/day/2022-01-15');

    await expect(page.getByText('No consumption reported this day.')).toBeVisible();
    await expect(chartPanels(page)).toHaveCount(2);
  });

  test('cheapest hours default to three and are the actual cheapest', async ({ page, request }) => {
    const api = await getDay(request, FIXTURES.negativeStreakDay);
    const cheapestThree = api.hours
      .filter((h) => h.priceSntKwh !== null)
      .sort((a, b) => a.priceSntKwh! - b.priceSntKwh!)
      .slice(0, 3)
      .map((h) => `${String(h.hour).padStart(2, '0')}:00`);

    await page.goto(`/day/${FIXTURES.negativeStreakDay}`);

    const items = page.getByTestId('cheapest-hour');
    await expect(items).toHaveCount(3);

    const rendered = (await items.allInnerTexts()).map((t) => t.split('\n')[0]!.trim());
    expect(rendered).toEqual(cheapestThree);
  });

  test('the cheapest-hours stepper is URL-driven and needs no refetch', async ({ page }) => {
    await page.goto(`/day/${FIXTURES.fullDay}`);
    await expect(page.getByTestId('cheapest-hour')).toHaveCount(3);

    // Deliberately a UI-only filter: the client already holds all 24 hours, so
    // changing N must not hit the API again.
    const requests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/')) requests.push(req.url());
    });

    await page.getByTestId('cheapest-n').selectOption('5');

    await expect.poll(() => searchParams(page.url()).get('cheapestN')).toBe('5');
    await expect(page.getByTestId('cheapest-hour')).toHaveCount(5);
    await expect(page.getByRole('heading', { name: 'Cheapest 5 hours' })).toBeVisible();
    expect(requests).toEqual([]);
  });

  test('a deep link restores the cheapest-hours selection', async ({ page }) => {
    await page.goto(`/day/${FIXTURES.fullDay}?cheapestN=10`);

    await expect(page.getByTestId('cheapest-hour')).toHaveCount(10);
    await expect(page.getByTestId('cheapest-n')).toHaveValue('10');
  });

  test('back link returns to the list', async ({ page }) => {
    await page.goto(`/day/${FIXTURES.fullDay}`);
    await page.getByRole('link', { name: '← Back to list' }).click();

    await expect(page).toHaveURL(/\/(\?|$)/);
    await expect(page.getByTestId('daily-table')).toBeVisible();
  });

  test('a DST day renders its real hour count, not a hardcoded 24', async ({ page, request }) => {
    const api = await getDay(request, FIXTURES.dstSpringDay);
    expect(api.hours, 'fixture assumption').toHaveLength(23);

    await page.goto(`/day/${FIXTURES.dstSpringDay}`);

    await expect(page.getByTestId('stat-production')).toContainText(
      `${api.summary.productionHoursReported}/23 h`,
    );

    await page.getByText('Hourly data (23 rows)').click();
    await expect(page.getByTestId('hourly-row')).toHaveCount(23);
    await expect(page.getByTestId('hourly-table')).not.toContainText('03:00');
  });

  test('a date with no data surfaces an error instead of a blank page', async ({ page }) => {
    await page.goto(`/day/${FIXTURES.missingDay}`);

    await expect(page.getByTestId('day-error')).toContainText('404');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });
});
