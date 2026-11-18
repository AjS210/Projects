import test from 'node:test';
import assert from 'node:assert/strict';
import { STORE, packRecords } from '../../src/core/collection.js';
import { SAMPLE, variants } from '../../src/core/puzzle.js';
import { openPhone, uploadBoardPhoto } from './site.js';

test('numbered saves, legacy backup imports, X groups and number search on a phone', async (t) => {
  const page = await openPhone(t);
  const button = (name) => page.getByRole('button', { name, exact: true });
  const saved = () =>
    page.evaluate((key) => JSON.parse(localStorage.getItem(key))?.solutions, STORE);
  const review = await uploadBoardPhoto(page);
  await review.getByText('Solution #2182', { exact: true }).waitFor();
  await review.getByText('New to you · X group B3', { exact: true }).waitFor();
  assert.equal(await saved(), undefined, 'recognition is not a collection save');
  await review.getByRole('button', { name: 'Save to collection' }).tap();
  await review.waitFor({ state: 'detached' });
  assert.deepEqual(
    (await saved()).map((r) => [r.name, r.cells]),
    [['Solution #2182', SAMPLE]],
  );

  await page.getByRole('link', { name: /^Collection/ }).tap();
  const first = 'FFIIIIILZZVFFYLLLLZNVFYYYYXZZNVVVTWXXXNNPPPTWWXUNUPPTTTWWUUU';
  const cells = variants(first)[3],
    createdAt = '2024-02-11T15:00:00Z';
  await button('Import grids').tap();
  await page.getByLabel('Choose grid or backup file').setInputFiles({
    name: 'previous.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      packRecords([
        { name: 'Kitchen table', cells, createdAt },
        { name: 'Mirrored lid', cells: variants(SAMPLE)[1], createdAt },
      ]),
    ),
  });
  await page.getByText('2 verified boards found').waitFor();
  await page.locator('.import-samples').getByText('Solution #1', { exact: true }).waitFor();
  await button('Import solutions').tap();
  await page.getByText('1 solution added · 1 duplicate skipped.').waitFor();
  const records = await saved();
  const restored = records.find((r) => r.name === 'Solution #1');
  assert.equal(restored.cells, cells);
  assert.equal(restored.createdAt, createdAt);
  assert.equal(restored.previousName, 'Kitchen table');
  assert.equal(records.length, 2);
  await page.reload();
  const summary = page.locator('.x-groups summary'),
    cards = page.locator('.collection-list').getByRole('button');
  await summary.tap();
  await button('C4 1 / 276').tap();
  assert.equal(await cards.count(), 1);
  await button('Open solution: Solution #1').tap();
  const detail = page.getByRole('dialog', { name: 'Solution #1', exact: true });
  await detail.getByText('X group C4', { exact: true }).waitFor();
  await detail.getByText('Earlier name: Kitchen table', { exact: true }).waitFor();
  assert.equal((await detail.locator('.cell-letter').allTextContents()).join(''), cells);
  await detail.getByRole('button', { name: 'Close dialog' }).tap();
  await button('C5 0 / 337').tap();
  await page.getByText('No solutions found', { exact: true }).waitFor();
  await button('Show all saved solutions').tap();
  assert.equal(await cards.count(), 2);
  assert.deepEqual(await cards.evaluateAll((els) => els.map((el) => el.title)), [
    'Solution #1',
    'Solution #2182',
  ]);
  await page.getByRole('textbox', { name: 'Search solutions' }).fill('#2182');
  assert.equal(await cards.count(), 1);
  await button('Open solution: Solution #2182').waitFor();
  assert.deepEqual(await saved(), records, 'browsing the catalogue metadata does not mutate saves');
});
