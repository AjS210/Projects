import test from 'node:test';
import assert from 'node:assert/strict';
import { LETTERS, PIECES, SAMPLE } from '../../src/core/puzzle.js';
import { STORE, packRecords } from '../../src/core/collection.js';
import { openPhone, uploadBoardPhoto } from './site.js';

const previousSample =
  'LLLLNNXUUI' + 'LFNNNXXXUI' + 'FFYYYYXUUI' + 'VFFTYWWZZI' + 'VTTTWWPPZI' + 'VVVTWPPPZZ';
const fills = (cells) => Array.from(cells, (letter) => PIECES[letter].color);

test('the lid is a guide reference only; photo tools, swatches and save confirmation belong to the upload dialog', async (t) => {
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
  const card = page.getByRole('region', { name: 'Collection Upload' });
  await card.waitFor();
  assert.equal(await card.locator('svg image,.puzzle-board,.board-stage,.result-row').count(), 0);
  assert.equal(await button('Adjust grid').count(), 0);
  assert.equal(await button('Use camera').count(), 0);
  const readFills = (selector) =>
    page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('fill')));
  await button('Quick guide').tap();
  await button('View lid solution').tap();
  const lid = page.getByRole('dialog', { name: 'Pack-away grid' });
  assert.equal((await lid.locator('.cell-letter').allTextContents()).join(''), SAMPLE);
  assert.equal(await lid.locator('img,image').count(), 0);
  await button('Done').tap();
  const review = await uploadBoardPhoto(page);
  await review.getByText('Solution #2182', { exact: true }).waitFor();
  assert.deepEqual(await readFills('.review-content .cell-square'), fills(SAMPLE));
  assert.deepEqual(await readFills('.piece-tile .piece-icon rect:first-child'), fills(LETTERS));
  await button('Edit cells').click();
  const brushes = await page
    .locator('.brush')
    .evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  assert.deepEqual(
    brushes,
    fills(LETTERS).map((hex) => `rgb(${[...Buffer.from(hex.slice(1), 'hex')].join(', ')})`),
  );
  await button('Clear grid').click();
  await button('Apply changes').click();
  await review.getByText('Review needed', { exact: true }).waitFor();
  assert.ok(await button('Save to collection').isDisabled());
  await button('Adjust grid').tap();
  await button('Read grid').tap();
  await review.getByText('Solution #2182', { exact: true }).waitFor();
  assert.equal((await review.locator('.cell-letter').allTextContents()).join(''), SAMPLE);
  await button('Cancel').tap();
  assert.equal(await card.locator('.puzzle-board').count(), 0);
  await page.getByRole('link', { name: /^Collection/ }).click();
  await button('Open solution: Solution #1252').waitFor();
  assert.deepEqual(await readFills('.entry-board .cell-square'), fills(previousSample));
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORE), stored);
});

test('a failed replacement upload never offers a stale successful reading to save', async (t) => {
  const page = await openPhone(t);
  const review = await uploadBoardPhoto(page);
  await review.getByRole('button', { name: 'Cancel' }).tap();
  await page
    .getByLabel('Upload solution photo')
    .setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([255, 216]) });
  await review.getByRole('alert').waitFor();
  assert.equal(await review.getByRole('button', { name: 'Save to collection' }).count(), 0);
  assert.equal(await review.locator('.cell-letter').count(), 0);
  await review.getByRole('button', { name: 'Cancel' }).tap();
  assert.equal(await page.getByRole('button', { name: 'Review last upload' }).count(), 0);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORE), null);
});

test('dropping an unreadable board image still opens review with adjustment, never an automatic save', async (t) => {
  const page = await openPhone(t);
  const card = page.getByRole('region', { name: 'Collection Upload' });
  // A valid local image with no puzzle edges, as opposed to a failed decode.
  await card.evaluate(async (el) => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 144;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#aaa';
    ctx.fillRect(0, 0, 240, 144);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([blob], 'table.png', { type: 'image/png' }));
    el.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));
  });
  const review = page.getByRole('dialog', { name: 'Review upload' });
  await review.getByText('Review needed', { exact: true }).waitFor();
  assert.ok(await review.getByRole('button', { name: 'Save to collection' }).isDisabled());
  await review.getByRole('button', { name: 'Adjust grid' }).tap();
  await page
    .getByRole('dialog', { name: 'Adjust board frame' })
    .getByRole('button', { name: 'Close dialog' })
    .tap();
  await review.getByRole('button', { name: 'Cancel' }).tap();
  assert.equal(await card.locator('.puzzle-board').count(), 0);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORE), null);
});
