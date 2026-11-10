import { type Cleanup } from './dom.js';

/**
 * Lazy loading for images (and content background images) below the first
 * screen (original: lazysizes). Starts shortly after the load event so these
 * never compete with the visible ones; then loads anything within 1250px of
 * the viewport (Chrome's native margin).
 */
export function initLazyImages(): Cleanup {
  const images = Array.from(document.querySelectorAll<HTMLElement>('img[data-hs-lazy], [data-hs-bg]'));
  if (!images.length) return () => {};
  const load = (el: HTMLElement) => {
    if (el.dataset.hsBg) {
      el.style.backgroundImage = `url("${el.dataset.hsBg}")`;
      el.removeAttribute('data-hs-bg');
      return;
    }
    const img = el as HTMLImageElement;
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    if (img.dataset.src) img.src = img.dataset.src;
    img.removeAttribute('data-hs-lazy');
  };
  if (!('IntersectionObserver' in window)) {
    images.forEach(load);
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        load(e.target as HTMLElement);
      });
    },
    { rootMargin: '1250px 0px' },
  );
  let timer = 0;
  // a moment after the load event, so the first screen has been painted
  const start = () => {
    timer = window.setTimeout(() => images.forEach((img) => io.observe(img)), 250);
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener('load', start);
    io.disconnect();
  };
}
