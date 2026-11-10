import { on, type Cleanup } from './dom.js';

/**
 * Instagram feed size classes (original: sbi-scripts setImageSizeClass): tiles
 * narrower than 240px get "sbi_medium", up to 120px "sbi_small", which shrink
 * the carousel icon.
 */
export function initInstagram(): Cleanup {
  const feed = document.querySelector<HTMLElement>('#sb_instagram');
  const images = feed?.querySelector<HTMLElement>('#sbi_images');
  if (!feed || !images) return () => {};
  const update = () => {
    const cs = getComputedStyle(images);
    const padding = (parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) / 2;
    const w = window.innerWidth;
    const cols = Number(feed.dataset[w <= 480 ? 'colsmobile' : w <= 800 ? 'colstablet' : 'cols']) || 5;
    const tile = (feed.clientWidth - padding * (cols + 2)) / cols;
    feed.classList.toggle('sbi_medium', tile > 120 && tile < 240);
    feed.classList.toggle('sbi_small', tile <= 120);
  };
  update();
  return on(window, 'resize', update);
}
