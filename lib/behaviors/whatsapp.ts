import { combine, on, onActivate, type Cleanup } from './dom.js';

const GDPR_KEY = 'nta-wa-gdpr';

function gdprAccepted() {
  return document.cookie.split('; ').some((c) => c === `${GDPR_KEY}=accept`);
}

/** WhatsApp chat button and popup (original: "WhatsApp for WordPress" plugin). */
export function initWhatsapp(): Cleanup {
  const root = document.querySelector<HTMLElement>('[data-hs-whatsapp]');
  if (!root) return () => {};
  const button = root.querySelector<HTMLElement>('.wa__btn_popup');
  const box = root.querySelector<HTMLElement>('.wa__popup_chat_box');
  if (!button || !box) return () => {};
  const cleanups: Cleanup[] = [];
  let launchTimer = 0;
  let closeTimer = 0;

  button.setAttribute('role', 'button');
  button.setAttribute('tabindex', '0');
  button.setAttribute('aria-expanded', 'false');

  const toggle = () => {
    if (box.classList.contains('wa__active')) {
      box.classList.remove('wa__active');
      button.classList.remove('wa__active');
      button.setAttribute('aria-expanded', 'false');
      window.clearTimeout(launchTimer);
      if (box.classList.contains('wa__lauch')) {
        closeTimer = window.setTimeout(() => {
          box.classList.remove('wa__pending', 'wa__lauch');
        }, 400);
      }
    } else {
      box.querySelectorAll<HTMLElement>('[data-hs-style]').forEach((el) => {
        el.setAttribute('style', el.dataset.hsStyle || '');
        el.removeAttribute('data-hs-style');
      });
      box.classList.add('wa__pending', 'wa__active');
      button.classList.add('wa__active');
      button.setAttribute('aria-expanded', 'true');
      window.clearTimeout(closeTimer);
      if (!box.classList.contains('wa__lauch')) {
        launchTimer = window.setTimeout(() => box.classList.add('wa__lauch'), 100);
      }
    }
  };
  cleanups.push(onActivate(button, toggle));
  // Escape closes the open chat and returns focus to the button (UX2-09)
  cleanups.push(
    on(document, 'keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !box.classList.contains('wa__active')) return;
      toggle();
      button.focus();
    }),
  );

  // Improved design: the text bubble next to the button hides once the visitor
  // scrolls, so it no longer covers content (UX-12).
  if (root.hasAttribute('data-hs-compact')) {
    const compact = () => {
      if (window.scrollY > 120) root.classList.add('hs-wa-compact');
    };
    compact();
    cleanups.push(on(window, 'scroll', compact, { passive: true }));
  }

  // GDPR checkbox: the chat link is enabled once the privacy notice is accepted.
  const gdpr = root.querySelector<HTMLElement>('.nta-wa-gdpr');
  const enableLinks = () =>
    root.querySelectorAll('.wa__popup_content_item').forEach((el) => el.classList.remove('pointer-disable'));
  if (gdpr) {
    if (gdprAccepted()) {
      gdpr.style.display = 'none';
      enableLinks();
    } else {
      const input = gdpr.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (input) {
        cleanups.push(
          on(input, 'change', () => {
            if (!input.checked) return;
            document.cookie = `${GDPR_KEY}=accept; max-age=${30 * 24 * 3600}; path=/; SameSite=Lax`;
            gdpr.style.opacity = '0';
            window.setTimeout(() => {
              gdpr.style.display = 'none';
            }, 400);
            enableLinks();
          }),
        );
      }
    }
  }

  return () => {
    combine(cleanups)();
    window.clearTimeout(launchTimer);
    window.clearTimeout(closeTimer);
  };
}
