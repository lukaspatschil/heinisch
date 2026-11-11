// Design improvements on top of the 1:1 import (see reviews/TRACKER.md for the
// review findings each step resolves). Skipped with `npm run import -- --original`.

import * as cheerio from 'cheerio';

// Accessible text colours derived from the brand palette (WCAG AA on white / #fcfafa / #f2efeb).
export const COLORS = {
  rose: '#8e5f63', // 5.3:1 on white – replaces the pastel rosé text #dccaca / #d1a5a5
  muted: '#6b6862', // 5.3:1 – replaces the light greys #9fa6a6 / #a5a5a5 / #d7d7d7 / #c4c4c4
  body: '#4f4d49', // 8.5:1 – theme body text colour
};

const ROSE_SOURCES = ['#dccaca', '#d1a5a5', '#ede2df', 'rgb\\(\\s*220,\\s*202,\\s*202\\s*\\)', 'rgb\\(\\s*209,\\s*165,\\s*165\\s*\\)'];
const MUTED_SOURCES = ['#9fa6a6', '#a5a5a5', '#d7d7d7', '#c4c4c4'];
const OVERLINE_VARS = 'var\\(--scheme_[12]--overline--(?:default|accent)\\)';

/** Remap low-contrast TEXT colours (only `color`, never backgrounds/borders). UI-01/02/04/13/14, UX-06. */
export function improveCss(css) {
  const color = (sources, to) => {
    const re = new RegExp(`(^|[;{\\s"'])(color|--title-color|--socials-text-color|--textHoverColor|--activeTextColor)(\\s*:\\s*)(?:${sources.join('|')})(?![\\w-])`, 'gi');
    css = css.replace(re, `$1$2$3${to}`);
  };
  color(ROSE_SOURCES, COLORS.rose);
  color(MUTED_SOURCES, COLORS.muted);
  // the second scheme's navy text next to the warm greys (UI3-11, UI4-03)
  color(['#324b58', '#121c22', 'var\\(--scheme_2--text--(?:default|accent)\\)', 'var\\(--scheme_2--button--text--(?:default|hover)\\)'], COLORS.body);
  color([OVERLINE_VARS], COLORS.muted);
  // icon colour of the footer social links
  css = css.replace(/--socials-icon-color\s*:\s*#dccaca/gi, `--socials-icon-color: ${COLORS.rose}`);
  // Tablets (768–1199px, also iPads in landscape: UI2-01) get the mobile layout instead of a shrunken desktop (UI-05):
  // move the theme's 767/768px (47.99875/48em) breakpoints to 1199/1200px.
  return css
    .replace(/max-width:\s*76[78]px/g, 'max-width: 1199px')
    .replace(/min-width:\s*768px/g, 'min-width: 1200px')
    .replace(/max-width:\s*47\.99875em/g, 'max-width: 74.99875em')
    .replace(/min-width:\s*48em/g, 'min-width: 75em');
}

/** Normalise tel:/mailto: links (UX-18). */
function fixContactLinks($) {
  $('a[href^="tel:"]').each((_, a) => {
    const digits = $(a).attr('href').replace(/[^\d+]/g, '');
    $(a).attr('href', 'tel:' + (digits.startsWith('0') ? '+43' + digits.slice(1) : digits));
  });
  $('a[href^="mailto:"]').each((_, a) => $(a).attr('href', $(a).attr('href').replace(/^mailto:\s*/, 'mailto:')));
  // one way of writing the number (UX4-08)
  $('a[href^="tel:"]').each((_, a) => {
    const text = $(a).text();
    if (/0677\s*\/?\s*6434\s*5461/.test(text.replace(/\s+/g, ''))) $(a).text(text.replace(/0677[\s\/\d]+/, PHONE.label));
  });
}

// Pages whose designed page title is not the original h1 (UX2-07)
const H1_TEXT = { '/portfolio/': /^Meine Fotografie$/, '/ueber-mich/': /^(Über mich|Hallo, ich bin Daniela)$/ };

/**
 * Exactly one h1 for each device layout (UX-09, UX2-07). Desktop and mobile
 * templates are both in the DOM, one hidden by CSS, so each needs its own h1.
 * Headings above the h1 (taglines like "About me") lose their heading role.
 */
function fixHeadings($, path) {
  const rename = (el, tag) => {
    el.tagName = tag;
    el.name = tag;
  };
  const text = (el) => $(el).text().replace(/\s+/g, ' ').trim();
  // empty headings carry no meaning for screen readers
  $('main h1, main h2, main h3, main h4, main h5, main h6').each((_, el) => {
    if (!text(el)) rename(el, 'div');
  });
  const heads = $('main h1, main h2, main h3, main h4, main h5, main h6').toArray();
  const device = (el) => $(el).closest('[data-only-device]').attr('data-only-device') || '';
  for (const d of ['desktop', 'mobile']) {
    const visible = heads.filter((el) => ['', d].includes(device(el)));
    const want = H1_TEXT[path];
    const h1 = (want && visible.find((el) => want.test(text(el)))) || visible.find((el) => el.name === 'h1') || visible[0];
    if (!h1) continue;
    visible.forEach((el) => el !== h1 && el.name === 'h1' && rename(el, 'h2'));
    rename(h1, 'h1');
    const at = visible.indexOf(h1);
    visible.slice(0, at).forEach((el) => $(el).attr('role', 'none'));
    // no skipped levels after the h1 (UX3-05): the levels used become h2, h3, …
    const after = visible.slice(at + 1);
    const levels = [...new Set(after.map((el) => Number(el.name[1])))].sort();
    let prev = 1;
    after.forEach((el) => {
      // compressed level, and never more than one level below the previous heading
      const level = Math.min(2 + levels.indexOf(Number(el.name[1])), prev + 1);
      rename(el, `h${level}`);
      prev = level;
    });
  }
}

// Alt texts (UX2-08): portraits of Daniela by file name, other photos by shooting type.
const PORTRAIT_ALTS = {
  'ME-28-von-53': 'Daniela Heinisch mit Kamera im Abendlicht',
  'Portrait-29': 'Daniela Heinisch sitzt lachend mit ihrer Kamera auf dem Boden',
  'Portrait-19': 'Daniela Heinisch mit Kamera, Schwarzweiß-Porträt',
  'Portrait-12': 'Daniela Heinisch mit ihrer Kamera',
};
const SHOOTING_ALTS = [
  [/babybauch/i, 'Babybauchshooting'],
  [/newborn/i, 'Neugeborenenshooting'],
  [/still|mummy/i, 'Mummy-and-me-Shooting'],
  [/afterwedding|hochzeit/i, 'After-Wedding-Shooting'],
  [/paar|danielstephie/i, 'Paarshooting'],
  [/familien|regen/i, 'Familienshooting'],
];

function improveAlts($) {
  $('main img').each((_, img) => {
    const a = img.attribs;
    const file = (a['data-src'] || a.src || '').split('/').pop().replace(/-scaled|-\d+x\d+|\.\w+$/g, '');
    const alt = (a.alt || '').trim();
    if (!/^$|^[^\s]+_[^\s]+$/.test(alt) || file.startsWith('data:') || /_nlow$/.test(file)) return;
    const portrait = PORTRAIT_ALTS[file];
    const shooting = SHOOTING_ALTS.find(([re]) => re.test(file))?.[1];
    if (portrait || shooting) $(img).attr('alt', portrait || `${shooting} von Daniela Heinisch Photography`);
  });
}

/**
 * FAQ (UI4-04, UI5-05): the note below the answers was placed for the longest
 * answer and left up to 190px of empty space under short ones. It now follows
 * each answer directly.
 */
function attachFaqHint($) {
  const hint = $('main .flex-block__element--text').filter((_, el) => /weitere Fragen/.test($(el).text()));
  if (hint.length !== 1) throw new Error('attachFaqHint: hint not found');
  const html = hint.find('.flex-block__text-content').html().trim();
  $('main .flex-element-type-tabs2__slide-text').each((_, el) => $(el).after(`<div class="hs-faq-hint">${html}</div>`));
  hint.remove();
}

/** FAQ: the title "Häufige Fragen" is set as two separate words (UX2-07). */
function joinFaqTitle($) {
  $('main h1, main h2, main h3').each((_, el) => {
    const node = $(el);
    if (node.text().trim() !== 'Häufige') return;
    node.append('<span class="hs-sr-only"> Fragen</span>');
    const block = node.closest('.flex-block');
    const device = node.closest('[data-only-device]').attr('data-only-device');
    block
      .find('h1, h2, h3')
      .filter((_, h) => $(h).text().trim() === 'Fragen' && $(h).closest('[data-only-device]').attr('data-only-device') === device)
      .each((_, h) => {
        h.tagName = h.name = 'div';
        $(h).attr('aria-hidden', 'true');
      });
  });
  // the questions follow the page title directly
  $('main h4.flex-element-type-tabs2__slide-title, main .flex-element-type-tabs2__slide-title h4').each((_, h) => {
    h.tagName = h.name = 'h2';
  });
  // the answers were h5 headings
  $('main h5.flex-element-type-tabs2__slide-text').each((_, h) => {
    h.tagName = h.name = 'div';
  });
}

function addSkipLink($) {
  $('#primary').attr('id', 'primary').attr('tabindex', '-1');
  $('#page').prepend('<a class="hs-skip-link" href="#primary">Zum Inhalt springen</a>');
}

function markCurrentPage($, pagePath) {
  if (!pagePath) return;
  // galleries belong to the "Galerie" menu item (/portfolio/) (UX3-11)
  const menuPath = pagePath.startsWith('/gallery/') ? '/portfolio/' : pagePath;
  $(`a.flex-element-type-menu__menu-item-link[href="${menuPath}"], a.flex-element-type-menu-mobile-popup__menu-item-link[href="${menuPath}"]`).attr(
    'aria-current',
    menuPath === pagePath ? 'page' : 'true',
  );
}

/** Body text with cramped line height (UI-11): at least 1.55 for text up to 1em. */
function relaxLineHeights($) {
  $('.flex-block__element--text[style*="--line-height"]').each((_, el) => {
    const style = $(el).attr('style');
    const size = parseFloat((style.match(/--font-size:\s*([\d.]+)em/) || [])[1] || '1');
    const lh = parseFloat((style.match(/--line-height:\s*([\d.]+)em/) || [])[1] || '0');
    if (size <= 1 && lh && lh < 1.3) $(el).attr('style', style.replace(/--line-height:\s*[\d.]+em/, '--line-height: 1.55em'));
    // two-line titles whose lines touched (UI3-06)
    else if (size > 1 && size <= 1.5 && lh && lh < 1.25) $(el).attr('style', style.replace(/--line-height:\s*[\d.]+em/, '--line-height: 1.3em'));
  });
}

/** Fonts that the original requests but never loads (rendered as Times): UI-12. */
function replaceMissingFonts($) {
  $('[style*="Tangerine"]').each((_, el) => {
    $(el).addClass('hs-quote').attr('style', $(el).attr('style').replace(/Tangerine/g, 'Isabel-Light-Italic'));
  });
  $('[style*="Mukta Malar"]').each((_, el) => {
    $(el).addClass('hs-body-text').attr('style', $(el).attr('style').replace(/Mukta Malar/g, 'Open Sans'));
  });
}

export function improvePage($, { path }) {
  $('[style]').each((_, el) => {
    const s = $(el).attr('style');
    const next = improveCss(s);
    if (next !== s) $(el).attr('style', next);
  });
  $('style').each((_, el) => {
    $(el).text(improveCss($(el).html() || ''));
  });
  // mobile menu icon (UI-19)
  $('.flex-element-type-menu__trigger').css('--color', COLORS.body);
  fixContactLinks($);
  // navigation landmarks (UX4-02)
  $('header .flex-element-type-menu')
    .filter((_, el) => $(el).find('a').length > 0)
    .each((i, el) => $(el).attr('role', 'navigation').attr('aria-label', i ? 'Hauptmenü rechts' : 'Hauptmenü links'));
  $('footer .flex-element-type-menu').first().attr('role', 'navigation').attr('aria-label', 'Rechtliches');
  $('.fgt-copyright__scroll-to-top-label').text('Nach oben');
  // builder image sizes still assumed the 767px breakpoint (UI3-07)
  $('img[sizes*="max-width: 767px"]').each((_, img) => {
    $(img).attr('sizes', $(img).attr('sizes').replace('max-width: 767px', 'max-width: 1199px'));
  });
  // "Die Person hinter der Kamera" was 8px on phones (UI3-08)
  $('main h2, main h3')
    .filter((_, el) => $(el).text().trim() === 'Die Person hinter der Kamera')
    .closest('.flex-block__element')
    .addClass('hs-kicker-min');
  // Instagram alts were whole post texts with hashtags (UX3-08): first sentence only
  $('#sb_instagram img[alt]').each((_, img) => {
    const alt = $(img).attr('alt').replace(/#\S+/g, '').replace(/\s+/g, ' ').trim();
    const first = alt.split(/(?<=[.!?])\s/)[0];
    $(img).attr('alt', first.length > 125 ? first.slice(0, 125).replace(/\s+\S*$/, '') + ' …' : first);
  });
  relaxLineHeights($);
  replaceMissingFonts($);
  improveContent($, path);
  if (path === '/haeufige-fragen/') joinFaqTitle($);
  if (path === '/haeufige-fragen/') attachFaqHint($);
  fixHeadings($, path);
  addSkipLink($);
  markCurrentPage($, path);
}

// ---------------------------------------------------------------- content additions

export const GALLERIES = [
  ['/gallery/babybauch/', 'Babybauch'],
  ['/gallery/newborn/', 'Newborn'],
  ['/gallery/baby-kleinkind-mummy-and-me/', 'Baby, Kleinkind & Mummy and Me'],
  ['/gallery/familien/', 'Familien'],
  ['/gallery/paare/', 'Paare'],
  ['/gallery/portrait/', 'Portrait'],
  ['/gallery/hochzeitsfotografie/', 'Hochzeit'],
];
const NO_CTA = ['/kontakt-2/', '/danke-seite/', '/impressum/', '/datenschutzerklaerung/'];
const PHONE = { href: 'tel:+4367764345461', label: '0677 / 643 454 61' };
const MAIL = 'photography@danielaheinisch.at';
const WHATSAPP = 'https://api.whatsapp.com/send?phone=4367764345461';
const INSTAGRAM = 'https://www.instagram.com/danielaheinischphotography/';

/** Call to action at the end of content pages (UX-16). */
export function ctaSection() {
  return `<section class="hs-cta" aria-labelledby="hs-cta-title">
  <h2 id="hs-cta-title" class="hs-cta__title">Lust auf euer eigenes Shooting?</h2>
  <p class="hs-cta__text">Erzählt mir von euch und euren Wünschen – ich freue mich auf eure Nachricht.</p>
  <div class="hs-cta__actions">
    <a class="hs-btn hs-btn--primary" href="/kontakt-2/">Jetzt anfragen</a>
    <a class="hs-btn hs-btn--secondary" href="${WHATSAPP}" target="_blank" rel="noopener">Per WhatsApp schreiben</a>
  </div>
  <p class="hs-cta__contact"><a href="${PHONE.href}">${PHONE.label}</a><span class="hs-cta__sep" aria-hidden="true"> · </span><a href="mailto:${MAIL}">${MAIL}</a></p>
</section>`;
}

/** Links between the galleries (UX-22). */
function galleryNav(current) {
  const links = GALLERIES.map(
    ([href, label]) => `<li><a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a></li>`,
  ).join('');
  return `<nav class="hs-gallery-nav" aria-label="Galerien"><a class="hs-gallery-nav__all" href="/portfolio/">← Alle Galerien</a><ul>${links}</ul></nav>`;
}

function improveGallery($, path) {
  const entry = GALLERIES.find(([href]) => href === path);
  const grid = $('.flo-gallery-grid-wrapper').first();
  if (!entry || !grid.length) return;
  // descriptive, non-repetitive alt texts (UX-11)
  const items = $('a.flo-gallery-grid__image');
  items.each((_, a) => {
    const i = Number($(a).attr('data-hs-index'));
    $(a).find('img').attr('alt', `${entry[1]}: Foto ${i + 1} von ${items.length}`);
    $(a).attr('aria-label', `${entry[1]}: Foto ${i + 1} von ${items.length} vergrößern`);
  });
  grid.prepend(galleryNav(path));
  // three columns from 600px on (see improvements.css)
  grid.find('img[sizes]').attr('sizes', '(min-width: 600px) 33vw, 100vw');
  // up to 97 photo links: let keyboard users jump past them (UX3-07)
  grid.find('.flo-gallery-grid').before('<a class="hs-skip-link hs-skip-link--gallery" href="#hs-gallery-end">Galerie überspringen</a>');
  grid.append(galleryNav(path).replace('<nav ', '<nav id="hs-gallery-end" tabindex="-1" ').replace('aria-label="Galerien"', 'aria-label="Galerien (Seitenende)"'));
}

/** Contact form: privacy note, German messages flag, accessible errors (UX-03/04/05/08). */
function improveForm($) {
  const form = $('form[data-hs-form]');
  if (!form.length) return;
  form.attr('data-hs-improved', '');
  form
    .find('.form-group-submit, section.form-group-submit')
    .first()
    .before(
      '<p class="hs-form-note">Mit dem Absenden stimmst du der Verarbeitung deiner Angaben zur Bearbeitung deiner Anfrage zu. Mehr dazu in der <a href="/datenschutzerklaerung/">Datenschutzerklärung</a>.</p>',
    );
  const auto = { 'dein-vorname': 'given-name', 'dein-nachname': 'family-name', 'deine-e-mail-adresse': 'email', 'deine-telefonnummer': 'tel' };
  for (const [id, value] of Object.entries(auto)) form.find(`#${id}`).attr('autocomplete', value);
  form.find('#deine-telefonnummer').attr('inputmode', 'tel');
  // the long placeholder was cut off on phones (UI-07)
  // a visible label instead of the question as placeholder only (UX5-06)
  const select = form.find('select');
  select.closest('.form-group').find('label').first().attr('for', select.attr('id')).text('Wie hast du von mir erfahren?');
  select.find('option[value=""]').first().text('Bitte auswählen');
  // the radio question labels a group, not a single control (UX3-03)
  form.find('.radio-list').each((i, list) => {
    const label = $(list).closest('.form-group').find('label').first();
    const id = `hs-radio-label-${i}`;
    label.attr('id', id).removeAttr('for');
    $(list).attr('role', 'radiogroup').attr('aria-labelledby', id).attr('aria-required', 'true');
  });
  form.find('.form-group.required').find('input:not([type=radio]), textarea').attr('aria-required', 'true');
}

function improveWhatsapp($) {
  $('#wa').attr('data-hs-compact', '');
  $('.wa__btn_popup_txt, .wa__popup_title').each((_, el) => $(el).html($(el).html().replace(/Whatsapp/g, 'WhatsApp')));
  // the bubble text is hidden on phones, so the button names itself (label = visible text)
  $('.wa__btn_popup').attr('aria-label', $('.wa__btn_popup_txt').first().text().replace(/\s+/g, ' ').trim() || 'WhatsApp-Chat öffnen');
  $('.nta-wa-gdpr label span span').html(
    'Bitte stimme zuerst der <a href="/datenschutzerklaerung/">Datenschutzerklärung</a> zu, um den WhatsApp-Chat zu starten.',
  );
}

function linkFaqContact($) {
  $('main p, main span').each((_, el) => {
    const node = $(el);
    if (node.children().length || !/jederzeit kontaktieren\./.test(node.text())) return;
    node.html(node.html().replace('kontaktieren', '<a class="hs-inline-link" href="/kontakt-2/">kontaktieren</a>'));
  });
}

/** Desktop values (em) of a builder element, read from its first CSS rule. */
function builderVars($) {
  const css = $('style').toArray().map((el) => $(el).html()).join('\n');
  return (el) => {
    const id = ($(el).attr('class').match(/element_id_\w+/) || [])[0];
    const rule = css.match(new RegExp(`${id}[^{]*\\{([^}]*)\\}`));
    if (!rule) return null;
    return Object.fromEntries([...rule[1].matchAll(/--(el-width|el-height|position-top|position-left):\s*([\d.]+)em/g)].map((m) => [m[1], Number(m[2])]));
  };
}

/** Desktop-only overrides of builder element variables, e.g. { 'position-top': 29.1 }. */
function desktopOverrides($, list) {
  const rules = list
    .map(([el, vars]) => {
      const id = ($(el).attr('class').match(/element_id_\w+/) || [])[0];
      const decl = Object.entries(vars).map(([k, v]) => `--${k}: ${v}em !important;`).join(' ');
      return `.flex-block__element--${id}.flex-block__element--${id} { ${decl} }`;
    })
    .join('\n');
  $('main').first().append(`<style>@media (min-width: 1200px) {\n${rules}\n}</style>`);
}

/**
 * Ablauf (UX3-05): the three steps stand side by side, but their number, title
 * and text elements were in the DOM right to left (03, 02, 01). Screen readers
 * get them column by column, left to right. Builder elements carry their own
 * z-index, so the DOM order does not change the look.
 */
function orderSteps($) {
  const css = $('style').toArray().map((el) => $(el).html()).join('\n');
  const pos = (el) => {
    const id = ($(el).attr('class').match(/element_id_\w+/) || [])[0];
    const m = css.match(new RegExp(`${id}[^{]*\\{[^}]*?--position-top:\\s*([\\d.]+)em;[^}]*?--position-left:\\s*([\\d.]+)em`));
    return m ? { top: Number(m[1]), left: Number(m[2]) } : null;
  };
  const container = $('main .flex-block__main-container').first();
  const steps = container
    .children('.flex-block__element--text')
    .toArray()
    .filter((el) => !$(el).attr('data-only-device') && /^(0[123]|Eure Bilder|Der große Tag|Das Kennenlernen|Nach|Wir treffen|Nachdem)/.test($(el).text().trim()));
  if (steps.length !== 9 || steps.some((el) => !pos(el))) throw new Error('orderSteps: unexpected /ablauf/ structure');
  // columns: elements whose left edge is within 8em of the column's first element
  const byLeft = [...steps].sort((a, b) => pos(a).left - pos(b).left);
  const columns = [];
  for (const el of byLeft) {
    const col = columns.find((c) => Math.abs(pos(c[0]).left - pos(el).left) < 8);
    if (col) col.push(el);
    else columns.push([el]);
  }
  const sorted = columns.flatMap((c) => c.sort((a, b) => pos(a).top - pos(b).top));
  // numbers, titles and texts of the three columns on one line each (UI5-07)
  const rows = columns[0].map((_, k) => columns.map((c) => c[k]).filter(Boolean));
  desktopOverrides(
    $,
    rows.flatMap((row) => {
      const top = Math.min(...row.map((el) => pos(el).top));
      return row.map((el) => [el, { 'position-top': top }]);
    }),
  );
  const anchorEl = $('<span></span>');
  $(steps[0]).before(anchorEl);
  sorted.forEach((el) => anchorEl.before(el));
  anchorEl.remove();
}

/**
 * Privacy policy (UI2-07, UI2-08): the whole text was one h3 with <br> lines.
 * Blocks (separated by an empty line) become paragraphs; a short first line
 * that is upper case or a question becomes a section heading. The consent
 * buttons of the WordPress cookie plugin do nothing on the static site.
 */
function legalText($) {
  $('main .rcb-sc-link').closest('.flo-block-text__text').remove();
  const source = $('main h3.flo-block-text__subtitle')
    .toArray()
    .map((el) => $(el))
    .sort((a, b) => b.text().length - a.text().length)[0];
  if (!source) return;
  const blocks = source.html().split(/<br>\s*(?:&nbsp;|\u00a0)\s*<br>/);
  const html = blocks
    .map((block) => {
      const lines = block.split(/<br>/).map((l) => l.trim()).filter((l) => cheerio.load(l).text().replace(/\u00a0/g, ' ').trim());
      if (!lines.length) return '';
      const first = cheerio.load(lines[0]).text().trim();
      const heading = first.length < 110 && (!/[a-zäöüß]/.test(first) || /\?$/.test(first) || (lines.length > 1 && /^[a-f]\. /.test(first)));
      const level = /^[a-f]\. /.test(first) ? 'h3' : 'h2';
      if (heading && lines.length === 1) return `<${level}>${first}</${level}>`;
      if (heading) return `<${level}>${first}</${level}>\n<p>${lines.slice(1).join('<br>')}</p>`;
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('\n');
  source.replaceWith(`<div class="hs-legal-body">${html}</div>`);
}

/**
 * Portfolio (UI-21, UI2-03, UI2-04): the absolute-positioned teaser collage
 * becomes a regular grid of cards. Each genre keeps its photo, caption,
 * tagline and text; they are grouped by the gallery their caption links to.
 */
// after the hero has loaded (lib/behaviors/lazy-images.ts), like the importer's deferred images
const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function portfolioGrid($) {
  const shared = $('main .flex-block__element').filter((_, el) => !$(el).attr('data-only-device')).toArray();
  const hero = $('main .flex-block__element--image img').first();
  const imgAttrs = (img) => ({ src: img.attr('data-src') || img.attr('src'), srcset: img.attr('data-srcset') || img.attr('srcset') || '' });
  const cards = [];
  let texts = [];
  let image = null;
  const genres = [
    [/^babybauch fotografie$/i, '/gallery/babybauch/'],
    [/^neugeborenen fotografie$/i, '/gallery/newborn/'],
    [/^familien fotografie$/i, '/gallery/familien/'],
    [/^baby\/kleinkind fotografie/i, '/gallery/baby-kleinkind-mummy-and-me/'],
    [/^paar fotografie$/i, '/gallery/paare/'],
    [/^portrait fotografie$/i, '/gallery/portrait/'],
    [/^hochzeitsfotografie$/i, '/gallery/hochzeitsfotografie/'],
  ];
  for (const el of shared) {
    const node = $(el);
    if (node.is('.flex-block__element--image')) {
      // the genre photo is the linked one (Mummy and me has a second, unlinked photo)
      if (node.is('a') || node.find('a').length || !image) image = imgAttrs(node.find('img'));
      continue;
    }
    if (!node.is('.flex-block__element--text')) continue;
    const text = node.text().replace(/\s+/g, ' ').trim();
    const genre = genres.find(([re]) => re.test(text));
    if (!text) continue;
    if (!genre) {
      texts.push(text);
      continue;
    }
    // caption: closes the current genre
    const [tagline, description] = [...texts].sort((x, y) => x.length - y.length);
    const title = node.find('.flex-block__text-content').html().replace(/<br\s*\/?>|<\/p>\s*<p[^>]*>/gi, ' · ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/([a-zäöüß])([A-ZÄÖÜ])/g, '$1 · $2').trim();
    cards.push({ href: genre[1], title, tagline, description, image });
    texts = [];
    image = null;
  }
  const sizes = '(min-width: 1200px) 526px, (min-width: 768px) calc(50vw - 48px), calc(100vw - 40px)';
  const heroImg = imgAttrs(hero);
  const cardHtml = cards
    .map(
      (c) => `<li class="hs-genre">
  <a class="hs-genre__media" href="${c.href}" tabindex="-1" aria-hidden="true"><img src="${PLACEHOLDER}" data-src="${c.image.src}"${c.image.srcset ? ` data-srcset="${c.image.srcset}" sizes="${sizes}"` : ''} data-hs-lazy alt="${c.title}: Beispielfoto" decoding="async"></a>
  <h2 class="hs-genre__title"><a href="${c.href}">${c.title}</a></h2>
  <p class="hs-genre__tagline">${c.tagline}</p>
  <p class="hs-genre__text">${c.description}</p>
  <a class="hs-genre__more" href="${c.href}">Galerie ansehen</a>
</li>`,
    )
    .join('\n');
  $('#primary').html(`<article class="hs-portfolio">
<h1 class="hs-simple__title">Meine Fotografie</h1>
<img class="hs-portfolio__hero" src="${heroImg.src}"${heroImg.srcset ? ` srcset="${heroImg.srcset}" sizes="(min-width: 1200px) 1052px, calc(100vw - 48px)"` : ''} alt="Babybauchshooting von Daniela Heinisch Photography" loading="eager" fetchpriority="high" decoding="async">
<ul class="hs-genres">${cardHtml}</ul>
</article>`);
}

// Small text fixes (UI2-12): an English page title on a German site, Swiss "ss"
const TEXT_FIXES = { 'About me': 'Über mich', 'Der grosse Tag': 'Der große Tag' };

export function improveContent($, path) {
  $('main *')
    .filter((_, el) => $(el).children().length === 0 && TEXT_FIXES[$(el).text().trim()])
    .each((_, el) => $(el).text(TEXT_FIXES[$(el).text().trim()]));
  if (path === '/portfolio/') portfolioGrid($);
  // title over the hero photo ran into the right screen edge on phones (UI-24, UI2-18)
  $('main .flex-block__element--text')
    .filter((_, el) => $(el).text().trim() === 'Meine Fotografie')
    .addClass('hs-photo-title');
  if (path === '/') {
    // an inquiry button in the first screen (UX2-10)
    $('.flo-slide-content .top-side-wrapper .bottom-side, .flo-slide-content .bottom-description')
      .first()
      .after('<a class="hs-btn hs-btn--primary hs-hero-cta" href="/kontakt-2/">Jetzt anfragen</a>');
  }
  if (path === '/ablauf/') {
    orderSteps($);
    // hairlines placed for the desktop ran off the screen on phones and tablets (UI5-13)
    const vars = builderVars($);
    $('main .flex-block__element')
      .filter((_, el) => Math.min(vars(el)?.['el-height'] ?? 1, vars(el)?.['el-width'] ?? 1) < 0.2)
      .addClass('hs-desktop-line');
  }
  if (path === '/ueber-mich/') {
    // the button sat 7px under the quote (UI5-10)
    $('main a.flex-block__element--button')
      .filter((_, el) => /jetzt anfragen/i.test($(el).text()))
      .addClass('hs-btn-gap');
  }
  if (path === '/liebe-worte/') {
    // the last client photo was larger and 8px further left than the others (UI5-08)
    const vars = builderVars($);
    const photos = $('main .flex-block__element--image').toArray();
    const [ref, last] = [photos[photos.length - 2], photos[photos.length - 1]];
    if (vars(ref) && vars(last)) {
      const r = vars(ref);
      desktopOverrides($, [[last, { 'el-width': r['el-width'], 'el-height': r['el-height'], 'position-left': r['position-left'] }]]);
    }
  }
  if (path === '/danke-seite/') {
    // the thank-you page was a dead end (UX3-13)
    $('footer#colophon').before(`<section class="hs-cta" aria-label="Weiter">
  <div class="hs-cta__actions">
    <a class="hs-btn hs-btn--primary" href="/">Zur Startseite</a>
    <a class="hs-btn hs-btn--secondary" href="${INSTAGRAM}" target="_blank" rel="noopener">Instagram ansehen</a>
  </div>
</section>`);
  }
  if (path === '/haeufige-fragen/') {
    // light title on a bright sky: darken the top of the hero photo (UI2-02)
    const hero = $('main .flex-block').first();
    hero.find('.flex-block__element--image').addClass('hs-dim-top');
    hero
      .find('.flex-block__element--text')
      .filter((_, el) => $(el).text().trim() === 'FAQ')
      .addClass('hs-kicker');
  }
  if (path === '/datenschutzerklaerung/') legalText($);
  if (path === '/impressum/') {
    // the page title was bold text only (UX2-07)
    $('.flo-block-text__text strong')
      .filter((_, el) => $(el).text().trim() === 'Impressum')
      .first()
      .each((_, el) => {
        $(el).next('br').remove();
        $(el).replaceWith('<h1 class="hs-legal-title">Impressum</h1>');
      });
    $('main .flo-block-text__text').first().addClass('hs-legal-body');
    // one phone number site-wide, confirmed by the client (UX2-04)
    $('main .flo-block-text__text').each((_, el) => {
      $(el).html($(el).html().replace(/0660\s*5676671/, `<a class="hs-inline-link" href="${PHONE.href}">${PHONE.label}</a>`));
    });
  }
  if (path === '/kontakt-2/') {
    // the footer button pointed to the page itself (UX2-11)
    $('form[data-hs-form]').closest('.flo-form-block, .flex-block__element').first().attr('id', 'formular');
    $('footer a[href="/kontakt-2/"]').attr('href', '#formular').removeAttr('target').removeAttr('rel');
  }
  // internal links opened new tabs
  $('a[href^="/"][target="_blank"], a[href^="#"][target="_blank"]').removeAttr('target');
  // location links lacked the trailing slash and went through a redirect
  $('.footer-seo a').each((_, a) => {
    const href = $(a).attr('href');
    if (href.startsWith('/') && !href.endsWith('/')) $(a).attr('href', href + '/');
  });
  improveAlts($);
  improveGallery($, path);
  improveForm($);
  improveWhatsapp($);
  linkFaqContact($);
  if (path && !NO_CTA.includes(path)) $('footer#colophon').before(ctaSection());
}

/** Meta description from the page's own first paragraph, for pages without one (SEO). */
const DESCRIPTIONS = {
  '/kontakt-2/': 'Anfrage für euer Fotoshooting bei Daniela Heinisch Photography in Mödling: Babybauch, Neugeborene, Familie, Paar, Portrait und Hochzeit.',
  '/haeufige-fragen/': 'Antworten auf häufige Fragen zum Fotoshooting: Location, Kleidung, Regen, Haustiere und wann ihr eure Bilder bekommt.',
};

export function describePage($, path) {
  if (DESCRIPTIONS[path]) return DESCRIPTIONS[path];
  const gallery = GALLERIES.find(([href]) => href === path);
  if (gallery) return `${gallery[1]}: Galerie mit Fotos von Daniela Heinisch Photography, eurer Fotografin in Mödling.`;
  const text = $('main p, main .flex-block__text-content, main .hs-legal-body p')
    .toArray()
    .filter((el) => !$(el).closest('form, .hs-form-note, .hs-cta, [aria-hidden="true"]').length)
    .map((el) => $(el).text().replace(/\s+/g, ' ').trim())
    .find((t) => t.length >= 80);
  if (!text) return null;
  if (text.length <= 155) return text;
  return text.slice(0, 155).replace(/\s+\S*$/, '') + ' …';
}

// ---------------------------------------------------------------- new pages

/** Replace the main content of a frame page (header/footer of an existing page). */
export function framePage($, path, mainHtml, { cta = true } = {}) {
  $('#primary').html(`<article class="hs-simple">${mainHtml}</article>`);
  $('.hs-cta').remove();
  $('[aria-current="page"]').removeAttr('aria-current');
  markCurrentPage($, path);
  if (cta) $('footer#colophon').before(ctaSection());
}

export function preiseMain() {
  return `<h1 class="hs-simple__title">Preise</h1>
<p class="hs-simple__lead">Preise und Pakete erhaltet ihr auf Anfrage.</p>
<p>Jedes Shooting ist so individuell wie ihr – Babybauch, Neugeborene, Familie, Paar, Portrait oder Hochzeit. Schreibt mir kurz, welches Shooting ihr euch wünscht, und ich schicke euch ein passendes Angebot.</p>
<p>Wie ein Shooting bei mir abläuft, erfahrt ihr unter <a class="hs-inline-link" href="/ablauf/">Ablauf</a>; Antworten auf häufige Fragen findet ihr in den <a class="hs-inline-link" href="/haeufige-fragen/">FAQ</a>.</p>
<div class="hs-simple__actions">
  <a class="hs-btn hs-btn--primary" href="/kontakt-2/">Preise anfragen</a>
  <a class="hs-btn hs-btn--secondary" href="${WHATSAPP}" target="_blank" rel="noopener">Per WhatsApp fragen</a>
</div>`;
}

export function notFoundMain() {
  return `<h1 class="hs-simple__title">Diese Seite gibt es leider nicht</h1>
<p class="hs-simple__lead">Vielleicht hat sich die Adresse geändert. Von hier aus geht es weiter:</p>
<div class="hs-simple__actions">
  <a class="hs-btn hs-btn--primary" href="/">Zur Startseite</a>
  <a class="hs-btn hs-btn--secondary" href="/portfolio/">Galerie</a>
  <a class="hs-btn hs-btn--secondary" href="/kontakt-2/">Kontakt</a>
</div>`;
}

/** Old WordPress leftovers that now redirect (UX-20). */
export const REDIRECTS = {
  '/website-im-aufbau/': '/',
  // one gallery overview: the portfolio page the menu links to (UX3-11)
  '/gallery/': '/portfolio/',
  '/entry_form/kontaktformular/': '/kontakt-2/',
};
