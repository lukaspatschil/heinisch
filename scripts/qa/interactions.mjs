#!/usr/bin/env node
// Screenshots of interactive states (menu, slider, lightbox, WhatsApp, form
// validation) for original and clone, plus functional assertions on the clone.
//
//   node scripts/qa/interactions.mjs <cloneBaseUrl> [originalBaseUrl]
//
// Output: screenshots/interactions/{original,clone}/<state>.png
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const [, , cloneBase = 'http://localhost:4321', origBase = 'https://danielaheinisch.at'] = process.argv;

const DESKTOP = { viewport: { width: 1440, height: 900 } };
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent };

async function declineCookies(page, base) {
  if (!/danielaheinisch\.at/.test(base)) return;
  const b = page.getByText('Weiter ohne Einwilligung', { exact: true }).first();
  await b.click({ timeout: 8000 }).catch(() => {});
}

async function run(base, label, isClone) {
  const out = path.join(ROOT, 'screenshots', 'interactions', label);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.png') });
  const results = [];
  const check = async (name, fn) => {
    try {
      await fn();
      results.push(`ok   ${name}`);
    } catch (err) {
      results.push(`FAIL ${name}: ${String(err.message).split('\n')[0]}`);
    }
  };

  // Mobile menu
  {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    await declineCookies(page, base);
    await page.waitForTimeout(1500);
    await check('mobile menu opens and closes', async () => {
      await page.locator('header .flex-element-type-menu__trigger').first().click();
      await page.waitForTimeout(800);
      await shot(page, 'mobile-menu-open');
      const popup = page.locator('.flex-element-type-menu-mobile-popup--open');
      if (isClone) assert.equal(await popup.count(), 1);
      await page.locator('.flex-element-type-menu-mobile-popup--open .flex-element-type-menu-mobile-popup__header-close-button').click();
      await page.waitForTimeout(800);
      if (isClone) assert.equal(await page.locator('.flex-element-type-menu-mobile-popup--open').count(), 0);
    });
    await ctx.close();
  }

  // Slider, WhatsApp (desktop)
  {
    const ctx = await browser.newContext(DESKTOP);
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    await declineCookies(page, base);
    await page.waitForTimeout(2500);
    await check('slider next/prev with counter', async () => {
      await page.locator('.flo-slick-slider-block-next-arrow').click();
      await page.waitForTimeout(2500);
      await shot(page, 'slider-slide-2');
      assert.equal((await page.locator('.flo_slick__current-index').first().textContent()).trim(), '2');
      await page.locator('.flo-slick-slider-block-prev-arrow').click();
      await page.waitForTimeout(2500);
      await page.locator('.flo-slick-slider-block-prev-arrow').click();
      await page.waitForTimeout(2500);
      await shot(page, 'slider-slide-6');
      assert.equal((await page.locator('.flo_slick__current-index').first().textContent()).trim(), '6');
    });
    await check('whatsapp popup opens', async () => {
      await page.locator('.wa__btn_popup').click();
      await page.waitForTimeout(1200);
      await shot(page, 'whatsapp-open');
      assert.equal(await page.locator('.wa__popup_chat_box.wa__active').count(), 1);
    });
    await ctx.close();
  }

  // Gallery lightbox
  for (const [name, opts] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(base + '/gallery/familien/', { waitUntil: 'load' });
    await declineCookies(page, base);
    await page.waitForTimeout(2000);
    await check(`lightbox (${name})`, async () => {
      await page.locator('.flo-gallery-grid__image').first().click();
      await page.waitForTimeout(1500);
      await shot(page, `lightbox-${name}`);
      assert.equal(await page.locator('.fancybox-container').count(), 1);
      assert.equal((await page.locator('[data-fancybox-index]').textContent()).trim(), '1');
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(1200);
      assert.equal((await page.locator('[data-fancybox-index]').textContent()).trim(), '2');
      await shot(page, `lightbox-${name}-next`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      assert.equal(await page.locator('.fancybox-container').count(), 0);
    });
    await ctx.close();
  }

  // FAQ tabs
  for (const [name, opts] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(base + '/haeufige-fragen/', { waitUntil: 'load' });
    await declineCookies(page, base);
    await page.waitForTimeout(2500);
    await check(`faq tabs (${name})`, async () => {
      await page.locator('.flex-element-type-tabs-switcher__item:visible').nth(2).click();
      await page.waitForTimeout(1200);
      await shot(page, `faq-tab-3-${name}`);
      const title = await page.locator('.flex-element-type-tabs2__slide.slick-current:visible .flex-element-type-tabs2__slide-title').first().textContent();
      assert.equal(title.trim(), 'Was sollen wir anziehen?');
    });
    await ctx.close();
  }

  // Contact form validation (never submits on the original)
  {
    const ctx = await browser.newContext(DESKTOP);
    const page = await ctx.newPage();
    await page.goto(base + '/kontakt-2/', { waitUntil: 'load' });
    await declineCookies(page, base);
    await page.waitForTimeout(2500);
    await check('form shows required errors', async () => {
      await page.locator('form.flo-form input[type=submit]').click();
      await page.waitForTimeout(1000);
      await page.locator('.flo-form-block__form').screenshot({ path: path.join(out, 'form-errors.png') });
      // the improved clone also requires the photo type and speaks German
      const improved = isClone && (await page.locator('form[data-hs-improved]').count()) > 0;
      assert.equal(await page.locator('.form-group.error').count(), improved ? 5 : 4);
      assert.equal(
        (await page.locator('.errors.help-block').first().textContent()).trim(),
        improved ? 'Bitte fülle dieses Feld aus.' : 'This field is required!',
      );
    });
    if (isClone) {
      await check('errors clear once fields are filled', async () => {
        await page.fill('#dein-vorname', 'Test');
        await page.fill('#dein-nachname', 'Person');
        await page.fill('#deine-e-mail-adresse', 'test@example.com');
        await page.fill('#deine-nachricht', 'Hallo');
        if (await page.locator('form[data-hs-improved]').count()) await page.locator('.radio-list label').first().click();
        assert.equal(await page.locator('.form-group.error').count(), 0);
      });
    }
    await ctx.close();
  }

  await browser.close();
  console.log(`== ${label}`);
  results.forEach((r) => console.log('  ' + r));
  return results.filter((r) => r.startsWith('FAIL')).length;
}

const failedClone = await run(cloneBase, 'clone', true);
if (origBase !== 'none') await run(origBase, 'original', false);
if (failedClone) process.exitCode = 1;
