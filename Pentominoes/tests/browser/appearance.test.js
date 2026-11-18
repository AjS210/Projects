import test from 'node:test';
import assert from 'node:assert/strict';
import { PIECES } from '../../src/core/puzzle.js';
import { openPhone } from './site.js';

// Independent transcription of the supplied outline, read top to bottom.
const trace = [
  'FFLLLL',
  'IFFWNL',
  'IFWWNN',
  'IWWZTN',
  'IZZZTN',
  'IZYTTT',
  'UUY...',
  'UYY...',
  'UUY...',
];

// Read the rendered asset (including the actual launcher PNGs). Ignoring padding
// lets each platform have its own safe area without changing the packing.
async function readMark({ url, palette, share }) {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement('canvas');
  const w = (canvas.width = image.naturalWidth),
    h = (canvas.height = image.naturalHeight);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const letterAt = (x, y) => {
    const i = (y * w + x) * 4;
    const rgb = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    return data[i + 3] === 255 ? palette[rgb] : undefined;
  };
  let left = w,
    top = h,
    right = -1,
    bottom = -1;
  for (let y = 0; y < h; y++)
    for (let x = share ? Math.floor(w / 2) : 0; x < w; x++) {
      if (!letterAt(x, y)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  if (right < left) return [];
  return Array.from({ length: 9 }, (_, row) =>
    Array.from(
      { length: 6 },
      (_, col) =>
        letterAt(
          Math.floor(left + ((col + 0.5) * (right - left + 1)) / 6),
          Math.floor(top + ((row + 0.5) * (bottom - top + 1)) / 9),
        ) || '.',
    ).join(''),
  );
}

test('page, favicon, touch, launcher and share art all reproduce the traced P in lid colors', async (t) => {
  const page = await openPhone(t);
  const base = page.url();
  const url = (ref) => new URL(ref, base).href;
  const mark = await page.locator('.brand .brand-mark').getAttribute('src');
  assert.equal(url(await page.locator('.footer-brand .brand-mark').getAttribute('src')), url(mark));
  assert.equal(url(await page.locator('.mark-study image').getAttribute('href')), url(mark));
  assert.equal(
    await page.locator('.footer-brand .brand-mark').evaluate((e) => getComputedStyle(e).filter),
    'none',
  );
  const href = (selector) => page.locator(selector).getAttribute('href');
  const ico = await page.request.get(url(await href('link[rel="icon"][href$=".ico"]')));
  assert.ok(ico.ok());
  assert.equal((await ico.body()).readUInt16LE(2), 1, 'ICO fallback');
  const favicon = url(await href('link[rel="icon"][type="image/svg+xml"]'));
  const touch = url(await href('link[rel="apple-touch-icon"]'));
  const manifestURL = url(await href('link[rel="manifest"]'));
  const manifest = await (await page.request.get(manifestURL)).json();
  assert.equal(new URL(manifest.start_url, manifestURL).href, base);
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
  const launcher = manifest.icons.map((i) => new URL(i.src, manifestURL).href);
  const social = new URL(await page.locator('meta[property="og:image"]').getAttribute('content'));
  const share = new URL(social.pathname, base).href; // use the local Pages build, not the network
  const palette = Object.fromEntries(
    Object.entries(PIECES).map(([l, p]) => [parseInt(p.color.slice(1), 16), l]),
  );
  for (const src of [url(mark), favicon, touch, ...launcher, share]) {
    assert.ok(src.startsWith(base), `${src} must resolve within the nested app`);
    assert.deepEqual(
      await page.evaluate(readMark, { url: src, palette, share: src === share }),
      trace,
      src,
    );
  }
});

test('light OS preference still opens dark workspace, empty editor, collection and import forms', async (t) => {
  const page = await openPhone(t);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload();
  const button = (name) => page.getByRole('button', { name, exact: true });
  const dark = async (selector, property = 'backgroundColor') => {
    const color = await page
      .locator(selector)
      .first()
      .evaluate((e, p) => getComputedStyle(e)[p], property);
    assert.match(color, /^rgb\(/, `${selector}: expected an opaque surface, got ${color}`);
    assert.ok(
      color.match(/\d+/g).every((c) => Number(c) < 96),
      `${selector} is not dark: ${color}`,
    );
  };
  assert.equal(await page.locator('html').evaluate((e) => getComputedStyle(e).colorScheme), 'dark');
  for (const sel of ['html', 'body', '.site-header', '.panel', '.board-stage', '.piece-tile'])
    await dark(sel);
  await button('Edit grid').click();
  await dark('dialog[open]');
  await button('Clear grid').click();
  await dark('.editor-stage .cell-square', 'fill');
  await button('Cancel').click();
  await page.getByRole('link', { name: /^Collection/ }).click();
  await dark('.collection-panel');
  await button('Import grids').click();
  await dark('.import-drop');
  await button('Paste or link').click();
  await dark('textarea');

  // Before the app bundle or stylesheet arrives there is still a dark canvas.
  await page.route(/\/assets\/.*\.(js|css)$/, (route) => route.abort());
  await page.reload();
  await dark('html');
});
