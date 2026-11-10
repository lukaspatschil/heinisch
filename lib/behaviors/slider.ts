import { combine, on, onActivate, onSwipe, prefersReducedMotion, type Cleanup } from './dom.js';

/**
 * Hero slider (original: slick.js "singleitem" slider of flo-gutenberg-blocks).
 * Infinite loop with one clone on each side, 1600ms ease transition, swipe,
 * arrows, keyboard, and the per-slide title/description/counter overlay.
 */
export function initSlider(): Cleanup {
  const cleanups: Cleanup[] = [];
  document.querySelectorAll<HTMLElement>('[data-hs-slider]').forEach((slider) => {
    cleanups.push(setup(slider));
  });
  return combine(cleanups);
}

function setup(slider: HTMLElement): Cleanup {
  const container = slider.closest<HTMLElement>('.flo-slick-slide-container');
  const track = slider.querySelector<HTMLElement>('[data-hs-track]');
  if (!container || !track) return () => {};
  const slides = Array.from(track.children) as HTMLElement[];
  const count = slides.length;
  if (count < 2) return () => {};
  const speed = prefersReducedMotion() ? 0 : Number(slider.dataset.slickSpeed || 1600);
  track.style.setProperty('--hs-speed', `${speed}ms`);

  // Clones for the infinite loop.
  const makeClone = (s: HTMLElement) => {
    const c = s.cloneNode(true) as HTMLElement;
    c.classList.add('slick-cloned');
    c.classList.remove('slick-current', 'slick-active', 'slick-center');
    c.setAttribute('aria-hidden', 'true');
    c.setAttribute('tabindex', '-1');
    c.querySelectorAll('img').forEach((img) => img.removeAttribute('fetchpriority'));
    return c;
  };
  const headClone = makeClone(slides[count - 1]);
  const tailClone = makeClone(slides[0]);
  track.insertBefore(headClone, slides[0]);
  track.appendChild(tailClone);

  let index = 0; // logical slide index
  let offset = 1; // position in the track (including the leading clone)
  let animating = false;

  const setOffset = (o: number, animate: boolean) => {
    track.classList.toggle('hs-no-transition', !animate || speed === 0);
    track.style.setProperty('--hs-offset', String(o));
    offset = o;
  };
  setOffset(1, false);
  // force layout so the next transform animates
  void track.offsetWidth;

  const wrapper = container.querySelector<HTMLElement>('.flo-slide-content--wrapper');
  const updateOverlay = (i: number) => {
    const s = slides[i];
    const color = s.dataset.elements_color;
    if (color !== undefined) {
      container
        .querySelectorAll<HTMLElement>('.decorative-line, .slick-arrow, .flo_slick__counter, .flo-slide-content--wrapper')
        .forEach((el) => el.setAttribute('style', `--elements_color:${color}`));
    }
    if (!wrapper) return;
    const titleBlock = wrapper.querySelector<HTMLElement>('.title-block');
    if (titleBlock) titleBlock.innerHTML = s.dataset.title ? s.dataset.slideTitle || '' : '';
    wrapper.querySelectorAll<HTMLElement>('.flo-slide-description').forEach((d) => {
      d.innerHTML = s.dataset.slideDescription || '';
    });
  };
  const updateCounter = (i: number) => {
    container.querySelectorAll('.flo_slick__current-index').forEach((el) => {
      el.textContent = String(i + 1);
    });
  };
  const updateClasses = (i: number) => {
    slides.forEach((s, k) => {
      const current = k === i;
      s.classList.toggle('slick-current', current);
      s.classList.toggle('slick-active', current);
      s.classList.toggle('slick-center', current);
      s.setAttribute('aria-hidden', current ? 'false' : 'true');
      if (current) s.removeAttribute('tabindex');
      else s.setAttribute('tabindex', '-1');
    });
  };

  const goTo = (target: number) => {
    if (animating) return;
    warm();
    const next = ((target % count) + count) % count;
    updateOverlay(next); // slick "beforeChange"
    const trackTarget = target < 0 ? 0 : target >= count ? count + 1 : next + 1;
    index = next;
    if (speed === 0) {
      setOffset(next + 1, false);
      updateClasses(next);
      updateCounter(next);
      return;
    }
    animating = true;
    setOffset(trackTarget, true);
  };

  const onTransitionEnd = (e: TransitionEvent) => {
    if (e.target !== track || e.propertyName !== 'transform') return;
    animating = false;
    if (offset === 0 || offset === count + 1) setOffset(index + 1, false);
    updateClasses(index);
    updateCounter(index); // slick "afterChange"
  };

  const cleanups: Cleanup[] = [on(track, 'transitionend', onTransitionEnd)];
  const prev = slider.querySelector<HTMLElement>('[data-hs-prev]');
  const next = slider.querySelector<HTMLElement>('[data-hs-next]');
  if (prev) cleanups.push(onActivate(prev, () => goTo(index - 1)));
  if (next) cleanups.push(onActivate(next, () => goTo(index + 1)));
  cleanups.push(
    on(slider, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(index - 1);
      if (e.key === 'ArrowRight') goTo(index + 1);
    }),
  );

  // Swipe / drag (slick: touchThreshold 5 => 1/5 of the slider width). Listen on the
  // container: the title/counter overlay covers the slides.
  const list = slider.querySelector<HTMLElement>('.slick-list');
  if (list) {
    cleanups.push(
      onSwipe(container, (dx, dy) => {
        if (Math.abs(dx) > list.clientWidth / 5 && Math.abs(dx) > Math.abs(dy)) goTo(dx < 0 ? index + 1 : index - 1);
      }),
      on(list, 'dragstart', (e: DragEvent) => e.preventDefault()),
    );
  }

  // The other slide images have no src in the HTML (keeps them off the critical path);
  // load them once the page has loaded, like slick's lazyLoad "ondemand" + lazypreload.
  const warm = () => {
    track.querySelectorAll<HTMLImageElement>('img[data-hs-deferred]').forEach((img) => {
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      if (img.dataset.src) img.src = img.dataset.src;
      img.removeAttribute('data-hs-deferred');
    });
  };
  let warmTimer: number | undefined;
  const scheduleWarm = () => {
    warmTimer = window.setTimeout(warm, 1500);
  };
  if (document.readyState === 'complete') scheduleWarm();
  else cleanups.push(on(window, 'load', scheduleWarm));

  return () => {
    combine(cleanups)();
    window.clearTimeout(warmTimer);
    headClone.remove();
    tailClone.remove();
  };
}
