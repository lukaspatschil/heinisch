// Browser entry point, bundled to public/js/site.js by `npm run build:js` and loaded
// as a module script on every page (pages/_document.tsx). Re-implements the
// interactive parts of the original WordPress theme (jQuery, slick, Masonry,
// fancybox, plugin scripts) on top of the static markup.
import { initAppearAnimations } from './animations.js';
import { initContactForm } from './contact-form.js';
import { initInstagram } from './instagram.js';
import { initLazyImages } from './lazy-images.js';
import { initLightbox } from './lightbox.js';
import { initMasonry } from './masonry.js';
import { initMobileMenu } from './mobile-menu.js';
import { initScrollTop } from './scroll-top.js';
import { initSlider } from './slider.js';
import { initTabs } from './tabs.js';
import { initWhatsapp } from './whatsapp.js';

initLazyImages();
initAppearAnimations();
initMobileMenu();
initScrollTop();
initSlider();
initTabs();
initMasonry();
initLightbox();
initWhatsapp();
initInstagram();
initContactForm();
