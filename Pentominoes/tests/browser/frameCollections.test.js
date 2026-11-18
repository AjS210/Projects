import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openPhone } from './site.js';
import { DRAFT_KEY } from '../../src/core/gameDraft.js';
import { STORE } from '../../src/core/collection.js';
import { LETTERS } from '../../src/core/puzzle.js';

function solvedDraft(boardId, file, width) {
  const line = readFileSync(new URL(`../../reference/isomer-design/${file}.txt`, import.meta.url), 'utf8').split('\n')[0];
  const cells = line.trim().split(/\s+/).slice(1).join('');
  const pieces = Object.fromEntries(LETTERS.map((letter) => {
    const absolute = [...cells].flatMap((l, i) => l === letter ? [[i % width, Math.floor(i / width)]] : []);
    const x = Math.min(...absolute.map((p) => p[0])), y = Math.min(...absolute.map((p) => p[1]));
    return [letter, { points: absolute.map(([px, py]) => [px - x, py - y]), at: [x, y] }];
  }));
  return { boardId, pieces, stack: LETTERS };
}

test('frame collections save solves, isolate matching numbers, filter groups and export together', async (t) => {
  const page = await openPhone(t);
  const game = page.getByRole('region', { name: 'Game board' });
  for (const [id, file, width] of [['3x20', '3x20', 20], ['8x8-center', '8x8a', 8]]) {
    await page.evaluate(([key, draft]) => sessionStorage.setItem(key, JSON.stringify(draft)), [DRAFT_KEY, solvedDraft(id, file, width)]);
    await page.reload();
    await game.getByRole('button', { name: 'Save solution' }).click();
    const dialog = page.getByRole('dialog', { name: 'Save Solution #1' });
    await dialog.getByRole('button', { name: 'Save to collection' }).click();
    await dialog.waitFor({ state: 'detached' });
  }
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORE);
  assert.deepEqual(saved.solutions.map((r) => r.boardId).sort(), ['3x20', '8x8-center']);
  await page.getByRole('link', { name: /^Collection/ }).click();
  const collection = page.getByRole('region', { name: 'Saved solutions' });
  const change = async (frame) => {
    await collection.getByRole('button', { name: 'Change Frame' }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a collection frame' });
    await dialog.getByRole('radio', { name: frame, exact: true }).check();
    await dialog.getByRole('button', { name: 'Use board' }).click();
  };
  assert.equal(await collection.getByRole('button', { name: 'Open solution: Solution #1' }).count(), 0);
  await change('3×20 Frame');
  assert.equal(await collection.getByRole('button', { name: 'Open solution: Solution #1' }).count(), 1);
  assert.match(await collection.locator('.x-group-current').innerText(), /1 \/ 2/);
  await collection.locator('.x-groups summary').click();
  await collection.getByRole('button', { name: /B3/ }).click();
  await collection.getByRole('button', { name: 'Open solution: Solution #1' }).click();
  const entry = page.getByRole('dialog', { name: 'Solution #1' });
  assert.equal(await entry.locator('.puzzle-board').getAttribute('viewBox'), '0 0 830 150');
  await entry.getByRole('button', { name: 'Close dialog' }).click();
  await change('8×8 · Center');
  assert.match(await collection.locator('.x-group-current').innerText(), /1 \/ 65/);
  assert.equal(await collection.getByRole('button', { name: 'Open solution: Solution #1' }).count(), 1);
  assert.ok(await collection.getByRole('button', { name: 'Export' }).isEnabled());
  await page.reload();
  assert.equal((await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORE)).solutions.length, 2);
});
