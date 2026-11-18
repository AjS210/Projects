// Rebuild with `npm run brand` (Chromium as for test:browser). No browser or
// external image service is needed at app build time or on the user's device.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { PIECES } from '../src/core/puzzle.js';

// Traced on the supplied outline's six-column, nine-row lattice, not the
// rectangular 12-piece lid board. Each closed path is one whole pentomino.
const outlines = {
  F: 'M0 0h2v1h1v1H2v1H1V1H0Z',
  L: 'M2 0h4v2H5V1H2Z',
  I: 'M0 1h1v5H0Z',
  W: 'M3 1h1v2H3v1H1V3H2V2H3Z',
  N: 'M4 1h1v1h1v3H5V3H4Z',
  Z: 'M3 3h1v2H2v1H1V4H3Z',
  T: 'M4 3h1v2h1v1H3V5H4Z',
  Y: 'M2 5h1v4H2V8H1V7H2Z',
  U: 'M0 6h2v1H1v1h1v1H0Z',
};
const night = '#101517';
const mark = `<g stroke="${night}" stroke-width=".085" stroke-linejoin="round">
${Object.entries(outlines)
  .map(([letter, d]) => `  <path data-piece="${letter}" fill="${PIECES[letter].color}" d="${d}"/>`)
  .join('\n')}
</g>`;
const svg = (view, content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}"><title>PentoLog</title>\n${content}\n</svg>\n`;
const square = (unit, radius = 0) =>
  svg(
    '0 0 100 100',
    `<rect width="100" height="100" rx="${radius}" fill="${night}"/>\n<g transform="translate(${50 - 3 * unit} ${50 - 4.5 * unit}) scale(${unit})">${mark}</g>`,
  );
const dir = new URL('../public/', import.meta.url);
const put = (name, bytes) => writeFile(new URL(name, dir), bytes);
await mkdir(new URL('brand/', dir), { recursive: true });
await put('brand/mark.svg', svg('-.055 -.055 6.11 9.11', mark));
const favicon = square(10, 19);
await put('favicon.svg', favicon);

// Scrapers do not run the app. Give them a real PNG with the same mark and the
// locally bundled fonts, rather than asking them to rasterize SVG or load JS.
const shareCard = svg(
  '0 0 1200 630',
  `
<defs><pattern id="dots" width="17" height="17" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="1.2" fill="#384549"/></pattern></defs>
<rect width="1200" height="630" fill="${night}"/>
<rect x="26" y="26" width="1148" height="578" rx="18" fill="#191f21" stroke="#364043"/>
<rect x="711" y="54" width="425" height="522" fill="url(#dots)"/>
<g transform="translate(795 119) scale(44)">${mark}</g>
<path d="M94 158h44" stroke="#e7c180" stroke-width="3"/>
<g font-family="'Pento Mono', monospace" font-size="18" letter-spacing="3" fill="#e7c180"><text x="154" y="164">PENTOMINO TOOLKIT</text></g>
<g font-family="'Pento Sans', sans-serif"><text x="87" y="320" font-size="114" font-weight="680" letter-spacing="-6" fill="#eceee8">PentoLog</text><text x="94" y="380" font-size="33" fill="#b3beba">Your pentomino solution notebook.</text></g>
<path d="M94 459h470" stroke="#394548"/>
<text x="94" y="500" font-family="'Pento Mono', monospace" font-size="17" letter-spacing="2" fill="#a7b3af">SCAN  /  VERIFY  /  COLLECT</text>`,
);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  async function raster(image, width, height = width, fonts = '') {
    await page.setViewportSize({ width, height });
    await page.setContent(
      `<style>${fonts}*{margin:0}svg{display:block;width:100vw;height:100vh}</style>${image}`,
    );
    await page.evaluate(() => document.fonts.ready);
    return page.screenshot({ type: 'png', omitBackground: true });
  }
  const any = square(8.9);
  for (const size of [180, 192, 512]) {
    await put(
      `brand/${size === 180 ? 'apple-touch-icon' : `icon-${size}`}.png`,
      await raster(any, size),
    );
  }
  // All the artwork, including the extreme corners, fits the maskable safe circle.
  await put('brand/maskable-512.png', await raster(square(7.15), 512));

  // Standard multi-size ICO directory with PNG-compressed frames for tab fallbacks.
  const sizes = [16, 32, 48];
  const directory = Buffer.alloc(6 + sizes.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(sizes.length, 4);
  const frames = [directory];
  let offset = directory.length;
  for (const [i, size] of sizes.entries()) {
    const png = await raster(favicon, size);
    const pos = 6 + i * 16;
    directory[pos] = directory[pos + 1] = size;
    directory.writeUInt16LE(1, pos + 4);
    directory.writeUInt16LE(32, pos + 6);
    directory.writeUInt32LE(png.length, pos + 8);
    directory.writeUInt32LE(offset, pos + 12);
    frames.push(png);
    offset += png.length;
  }
  await put('favicon.ico', Buffer.concat(frames));

  async function font(name, weight, path) {
    const bytes = await readFile(new URL(import.meta.resolve(path)));
    return `@font-face{font-family:'${name}';font-weight:${weight};src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2')}`;
  }
  const fonts =
    (await font(
      'Pento Sans',
      '100 1000',
      '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2',
    )) +
    (await font(
      'Pento Mono',
      '500',
      '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2',
    ));
  await put('brand/share.png', await raster(shareCard, 1200, 630, fonts));
} finally {
  await browser.close();
}
