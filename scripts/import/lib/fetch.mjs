// Cached HTTP fetching for the importer. Everything downloaded from the
// original site is stored under scripts/import/.cache so re-runs are offline
// and deterministic.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const CACHE_DIR = path.resolve(import.meta.dirname, '..', '.cache');

function cachePath(url, kind) {
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
  const ext = kind === 'text' ? '.txt' : '.bin';
  return path.join(CACHE_DIR, 'http', hash + ext);
}

async function fetchWithRetry(url, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (site-import; +https://danielaheinisch.at)' },
        redirect: 'follow',
      });
      return res;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

/** Fetch a URL as text. Returns { status, body }. Non-200 responses are cached too. */
export async function fetchText(url) {
  const file = cachePath(url, 'text');
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const res = await fetchWithRetry(url);
  const out = { status: res.status, body: await res.text() };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out));
  return out;
}

/** Fetch a URL as binary. Returns a Buffer, or null when the server answers non-200. */
export async function fetchBinary(url) {
  const file = cachePath(url, 'bin');
  const miss = file + '.404';
  if (fs.existsSync(file)) return fs.readFileSync(file);
  if (fs.existsSync(miss)) return null;
  const res = await fetchWithRetry(url);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (res.status !== 200) {
    fs.writeFileSync(miss, String(res.status));
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  return buf;
}

/** Run async tasks with bounded concurrency. */
export async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
