# UI-Review Runde 5 (Reviewer: ui)

Website: http://localhost:4321 (statischer Build, unverändert geprüft). Alle 21 Seiten aus pages.txt bei laptop-1440, tablet-1024 und mobile-390, die zehn Schlüsselseiten zusätzlich bei tablet-768 und desktop-1920 (Vollbild-Screenshots nach Durchscrollen, Messung per getComputedStyle/getBoundingClientRect: Schriftgrößen, Bildauflösung, Überlauf, Button-Maße, Fokus). Zusätzlich Hero-Folien 1-6 auf Mobil/Laptop, Tastaturfokus am Logo. Kein horizontaler Überlauf bei 390/768/1024/1440/1920, kein Bild hochskaliert, Mindestschrift 12 px auf Laptop und Tablet.

## Punkte

| Kriterium | Punkte | Begründung |
| --- | --- | --- |
| typografie | 9,0 | Hierarchie und Zeilenhöhen stabil, Hero-Zähler 13 px. Offen nur low: Mobil-Labels und Ablauf-Nummern 11,44 px (UI5-03) und weiter unterstrichene Überschriften sowie uneinheitliche Titelgrößen (UI5-04, seit Runde 3 offen, vom Tracker fälschlich als erledigt geführt). |
| farbe_kontrast | 9,0 | Fließtexte, Buttons, Footer, FAQ-Hinweis (#4F4D49) sauber. Offen medium: Mobil-Hero-Text, Untertitel Folien 2 und 4 in #ABB8C3 mit ca. 1,5:1, Folie 1 weiß auf hellem Hemd ca. 2,2:1 (UI5-01), daher max. 9. |
| layout_abstaende | 9,0 | Galerie-Navigation jetzt bündig. Offen nur low, aber mehrere: FAQ-Leerfläche (UI5-05, seit Runde 2), FAQ mobil vier linke Kanten (UI5-06), Ablauf Spalte 3 (UI5-07), Button klebt am Text (UI5-10), versetzte Trennlinien Tablet/Mobil (UI5-13). |
| bilder | 9,5 | Kein Bild hochskaliert, Galerien dreispaltig, Teaser scharf. Offen nur low: Kundenfoto C&T (UI5-08), ungleiches Bildpaar Über mich (UI5-09). |
| responsive | 9,0 | Header, Galerien, Mobil-Hero randlos (390 px), kein Überlauf. Offen nur low: 340-px-Textspalte und 12 133 px Startseite bei 1024 (UI5-11), Kontaktformular mobil nur 253 px breit mit abgeschnittenem Select (UI5-14). |
| komponenten | 9,0 | Alle Builder-Buttons jetzt 48 px, gleiche Schrift und Innenabstand, Skip-Link, Menü, Formular, Footer sauber. Offen nur low, aber eine fehlgeschlagene Korrektur: Logo-Link ohne jeden Tastaturfokus (UI5-02), zwei Rosé-Füllungen (UI5-12). |

Regelcheck: ein offener medium-Fund (UI5-01, farbe_kontrast, max. 9), kein high. Alle anderen Kriterien haben nur low-Funde. Typografie, Layout, Responsive und Komponenten stehen bei 9,0, weil dort mehrere Reste über mehrere Runden bestehen bzw. eine Korrektur nicht wirkt. Der Tracker führt UI4-07 und UI4-08 als umgesetzt bzw. teilweise, beides stimmt am laufenden Build nicht.

## Positiv

- Alle Flächen-Buttons einheitlich 48 px hoch, Nunito Sans 13 px/600, 28 px Innenabstand (Laptop, 1024, 390).
- Galerie-Navigation bündig mit dem Raster (x = 101), Galerien bei 1024 px dreispaltig.
- Mobil-Hero randlos, Kopfzeile mittig, Footer mit Open-Sans-Links, 'Nach oben' 13 px.
- Datenschutz-Titel in der Textspalte, FAQ-Hinweis im Markengrau.

## Verifikation der Runde-4-Funde

Zusammenfassung: 4 behoben, 2 teilweise, 9 offen (von 15).

| ID | Status | Beleg |
| --- | --- | --- |
| UI4-01 | teilweise | Hero-Zähler jetzt 13 px (Laptop) und kein Text mehr unter 12 px auf Laptop und Tablet (Scan aller 21 Seiten). Mobil-390 bleiben Genre-Labels der Startseite ("Babybauch Fotografie" usw.) und Ablauf-Nummern 01-03 bei 11,44 px. |
| UI4-02 | behoben | Alle Builder-Buttons (Ihr wollt mehr wissen, Mehr liebe Worte, Schreib mir, Jetzt Anfragen, Kontakt) sind auf Laptop, 1024 und 390 genau 48 px hoch, Nunito Sans 13 px/600 mit 1,56 px Laufweite, Innenabstand 28 px (Text 199 in Box 255). Breiten 196-255 px je nach Text. Restunterschied Füllfarbe siehe UI5-12. |
| UI4-03 | behoben | FAQ-Hinweis "Für weitere Fragen" ist rgb(79,77,73) = #4F4D49 (Laptop und mobil), kein #324B58 mehr. |
| UI4-04 | offen | FAQ Laptop: Antwort 1 endet y = 730, Hinweis beginnt y = 916 (186 px Leerfläche, bei längeren Antworten 145 px); mobil ca. 200 px. Unverändert zu Runde 4. |
| UI4-05 | behoben | "Nach oben" jetzt Open Sans 13 px (Höhe 16 px) statt Cormorant; Rechtslinks bei 1920 px 15 px (Nunito Sans) neben 18-px-Spaltentext, Hierarchie nicht mehr umgekehrt. |
| UI4-06 | teilweise | Mobil-Hero jetzt randlos (x = 0, 390 x 560 px). Titel (y 223-265) und Untertitel liegen aber weiter auf Kopf und Gesichtern von Vater und Kind; Kontrast Weiß gegen Hintergrund gemessen ca. 2,2:1. Rest als UI5-01. |
| UI4-07 | offen | Der alte 389 x 133 px Rahmen ist weg, aber es gibt jetzt gar keinen Fokusrahmen mehr: a.flex-element-type-logo:focus-visible hat outline none, die Regel für img/svg greift nicht, weil das Logo ein span mit background-image ist (Screenshot nach 2. Tab: kein Ring). Rest als UI5-02. |
| UI4-08 | offen | Unterstreichung weiter vorhanden: "Ablauf" (SPAN/U text-decoration underline, #8E5F63, 30 px) und "Meine liebe zur Fotografie" (20 px, underline) auf Laptop und mobil; H1-Größen unverändert (18/30/56/89 px). Rest als UI5-04. |
| UI4-09 | offen | Liebe Worte Laptop: sechstes Foto x = 93, 542 x 417 px, die fünf ersten x = 101, 534 x 347-357 px. Unverändert. |
| UI4-10 | offen | Über mich Laptop: Foto 1 225 x 300 px bei y = 1357, Foto 2 179 x 239 px bei y = 1380. Unverändert. |
| UI4-11 | offen | Über mich Laptop: Absatzende y = 1566, Button-Oberkante y = 1573 (7 px). Unverändert. |
| UI4-12 | offen | Startseite bei 1024 px weiter 12 133 px hoch, Haupttext in 340-px-Spalte (x 347-687). Unverändert. |
| UI4-13 | offen | FAQ mobil-390: Hero-Bild x = 14, Titel x = 18, Hinweis x = 17, Antwort und Fragenliste x = 31/52. Unverändert. |
| UI4-14 | behoben | Galerie Familien Laptop: "← Alle Galerien" bei x = 101, erstes Foto bei x = 101 (Navigation im Raster-Container). |
| UI4-15 | offen | Ablauf Laptop: Nummern y = 638 / 636 / 631, Titel 752 / 752 / 747, Texte 827 / 826 / 821. Spalte 3 weiter 5-7 px höher. |

## Neue und verbleibende Funde

| ID | Schwere | Kriterium | Seite / Viewport | Problem | Empfehlung | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| UI5-01 | medium | farbe_kontrast | / / mobile-390 | **Rest von UI4-06: Mobil-Hero-Text schwer lesbar (Folie 1 auf Gesichtern, Folien 2 und 4 grau auf Foto)**: Mobil-390: Hero-Titel und Untertitel (Folie 1, y 223-337) liegen auf Kopf und Gesichtern von Vater und Kind, weißer Text gegen helles Hemd/Himmel nur ca. 2,2:1. Auf Folie 2 (Schwangere vor grauem Vorhang) und Folie 4 ist der Untertitel ("Ein bisschen Ich, ein bisschen Du und ganz viel Liebe", "Emotionen, Gefühle und Liebe ...") per mark-Element in #ABB8C3 gesetzt, 13 px: gemessener Kontrast auf Folie 2 ca. 1,5:1, praktisch nicht lesbar (auch auf 1024 px 13 px und auf Laptop bei Folie 4 ca. 3:1). Der erste Eindruck der Startseite auf dem Handy ist betroffen. | Untertitel in allen Folien #FFFFFF, mobil unteres Verlaufsband rgba(0,0,0,.45) hinter Titel und Untertitel oder Textblock ins untere Drittel setzen; #ABB8C3 per CSS überschreiben (.flo-slick-slider-block mark {color:#fff}). | [annotated/UI5-01.png](annotated/UI5-01.png) |
| UI5-02 | low | komponenten | / / laptop-1440 | **Rest von UI4-07: Logo-Link ohne sichtbaren Tastaturfokus**: Nach dem Skip-Link (2. Tab) bekommt der Logo-Link outline: none und keinen box-shadow; im Screenshot ist keine Markierung zu sehen. Die Korrektur setzt den Ring auf img/svg, das Logo ist aber ein span mit background-image. Alle Menüpunkte zeigen einen sauberen 2-px-Rahmen. Gleicher Link im Footer. | Ring an .flex-element-type-logo__image oder per outline-offset am a selbst, 2 px #8E5F63, Breite des Logos begrenzen. | [annotated/UI5-02.png](annotated/UI5-02.png) |
| UI5-03 | low | typografie | / / mobile-390 | **Rest von UI4-01: Mobil Genre-Labels und Ablauf-Nummern 11,44 px**: Auf Mobil-390 stehen "Babybauch Fotografie", "Neugeborenen fotografie", "familien fotografie" (Startseite) und die Ablauf-Nummern 01-03 bei 11,44 px in Versalien mit Laufweite; die Mindestschrift 12 px greift nur auf Laptop und Tablet. Alle anderen Texte sind mindestens 12 px. | Mindestschrift 12,5 px auch mobil (max(12.5px, ...)) für diese Labels. | [annotated/UI5-03.png](annotated/UI5-03.png) |
| UI5-04 | low | typografie | /ablauf/ / laptop-1440 | **Rest von UI4-08: Unterstrichene Überschriften "Ablauf" und "Meine Liebe zur Fotografie"**: Die Überschrift "Ablauf" (30 px, #8E5F63) ist weiter unterstrichen (text-decoration an SPAN und U), ebenso "Meine liebe zur Fotografie" auf /ueber-mich/ (20 px). Unterstrichene Titel wirken wie Links. H1-Größen reichen weiter von 18 px (Impressum) über 30/56 px bis 89 px (FAQ). | text-decoration und u-Element bei Überschriften zurücksetzen (main h1 u, main h2 u {text-decoration:none}); Titelgrößen auf zwei Stufen vereinheitlichen. | [annotated/UI5-04.png](annotated/UI5-04.png) |
| UI5-05 | low | layout_abstaende | /haeufige-fragen/ / laptop-1440 | **Rest von UI4-04: 186 px Leerfläche zwischen Antwort und Hinweis**: Antwort endet bei y = 730, der Hinweis "Für weitere Fragen" beginnt bei y = 916 (186 px; mobil ca. 200 px). Seit Runde 2 unverändert. | Feste Mindesthöhe des Antwortbereichs durch 48 px Abstand ersetzen. | [annotated/UI5-05.png](annotated/UI5-05.png) |
| UI5-06 | low | layout_abstaende | /haeufige-fragen/ / mobile-390 | **Rest von UI4-13: FAQ mobil mit vier linken Kanten**: Hero-Bild x = 14, Titel x = 18, Hinweis x = 17, Antwort x = 31, Fragen x = 31/52. Unverändert. | Einheitlicher Seitenrand (24 px) für Titel, Antwort, Hinweis und Fragenliste. | [annotated/UI5-06.png](annotated/UI5-06.png) |
| UI5-07 | low | layout_abstaende | /ablauf/ / laptop-1440 | **Rest von UI4-15: Ablauf-Spalte 3 sitzt 5-7 px höher**: Nummern y = 638 / 636 / 631, Titel 752 / 752 / 747, Texte 827 / 826 / 821. | Gleiches top für alle drei Spalten (gleiche Paddings). | [annotated/UI5-07.png](annotated/UI5-07.png) |
| UI5-08 | low | bilder | /liebe-worte/ / laptop-1440 | **Rest von UI4-09: letztes Kundenfoto größer und 8 px nach links versetzt**: Foto 6 (C&T) x = 93, 542 x 417 px; Fotos 1-5 x = 101, 534 x 347-357 px. | Alle Fotos 534 x 356 px (object-fit: cover), x = 101. | [annotated/UI5-08.png](annotated/UI5-08.png) |
| UI5-09 | low | bilder | /ueber-mich/ / laptop-1440 | **Rest von UI4-10: Bildpaar mit verschiedenen Größen und Höhen**: Foto 1: 225 x 300 px bei y = 1357; Foto 2: 179 x 239 px bei y = 1380 (23 px tiefer, 20 % kleiner). Unverändert. | Gleiche Höhe und Oberkante oder bewusster, größerer Versatz. | [annotated/UI5-09.png](annotated/UI5-09.png) |
| UI5-10 | low | layout_abstaende | /ueber-mich/ / laptop-1440 | **Rest von UI4-11: Button "Jetzt anfragen" nur 7 px unter dem Text**: Absatz endet y = 1566, Button beginnt y = 1573 (7 px). Absätze haben 27 px Zeilenabstand. Mobil ebenfalls ca. 8 px unter dem Zitat. | margin-top 32-48 px. | [annotated/UI5-10.png](annotated/UI5-10.png) |
| UI5-11 | low | responsive | / / tablet-1024 | **Rest von UI4-12: Tablet 1024 mit 340-px-Textspalte, Startseite 12 133 px hoch**: Haupttext in 340-px-Spalte (x 347-687, ca. 35 Zeichen je Zeile) bei 1024 px Breite, Seite 12 133 px hoch (Laptop 6 860 px). Unverändert seit Runde 3. | Textspalte zwischen 768 und 1199 px auf 560-640 px verbreitern, Abschnittsabstände begrenzen. | [annotated/UI5-11.png](annotated/UI5-11.png) |
| UI5-12 | low | komponenten | / / laptop-1440 | **Zwei verschiedene Rosé-Füllungen bei sonst gleichen Buttons**: "Ihr wollt mehr wissen", "Jetzt Anfragen" und "Kontakt" sind #EDE2DF, "Mehr liebe Worte" und "Schreib mir" (Footer) #DCCACA. Gleiche Größe und Schrift, aber zwei Fülltöne; auf /ueber-mich/ stehen beide Töne unter 400 px Abstand untereinander. | Eine Füllung (#EDE2DF) für alle sekundären Flächen-Buttons. | [annotated/UI5-12.png](annotated/UI5-12.png) |
| UI5-13 | low | layout_abstaende | /ablauf/ / tablet-1024 | **Ablauf Tablet/Mobil: Trennlinien versetzt, Reste am linken Rand**: Bei 1024 px liegen zwei Haarlinien bei x = -345 bis 80 (sichtbarer 80-px-Stummel am linken Rand, y = 1271 und 1942), die obere Trennlinie über dem Foto x = 458-974 statt zentriert (Seitenmitte 512, Linienmitte 716). Bei 768 px läuft sie von x = 330 aus dem Bild (846 > 768); mobil-390 von x = 154 bis zum Rand. Foto mobil x = 21-380 (Rand 21 / 10 px). | Trennlinien im Mobil-/Tablet-Layout auf Spaltenbreite zentrieren (left:50%; translateX(-50%)), Stummel ausblenden. | [annotated/UI5-13.png](annotated/UI5-13.png) |
| UI5-14 | low | responsive | /kontakt-2/ / mobile-390 | **Kontakt mobil: Formularfelder nur 253 px breit, Select-Text abgeschnitten**: Alle Felder x = 68-321 (65 % der Breite, 68 px Rand links und rechts) bei 390 px; Überschrift x = 63, Einleitung x = 62, Label x = 68. Der Select zeigt "Wie hast du von mir erfah..." mit Auslassung. Bei 768 px 590 px, bei 1024 px 790 px breit. | Formularspalte mobil auf 100 % minus 24-px-Rand (342 px) und gemeinsame linke Kante. | [annotated/UI5-14.png](annotated/UI5-14.png) |
