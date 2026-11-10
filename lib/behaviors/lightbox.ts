import { combine, on, onSwipe, prefersReducedMotion, type Cleanup } from './dom.js';

/**
 * Gallery lightbox. Re-creates the fancybox 3 markup used by the original
 * site so the original jquery.fancybox.min.css styles it: infobar (n / total),
 * toolbar (zoom, slideshow, thumbnails, close), arrows, keyboard and swipe.
 */

type Item = { src: string; thumb: string; width: number; height: number };

const ICONS = {
  zoom: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.7 17.3l-3-3a5.9 5.9 0 0 0-.6-7.6 5.9 5.9 0 0 0-8.4 0 5.9 5.9 0 0 0 0 8.4 5.9 5.9 0 0 0 7.7.7l3 3a1 1 0 0 0 1.3 0c.4-.5.4-1 0-1.5zM8.1 13.8a4 4 0 0 1 0-5.7 4 4 0 0 1 5.7 0 4 4 0 0 1 0 5.7 4 4 0 0 1-5.7 0z"></path></svg>',
  play: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6.5 5.4v13.2l11-6.6z"></path></svg><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8.33 5.75h2.2v12.5h-2.2V5.75zm5.15 0h2.2v12.5h-2.2V5.75z"></path></svg>',
  thumbs: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14.59 14.59h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76H5.65v-3.76zm8.94-4.47h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76H5.65v-3.76zm8.94-4.47h3.76v3.76h-3.76V5.65zm-4.47 0h3.76v3.76h-3.76V5.65zm-4.47 0h3.76v3.76H5.65V5.65z"></path></svg>',
  close: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 10.6L6.6 5.2 5.2 6.6l5.4 5.4-5.4 5.4 1.4 1.4 5.4-5.4 5.4 5.4 1.4-1.4-5.4-5.4 5.4-5.4-1.4-1.4-5.4 5.4z"></path></svg>',
  left: '<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.28 15.7l-1.34 1.37L5 12l4.94-5.07 1.34 1.38-2.68 2.72H19v1.94H8.6z"></path></svg></div>',
  right: '<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.4 12.97l-2.68 2.72 1.34 1.38L19 12l-4.94-5.07-1.34 1.38 2.68 2.72H5v1.94z"></path></svg></div>',
};

const DURATION = 366;
const SLIDESHOW_SPEED = 3000;

export function initLightbox(): Cleanup {
  const grids = Array.from(document.querySelectorAll<HTMLElement>('[data-hs-masonry]'));
  if (!grids.length) return () => {};
  const cleanups: Cleanup[] = [];
  grids.forEach((grid) => {
    cleanups.push(
      on(grid, 'click', (e: MouseEvent) => {
        const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.flo-gallery-grid__image');
        if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        const links = Array.from(grid.querySelectorAll<HTMLAnchorElement>('a.flo-gallery-grid__image')).sort(
          (a, b) => Number(a.dataset.hsIndex) - Number(b.dataset.hsIndex),
        );
        const items: Item[] = links.map((a) => {
          const img = a.querySelector('img');
          return {
            src: a.getAttribute('href') || '',
            thumb: a.dataset.thumb || img?.getAttribute('src') || '',
            width: Number(img?.getAttribute('width')) || 1600,
            height: Number(img?.getAttribute('height')) || 1067,
          };
        });
        cleanups.push(open(items, links.indexOf(link), link));
      }),
    );
  });
  return combine(cleanups);
}

