// Some parts of the original site are rendered client-side by WordPress plugins
// (Vue contact form, Instagram feed, WhatsApp widget). We render them once in a
// headless browser and store the resulting markup so the clone can ship it as
// static HTML.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { CACHE_DIR } from './fetch.mjs';

const FILE = path.join(CACHE_DIR, 'snapshots.json');

const TARGETS = [
  { key: 'whatsapp', url: 'https://danielaheinisch.at/', selector: '#wa' },
  { key: 'instagram', url: 'https://danielaheinisch.at/', selector: '#sb_instagram' },
  { key: 'contactForm', url: 'https://danielaheinisch.at/kontakt-2/', selector: '.app-flo-forms' },
];

export async function getSnapshots() {
  if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const out = {};
  let current = null;
  for (const t of TARGETS) {
    if (current !== t.url) {
      await page.goto(t.url, { waitUntil: 'load', timeout: 120000 });
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(3000);
      current = t.url;
    }
    await page.waitForSelector(t.selector, { timeout: 30000, state: 'attached' });
    out[t.key] = await page.$eval(t.selector, (el) => el.outerHTML);
  }
  await browser.close();
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(out, null, 1));
  return out;
}
