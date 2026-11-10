// WOFF 1.0 -> WOFF2 conversion for the self-hosted theme fonts (~30% smaller).
import zlib from 'node:zlib';
import wawoff2 from 'wawoff2';

/** Decode a WOFF 1.0 file into the plain SFNT (TTF/OTF) it wraps. */
export function woffToSfnt(woff) {
  if (woff.readUInt32BE(0) !== 0x774f4646) throw new Error('not a WOFF file');
  const flavor = woff.readUInt32BE(4);
  const numTables = woff.readUInt16BE(12);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    const tag = woff.readUInt32BE(o);
    const offset = woff.readUInt32BE(o + 4);
    const compLength = woff.readUInt32BE(o + 8);
    const origLength = woff.readUInt32BE(o + 12);
    const checksum = woff.readUInt32BE(o + 16);
    const raw = woff.subarray(offset, offset + compLength);
    const data = compLength < origLength ? zlib.inflateSync(raw) : Buffer.from(raw);
    if (data.length !== origLength) throw new Error('bad table length');
    tables.push({ tag, checksum, data });
  }
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = 2 ** entrySelector * 16;
  const headerSize = 12 + numTables * 16;
  let offset = headerSize;
  const records = tables.map((t) => {
    const r = { ...t, offset };
    offset += (t.data.length + 3) & ~3;
    return r;
  });
  const out = Buffer.alloc(offset);
  out.writeUInt32BE(flavor, 0);
  out.writeUInt16BE(numTables, 4);
  out.writeUInt16BE(searchRange, 6);
  out.writeUInt16BE(entrySelector, 8);
  out.writeUInt16BE(numTables * 16 - searchRange, 10);
  records.forEach((r, i) => {
    const o = 12 + i * 16;
    out.writeUInt32BE(r.tag, o);
    out.writeUInt32BE(r.checksum, o + 4);
    out.writeUInt32BE(r.offset, o + 8);
    out.writeUInt32BE(r.data.length, o + 12);
    r.data.copy(out, r.offset);
  });
  return out;
}

// wawoff2 (emscripten) is not re-entrant: run conversions one at a time.
let queue = Promise.resolve();
export function woffToWoff2(woff) {
  const run = queue.then(() => convert(woff));
  queue = run.catch(() => {});
  return run;
}

async function convert(woff) {
  const sfnt = woffToSfnt(woff);
  const woff2 = Buffer.from(await wawoff2.compress(sfnt));
  // self-check: the WOFF2 must decode back to the same SFNT tables
  const back = Buffer.from(await wawoff2.decompress(woff2));
  if (back.length < sfnt.length * 0.9) throw new Error('woff2 round trip failed');
  return woff2;
}
