#!/usr/bin/env node
// WCAG contrast audit of all visible text on every page.
//
//   node scripts/qa/contrast.mjs [baseUrl] [viewports] [pages]
//
// Text over photos (hero slider, image backgrounds) is skipped – it needs a visual check.
import { chromium } from 'playwright';
import { VIEWPORTS, readPages } from './screenshots.mjs';

const [, , base = 'http://localhost:4321', vpArg = 'laptop-1440,tablet-1024,tablet-768,mobile-390', pagesArg] = process.argv;
const pages = readPages(pagesArg);
const browser = await chromium.launch();
let total = 0;
for (const vp of vpArg.split(',')) {
  const ctx = await browser.newContext({ deviceScaleFactor: 1, ...VIEWPORTS[vp] });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    const fails = await page.evaluate(() => {
      const parse = (c) => {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        return { r, g, b, a };
      };
      const lum = ({ r, g, b }) => {
        const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      while (walker.nextNode()) {
        const t = walker.currentNode;
        if (!t.textContent.trim()) continue;
        const el = t.parentElement;
        if (!el || seen.has(el)) continue;
        seen.add(el);
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') continue;
        if (el.closest('.flo-slick-slide-container, .fancybox-container, [aria-hidden="true"], [inert], .hs-skip-link, .sbi-screenreader, script, style, noscript')) continue;
        // effective opacity / hidden ancestors
        let op = 1;
        let n = el;
        let overImage = false;
        let bg = null;
        while (n && n.nodeType === 1) {
          const s = getComputedStyle(n);
          op *= Number(s.opacity);
          if (s.display === 'none') op = 0;
          if (!bg) {
            if (s.backgroundImage && s.backgroundImage !== 'none' && !s.backgroundImage.startsWith('linear')) overImage = true;
            const c = parse(s.backgroundColor);
            if (c && c.a > 0.5) bg = c;
          }
          n = n.parentElement;
        }
        // text placed over a photo (an <img> underneath the text's centre)
        if (!overImage) {
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          if (cy > 0 && cy < innerHeight) overImage = document.elementsFromPoint(cx, cy).some((e) => e.tagName === 'IMG' && !el.contains(e));
          else overImage = !!el.closest('.flex-block')?.querySelector('img') && Number(cs.fontSize) > 40;
        }
        if (op < 0.5 || overImage) continue;
        bg = bg || { r: 255, g: 255, b: 255, a: 1 };
        const fg = blend(parse(cs.color), bg);
        const L1 = lum(fg);
        const L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const size = parseFloat(cs.fontSize);
        const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
        const need = large ? 3 : 4.5;
        if (ratio < need) out.push(`${ratio.toFixed(2)}:1 (need ${need}) ${size.toFixed(0)}px ${cs.color} on rgb(${bg.r},${bg.g},${bg.b}) "${t.textContent.trim().slice(0, 50)}"`);
      }
      return out;
    });
    if (fails.length) {
      total += fails.length;
      console.log(`== ${vp} ${p} (${fails.length})`);
      fails.slice(0, 12).forEach((f) => console.log('   ' + f));
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`total contrast failures: ${total}`);
if (total) process.exitCode = 1;
