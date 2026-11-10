#!/usr/bin/env node
// Pixel comparison of original vs. clone screenshots.
//
//   node scripts/qa/compare.mjs [originalDir] [cloneDir] [diffDir]
//
// Writes a diff image per page/viewport and screenshots/report.md.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const [, , origDir = 'screenshots/original', cloneDir = 'screenshots/clone', diffDir = 'screenshots/diff'] = process.argv;

function load(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function crop(png, width, height) {
  if (png.width === width && png.height === height) return png.data;
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    png.data.copy(out, y * width * 4, y * png.width * 4, y * png.width * 4 + width * 4);
  }
  return out;
}

const rows = [];
for (const vp of fs.readdirSync(path.resolve(ROOT, origDir)).sort()) {
  const vpDir = path.resolve(ROOT, origDir, vp);
  if (!fs.statSync(vpDir).isDirectory()) continue;
  for (const file of fs.readdirSync(vpDir).filter((f) => f.endsWith('.png')).sort()) {
    const cloneFile = path.resolve(ROOT, cloneDir, vp, file);
    if (!fs.existsSync(cloneFile)) {
      rows.push({ vp, page: file.replace('.png', ''), missing: true });
      continue;
    }
    const a = load(path.join(vpDir, file));
    const b = load(cloneFile);
    const width = Math.min(a.width, b.width);
    const height = Math.min(a.height, b.height);
    const diff = new PNG({ width, height });
    const mismatched = pixelmatch(crop(a, width, height), crop(b, width, height), diff.data, width, height, {
      threshold: 0.1,
      includeAA: false,
    });
    fs.mkdirSync(path.resolve(ROOT, diffDir, vp), { recursive: true });
    fs.writeFileSync(path.resolve(ROOT, diffDir, vp, file), PNG.sync.write(diff));
    rows.push({
      vp,
      page: file.replace('.png', ''),
      diffPct: (100 * mismatched) / (width * height),
      heightOrig: a.height,
      heightClone: b.height,
    });
  }
}

const lines = [
  '# Screenshot comparison: original vs. clone',
  '',
  `Generated ${new Date().toISOString()}. Pixel threshold 0.1 (pixelmatch), anti-aliasing ignored.`,
  '',
  '| Viewport | Page | Diff % | Height original | Height clone |',
  '| --- | --- | ---: | ---: | ---: |',
];
for (const r of rows) {
  if (r.missing) lines.push(`| ${r.vp} | ${r.page} | missing | | |`);
  else
    lines.push(
      `| ${r.vp} | ${r.page} | ${r.diffPct.toFixed(2)} | ${r.heightOrig} | ${r.heightClone}${r.heightOrig !== r.heightClone ? ' ⚠️' : ''} |`,
    );
}
fs.writeFileSync(path.join(ROOT, 'screenshots', 'report.md'), lines.join('\n') + '\n');
const worst = rows.filter((r) => !r.missing).sort((x, y) => y.diffPct - x.diffPct);
console.log('worst 15:');
worst.slice(0, 15).forEach((r) => console.log(`  ${r.vp.padEnd(13)} ${r.page.padEnd(40)} ${r.diffPct.toFixed(2)}%  h ${r.heightOrig}/${r.heightClone}`));
const avg = worst.reduce((s, r) => s + r.diffPct, 0) / (worst.length || 1);
console.log(`pages: ${rows.length}, average diff ${avg.toFixed(2)}%, height mismatches: ${worst.filter((r) => r.heightOrig !== r.heightClone).length}`);
