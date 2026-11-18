import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { preview } from 'vite';
import { boards, sheetJpg } from '../fixtures/sheetPhoto.js';

// Exercise the actual file picker, SVG hit targets, pointer capture, scan worker
// and React selection state. No private screenshot, persistent server or account.
test('after bulk import, move the frame to another board, resize, read and switch again', async (t) => {
  const site = await preview({
    base: '/Emul8or/',
    preview: { host: '0.0.0.0', port: 0 },
    logLevel: 'silent',
  });
  let browser;
  t.after(async () => {
    await browser?.close();
    await site.close();
  });
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const button = (name) => page.getByRole('button', { name, exact: true });
  const target = (n) =>
    page.locator('.frame-jump-target').filter({ hasText: `Jump to board ${n}` });
  const jump = page.getByRole('combobox', { name: 'Jump to board' });
  const saved = () => page.evaluate(() => localStorage.getItem('pentolog.collection.v1'));
  const read = async (index) => {
    await button('Read grid').click();
    await page.locator('.grid-panel[aria-busy="false"]').waitFor();
    await page.getByText(`Board ${index + 1} of ${boards.length}`, { exact: true }).waitFor();
    assert.equal(
      (await page.locator('.grid-content .cell-letter').allTextContents()).join(''),
      boards[index],
    );
    assert.ok(await button('Choose from 4 boards').isEnabled());
  };
  await page.goto(`http://127.0.0.1:${site.httpServer.address().port}/Emul8or/#collection`);
  await button('Import grids').click();
  await page.getByLabel('Choose grid or backup file').setInputFiles({
    name: 'sheet.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(sheetJpg({ right: true })),
  });
  await page.getByText('4 verified boards found', { exact: true }).waitFor();
  await button('Import solutions').click();
  const original = await saved();
  assert.ok(JSON.parse(original).solutions.length > 0);
  await page.getByRole('link', { name: 'Workspace', exact: true }).click();
  await button('Adjust frame').click();
  assert.equal(await jump.inputValue(), '0');

  // Touch the interior, not a corner, and slide from board 1 to board 3.
  const center = async (loc) => {
    const { x, y, width, height } = await loc.boundingBox();
    return { x: x + width / 2, y: y + height / 2 };
  };
  const session = await page.context().newCDPSession(page);
  const touch = (type, touchPoints) =>
    session.send('Input.dispatchTouchEvent', { type, touchPoints });
  await touch('touchStart', [
    await center(page.getByRole('button', { name: /^Move whole frame/ })),
  ]);
  await touch('touchMove', [await center(target(3))]);
  await touch('touchEnd', []);
  assert.equal(await jump.inputValue(), '2');
  await page.getByLabel(/Top left handle/).press('ArrowRight');
  await read(2);
  await button('Adjust frame').click();
  assert.equal(await jump.inputValue(), '2');
  await target(4).tap();
  assert.equal(await jump.inputValue(), '3');
  await read(3);
  await button('Adjust frame').click();
  await jump.selectOption('1');
  await read(1);
  assert.equal(await saved(), original, 'frame reviews must never rewrite saved solutions');
});
