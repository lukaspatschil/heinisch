#!/usr/bin/env node
// Full-page screenshots of every page at several viewports.
//
//   node scripts/qa/screenshots.mjs <baseUrl> <outDir> [viewports] [pages]
//
//   baseUrl    e.g. https://danielaheinisch.at or http://localhost:3000
//   outDir     e.g. screenshots/original or screenshots/clone
//   viewports  optional comma separated list (default: all)
//   pages      optional comma separated list of paths (default: scripts/qa/pages.txt)
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

export const VIEWPORTS = {
  'desktop-1920': { viewport: { width: 1920, height: 1080 } },
  'laptop-1440': { viewport: { width: 1440, height: 900 } },
  'tablet-1024': { viewport: { width: 1024, height: 768 }, hasTouch: true },
  'tablet-768': { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true },
  'mobile-390': {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPhone 13'].userAgent,
  },
};

export const slugOf = (p) => (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '__'));

export function readPages(arg) {
  if (arg) return arg.split(',');
  return fs
    .readFileSync(path.join(import.meta.dirname, 'pages.txt'), 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // Scroll through the page so lazy images load.
  await page.evaluate(async () => {
    const h = () => document.documentElement.scrollHeight;
    for (let y = 0; y < h(); y += 300) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((r) => img.addEventListener('load', r, { once: true }) || setTimeout(r, 5000))),
    );
  });
  await page.waitForTimeout(1500);
}

// The original site shows a "Real Cookie Banner" consent dialog (the clone has
// no tracking and therefore no banner). Decline once per browser context so the
// original screenshots show the actual page.
async function dismissCookieBanner(page, base) {
  await page.goto(base.replace(/\/$/, '') + '/impressum/', { waitUntil: 'load', timeout: 90000 });
  const button = page.getByText('Weiter ohne Einwilligung', { exact: true }).first();
  try {
    await button.waitFor({ state: 'visible', timeout: 15000 });
    await button.click();
    await page.waitForTimeout(1000);
  } catch {
    // banner not shown
  }
}

async function main() {
  const [, , base, outDir, vpArg, pagesArg] = process.argv;
  if (!base || !outDir) {
    console.error('usage: screenshots.mjs <baseUrl> <outDir> [viewports] [pages]');
    process.exit(1);
  }
  const pages = readPages(pagesArg);
  const wanted = vpArg && vpArg !== 'all' ? vpArg.split(',') : Object.keys(VIEWPORTS);
  const browser = await chromium.launch();
  let failed = 0;
  for (const name of wanted) {
    const opts = VIEWPORTS[name];
    fs.mkdirSync(path.join(outDir, name), { recursive: true });
    const ctx = await browser.newContext({ deviceScaleFactor: 1, reducedMotion: 'reduce', ...opts });
    const page = await ctx.newPage();
    if (/danielaheinisch\.at/.test(base)) await dismissCookieBanner(page, base);
    for (const p of pages) {
      try {
        await page.goto(base.replace(/\/$/, '') + p, { waitUntil: 'load', timeout: 90000 });
        await settle(page);
        // the original's consent banner can (re)appear on any page view
        const banner = page.getByText('Weiter ohne Einwilligung', { exact: true }).first();
        if (await banner.isVisible().catch(() => false)) {
          await banner.click();
          await page.waitForTimeout(1500);
        }
        await page.screenshot({ path: path.join(outDir, name, slugOf(p) + '.png'), fullPage: true, animations: 'disabled' });
        console.log('ok ', name, p);
      } catch (err) {
        failed++;
        console.log('ERR', name, p, String(err.message).split('\n')[0]);
      }
    }
    await ctx.close();
  }
  await browser.close();
  if (failed) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
