// Image localisation: every WordPress upload referenced by the original site
// is mapped to a WebP file under public/images, keeping the WordPress folder
// structure and size suffixes so srcset/sizes semantics stay identical.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fetchBinary, pool } from './fetch.mjs';
import { woffToWoff2 } from './woff.mjs';

const UPLOADS_RE = /^https?:\/\/(?:www\.)?danielaheinisch\.at\/wp-content\/uploads\/(.+)$/i;
// SVGs are rasterised too: the only one (the logo) embeds four PNGs and weighs 760 KB.
const RASTER = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg']);
const MAX_WIDTH = 2560;
const SVG_WIDTH = 500; // logo is shown at max ~120 CSS px

export function isUploadUrl(url) {
  return UPLOADS_RE.test(normalizeUrl(url));
}

export function normalizeUrl(url) {
  let u = url.trim().replace(/&amp;/g, '&');
  if (u.startsWith('//')) u = 'https:' + u;
  return u.split('#')[0].split('?')[0];
}

export class ImageStore {
  constructor(publicDir) {
    this.publicDir = publicDir;
    this.jobs = new Map(); // local path -> { url, rel, ext, w, h }
    this.sources = new Map(); // base key -> Promise<{ buf, width, height }|null>
    this.failed = [];
  }

  /** Register an uploads URL and return its public path. Non-upload URLs are returned unchanged. */
  local(url) {
    const norm = normalizeUrl(url);
    const m = norm.match(UPLOADS_RE);
    if (!m) return url;
    const rel = decodeURIComponent(m[1]);
    const ext = path.extname(rel).slice(1).toLowerCase();
    if (!RASTER.has(ext)) {
      // fonts: WOFF is re-packed as WOFF2; gif / anything else: copied verbatim
      const out = '/images/' + rel + (ext === 'woff' ? '2' : '');
      if (!this.jobs.has(out)) this.jobs.set(out, { url: norm, rel, ext, copy: true });
      return encodeURI(out);
    }
    const noExt = rel.slice(0, -(ext.length + 1));
    const out = '/images/' + noExt + (ext === 'svg' ? '-svg' : '') + '.webp'; // logo exists as .svg and .png
    if (!this.jobs.has(out)) {
      const sm = noExt.match(/^(.*)-(\d+)x(\d+)$/);
      this.jobs.set(out, {
        url: norm,
        rel,
        ext,
        base: sm ? sm[1] : noExt,
        w: sm ? Number(sm[2]) : null,
        h: sm ? Number(sm[3]) : null,
      });
    }
    return encodeURI(out);
  }

  /** Rewrite every URL in a srcset string. */
  srcset(value) {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [u, ...desc] = part.split(/\s+/);
        return [this.local(u), ...desc].join(' ');
      })
      .join(', ');
  }

  /** Best available full-size source for a WordPress base name (prefers "-scaled"). */
  source(job) {
    const base = job.base.replace(/-scaled$/, '');
    const key = base + '.' + job.ext;
    if (!this.sources.has(key)) {
      this.sources.set(
        key,
        (async () => {
          const root = 'https://danielaheinisch.at/wp-content/uploads/';
          for (const candidate of [`${base}-scaled.${job.ext}`, `${base}.${job.ext}`]) {
            const buf = await fetchBinary(root + encodeURI(candidate));
            if (buf) {
              const meta = await sharp(buf).metadata();
              return { buf, width: meta.width, height: meta.height };
            }
          }
          return null;
        })(),
      );
    }
    return this.sources.get(key);
  }

  async processAll(log = console.log) {
    const entries = [...this.jobs.entries()];
    let done = 0;
    await pool(entries, 6, async ([out, job]) => {
      const file = path.join(this.publicDir, decodeURI(out));
      try {
        if (fs.existsSync(file)) return;
        fs.mkdirSync(path.dirname(file), { recursive: true });
        if (job.copy) {
          const buf = await fetchBinary(job.url);
          if (!buf) throw new Error('download failed');
          fs.writeFileSync(file, job.ext === 'woff' ? await woffToWoff2(buf) : buf);
          return;
        }
        let input = null;
        let resizeTo = null;
        if (job.w && job.h) {
          const src = await this.source(job);
          const ratio = job.w / job.h;
          if (src && Math.abs(src.width / src.height - ratio) / ratio < 0.01 && src.width >= job.w) {
            input = src.buf;
            resizeTo = job.w;
          }
        }
        if (!input) {
          input = await fetchBinary(job.url);
          if (!input) {
            // the exact size is missing on the server: fall back to the best source
            const src = await this.source(job);
            if (!src) throw new Error('download failed');
            input = src.buf;
            resizeTo = job.w || null;
          }
        }
        let img = sharp(input, { failOn: 'none' }).rotate();
        const meta = await sharp(input).metadata();
        const width = resizeTo || Math.min(meta.width, job.ext === 'svg' ? SVG_WIDTH : MAX_WIDTH);
        if (width < meta.width) img = img.resize({ width, withoutEnlargement: true });
        const hasAlpha = meta.hasAlpha;
        await img
          .webp(hasAlpha ? { quality: 90, alphaQuality: 100, effort: 5 } : { quality: 78, effort: 5 })
          .toFile(file);
      } catch (err) {
        this.failed.push({ url: job.url, error: String(err.message || err) });
      } finally {
        done++;
        if (done % 200 === 0) log(`  images: ${done}/${entries.length}`);
      }
    });
    return { total: entries.length, failed: this.failed };
  }
}