function open(items: Item[], start: number, opener: HTMLElement): Cleanup {
  const total = items.length;
  let index = start;
  let zoomed = false;
  let slideshow = 0;
  let panX = 0;
  let panY = 0;

  const root = document.createElement('div');
  root.className =
    'fancybox-container fancybox-show-toolbar fancybox-show-infobar fancybox-show-nav fancybox-is-zoomable fancybox-can-zoomIn';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Bildergalerie');
  root.tabIndex = -1;
  root.style.transitionDuration = `${DURATION}ms`;
  root.innerHTML = `
    <div class="fancybox-bg"></div>
    <div class="fancybox-inner">
      <div class="fancybox-infobar"><span data-fancybox-index></span>&nbsp;/&nbsp;<span data-fancybox-count>${total}</span></div>
      <div class="fancybox-toolbar">
        <button type="button" data-fancybox-zoom class="fancybox-button fancybox-button--zoom" title="Zoom" aria-label="Zoom">${ICONS.zoom}</button>
        <button type="button" data-fancybox-play class="fancybox-button fancybox-button--play" title="Diashow starten" aria-label="Diashow starten">${ICONS.play}</button>
        <button type="button" data-fancybox-thumbs class="fancybox-button fancybox-button--thumbs" title="Vorschaubilder" aria-label="Vorschaubilder">${ICONS.thumbs}</button>
        <button type="button" data-fancybox-close class="fancybox-button fancybox-button--close" title="Schließen" aria-label="Schließen">${ICONS.close}</button>
      </div>
      <div class="fancybox-navigation">
        <button type="button" data-fancybox-prev class="fancybox-button fancybox-button--arrow_left" title="Zurück" aria-label="Zurück">${ICONS.left}</button>
        <button type="button" data-fancybox-next class="fancybox-button fancybox-button--arrow_right" title="Weiter" aria-label="Weiter">${ICONS.right}</button>
      </div>
      <div class="fancybox-stage">
        <div class="fancybox-slide fancybox-slide--current fancybox-slide--image fancybox-slide--complete">
          <div class="fancybox-content"><img class="fancybox-image" alt=""></div>
        </div>
      </div>
      <div class="fancybox-caption fancybox-caption--separate"><div class="fancybox-caption__body"></div></div>
      <div class="fancybox-progress"></div>
    </div>`.replace(/>\s+</g, '><'); // no whitespace between the inline-block buttons

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const slide = $('.fancybox-slide');
  const content = $('.fancybox-content');
  const image = $<HTMLImageElement>('.fancybox-image');
  const counter = $('[data-fancybox-index]');
  const playBtn = $('[data-fancybox-play]');
  const progress = $('.fancybox-progress');
  let thumbs: HTMLElement | null = null;

  // Body scroll lock like fancybox ("fancybox-active compensate-for-scrollbar").
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  document.body.classList.add('fancybox-active', 'compensate-for-scrollbar');
  const styleTag = document.createElement('style');
  styleTag.textContent = `.compensate-for-scrollbar{margin-right:${scrollbar}px;}`;
  document.head.appendChild(styleTag);

  const fit = () => {
    const item = items[index];
    const cs = getComputedStyle(slide);
    const availW = slide.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = slide.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const scale = zoomed ? 1 : Math.min(1, availW / item.width, availH / item.height);
    const w = item.width * scale;
    const h = item.height * scale;
    let x = (slide.clientWidth - w) / 2;
    let y = (slide.clientHeight - h) / 2;
    if (zoomed) {
      x = Math.min(0, Math.max(slide.clientWidth - w, x + panX));
      y = Math.min(0, Math.max(slide.clientHeight - h, y + panY));
      if (w <= slide.clientWidth) x = (slide.clientWidth - w) / 2;
      if (h <= slide.clientHeight) y = (slide.clientHeight - h) / 2;
    }
    content.style.width = `${w}px`;
    content.style.height = `${h}px`;
    content.style.transform = `translate(${x}px, ${y}px) scale(1, 1)`;
    const canZoom = item.width > availW + 1 || item.height > availH + 1;
    root.classList.toggle('fancybox-is-zoomable', canZoom);
    root.classList.toggle('fancybox-can-zoomIn', canZoom && !zoomed);
    root.classList.toggle('fancybox-can-zoomOut', zoomed);
    root.classList.toggle('fancybox-can-pan', zoomed);
  };

  const show = (i: number) => {
    index = ((i % total) + total) % total;
    zoomed = false;
    panX = panY = 0;
    counter.textContent = String(index + 1);
    image.style.opacity = '0';
    image.onload = () => {
      image.style.transition = prefersReducedMotion() ? '' : 'opacity 330ms';
      image.style.opacity = '1';
    };
    image.src = items[index].src;
    if (image.complete) image.style.opacity = '1';
    fit();
    // preload neighbours
    [index + 1, index - 1].forEach((k) => {
      const pre = new Image();
      pre.src = items[(k + total) % total].src;
    });
    if (thumbs) {
      thumbs.querySelectorAll('a').forEach((a, k) => a.classList.toggle('fancybox-thumbs-active', k === index));
      thumbs.querySelector<HTMLElement>('.fancybox-thumbs-active')?.scrollIntoView({ block: 'nearest' });
    }
  };

  const stopSlideshow = () => {
    window.clearTimeout(slideshow);
    slideshow = 0;
    playBtn.classList.remove('fancybox-button--pause');
    playBtn.classList.add('fancybox-button--play');
    progress.style.transitionDuration = '';
    progress.style.transform = '';
  };
  const tick = () => {
    progress.style.transitionDuration = '0ms';
    progress.style.transform = 'scaleX(0)';
    void progress.offsetWidth;
    progress.style.transitionDuration = `${SLIDESHOW_SPEED}ms`;
    progress.style.transform = 'scaleX(1)';
    slideshow = window.setTimeout(() => {
      show(index + 1);
      tick();
    }, SLIDESHOW_SPEED);
  };
  const toggleSlideshow = () => {
    if (slideshow) return stopSlideshow();
    playBtn.classList.remove('fancybox-button--play');
    playBtn.classList.add('fancybox-button--pause');
    tick();
  };

  const toggleThumbs = () => {
    if (thumbs) {
      thumbs.remove();
      thumbs = null;
      root.classList.remove('fancybox-show-thumbs');
    } else {
      thumbs = document.createElement('div');
      thumbs.className = 'fancybox-thumbs fancybox-thumbs-y';
      const list = document.createElement('div');
      list.className = 'fancybox-thumbs__list';
      items.forEach((item, k) => {
        const a = document.createElement('a');
        a.href = '#';
        a.tabIndex = 0;
        a.dataset.index = String(k);
        a.setAttribute('aria-label', `Bild ${k + 1}`);
        a.style.backgroundImage = `url("${item.thumb}")`;
        list.appendChild(a);
      });
      list.addEventListener('click', (e) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-index]');
        if (!a) return;
        e.preventDefault();
        show(Number(a.dataset.index));
      });
      thumbs.appendChild(list);
      root.appendChild(thumbs);
      root.classList.add('fancybox-show-thumbs');
    }
    fit();
    show(index);
  };

  let closing = false;
  const cleanups: Cleanup[] = [];
  const close = () => {
    if (closing) return;
    closing = true;
    stopSlideshow();
    root.classList.remove('fancybox-is-open');
    root.classList.add('fancybox-is-closing');
    window.setTimeout(destroy, prefersReducedMotion() ? 0 : DURATION);
  };
  const destroy = () => {
    combine(cleanups)();
    root.remove();
    styleTag.remove();
    document.body.classList.remove('fancybox-active', 'compensate-for-scrollbar');
    opener.focus({ preventScroll: true });
  };

  cleanups.push(
    on($('[data-fancybox-close]'), 'click', close),
    on($('[data-fancybox-prev]'), 'click', () => show(index - 1)),
    on($('[data-fancybox-next]'), 'click', () => show(index + 1)),
    on($('[data-fancybox-zoom]'), 'click', () => {
      zoomed = !zoomed;
      panX = panY = 0;
      fit();
    }),
    on(playBtn, 'click', toggleSlideshow),
    on($('[data-fancybox-thumbs]'), 'click', toggleThumbs),
    on(window, 'resize', fit),
    on(document, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
      else if (e.key === 'Tab') {
        // keep focus inside the dialog
        const focusables = Array.from(root.querySelectorAll<HTMLElement>('button, a[href]'));
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }),
  );

  // Click on the backdrop closes, click on the image zooms (fancybox defaults).
  let downX = 0;
  let downY = 0;
  let pointerDown = false;
  let startPanX = 0;
  let startPanY = 0;
  cleanups.push(
    on(slide, 'pointerdown', (e: PointerEvent) => {
      pointerDown = true;
      downX = e.clientX;
      downY = e.clientY;
      startPanX = panX;
      startPanY = panY;
    }),
    on(slide, 'pointermove', (e: PointerEvent) => {
      if (!pointerDown || !zoomed) return;
      panX = startPanX + (e.clientX - downX);
      panY = startPanY + (e.clientY - downY);
      fit();
    }),
    on(slide, 'pointerup', (e: PointerEvent) => {
      if (!pointerDown) return;
      pointerDown = false;
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      const moved = Math.abs(dx) > 10 || Math.abs(dy) > 10;
      if (zoomed) {
        if (!moved && content.contains(e.target as Node)) {
          zoomed = false;
          fit();
        }
        return;
      }
      if (moved) {
        // touch swipes are handled by onSwipe below
        if (e.pointerType === 'mouse' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(dx < 0 ? index + 1 : index - 1);
        return;
      }
      // on touch devices a tap closes the lightbox, like on the original
      if (e.pointerType === 'touch') close();
      else if (content.contains(e.target as Node)) {
        if (root.classList.contains('fancybox-is-zoomable')) {
          zoomed = true;
          fit();
        }
      } else close();
    }),
    on(image, 'dragstart', (e: DragEvent) => e.preventDefault()),
    onSwipe(root, (dx, dy, touch) => {
      if (touch && !zoomed && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(dx < 0 ? index + 1 : index - 1);
    }),
  );

  document.body.appendChild(root);
  show(start);
  requestAnimationFrame(() => root.classList.add('fancybox-is-open'));
  root.focus({ preventScroll: true });
  return () => {
    if (root.isConnected) destroy();
  };
}
