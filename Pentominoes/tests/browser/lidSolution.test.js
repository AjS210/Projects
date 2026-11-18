import test from 'node:test';
import assert from 'node:assert/strict';
import { LETTERS, PIECES, SAMPLE } from '../../src/core/puzzle.js';
import { STORE, packRecords } from '../../src/core/collection.js';
import { openPhone } from './site.js';

const previousSample =
  'LLLLNNXUUI' + 'LFNNNXXXUI' + 'FFYYYYXUUI' + 'VFFTYWWZZI' + 'VTTTWWPPZI' + 'VVVTWPPPZZ';
const fills = (cells) => Array.from(cells, (letter) => PIECES[letter].color);

test('the lid solution and existing saved boards use the same piece colors on a phone', async (t) => {
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
  await page.getByRole('heading', { name: 'Lid solution', exact: true }).waitFor();
  const button = (name) => page.getByRole('button', { name, exact: true });
  const readFills = (selector) =>
    page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('fill')));
  const grid = () => page.locator('.grid-content .cell-letter').allTextContents();
  assert.equal((await grid()).join(''), SAMPLE);
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
  // Not just the initial state: the production worker must restore it from the sample JPEG.
  await button('Adjust frame').click();
  await button('Read grid').click();
  await page.getByText('All 12 piece shapes recognized.', { exact: true }).waitFor();
  assert.equal((await grid()).join(''), SAMPLE);

  await page.getByRole('link', { name: /^Collection/ }).click();
  await button('Open solution: Solution #1252').waitFor();
  assert.deepEqual(await readFills('.entry-board .cell-square'), fills(previousSample));
  await button('Quick guide').click();
  await button('Load lid solution').click();
  await page.getByRole('heading', { name: 'Lid solution', exact: true }).waitFor();
  assert.equal((await grid()).join(''), SAMPLE);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORE), stored);
});
