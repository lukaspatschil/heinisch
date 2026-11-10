export type Cleanup = () => void;

/** addEventListener that returns its own removal function. */
export function on<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  type: K | string,
  handler: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): Cleanup {
  target.addEventListener(type, handler as EventListener, options);
  return () => target.removeEventListener(type, handler as EventListener, options);
}

/** Activate an element with Enter/Space like a button (for div-based controls). */
export function onActivate(el: HTMLElement, handler: (e: Event) => void): Cleanup {
  const offClick = on(el, 'click', handler);
  const offKey = on(el, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler(e);
    }
  });
  return () => {
    offClick();
    offKey();
  };
}

export function combine(cleanups: Cleanup[]): Cleanup {
  return () => cleanups.forEach((fn) => fn());
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Horizontal swipe / drag detection. Touch uses touch events (pointer events
 * get cancelled as soon as the browser starts panning), mouse uses pointer events.
 */
export function onSwipe(el: HTMLElement, handler: (dx: number, dy: number, touch: boolean) => void): Cleanup {
  let sx = 0;
  let sy = 0;
  let active = false;
  return combine([
    on(el, 'touchstart', (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      active = true;
    }, { passive: true }),
    on(el, 'touchend', (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      handler(t.clientX - sx, t.clientY - sy, true);
    }),
    on(el, 'pointerdown', (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      sx = e.clientX;
      sy = e.clientY;
      active = true;
    }),
    on(window, 'pointerup', (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !active) return;
      active = false;
      handler(e.clientX - sx, e.clientY - sy, false);
    }),
  ]);
}
