import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE } from '../../src/core/puzzle.js';
import { STORE, formatDate, packRecords } from '../../src/core/collection.js';
import { openPhone } from './site.js';

const grids = [
  SAMPLE,
  'UUXFFTTTWWUXXXFFTWWNUUXLFZTWNNLLLLYZZZNVPPPYYYYZNVPPIIIIIVVV',
  'IVVVTTTPPPIVUUUTWWPPIVUZUTFWWLIZZZFFFXWLIZYNNFXXXLYYYYNNNXLL',
  'LLLLNNXUUILFNNNXXXUIFFYYYYXUUIVFFTYWWZZIVTTTWWPPZIVVVTWPPPZZ',
];

test('phone collection fits three tappable boards per row and keeps captions in the detail view', async (t) => {
  const page = await openPhone(t, '#collection');
  const createdAt = '2026-09-10T12:00:00Z';
  const stored = packRecords(
    grids.map((cells, i) => ({ id: `board-${i}`, name: `My solve ${i + 1}`, cells, createdAt })),
  );
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORE, stored]);
  await page.reload();
  const cards = page.locator('.collection-list').getByRole('button');
  await cards.nth(3).waitFor();
  assert.deepEqual(await cards.allInnerTexts(), ['', '', '', ''], 'image-only buttons');

  // Phone screen zoom settings can change the viewport width in CSS pixels.
  for (const width of [320, 360, 384, 412]) {
    await page.setViewportSize({ width, height: 854 });
    const boxes = await cards.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().toJSON()),
    );
    const [a, b, c, d] = boxes;
    assert.ok(
      a.top === b.top && b.top === c.top && a.right < b.left && b.right < c.left,
      `${width}px: three across`,
    );
    assert.ok(d.left === a.left && d.top > a.bottom, `${width}px: fourth wraps`);
    assert.ok(
      boxes.every((r) => r.left >= 0 && r.right <= width && r.width > r.height && r.height >= 44),
      `${width}px: compact, tappable tiles on screen`,
    );
  }

  await page.getByRole('textbox', { name: 'Search solutions' }).fill('solve 3');
  const chosen = page.getByRole('button', { name: 'Open solution: My solve 3', exact: true });
  await chosen.waitFor();
  assert.equal(await cards.count(), 1);
  await chosen.tap();
  const detail = page.getByRole('dialog', { name: 'My solve 3', exact: true });
  const date = await page.evaluate(formatDate, createdAt);
  await detail.getByText(`Saved ${date} on this device.`, { exact: true }).waitFor();
  assert.equal((await detail.locator('.cell-letter').allTextContents()).join(''), grids[2]);
  await detail.getByRole('button', { name: 'Close dialog' }).tap();
  await page.getByRole('button', { name: 'Clear search' }).tap();
  assert.equal(await cards.count(), 4);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORE), stored);
});
