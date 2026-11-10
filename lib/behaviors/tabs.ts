import { combine, on, onActivate, type Cleanup } from './dom.js';

/**
 * FAQ tabs (original: flo-flex-builder "tabs-switcher" driving a slick "tabs2"
 * slider in fade mode). Each switcher controls the tabs element named in
 * data-selected-tabs-element of the same device variant.
 */
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
    let current = 0;
    const show = (i: number) => {
      current = (i + slides.length) % slides.length;
      items.forEach((it, k) => it.classList.toggle('flex-element-type-tabs-switcher__item--active', k === current));
      slides.forEach((sl, k) => {
        sl.classList.toggle('slick-current', k === current);
        sl.classList.toggle('slick-active', k === current);
        sl.setAttribute('aria-hidden', k === current ? 'false' : 'true');
      });
    };
    items.forEach((it) => cleanups.push(onActivate(it, () => show(Number(it.dataset.index)))));
    // swipe between tabs on touch devices
    let startX = 0;
    cleanups.push(
      on(target, 'pointerdown', (e: PointerEvent) => {
        startX = e.clientX;
      }),
      on(target, 'pointerup', (e: PointerEvent) => {
        const dx = e.clientX - startX;
        if (e.pointerType !== 'mouse' && Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
      }),
    );
  });
  return combine(cleanups);
}
