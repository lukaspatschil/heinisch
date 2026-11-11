import { assignColumns } from '../masonry-core.js';
import { on, type Cleanup } from './dom.js';

/**
 * Gallery masonry. Columns are pre-computed at build time for the reference
 * width; Masonry's "shortest column" placement can differ slightly at other
 * widths, so the assignment is re-checked in the browser and items are moved
 * between columns only when necessary.
 */
export function initMasonry(): Cleanup {
  const grids = Array.from(document.querySelectorAll<HTMLElement>('[data-hs-masonry]'));
  if (!grids.length) return () => {};
  const layout = () => {
    grids.forEach((grid) => {
      const cols = Array.from(grid.querySelectorAll<HTMLElement>(':scope > .hs-masonry-col'));
      // mobile layout: columns are display: contents, single column in DOM order (CSS order)
      if (!cols.length || getComputedStyle(cols[0]).display === 'contents') return;
      const items = Array.from(grid.querySelectorAll<HTMLElement>('.flo-gallery-grid__image')).sort(
        (a, b) => Number(a.dataset.hsIndex) - Number(b.dataset.hsIndex),
      );
      if (!cols.length || !items.length) return;
      const colWidth = cols[0].getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(items[0]).paddingLeft) || 0;
      const ratios = items.map((it) => {
        const m = (it.getAttribute('style') || '').match(/--img-height:\s*([\d.]+)%/);
        return m ? Number(m[1]) / 100 : 1;
      });
      const assignment = assignColumns(ratios, cols.length, colWidth, gap);
      const matches = items.every((it, i) => it.parentElement === cols[assignment[i]]);
      if (matches) return;
      items.forEach((it, i) => cols[assignment[i]].appendChild(it));
    });
  };

  layout();
  let raf = 0;
  const onResize = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(layout);
  };
  const offResize = on(window, 'resize', onResize);
  return () => {
    offResize();
    cancelAnimationFrame(raf);
  };
}
