import { type Cleanup } from './dom.js';

const FINAL_STATE: Record<string, string> = {
  '--animation-top': '0rem',
  '--animation-left': '0rem',
  '--animation-rotate': '0deg',
  '--animation-rotate-y': '0deg',
  '--animation-opacity': '1',
  '--animation-scale': '1',
  '--animation-blur': '0px',
  '--animation-clip-top': '0%',
  '--animation-clip-right': '0%',
  '--animation-clip-bottom': '0%',
  '--animation-clip-left': '0%',
};

/**
 * flo-flex-builder "appear" animations (only used by one shape on the FAQ
 * page): when the element scrolls into view it animates from the start state
 * in its CSS to the neutral state, like the original's anime.js timeline.
 */
export function initAppearAnimations(): Cleanup {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>('.flex-block__element--has-animation.flex-block__element--action-type-appear'),
  );
  if (!els.length) return () => {};
  const play = (el: HTMLElement) => {
    el.style.transition = 'transform 1s ease, opacity 1s ease, filter 1s ease, clip-path 1s ease';
    Object.entries(FINAL_STATE).forEach(([k, v]) => el.style.setProperty(k, v));
  };
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(play);
    return () => {};
  }
  const io = new IntersectionObserver((entries) =>
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      play(e.target as HTMLElement);
    }),
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
