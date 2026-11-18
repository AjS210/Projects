import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

export async function openPhone(t, hash = '') {
  const base = '/Projects/Pentominoes/';
  const site = await preview({
    base,
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
  await page.goto(`http://127.0.0.1:${site.httpServer.address().port}${base}${hash}`);
  return page;
}

// The same single image input accepts an existing file or a phone-camera result.
export async function uploadBoardPhoto(
  page,
  file = fileURLToPath(new URL('../fixtures/angled-board.jpg', import.meta.url)),
) {
  await page.getByLabel('Upload solution photo').setInputFiles(file);
  const review = page.getByRole('dialog', { name: 'Review upload' });
  await review.locator('.review-content[aria-busy="false"]').waitFor();
  return review;
}
