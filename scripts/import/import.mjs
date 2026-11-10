#!/usr/bin/env node
// Importer: converts the live WordPress site https://danielaheinisch.at into
// static content for the Next.js app.
//
//   content/pages/<id>.json   page metadata + body markup
//   content/routes.json       list of all routes
//   styles/site.css           global stylesheet (original cascade order)
//   public/images, public/assets  localised images (WebP), fonts and icons
//
// Usage: npm run import            (re-uses the download cache)
//        npm run import -- --fresh (clears the download cache first)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import { CACHE_DIR, fetchText } from './lib/fetch.mjs';
import { ImageStore, isUploadUrl } from './lib/images.mjs';
import { AssetStore } from './lib/assets.mjs';
import { getSnapshots } from './lib/snapshots.mjs';
import { assignColumns } from '../../lib/masonry-core.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const ORIGIN = 'https://danielaheinisch.at';
const PUBLIC = path.join(ROOT, 'public');
const CONTENT = path.join(ROOT, 'content');

// Every page of the original site (page, gallery and form sitemaps). The menu
// item "Preise" links to /preise/, which is a 404 on the original as well; its
// markup becomes the 404 page of the clone.
const PAGES = [
  '/',
  '/ueber-mich/',
  '/portfolio/',
  '/ablauf/',
  '/liebe-worte/',
  '/haeufige-fragen/',
  '/kontakt-2/',
  '/impressum/',
  '/datenschutzerklaerung/',
  '/danke-seite/',
  '/website-im-aufbau/',
  '/familienfotografin-baden/',
  '/familienfotografin-moedling/',
  '/newborn-shooting-moedling/',
  '/newborn-shooting-baden/',
  '/gallery/',
  '/gallery/portrait/',
  '/gallery/paare/',
  '/gallery/hochzeitsfotografie/',
  '/gallery/babybauch/',
  '/gallery/newborn/',
  '/gallery/baby-kleinkind-mummy-and-me/',
  '/gallery/familien/',
  '/entry_form/kontaktformular/',
];
const NOT_FOUND_SOURCE = '/preise/';

// Masonry reference geometry measured on the original at 1440px viewport.
// The browser re-checks the assignment at runtime for other widths.
const MASONRY_REF = { colWidth: 426, gap: 20 };

if (process.argv.includes('--fresh')) fs.rmSync(CACHE_DIR, { recursive: true, force: true });

const images = new ImageStore(PUBLIC);
const assets = new AssetStore(PUBLIC, images);
const log = (...a) => console.log(...a);

