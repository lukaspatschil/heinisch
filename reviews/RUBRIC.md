# Design-Review: Bewertungsschema

Website: Fotografin Daniela Heinisch (Familien-, Babybauch-, Neugeborenen-Fotografie, Mödling).
Ziel der Website: Vertrauen aufbauen, Arbeiten zeigen, Anfragen (Kontaktformular / WhatsApp / Telefon) erzeugen.

**Fix vorgegeben (nicht bewerten, nicht ändern lassen):** Texte/Inhalte der Kundin, Fotos, Logo,
Markenwirkung (zart, hell, Rosé/Beige-Töne, elegante Serifen- und Script-Schriften).
Bewertet wird die **Präsentation und Bedienung**. Tippfehler im Text dürfen gemeldet werden.

## Skala (pro Kriterium, 0–10, Schritte 0,5)

| Punkte | Bedeutung |
| --- | --- |
| 10 | Keine Funde in diesem Kriterium. |
| 9,5 | Nur kosmetische Kleinigkeiten (Schwere „low“), nichts, das Nutzer merklich stört. |
| 9 | Kleine, aber spürbare Mängel. |
| 7–8,5 | Deutliche Mängel auf einzelnen Seiten/Geräten. |
| < 7 | Grundlegende Probleme. |

**Regeln:** Jeder offene Fund mit Schwere **high** begrenzt das betroffene Kriterium auf höchstens 8,
jeder offene **medium**-Fund auf höchstens 9. Jede Bewertung unter 10 muss durch Funde belegt sein.

**Kundendaten:** Funde, die nur die Kundin klären kann (Fakten wie Telefonnummer, Preise oder
fehlende Inhalte), werden weiter erfasst, aber mit `"extern": true` markiert. Sie begrenzen die
Punkte nicht. Sie stehen im Tracker als „wartet auf Kundin“.

## UI-Kriterien (Reviewer „ui“)

1. **typografie** – Hierarchie, Lesbarkeit (Größe, Zeilenlänge, Zeilenhöhe), Konsistenz der Schriften.
2. **farbe_kontrast** – Farbwirkung, Text-/Hintergrund-Kontrast (WCAG AA: 4,5:1 Fließtext, 3:1 große Schrift/UI).
3. **layout_abstaende** – Raster, Ausrichtung, Weißraum, Konsistenz der Abstände zwischen Abschnitten.
4. **bilder** – Bildpräsentation, Zuschnitte, Bildqualität, Galerie-Darstellung.
5. **responsive** – Darstellung auf Smartphone (390/360 px), Tablet (768/1024 px), Desktop (1440/1920 px).
6. **komponenten** – Buttons, Links, Menü, Footer, Hover-/Fokus-Zustände, Konsistenz der Bedienelemente.

## UX-Kriterien (Reviewer „ux“)

1. **navigation** – Menü, Informationsarchitektur, keine toten Links/Sackgassen, Orientierung.
2. **conversion** – Wege zur Anfrage (Kontakt, WhatsApp, Telefon), Sichtbarkeit und Klarheit der Call-to-Actions.
3. **formulare** – Kontaktformular: Labels, Fehlermeldungen (Sprache!), Feedback, Pflichtfelder.
4. **mobile_bedienung** – Touch-Ziele (≥ 44 px), Lesbarkeit, überdeckende Elemente (z. B. WhatsApp-Button), Gesten.
5. **barrierefreiheit** – Tastatur, Fokus sichtbar, Alternativtexte, Semantik/Überschriften, Screenreader.
6. **vertrauen_inhalt** – Verständlichkeit von Angebot, Ablauf, FAQ, Referenzen; Impressum/Datenschutz erreichbar.

## Ablage pro Runde

`reviews/round-<n>/<ui|ux>/`
- `findings.json` – maschinenlesbar (Format siehe unten)
- `report.md` – Bericht mit Punkten je Kriterium, Begründung und Liste der Funde
- `annotated/<ID>.png` – markierte Screenshots (erzeugt mit `node scripts/qa/annotate.mjs findings.json`)

```json
{
  "reviewer": "ui",
  "round": 1,
  "scores": { "typografie": 8.5, "...": 9 },
  "findings": [
    {
      "id": "UI-01",
      "severity": "high | medium | low",
      "criterion": "farbe_kontrast",
      "page": "/",
      "viewport": "mobile-390 | tablet-768 | tablet-1024 | laptop-1440 | desktop-1920",
      "selector": "CSS-Selektor eines sichtbaren Elements (oder stattdessen rect)",
      "rect": { "x": 0, "y": 0, "width": 0, "height": 0 },
      "title": "Kurztitel",
      "detail": "Was genau ist das Problem, wo, warum stört es",
      "recommendation": "Konkreter Verbesserungsvorschlag (z. B. Farbwert, Größe)"
    }
  ]
}
```
