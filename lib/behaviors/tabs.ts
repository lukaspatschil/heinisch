import { combine, on, onActivate, onSwipe, type Cleanup } from './dom.js';

/**
 * FAQ tabs (original: flo-flex-builder "tabs-switcher" driving a slick "tabs2"
 * slider in fade mode). Each switcher controls the tabs element named in
 * data-selected-tabs-element of the same device variant. Exposed as ARIA tabs
 * with roving tabindex and arrow-key navigation (UX-10).
 */
let uid = 0;

export function initTabs(): Cleanup {
  const cleanups: Cleanup[] = [];
  document.querySelectorAll<HTMLElement>('[data-hs-tabs-switcher]').forEach((switcher) => {
    const element = switcher.closest<HTMLElement>('.flex-block__element');
    const device = element?.dataset.onlyDevice;
    const targetId = switcher.dataset.selectedTabsElement;
    const block = switcher.closest('.flex-block');
    const target = block?.querySelector<HTMLElement>(
      `.flex-block__element--${targetId}${device ? `[data-only-device="${device}"]` : ''} [data-hs-tabs]`,
    );
    if (!target) return;
    const items = Array.from(switcher.querySelectorAll<HTMLElement>('.flex-element-type-tabs-switcher__item'));
    const slides = Array.from(target.querySelectorAll<HTMLElement>('.slick-slide'));
    const id = ++uid;
    switcher.setAttribute('role', 'tablist');
    switcher.setAttribute('aria-label', 'Häufige Fragen');
    switcher.setAttribute('aria-orientation', 'vertical');
    items.forEach((it, k) => {
      it.setAttribute('role', 'tab');
      it.id = `hs-tab-${id}-${k}`;
      it.setAttribute('aria-controls', `hs-panel-${id}-${k}`);
    });
    slides.forEach((sl, k) => {
      sl.setAttribute('role', 'tabpanel');
      sl.id = `hs-panel-${id}-${k}`;
      sl.setAttribute('aria-labelledby', `hs-tab-${id}-${k}`);
    });

    let current = 0;
    const show = (i: number, focus = false) => {
      current = (i + slides.length) % slides.length;
      items.forEach((it, k) => {
        const active = k === current;
        it.classList.toggle('flex-element-type-tabs-switcher__item--active', active);
        it.setAttribute('aria-selected', String(active));
        it.tabIndex = active ? 0 : -1;
      });
      slides.forEach((sl, k) => {
        sl.classList.toggle('slick-current', k === current);
        sl.classList.toggle('slick-active', k === current);
        // hidden panels contain links: keep them out of the tab order too (aria-hidden-focus)
        sl.inert = k !== current;
        sl.removeAttribute('aria-hidden');
      });
      if (focus) items[current]?.focus();
    };
    show(0);

    items.forEach((it) => cleanups.push(onActivate(it, () => show(Number(it.dataset.index)))));
    cleanups.push(
      on(switcher, 'keydown', (e: KeyboardEvent) => {
        const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        if (e.key in keys) show(current + keys[e.key], true);
        else if (e.key === 'Home') show(0, true);
        else if (e.key === 'End') show(slides.length - 1, true);
        else return;
        e.preventDefault();
      }),
      // swipe between tabs on touch devices
      onSwipe(target, (dx, dy, touch) => {
        if (touch && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
      }),
    );
  });
  return combine(cleanups);
}
