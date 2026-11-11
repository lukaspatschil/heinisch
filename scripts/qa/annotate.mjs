#!/usr/bin/env node
// Annotated screenshots for design review findings.
//
//   node scripts/qa/annotate.mjs <findings.json> [baseUrl] [outDir]
//
// findings.json: { "findings": [ { "id": "UI-01", "page": "/", "viewport": "mobile-390",
//   "selector": ".css-selector" | "rect": { "x", "y", "width", "height" } (page px),
//   "title": "...", "severity": "high|medium|low" } ] }
// Writes <outDir>/<id>.png: the marked area (red frame + id label) with some context.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { VIEWPORTS } from './screenshots.mjs';

const [, , file, base = 'http://localhost:4321', outArg] = process.argv;
if (!file) {
  console.error('usage: annotate.mjs <findings.json> [baseUrl] [outDir]');
  process.exit(1);
}
const { findings } = JSON.parse(fs.readFileSync(file, 'utf8'));
const outDir = outArg || path.join(path.dirname(file), 'annotated');
fs.mkdirSync(outDir, { recursive: true });

const COLORS = { high: '#e00000', medium: '#ff7a00', low: '#0070f3' };
const MARGIN = 160;

const browser = await chromium.launch();
const groups = new Map();
for (const f of findings) {
  const key = `${f.viewport || 'laptop-1440'}|${f.page || '/'}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(f);
}

let failed = 0;
for (const [key, items] of groups) {
  const [vp, pagePath] = key.split('|');
  const ctx = await browser.newContext({ deviceScaleFactor: 1, ...(VIEWPORTS[vp] || VIEWPORTS['laptop-1440']) });
  const page = await ctx.newPage();
  await page.goto(base.replace(/\/$/, '') + pagePath, { waitUntil: 'load', timeout: 60000 });
  // load lazy images
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
  for (const f of items) {
    const box = await page.evaluate(
      ({ selector, rect }) => {
        if (rect) return rect;
        const el = [...document.querySelectorAll(selector)].find((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
      },
      { selector: f.selector, rect: f.rect },
    );
    if (!box) {
      failed++;
      console.log(`MISS ${f.id}: selector not found/visible: ${f.selector}`);
      continue;
    }
    await page.evaluate(
      ({ box, id, color }) => {
        document.querySelectorAll('.hs-annot').forEach((e) => e.remove());
        const frame = document.createElement('div');
        frame.className = 'hs-annot';
        Object.assign(frame.style, {
          position: 'absolute', left: box.x - 4 + 'px', top: box.y - 4 + 'px',
          width: box.width + 8 + 'px', height: box.height + 8 + 'px',
          border: `3px solid ${color}`, zIndex: 2147483647, pointerEvents: 'none', boxSizing: 'border-box',
        });
        const label = document.createElement('div');
        label.className = 'hs-annot';
        label.textContent = id;
        Object.assign(label.style, {
          position: 'absolute', left: box.x - 4 + 'px', top: Math.max(0, box.y - 28) + 'px',
          background: color, color: '#fff', font: 'bold 14px/24px Arial, sans-serif', padding: '0 8px',
          zIndex: 2147483647, pointerEvents: 'none',
        });
        document.body.append(frame, label);
      },
      { box, id: f.id, color: COLORS[f.severity] || COLORS.medium },
    );
    const size = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
    const x = Math.max(0, box.x - MARGIN);
    const y = Math.max(0, box.y - MARGIN);
    const clip = {
      x, y,
      width: Math.min(size.w - x, box.width + 2 * MARGIN),
      height: Math.min(size.h - y, box.height + 2 * MARGIN, 2000),
    };
    await page.screenshot({ path: path.join(outDir, `${f.id}.png`), fullPage: true, clip });
    console.log(`ok   ${f.id} → ${path.join(outDir, f.id + '.png')}`);
  }
  await ctx.close();
}
await browser.close();
if (failed) process.exitCode = 1;
