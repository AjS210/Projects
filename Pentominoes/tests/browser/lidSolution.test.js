import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { LETTERS, PIECES, SAMPLE } from '../../src/core/puzzle.js';
import { STORE, packRecords } from '../../src/core/collection.js';
import { openPhone } from './site.js';

const previousSample =
  'LLLLNNXUUI' + 'LFNNNXXXUI' + 'FFYYYYXUUI' + 'VFFTYWWZZI' + 'VTTTWWPPZI' + 'VVVTWPPPZZ';
const fills = (cells) => Array.from(cells, (letter) => PIECES[letter].color);

test('the lid defaults to a grid only; photo tools require a supplied image, including after a guide reset', async (t) => {
  const page = await openPhone(t);
  const stored = packRecords([
    {
      id: 'older',
      name: 'Earlier solve',
      cells: previousSample,
      createdAt: '2026-09-01T13:00:00Z',
    },
  ]);
  await page.evaluate(([key, data]) => localStorage.setItem(key, data), [STORE, stored]);
  await page.reload();
  const button = (name) => page.getByRole('button', { name, exact: true });
  const region = page.getByRole('region', { name: 'Solution grid' });
  const readFills = (selector) =>
    page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('fill')));
  const grid = async () => (await region.locator('.cell-letter').allTextContents()).join('');
  const gridOnly = async () => {
    await region.getByText('Solution #2182', { exact: true }).waitFor();
    assert.ok(await region.getByText('New to you · X group B3', { exact: true }).isVisible());
    assert.equal(await grid(), SAMPLE);
    assert.equal(await region.locator('.scan-source, img, svg image').count(), 0);
    assert.equal(await button('View photo').count(), 0);
    assert.ok(await button('Adjust frame').isDisabled());
    assert.ok(await button('Use camera').isEnabled());
    assert.ok(await region.getByRole('button', { name: /Upload a photo/ }).isEnabled());
    assert.deepEqual(
      await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .map((r) => r.name)
          .filter((url) => /\.jpe?g(?:[?#]|$)/i.test(url)),
      ),
      [],
    );
  };
  await gridOnly();
  assert.deepEqual(await readFills('.grid-content .cell-square'), fills(SAMPLE));
  assert.deepEqual(await readFills('.piece-tile .piece-icon rect:first-child'), fills(LETTERS));

  await button('Edit grid').click();
  const brushes = await page
    .locator('.brush')
    .evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  assert.deepEqual(
    brushes,
    fills(LETTERS).map((hex) => `rgb(${[...Buffer.from(hex.slice(1), 'hex')].join(', ')})`),
  );
  await button('Clear grid').click();
  await button('Apply changes').click();
  assert.ok(
    await button('Adjust frame').isDisabled(),
    'manually edited cells are not a photograph',
  );

  // Exercise the perspective reader from an actual file input, not a bundled demo.
  await page
    .getByLabel('Upload solution photo')
    .setInputFiles(fileURLToPath(new URL('../fixtures/angled-board.jpg', import.meta.url)));
  await region.getByText('angled-board.jpg', { exact: true }).waitFor();
  await region.getByText('Solution #2182', { exact: true }).waitFor();
  await button('Adjust frame').click();
  await button('Read grid').click();
  await region.getByText('Solution #2182', { exact: true }).waitFor();
  assert.equal(await grid(), SAMPLE);

  await page.getByRole('link', { name: /^Collection/ }).click();
  await button('Open solution: Solution #1252').waitFor();
  assert.deepEqual(await readFills('.entry-board .cell-square'), fills(previousSample));
  await button('Quick guide').click();
  await button('Load lid solution').click();
  await gridOnly();
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORE), stored);
});
