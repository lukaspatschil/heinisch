#!/usr/bin/env node
// Detects text blocks that overlap each other (absolute layouts can collide
// when text gets longer, e.g. after line-height or font changes).
//
//   node scripts/qa/overlap.mjs [baseUrl] [viewports] [pages]
import { chromium } from 'playwright';
import { VIEWPORTS, readPages } from './screenshots.mjs';

const [, , base = 'http://localhost:4321', vpArg = 'laptop-1440,tablet-1024,tablet-768,mobile-390', pagesArg] = process.argv;
const pages = readPages(pagesArg).filter((p) => !/website-im-aufbau|entry_form/.test(p));
const browser = await chromium.launch();
let total = 0;
for (const vp of vpArg.split(',')) {
  const ctx = await browser.newContext({ deviceScaleFactor: 1, ...VIEWPORTS[vp] });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const hits = await page.evaluate(() => {
      // line boxes of every visible text node
      const boxes = [];
      const walker = document.createTreeWalker(document.querySelector('main') || document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const t = walker.currentNode;
        if (!t.textContent.trim()) continue;
        const el = t.parentElement;
        if (el.closest('.flo-slick-slide-container, [aria-hidden="true"], [inert], .fancybox-container, .sbi-screenreader')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
        const range = document.createRange();
        range.selectNodeContents(t);
        for (const r of range.getClientRects()) {
          if (r.width < 2 || r.height < 2) continue;
          boxes.push({ x: r.left, y: r.top + scrollY, w: r.width, h: r.height, el, text: t.textContent.trim().slice(0, 40) });
        }
      }
      const out = [];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];
          if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox > 4 && oy > Math.min(a.h, b.h) * 0.35) out.push(`y=${Math.round(a.y)} "${a.text}" × "${b.text}"`);
        }
      }
      return [...new Set(out)];
    });
    if (hits.length) {
      total += hits.length;
      console.log(`== ${vp} ${p} (${hits.length})`);
      hits.slice(0, 8).forEach((h) => console.log('   ' + h));
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`total overlaps: ${total}`);
if (total) process.exitCode = 1;
