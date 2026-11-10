// Static asset localisation (fonts, icon fonts, plugin images) and CSS URL
// rewriting. Same-origin assets are mirrored to public/assets/<original path>.
import fs from 'node:fs';
import path from 'node:path';
import { fetchBinary, pool } from './fetch.mjs';
import { isUploadUrl, normalizeUrl } from './images.mjs';

const SITE_RE = /^https?:\/\/(?:www\.)?danielaheinisch\.at(\/.*)$/i;

export class AssetStore {
  constructor(publicDir, images) {
    this.publicDir = publicDir;
    this.images = images;
    this.jobs = new Map(); // public path -> url
    this.external = new Set();
    this.failed = [];
  }

  /** Map an absolute URL to a local public path (or return it unchanged). */
  local(url) {
    if (/^(data:|#|about:)/i.test(url)) return url;
    const norm = normalizeUrl(url);
    if (isUploadUrl(norm)) return this.images.local(norm);
    const m = norm.match(SITE_RE);
    if (!m) {
      this.external.add(norm);
      return url;
    }
    const out = '/assets' + decodeURIComponent(m[1]).replace(/\/{2,}/g, '/');
    if (!this.jobs.has(out)) this.jobs.set(out, norm);
    return encodeURI(out);
  }

  /**
   * Rewrite url(...) references inside a stylesheet and drop constructs that
   * browsers ignore anyway but the Next.js CSS parser rejects: rules with an
   * empty selector and IE "*property" hacks.
   */
  css(css, baseUrl) {
    return css
      .replace(/\/\*#\s*source(?:URL|MappingURL)=[^*]*\*\//g, '')
      .replace(/([{}]|^)\s*\{[^{}]*\}/g, '$1')
      .replace(/([{;])\s*\*[a-zA-Z-]+\s*:[^;}]*;?/g, '$1')
      .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (all, q, ref) => {
        if (/^(data:|#)/i.test(ref)) return all;
        if (/^\/(images|assets)\//.test(ref)) return all; // already localised
        let abs;
        try {
          abs = new URL(ref.startsWith('//') ? 'https:' + ref : ref, baseUrl).href;
        } catch {
          return all;
        }
        return `url('${this.local(abs)}')`;
      });
  }

  async processAll() {
    const entries = [...this.jobs.entries()];
    await pool(entries, 8, async ([out, url]) => {
      const file = path.join(this.publicDir, decodeURI(out));
      if (fs.existsSync(file)) return;
      const buf = await fetchBinary(url);
      if (!buf) {
        this.failed.push(url);
        return;
      }
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, buf);
    });
    return { total: entries.length, failed: this.failed, external: [...this.external] };
  }
}