const pageId = (p) => (p === '/' ? 'index' : p.replace(/^\/|\/$/g, '').replace(/\//g, '__'));
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

// ---------------------------------------------------------------- URLs

/** Rewrite an absolute URL of the original site into a root-relative one. */
function localHref(href) {
  if (!href) return href;
  const trimmed = href.trim();
  const m = trimmed.match(/^(?:https?:)?\/\/(?:www\.)?danielaheinisch\.at(\/[^\s]*)?$/i);
  if (!m) return href;
  let rest = m[1] || '/';
  if (isUploadUrl(ORIGIN + rest.split('#')[0])) return images.local(ORIGIN + rest);
  // other static files of the original (plugin/theme assets such as no-image.jpg)
  if (/\.(jpe?g|png|gif|svg|webp|ico|pdf|woff2?|ttf)$/i.test(rest.split(/[?#]/)[0])) return assets.local(ORIGIN + rest);
  const [pathPart, ...hashParts] = rest.split('#');
  let [p, query] = pathPart.split('?');
  if (!p.endsWith('/') && !path.extname(p)) p += '/';
  return p + (query ? '?' + query : '') + (hashParts.length ? '#' + hashParts.join('#') : '');
}

/** Rewrite url(...) references inside an inline style attribute or block. */
function rewriteCssUrls(css, base = ORIGIN + '/') {
  return assets.css(css, base);
}

// ---------------------------------------------------------------- CSS

function cssKey($, el) {
  if (el.tagName === 'link') return 'link:' + $(el).attr('href').split('?')[0].replace(/^https?:/, '');
  return 'style:' + ($(el).attr('id') || $(el).attr('class') || 'anonymous');
}

async function cssText($, el) {
  if (el.tagName === 'link') {
    let href = $(el).attr('href');
    if (href.startsWith('//')) href = 'https:' + href;
    const res = await fetchText(href);
    if (res.status !== 200) throw new Error('stylesheet failed: ' + href);
    return rewriteCssUrls(res.body, href);
  }
  return rewriteCssUrls($(el).html() || '');
}

function headStyleNodes($) {
  return $('head')
    // style-index.css of flo-gutenberg-blocks is loaded via rel="preload" + onload
    .children('link[rel="stylesheet"], link[rel="preload"][as="style"], style')
    .toArray()
    .filter((el) => {
      // Real Cookie Banner helper rule: the banner is not part of the clone.
      if (el.tagName === 'style' && /consent-id/.test($(el).html() || '')) return false;
      return true;
    });
}

// ---------------------------------------------------------------- page transforms

function transformImages($) {
  $('img').each((_, el) => {
    const img = $(el);
    const dataSrc = img.attr('data-src');
    const dataSrcset = img.attr('data-srcset');
    if (dataSrc) {
      img.attr('src', dataSrc);
      img.removeAttr('data-src');
    }
    if (dataSrcset) {
      img.attr('srcset', dataSrcset);
      img.removeAttr('data-srcset');
    }
    const cls = (img.attr('class') || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((c) => (c === 'lazyload' || c === 'lazypreload' ? 'lazyloaded' : c));
    if (cls.length) img.attr('class', cls.join(' '));
    // http:// images of the theme demo server (404 page) never load on the
    // original either (certificate error) and would hang the clone's load event.
    if (/^http:\/\//i.test(img.attr('src') || '')) img.attr('src', PLACEHOLDER).removeAttr('srcset');
    if (img.attr('src')) img.attr('src', localHref(img.attr('src')));
    if (img.attr('srcset')) img.attr('srcset', images.srcset(img.attr('srcset')));
    if (!img.attr('loading')) img.attr('loading', 'lazy');
    img.attr('decoding', 'async');
    img.removeAttr('data-id');
    if (img.is('[data-hs-deferred]')) {
      img.attr('data-src', img.attr('src')).attr('data-srcset', img.attr('srcset') || '');
      img.removeAttr('src').removeAttr('srcset').removeAttr('loading');
    }
    // flo-flex-builder fades images in after loading (inline style + "loaded" on the element)
    if (cls.includes('flex-img-tag')) {
      img.attr('style', 'opacity: 1; filter: blur(0px);');
      img.parent('.flex-block__element').addClass('loaded');
    }
  });
}

function transformAttributes($) {
  // The "light" logo variant is only shown on headers merged into the page
  // (.fgt-page-merge-with-header), which no page uses: it is always opacity 0.
  $('.flex-element-type-logo__image--light').removeAttr('style');
  for (const attr of ['style', 'data-hs-style']) {
    $(`[${attr}]`).each((_, el) => {
      const s = $(el).attr(attr);
      if (/url\(/.test(s)) $(el).attr(attr, rewriteCssUrls(s));
    });
  }
  $('style').each((_, el) => {
    $(el).text(rewriteCssUrls($(el).html() || ''));
  });
  for (const attr of ['href', 'data-thumb', 'data-full-res', 'action', 'src']) {
    $(`[${attr}]`).each((_, el) => {
      if (el.tagName === 'img' && attr === 'src') return;
      $(el).attr(attr, localHref($(el).attr(attr)));
    });
  }
}

const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Like lazysizes on the original: images outside the first screen get their
 * src from lib/behaviors/lazy-images.ts after the first paint.
 */
function deferOffscreenImages($) {
  const firstBlock = $('main .entry-content')
    .children()
    .filter((_, el) => $(el).find('img').length > 0)
    .first();
  // first screen: the first two images of the first block (one on galleries)
  const keep = new Set(
    firstBlock
      .find(firstBlock.find('[data-hs-index]').length ? '[data-hs-index="0"] img' : 'img')
      .slice(0, 2)
      .toArray(),
  );
  // the first of them is the likely LCP element
  if (keep.size) $([...keep][0]).attr('loading', 'eager').attr('fetchpriority', 'high');
  $('img[src]').each((_, el) => {
    const img = $(el);
    if (img.is('[data-hs-deferred]') || img.closest('.flo-slick-slide-container').length || keep.has(el)) return;
    img.attr('data-src', img.attr('src'));
    if (img.attr('srcset')) img.attr('data-srcset', img.attr('srcset'));
    img.attr('src', PLACEHOLDER).removeAttr('srcset').removeAttr('loading').attr('data-hs-lazy', '');
  });
  // inline background images in the content (SEO article pages), all but the first
  $('main [style*="background-image"]')
    .slice(1)
    .each((_, el) => {
      const style = $(el).attr('style');
      const m = style.match(/background-image:\s*url\(([^)]*)\);?/);
      if (!m || !/\/images\//.test(m[1])) return;
      $(el).attr('style', style.replace(m[0], '').trim()).attr('data-hs-bg', m[1].replace(/^['"]|['"]$/g, ''));
    });
}

/**
 * Accessible names for links that only contain images or icon fonts (no
 * visual change): logo, image links and social icons.
 */
function addAccessibleNames($, titles) {
  // images without alt (theme placeholders etc.) are decorative
  $('img:not([alt])').attr('alt', '');
  $('select:not([aria-label])').each((_, el) => {
    const first = $(el).find('option').first().text().trim();
    if (first) $(el).attr('aria-label', first);
  });
  // any remaining link without text, e.g. image-only links on the gallery overview
  $('a[href]:not([aria-label])').each((_, a) => {
    if ($(a).text().trim()) return;
    const label = titles[$(a).attr('href')] || $(a).find('img[alt]').first().attr('alt');
    if (label) $(a).attr('aria-label', label);
  });
  $('a.flex-element-type-logo').attr('aria-label', 'Daniela Heinisch Photography – Startseite');
  $('a.flex-block__element--image-link').each((_, a) => {
    const title = titles[$(a).attr('href')];
    if (title) $(a).attr('aria-label', title);
  });
  $('a.flex-element-type-socialLinks__link').each((_, a) => {
    const icon = ($(a).find('i').attr('class') || '').match(/flo-flex-icon-(\w+)/)?.[1];
    if (icon) $(a).attr('aria-label', icon[0].toUpperCase() + icon.slice(1));
  });
}

/**
 * flo-flex-builder ships some elements as escaped <script type="text/template"
 * data-element-device="desktop|mobile"> and renders the one matching the
 * viewport (width > 767 = desktop) with data-only-device="<device>". Server
 * rendered elements with the same id are removed on a device when a template
 * for the other device exists. We render all templates and let CSS
 * (clone.css, [data-only-device] / [data-hs-hide-on]) pick per viewport.
 */
function renderDeviceTemplates($, root) {
  const devicesById = {};
  root.find('script[data-element-device]').each((_, el) => {
    const id = $(el).attr('data-element-id');
    const device = $(el).attr('data-element-device');
    (devicesById[id] ||= new Set()).add(device);
    const raw = ($(el).html() || '').replace('class=&quot', `data-only-device="${device}" class=&quot`);
    $(el).after(cheerio.load(raw, null, false).text());
  });
  for (const [id, devices] of Object.entries(devicesById)) {
    const hideOn = ['desktop', 'mobile'].filter((d) => [...devices].some((other) => other !== d));
    root.find(`.${id}:not([data-only-device])`).attr('data-hs-hide-on', hideOn.join(' '));
  }
}

/** FAQ tabs (flo-flex-builder "tabs2" + "tabs-switcher"): state after slick (fade) init. */
function transformTabs($) {
  $('.flex-element-type-tabs2__slider').each((_, slider) => {
    const $s = $(slider);
    const slides = $s.children('.flex-element-type-tabs2__slide').toArray();
    const track = $('<div class="slick-track"></div>');
    slides.forEach((el, i) => {
      $(el).addClass('slick-slide').attr('data-slick-index', String(i)).attr('aria-hidden', i ? 'true' : 'false');
      if (i === 0) $(el).addClass('slick-current slick-active');
      track.append($(el));
    });
    $s.addClass('slick-initialized slick-slider').attr('data-hs-tabs', '');
    $s.empty().append($('<div class="slick-list draggable"></div>').append(track));
  });
  // The switcher items are generated by the original JS from the slide titles.
  $('.flex-element-type-tabs-switcher').each((_, sw) => {
    const $sw = $(sw);
    const element = $sw.closest('.flex-block__element');
    const device = element.attr('data-only-device');
    const target = $sw
      .closest('.flex-block')
      .find(`.flex-block__element--${$sw.attr('data-selected-tabs-element')}`)
      .filter((_, el) => $(el).attr('data-only-device') === device)
      .first();
    const defaults = $sw.find('.flex-element-type-tabs-switcher__item-defaults');
    const state = defaults.attr('data-active-state-class');
    const useTabName = !!defaults.attr('data-use-tab-name');
    target.find('.flex-element-type-tabs2__slide').each((i, slide) => {
      const title = $(slide).attr(useTabName ? 'data-alt-title' : 'data-title') || '';
      const item = $(
        `<div class=" flex-element-type-tabs-switcher__item flex-element-type-tabs-switcher__item--${state}${i === 0 ? ' flex-element-type-tabs-switcher__item--active' : ''} " data-index="${i}" role="button" tabindex="0"><span></span></div>`,
      );
      item
        .find('span')
        .attr('style', defaults.attr('data-style') || '')
        .attr('data-font', defaults.attr('data-font') || '')
        .text(` ${title} `);
      $sw.append(item);
    });
    $sw.attr('data-hs-tabs-switcher', '');
  });
}

/** The WordPress hero slider: render the state slick.js produces after init. */
function transformSlider($) {
  $('.flo-slick-slide-container').each((_, container) => {
    const $c = $(container);
    const slider = $c.find('.flo-slick-slider-block-slider').first();
    const slides = slider.children('.slick-slider-block-slide').toArray();
    const total = slides.length;
    slider.removeClass('flo-hidden').addClass('slick-initialized slick-slider');
    slider.attr('data-hs-slider', '');
    const arrowsStyle = `--elements_color:${$(slides[0]).attr('data-elements_color')}`;
    slides.forEach((s, i) => {
      const $s = $(s);
      $s.addClass('slick-slide');
      $s.attr('data-slick-index', String(i));
      if (i === 0) $s.addClass('slick-current slick-active slick-center').attr('aria-hidden', 'false');
      else $s.attr('aria-hidden', 'true').attr('tabindex', '-1');
      if (i === 0) $s.find('img').first().attr('loading', 'eager').attr('fetchpriority', 'high');
      else $s.find('img').first().attr('data-hs-deferred', ''); // src set by the slider script after load
    });
    const track = $('<div class="slick-track" data-hs-track></div>');
    const list = $('<div class="slick-list draggable"></div>').append(track);
    slides.forEach((s) => track.append($(s)));
    slider.prepend(
      `<div class="flo-slick-slider-block-prev-arrow slick-arrow" style="${arrowsStyle}" data-hs-prev role="button" aria-label="Vorheriges Bild" tabindex="0"><i class="gbp-icon-sl-arrow-left"></i></div>`,
    );
    slider.children('.flo-slick-slider-block-prev-arrow').after(list);
    list.after(
      `<div class="flo-slick-slider-block-next-arrow slick-arrow" style="${arrowsStyle}" data-hs-next role="button" aria-label="Nächstes Bild" tabindex="0"><i class="gbp-icon-sl-arrow-right"></i></div>`,
    );
    // Content overlay (title, description, counter) for the first slide.
    const first = $(slides[0]);
    const wrapper = $c.find('.flo-slide-content--wrapper');
    wrapper.attr('style', arrowsStyle);
    wrapper.find('.decorative-line, .flo_slick__counter').attr('style', arrowsStyle);
    if (first.attr('data-title')) wrapper.find('.title-block').html(first.attr('data-slide-title'));
    else wrapper.find('.title-block').empty();
    wrapper.find('.flo-slide-description').html(first.attr('data-slide-description') || '');
    wrapper.find('.flo_slick__current-index').text('1');
    wrapper.find('.flo_slick__total-index').text(String(total));
  });
}

/** Masonry gallery: pre-computed columns (desktop) + CSS order (mobile). */
function transformGalleries($) {
  $('.flo-gallery-grid--masonry').each((_, grid) => {
    const $g = $(grid);
    const items = $g.children('.flo-gallery-grid__image').toArray();
    const ratios = items.map((it) => {
      const m = ($(it).attr('style') || '').match(/--img-height:\s*([\d.]+)%/);
      return m ? Number(m[1]) / 100 : 1;
    });
    const wrapper = $g.closest('.flo-gallery-grid-wrapper');
    const cols = Number((wrapper.attr('style') || '').match(/--columns:\s*(\d+)/)?.[1] || 3);
    const assignment = assignColumns(ratios, cols, MASONRY_REF.colWidth, MASONRY_REF.gap);
    const columns = Array.from({ length: cols }, (_, c) => $(`<div class="hs-masonry-col" data-col="${c}"></div>`));
    items.forEach((it, i) => {
      const $it = $(it);
      $it.attr('style', `${$it.attr('style') || ''}; order: ${i}`.replace(/^;\s*/, ''));
      $it.attr('data-hs-index', String(i));
      $it.attr('data-fancybox', 'gallery');
      columns[assignment[i]].append($it);
    });
    $g.attr('data-hs-masonry', String(cols));
    $g.empty();
    columns.forEach((col) => $g.append(col));
  });
}

function cleanInstagram(html) {
  const $ = cheerio.load(html, null, false);
  const root = $('#sb_instagram');
  root.removeAttr('data-locatornonce').removeAttr('data-postid').removeAttr('data-shortcode-atts');
  root.find('.sbi_photo').each((_, a) => {
    $(a).removeAttr('data-img-src-set');
    $(a).removeAttr('style');
  });
  root.find('img').each((_, img) => {
    $(img).attr('loading', 'lazy').attr('decoding', 'async');
  });
  return $.html();
}

function cleanContactForm(html) {
  const $ = cheerio.load(html, null, false);
  $('textarea.flo-form-data').remove();
  // Give every control a stable name so the static form can submit it.
  $('.form-group').each((_, g) => {
    const $g = $(g);
    const label = $g.children('label').first().text().trim();
    $g.find('input, textarea, select').each((__, ctl) => {
      const $ctl = $(ctl);
      if ($ctl.attr('type') === 'submit') return;
      if (!$ctl.attr('name')) $ctl.attr('name', label || $ctl.attr('id') || 'feld');
    });
  });
  // Honeypot field of Flo Forms (hidden via CSS): keep its name recognisable.
  $('#flo-contact-phone').attr('name', '_honeypot').attr('tabindex', '-1').attr('autocomplete', 'off');
  $('.radio-list label.is-checked').removeClass('is-checked');
  $('.radio-list input[type=radio]').removeAttr('checked');
  $('form.flo-form').attr('data-hs-form', '').attr('novalidate', '');
  return $.html();
}

function cleanWhatsapp(html) {
  const $ = cheerio.load(html, null, false);
  $('#wa').attr('data-hs-whatsapp', '');
  // The ~50px avatar used the 2560px original; a 300px variant looks identical.
  // It sits in the closed chat popup, so whatsapp.ts applies it on first open.
  $('.wa__cs_img_wrap').each((_, el) => {
    $(el).attr('data-hs-style', ($(el).attr('style') || '').replace(/-scaled\.jpg/, '-300x200.jpg'));
    $(el).removeAttr('style');
  });
  return $.html();
}

function extractMeta($, pagePath) {
  const meta = {
    title: $('head title').text().trim(),
    description: $('meta[name="description"]').attr('content') || null,
    robots: $('meta[name="robots"]').attr('content') || null,
    canonical: $('link[rel="canonical"]').attr('href') || null,
    og: {},
    twitter: {},
    jsonLd: [],
  };
  $('meta[property^="og:"], meta[property^="article:"]').each((_, m) => {
    meta.og[$(m).attr('property')] = $(m).attr('content');
  });
  $('meta[name^="twitter:"]').each((_, m) => {
    meta.twitter[$(m).attr('name')] = $(m).attr('content');
  });
  $('script[type="application/ld+json"]').each((_, s) => {
    // Upload URLs inside JSON-LD point to the localised WebP files.
    const json = ($(s).html() || '').trim().replace(
      /https?:\\\/\\\/danielaheinisch\.at\\\/wp-content\\\/uploads\\\/[^"]+/g,
      (u) => ORIGIN + images.local(u.replace(/\\\//g, '/')).replace(/\//g, '\\/'),
    );
    meta.jsonLd.push(json);
  });
  if (meta.og['og:image']) meta.og['og:image'] = images.local(meta.og['og:image']);
  meta.path = pagePath;
  return meta;
}

/** robots.txt + sitemap (the original serves Yoast's /sitemap_index.xml). */
function writeSitemap(routes) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = routes
    .map((r) => `  <url><loc>${ORIGIN}${r.path}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n');
  fs.writeFileSync(
    path.join(PUBLIC, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  fs.writeFileSync(
    path.join(PUBLIC, 'sitemap_index.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${ORIGIN}/sitemap.xml</loc><lastmod>${today}</lastmod></sitemap>\n</sitemapindex>\n`,
  );
  fs.writeFileSync(path.join(PUBLIC, 'robots.txt'), `User-agent: *\nDisallow:\n\nSitemap: ${ORIGIN}/sitemap_index.xml\n`);
}

// ---------------------------------------------------------------- main

async function main() {
  log('1/5 Fetching pages …');
  const raw = {};
  for (const p of [...PAGES, NOT_FOUND_SOURCE]) {
    const res = await fetchText(ORIGIN + p);
    const expected = p === NOT_FOUND_SOURCE ? 404 : 200;
    if (res.status !== expected) throw new Error(`${p}: HTTP ${res.status}, expected ${expected}`);
    raw[p] = res.body;
  }

  log('2/5 Rendering client-side widgets in a headless browser …');
  const snapshots = await getSnapshots();
  if (!/vue-form-generator/.test(snapshots.contactForm)) throw new Error('contact form snapshot incomplete');

  log('3/5 Building global stylesheet …');
  const $home = cheerio.load(raw['/']);
  const globalKeys = new Map(); // key -> md5 of original text
  const globalCss = [];
  for (const el of headStyleNodes($home)) {
    const key = cssKey($home, el);
    const text = await cssText($home, el);
    globalKeys.set(key, md5(el.tagName === 'link' ? key : $home(el).html() || ''));
    globalCss.push(`/* ${key} */\n${text}`);
  }
  globalCss.push(`/* clone: extra widget styles */\n${fs.readFileSync(path.join(import.meta.dirname, 'clone.css'), 'utf8')}`);
  fs.mkdirSync(path.join(ROOT, 'styles'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'styles', 'site.css'), globalCss.join('\n\n') + '\n');

  // Page titles without the site name, used as accessible names for image links.
  const titles = Object.fromEntries(
    PAGES.map((p) => [p, cheerio.load(raw[p])('title').text().split(/ [-–] Daniela Heinisch/)[0].trim()]),
  );

  log('4/5 Converting pages …');
  fs.rmSync(path.join(CONTENT, 'pages'), { recursive: true, force: true });
  fs.mkdirSync(path.join(CONTENT, 'pages'), { recursive: true });
  const routes = [];
  for (const p of [...PAGES, NOT_FOUND_SOURCE]) {
    const $ = cheerio.load(raw[p]);
    const id = p === NOT_FOUND_SOURCE ? '404' : pageId(p);

    // Page specific stylesheets (anything that differs from the home page set).
    const pageCss = [];
    for (const el of headStyleNodes($)) {
      const key = cssKey($, el);
      const hash = md5(el.tagName === 'link' ? key : $(el).html() || '');
      if (globalKeys.get(key) === hash) continue;
      pageCss.push(await cssText($, el));
    }

    const meta = extractMeta($, p);
    const bodyClass = $('body').attr('class') || '';

    // Mobile menu popups are created from <script type="text/template"> by the
    // original JS and appended to <body>; we render them statically.
    const popups = [];
    $('script.flex-element-type-menu__mobile-popup-template').each((_, s) => {
      popups.push(($(s).html() || '').trim());
      $(s).remove();
    });

    const page = $('#page');
    renderDeviceTemplates($, page);
    page.find('script, noscript').remove();
    page.find('#sb_instagram').replaceWith(cleanInstagram(snapshots.instagram));
    page.find('.app-flo-forms').replaceWith(cleanContactForm(snapshots.contactForm));
    // Stray comments of the WordPress templates.
    page.find('*').contents().filter((_, n) => n.type === 'comment').remove();

    const $doc = cheerio.load(
      `<div id="hs-root">${$.html(page)}${popups.join('\n')}${cleanWhatsapp(snapshots.whatsapp)}</div>`,
      null,
      false,
    );
    transformSlider($doc);
    transformTabs($doc);
    transformGalleries($doc);
    transformImages($doc);
    transformAttributes($doc);
    deferOffscreenImages($doc);
    addAccessibleNames($doc, titles);
    // Keep the original popup scroll container class used by perfect-scrollbar.
    $doc('.flex-element-type-menu-mobile-popup').attr('data-hs-menu-popup', '');
    // perfect-scrollbar appends its (unstyled, empty) rails to the popup menu on the
    // original; they make the last menu item not :last-child, so it gets its divider line.
    $doc('.flex-element-type-menu-mobile-popup__menu').append('<div class="ps__rail-x"></div><div class="ps__rail-y"></div>');
    $doc('.flex-element-type-menu__trigger').attr('data-hs-menu-trigger', '').attr('role', 'button').attr('aria-label', 'Menü öffnen').attr('tabindex', '0');
    $doc('.flex-element-type-menu-mobile-popup__header-close-button').attr('data-hs-menu-close', '').attr('role', 'button').attr('aria-label', 'Menü schließen').attr('tabindex', '0');
    $doc('.fgt-copyright__scroll-to-top').attr('data-hs-scroll-top', '').attr('role', 'button').attr('tabindex', '0');
    // First image in the header logo is above the fold everywhere.
    const html = $doc('#hs-root').html().replace(/\n\s*\n+/g, '\n');

    const out = { id, path: p === NOT_FOUND_SOURCE ? null : p, meta, bodyClass, css: pageCss.join('\n'), html };
    fs.writeFileSync(path.join(CONTENT, 'pages', id + '.json'), JSON.stringify(out));
    if (out.path) routes.push({ id, path: p });
    log(`  ${p.padEnd(42)} → content/pages/${id}.json (${(html.length / 1024).toFixed(0)} KB)`);
  }
  fs.writeFileSync(path.join(CONTENT, 'routes.json'), JSON.stringify(routes, null, 2) + '\n');
  writeSitemap(routes);

  log('5/5 Downloading assets and converting images …');
  const a = await assets.processAll();
  log(`  assets: ${a.total} (${a.failed.length} failed)`);
  if (a.failed.length) log('  failed assets:', a.failed);
  if (a.external.length) log('  external references kept:', a.external);
  const i = await images.processAll(log);
  log(`  images: ${i.total} (${i.failed.length} failed)`);
  if (i.failed.length) {
    log('  failed images:', i.failed);
    process.exitCode = 1;
  }
  log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
