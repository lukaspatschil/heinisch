#!/usr/bin/env node
// Lighthouse audit of every page (mobile + desktop).
//
//   node scripts/qa/lighthouse.mjs <baseUrl> [mobile,desktop] [pages]
//
// Uses Playwright's Chromium. Writes lighthouse-reports/summary.md (scores of
// all pages) and one HTML report per page/form factor.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { readPages, slugOf } from './screenshots.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'lighthouse-reports');
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const MIN_SCORE = 90;

const desktopConfig = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
    emulatedUserAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
};

async function main() {
  const [, , base, ffArg, pagesArg] = process.argv;
  if (!base) {
    console.error('usage: lighthouse.mjs <baseUrl> [mobile,desktop] [pages]');
    process.exit(1);
  }
  const formFactors = ffArg && ffArg !== 'all' ? ffArg.split(',') : ['mobile', 'desktop'];
  const pages = readPages(pagesArg);
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox'],
  });
  const results = [];
  try {
    for (const ff of formFactors) {
      for (const p of pages) {
        const url = base.replace(/\/$/, '') + p;
        const runner = await lighthouse(
          url,
          { port: chrome.port, output: 'html', onlyCategories: CATEGORIES, logLevel: 'error' },
          ff === 'desktop' ? desktopConfig : undefined,
        );
        const lhr = runner.lhr;
        const scores = Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]));
        const metrics = {
          LCP: lhr.audits['largest-contentful-paint']?.displayValue,
          TBT: lhr.audits['total-blocking-time']?.displayValue,
          CLS: lhr.audits['cumulative-layout-shift']?.displayValue,
          FCP: lhr.audits['first-contentful-paint']?.displayValue,
        };
        fs.writeFileSync(path.join(OUT, `${slugOf(p)}--${ff}.html`), runner.report);
        results.push({ ff, page: p, scores, metrics });
        console.log(
          `${ff.padEnd(8)} ${p.padEnd(40)} ` +
            CATEGORIES.map((c) => `${c.slice(0, 4)} ${String(scores[c]).padStart(3)}`).join('  ') +
            `   LCP ${metrics.LCP} TBT ${metrics.TBT} CLS ${metrics.CLS}`,
        );
      }
    }
  } finally {
    await chrome.kill();
  }
  const lines = [
    '# Lighthouse results',
    '',
    `Base URL: ${base} — generated ${new Date().toISOString()}`,
    '',
    '| Form factor | Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |',
    '| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |',
    ...results.map(
      (r) =>
        `| ${r.ff} | ${r.page} | ${r.scores.performance} | ${r.scores.accessibility} | ${r.scores['best-practices']} | ${r.scores.seo} | ${r.metrics.LCP} | ${r.metrics.TBT} | ${r.metrics.CLS} |`,
    ),
  ];
  fs.writeFileSync(path.join(OUT, 'summary.md'), lines.join('\n') + '\n');
  const below = results.filter((r) => CATEGORIES.some((c) => r.scores[c] < MIN_SCORE));
  console.log(below.length ? `${below.length} runs below ${MIN_SCORE} in at least one category` : `all runs >= ${MIN_SCORE}`);
  if (below.length) process.exitCode = 1;
}

main();
