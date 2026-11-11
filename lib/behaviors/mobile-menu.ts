import { combine, onActivate, on, type Cleanup } from './dom.js';

const OPEN = 'flex-element-type-menu-mobile-popup--open';
const BODY_OPEN = 'flex-element-type-menu-mobile-popup-open';

/** Mobile navigation popup (original: flo-flex-builder menu element). */
export function initMobileMenu(): Cleanup {
  const cleanups: Cleanup[] = [];
  document.querySelectorAll<HTMLElement>('[data-hs-menu-trigger]').forEach((trigger) => {
    const id = trigger.dataset.elementId;
    const popup = document.querySelector<HTMLElement>(
      `[data-hs-menu-popup][data-element-id="${id}"]`,
    );
    if (!popup) return;
    // open popup is modal: the page behind it leaves the tab order (UX3-06)
    const background = () =>
      Array.from(popup.parentElement?.children ?? []).filter((el): el is HTMLElement => el !== popup) as HTMLElement[];
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', 'Menü');
    // closed popup: keep its links out of the tab order
    const close = () => {
      popup.classList.remove(OPEN);
      document.body.classList.remove(BODY_OPEN);
      trigger.setAttribute('aria-expanded', 'false');
      popup.inert = true;
      background().forEach((el) => (el.inert = false));
    };
    const open = () => {
      background().forEach((el) => (el.inert = true));
      popup.inert = false;
      popup.classList.add(OPEN);
      document.body.classList.add(BODY_OPEN);
      trigger.setAttribute('aria-expanded', 'true');
      popup.querySelector<HTMLElement>('[data-hs-menu-close]')?.focus();
    };
    popup.inert = true;
    trigger.setAttribute('aria-expanded', 'false');
    cleanups.push(onActivate(trigger, open));
    popup.querySelectorAll<HTMLElement>('[data-hs-menu-close]').forEach((btn) => {
      cleanups.push(
        onActivate(btn, () => {
          close();
          trigger.focus();
        }),
      );
    });
    cleanups.push(
      on(document, 'keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape' && popup.classList.contains(OPEN)) {
          close();
          trigger.focus();
        }
      }),
    );
    cleanups.push(close);
  });
  return combine(cleanups);
}
