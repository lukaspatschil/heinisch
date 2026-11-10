import { combine, onActivate, prefersReducedMotion, type Cleanup } from './dom.js';

/** "Back to top" link in the footer (original: jQuery animate, 300ms). */
export function initScrollTop(): Cleanup {
  const cleanups: Cleanup[] = [];
  document.querySelectorAll<HTMLElement>('[data-hs-scroll-top]').forEach((el) => {
    cleanups.push(
      onActivate(el, () => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }),
    );
  });
  return combine(cleanups);
}
