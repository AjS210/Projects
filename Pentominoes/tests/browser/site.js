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
