<img src="assets/icon.svg" width="64" height="64" alt="">

# heinisch

Statischer Nachbau von [danielaheinisch.at](https://danielaheinisch.at) (WordPress, Theme „Flo Pronto“ mit Flo Flex Builder) in **Next.js** mit Static Export. Das Ergebnis ist reines HTML/CSS mit ca. 20 KB eigenem JavaScript (kein Framework-JS im Browser) und lässt sich auf jedem statischen Hosting betreiben (Netlify, Vercel, Cloudflare Pages, S3, nginx …).

## Befehle

```sh
npm install
npm run build          # → ./out (statische Website inkl. 404.html)
npm start              # ./out lokal auf http://localhost:3000 ausliefern
npm run dev            # Entwicklungsserver
npm run import         # Inhalte neu von danielaheinisch.at übernehmen (siehe unten)
npm run import -- --original   # Import ohne Design-Verbesserungen (reiner 1:1-Nachbau)
```

## Design-Verbesserungen

Auf den 1:1-Import setzt eine Verbesserungsschicht auf, entstanden aus sechs Runden unabhängiger UI- und UX-Reviews (Ergebnis: alle Kriterien ≥ 9,5).

- `scripts/import/improve.mjs`: Änderungen am Markup beim Import (Kontrastfarben, Überschriften, Alt-Texte, Formular, Galerie-Navigation, Portfolio-Raster, Datenschutz-Gliederung, Weiterleitungen alter Seiten, neue Seite `/preise/`, Meta-Beschreibungen).
- `styles/improvements.css`: Gestaltung (Button-System, Fokus, Mindestschrift 12 px, Tablet-Layout bis 1199 px, Formular, Footer, Hero).
- `reviews/`: Bewertungsschema (`RUBRIC.md`), Tracker aller Funde mit Status (`TRACKER.md`) und je Runde die Berichte, `findings.json` und markierten Screenshots (`annotated/`).

Weiterleitungen: `/website-im-aufbau/` → `/`, `/entry_form/kontaktformular/` → `/kontakt-2/`, `/gallery/` → `/portfolio/`.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `pages/` | Next.js Pages Router: `[[...slug]].tsx` (alle Seiten), `404.tsx`, `_document.tsx`. `unstable_runtimeJS: false`, also keine React-Hydration im Browser. |
| `components/PageView.tsx` | Rendert SEO-Tags, seitenspezifisches CSS und das Markup einer Seite. |
| `content/pages/*.json` | Importierte Seiten (Metadaten, Markup), `content/routes.json` = alle URLs. **Generiert.** |
| `styles/site.css` | Globales Stylesheet in der Original-Reihenfolge. **Generiert.** |
| `public/images`, `public/assets` | Bilder als WebP (gleiche Ordner und Größen wie WordPress), Schriften (WOFF2), Icons. **Generiert.** |
| `public/robots.txt`, `public/sitemap*.xml` | Robots und Sitemap (wie Yoast im Original unter `/sitemap_index.xml`). **Generiert.** |
| `lib/behaviors/` | Interaktion, beim Build per esbuild zu `public/js/site.js` gebündelt: Hero-Slider, FAQ-Tabs, mobiles Menü, Galerie-Masonry, Lightbox, WhatsApp-Button, Kontaktformular, Instagram-Kachelgrößen, Einblend-Animation, Lazy-Loading, „Back to top“. Ersetzt jQuery/slick/Masonry/fancybox/lazysizes des Originals. |
| `scripts/import/` | Importer: lädt alle Seiten, rendert per Playwright die clientseitigen Widgets (Formular, Instagram, WhatsApp), lokalisiert CSS, Schriften und Bilder. |
| `scripts/qa/` | Qualitätssicherung: Screenshots, Pixelvergleich, Interaktionstests, Lighthouse. |
| `screenshots/` | Screenshots aller Seiten: `original/` und `clone/` je Viewport, `diff/` und `report.md`; `interactions/` (Menü, Slider, Lightbox, FAQ, WhatsApp, Formular – Original und Klon); `review/` (Belege der unabhängigen Reviews). |
| `lighthouse-reports/` | `summary.md` mit den Lighthouse-Werten aller Seiten. |

## Konfiguration (Umgebungsvariablen beim Build)

| Variable | Zweck |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Öffentliche URL für Canonical, Open Graph und JSON-LD (Standard: `https://danielaheinisch.at`). |
| `NEXT_PUBLIC_CONTACT_ENDPOINT` | Ziel-URL für das Kontaktformular (z. B. ein [Formspree](https://formspree.io)-Endpoint; der Formular-Inhalt wird als `multipart/form-data` gesendet). Danach wird wie im Original auf `/danke-seite/` weitergeleitet. **Ohne diese Variable öffnet das Formular das Mailprogramm** mit einer vorbereiteten Mail an photography@danielaheinisch.at. |

## Unterschiede zum Original (bewusst)

- **Kein Cookie-Banner, kein Tracking:** Google Analytics, Google Tag Manager und Matomo des Originals sind nicht eingebaut, deshalb ist auch kein Consent-Banner nötig. Das Original zeigt zusätzlich „Produktlizenz nicht für den Produktionseinsatz!“.
- **Kontaktformular:** braucht beim statischen Hosting einen Formular-Dienst (siehe oben). Validierung und Fehlermeldungen sind deutsch; ohne Dienst erscheint ein Hinweis zum Mailprogramm.
- **Instagram-Feed:** ist ein Schnappschuss vom Importzeitpunkt. Für neue Beiträge `npm run import -- --fresh` ausführen und neu bauen.
- **„Preise“** im Menü führt auf die neue Seite „Preise auf Anfrage“ (im Original eine 404-Seite).
- **Gestaltung und Barrierefreiheit verbessert** (siehe „Design-Verbesserungen“); Telefonnummer im Impressum auf Wunsch der Kundin vereinheitlicht (0677 / 643 454 61).
- **Alte Bild-URLs:** Bilder liegen jetzt unter `/images/…webp` statt `/wp-content/uploads/…jpg`. Wer alte Bild-Links (z. B. aus der Google-Bildersuche) erhalten will, richtet beim Hosting eine Weiterleitung `/wp-content/uploads/*` → `/images/*` ein (Dateiendung `.jpg`/`.png` → `.webp`).
- **URLs ohne Schrägstrich** (`/kontakt-2`) leitet WordPress auf `/kontakt-2/` weiter; beim statischen Hosting hängt das vom Anbieter ab (Netlify/Vercel/Cloudflare tun das standardmäßig).

## Inhalte aktualisieren

```sh
npm run import -- --fresh   # Cache leeren, alles neu vom Live-System laden
npm run build
```

## QA

```sh
npm run build && npx serve out -l 4321 &
node scripts/qa/screenshots.mjs https://danielaheinisch.at screenshots/original
node scripts/qa/screenshots.mjs http://localhost:4321 screenshots/clone
node scripts/qa/compare.mjs              # → screenshots/report.md + screenshots/diff/
node scripts/qa/interactions.mjs http://localhost:4321   # → screenshots/interactions/
node scripts/qa/lighthouse.mjs http://localhost:4321   # → lighthouse-reports/summary.md
node scripts/qa/contrast.mjs             # WCAG-Kontrast aller Texte
node scripts/qa/overlap.mjs              # sich überlappende Textzeilen
node scripts/qa/annotate.mjs reviews/round-N/ui/findings.json   # markierte Screenshots zu Review-Funden
```

Viewports: 1920×1080, 1440×900, 1024×768, 768×1024 (Tablet), 390×844 (iPhone 13).
