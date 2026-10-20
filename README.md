# Lern-Apps (Lernwelt)

Sammlung interaktiver Lern-Apps für den Unterricht (Mittelschule Bayern, v. a.
5. Klasse). Gehostet über GitHub Pages unter `geitner-hub.github.io/Lern-Apps`,
verwaltet über ein eigenes Admin-Panel.

## Struktur

```
index.html            Startseite (bleibt im Hauptordner – Home-Bildschirm-Symbol!)
admin.html            Verwaltung (Login wird im Cloudflare Worker geprüft)
aufgaben-check.html   Werkzeug: Beispielaufgaben aus aufgaben.js ansehen
404.html              Leitet alte Links (vor der Ordnerstruktur) automatisch um
config.json           Zentrale Konfiguration (nur diese Datei schreibt der Worker)
sw.js                 Offline-Speicher – muss im Hauptordner liegen
manifest.webmanifest  App-Symbol (Anleitung: APP-SYMBOL.md)

apps/mathe/  apps/englisch/  apps/gpg/   Lern-Apps nach Fach
apps/vorlage/app-template.html          Vorlage für eigene Apps (erst prüfen, ob ein Aufgabentyp reicht!)
apps/typen/uebung.html                  Aufgabentyp-Baukasten: eine Seite für alle Inhaltsdateien (Etappe 9)
spiele/               RUN!, Tower Defense, Mein Dorf (dorf.html), Tauziehen-Duell (tauziehen.html), Wort des Tages (wort-des-tages.html),
                      Zauberwort (zauberwort.html), Kitchen-Chaos (kitchen-chaos.html),
                      Entdecker-Expedition (expedition.html), Room Detective (room-detective.html),
                      Die Insel (insel.html, im Aufbau: Probelauf)
daten/                katalog.json (Inhalts-Katalog mit Themen-IDs), vokabeln5.json, vokabeln6.json, lernwelt-inhalte.json, dorf-inhalte.json,
                      woerter-en.json (Prüfliste fürs Wort des Tages, ENABLE-Wortliste, gemeinfrei)
                      kitchen-chaos.json (Schauplätze, Zutaten, Satzrahmen, Stufen)
                      room-detective.json (Gegenstände, Möbel, Präpositionen, Fälle, Merkmale der Verdächtigen, Stufen)
                      insel.json (Die Insel: Höhen- und Gebietskarte, Gebäude, Plätze, Wege, Bauplätze, Schilder)
                      insel-auftraege.json (Die Insel: Bewohner, Warenkisten, Paket-Orte, Satzrahmen je Stufe)
                      karten.json (Europa- und Deutschlandkarte, für Länder-Finder und Expedition)
                      welt.json (alle Länder in Längen-/Breitengraden, Kontinente, Länderlisten der Welt-Modi)
                      ozeane.json (die fünf Ozeane für den Globus, Natural Earth, gemeinfrei)
                      bayern.json (Bayernkarte: Bezirke © GeoBasis-DE / BKG, dl-de/by-2-0; Flüsse, Seen, Städte, Gebirge)
                      expedition.json (Hauptstädte, Nachbarn, Kartenmitten)
                      tower-defense.json (Tower Defense: Karten, Landschaften, Wellen, Türme, Gegner)
daten/inhalte/<fach>/ Inhaltsdateien des Baukastens (<Themen-ID>.json) und ihre Bilder (SVG)
gemeinsam/            Code, den alle Seiten nutzen (siehe unten)
gemeinsam/admin/      Module des Admins (admin.html lädt sie in fester Reihenfolge, Etappe 6)
gemeinsam/typen/      Die sieben Aufgabentypen (zuordnen, sortieren, lueckentext, eingabe, beschriften, bildwort, markieren)
fonts/ icons/ vendor/ Schriften, Symbole, fremde Bibliotheken
cloudflare/           Worker-Quelltext und Anleitung
werkzeuge/            Prüfskript (pruefen.py), Inventar (inventar.py → INVENTAR.md),
                      Rauchtest (RAUCHTEST.md), Testumgebung (TESTUMGEBUNG.md),
                      Vorlage für neue Inhalte (INHALT-PROMPT.md)
.github/workflows/    pruefen.yml – lässt pruefen.py bei jedem Upload laufen (grüner Haken / rotes Kreuz)
```

| Datei in `gemeinsam/` | Zweck |
|---|---|
| `umgebung.js` | **Erstes Skript jeder Seite.** Live/Test erkennen (`LW.UMGEBUNG`), Version (`LW.VERSION`), Speicher-Register aller Schlüssel, Trennung der Testumgebung |
| `shared.js` | Gemeinsame Konstanten & Helfer (Fächer, Farben, `escHtml`, `isSafeLink`, QR) – **einzige Quelle** |
| `config-api.js` | Laden (öffentlich/Admin) und Speichern über den Worker |
| `navbar.js` | Home-Button + Ergebnisspeicherung, in jeder App am Ende von `<body>`; lädt `pass.js` automatisch |
| `pass.js` | Lernwelt-Pass: XP, Level, Wochen-Serie, Meisterschafts-Sterne, Sicherungs-Code, Truhen-Zähler |
| `avatar3d.js` | 3D-Avatar aus Blöcken (lädt `vendor/three.min.js` erst bei Bedarf) |
| `chest3d.js` | 3D-Truhe zum Öffnen |
| `dorf-kern.js` | „Mein Dorf“: Spielstand, Aufträge, Bauen; von `navbar.js` in jeder App mitgeladen |
| `dorf-szene.js` | „Mein Dorf“: 3D-Dorf (Voxel-Gebäude als Code, feste Iso-Kamera), nur in `spiele/dorf.html` |
| `katalog.js` | Inhalts-Katalog laden und abfragen: Themen-IDs, Zuordnung alter Ergebnis- und Inhalt-Schlüssel (`LernKatalog`) |
| `aufgaben.js` | Aufgaben-Pools für die Spiele („Meine Themen“), Wortquelle `woerter()` für Wort-Spiele |
| `ziffernblock.js` | Großer Ziffernblock für Mathe-Apps (`LernZiffernblock`): Felder antippen, Ziffer springt weiter, iPad-Tastatur bleibt zu (Zahlenstrahl, Stellenwerttafel) |
| `karten-ansicht.js` | Karten laden, zoomen, verschieben, antippen (Länder-Finder, Expedition); `LernKarte.markup` zeichnet Flächen, Linien (Flüsse) und Punkte (Städte) mit Tippzonen |
| `globus.js` | Drehbarer Globus als SVG (orthografisch, kein WebGL) mit Gradnetz, Äquator und Nullmeridian (`LernGlobus`); Ozeane aus `daten/ozeane.json` |
| `welt-karte.js` | Weltkarte in **Equal Earth** (flächentreu) aus `daten/welt.json` über `vendor/d3-geo.min.js` (`LernWelt`) – Grundlage für alle Weltkarten und den Globus |
| `insel-welt.js` | „Die Insel“: Welt aus Blöcken nach `daten/insel.json` (Gebiete, Gebäude-Vorlagen, Wege, Absperrungen), Testinsel, Weltstücke (16 × 16 × 24) zu je einem Mesh gebacken (`LernInselWelt`), nur in `spiele/insel.html` |
| `insel-figuren.js` | „Die Insel“: Pass-Figur und Bewohner (Looks, gebacken), Warenkisten, Pakete, Vorlesen (`LernInselFiguren`) |
| `insel-auftraege.js` | „Die Insel“: Auftragsrahmen – Aufträge aus Bausteinen, Prüfung durch die Welt, erster Versuch (`LernInselAuftraege`) |
| `insel-bauen.js` | „Die Insel“: Bauen auf Bauplätzen – Raster, Antippen, Inventar, Bauplan prüfen, Spielstand (`LernInselBauen`) |
| `insel-karte.js` | „Die Insel“: Schatzkarte (aus den Weltdaten gezeichnet, Planquadrate, Maßstab) und Kompass (`LernInselKarte`) |
| `insel-steuerung.js` | „Die Insel“: Joystick, Kamera (dritte Person), Kollision mit dem Blockgitter, Hochsteigen, Sperre geschlossener Gebiete (`LernInselSteuerung`) |
| `spiel-hilfen.js` | Kleine Bausteine für die neuen Spiele: Runde melden, Endlos-XP, robuste Zeiger (mehrere Finger), wiederholbarer Zufall |
| `qrcode.js` | QR-Code-Erzeugung im Browser (MIT-Lizenz, Kazuhiko Arase) |
| `fonts.css` | Lokal gehostete Schriften aus `fonts/` (kein Google Fonts → DSGVO) |

**Weltkarten:** Alle GPG-Apps, die eine Weltkarte brauchen, nutzen die Equal-Earth-Projektion über
`gemeinsam/welt-karte.js`. Quelle: Natural Earth 1:50 Mio. (gemeinfrei, naturalearthdata.com), mit mapshaper
vereinfacht (15 %, Grenzen bleiben deckungsgleich), Koordinaten in 1/100 Grad. Länderlisten, Ausschnitte und
Lupen (z. B. Mittelamerika) je Modus stehen in `daten/welt.json` unter `modi` und lassen sich dort ohne Code
ändern (IDs = ADM0_A3-Codes wie in `karten.json`). `vendor/d3-geo.min.js` enthält d3-array 3.2.4 und
d3-geo 3.1.1 (ISC-Lizenz).

**Bayernkarte** (`apps/gpg/bayern.html`, `daten/bayern.json`): schon projiziert (transversale Mercator, 11,4° O).
Regierungsbezirke aus VG250 des BKG (**© GeoBasis-DE / BKG**, Datenlizenz Deutschland – Namensnennung – 2.0;
Quellenvermerk steht in der App), Nachbarländer, Donau, Main, Inn, Isar und die drei Seen aus Natural Earth.
Lech, Altmühl, Naab und Regen sowie die Gebirge sind schematisch über Ortskoordinaten gezeichnet (kein freier
Datensatz in dieser Genauigkeit erreichbar). Listen je Modus und der Heimatbezirk (`heimat`, golden umrandet)
stehen in `bayern.json`.

Die Skripte in `gemeinsam/` finden den Hauptordner selbst (über ihren eigenen Ort).
Deshalb funktionieren sie aus jeder Ordnertiefe – nur der Pfad beim Einbinden ändert sich.

**Wichtig:** Ergebnisse und Pass-Fortschritt werden nach dem **Dateinamen** gespeichert
(ohne Ordner). Jeder Dateiname darf also nur einmal vorkommen – und eine App darf später
in einen anderen Ordner umziehen, ohne dass Fortschritt verloren geht (dann `config.json`
über den Admin und die Liste in `404.html` anpassen).

## Neue App einpflegen

**Zuerst prüfen, ob ein Aufgabentyp reicht** (Abschnitt „Aufgabentyp-Baukasten“): Zuordnen, Sortieren, Lückentext,
Eingabe, Beschriften oder Bild-Wort. Dann ist eine neue App nur eine Inhaltsdatei. Eine eigene App lohnt sich nur
für Spiele und besondere Mechaniken (Karte antippen, Zeichnen, Bewegung …):

1. Vorlage `apps/vorlage/app-template.html` in den Fach-Ordner kopieren, z. B.
   `apps/mathe/meine-app.html`. Einbinden (für `apps/<fach>/`):
   im `<head>` als **erstes Skript** direkt nach `<meta charset>`
   `<script src="../../gemeinsam/umgebung.js"></script>`,
   dann `<link rel="stylesheet" href="../../gemeinsam/fonts.css">`,
   am Ende von `<body>` `<script src="../../gemeinsam/navbar.js"></script>`.
   Spiele liegen eine Ebene höher (`spiele/`) und nutzen `../gemeinsam/…`.
   Daten (JSON) aus `daten/` laden, z. B. `fetch('../../daten/vokabeln5.json')`.
   **Keine Google-Fonts-Links oder andere externe Dienste einbinden.**
2. In `admin.html` über „Neue App“ eintragen, mit Ordner: `apps/mathe/meine-app.html`
   (auch `…?parameter=wert` oder `https://…` möglich).
3. Klassenstufe(n) und Tags über 🏷 setzen – fertig.
4. Neues Fach mit eigenem Ordner? Einfach `apps/<fach>/` anlegen.

## Sicher hochladen (Infrastruktur)

- **Testumgebung:** Repo `Lern-Apps-test` (geitner-hub.github.io/Lern-Apps-test/). Neues zuerst dort
  hochladen und prüfen, dann live. Einrichten: `werkzeuge/TESTUMGEBUNG.md`. Dort bekommt jeder
  Speicherschlüssel automatisch das Präfix `lwtest-`; Admin-Speichern und Cloud-Sicherung sind gesperrt.
- **Version:** bei jeder Änderung an geladenen Dateien `VERSION` in `sw.js` **und** in
  `gemeinsam/umgebung.js` gleich erhöhen. Angezeigt im Admin (oben) und im Pass unter „Sicherung“.
- **Prüfung:** `werkzeuge/pruefen.py` läuft bei jedem Upload (GitHub → Actions). Rot = ansehen, bevor die Kinder üben.
- **Rauchtest:** nach jedem Upload die Checkliste `werkzeuge/RAUCHTEST.md` (ca. 5 Minuten).
- **Speicher-Register:** jeder Schlüssel im Gerätespeicher steht in `gemeinsam/umgebung.js` (`SPEICHER`).
  Neue Schlüssel beginnen mit `lernwelt-`; bestehende Namen nie ändern.
- **Sicherung:** jede Nacht automatisch als Release `sicherung-JJJJ-MM-TT` (nur bei Änderungen);
  Zurückholen: `werkzeuge/SICHERUNG.md`.
- **Inventar:** `python3 werkzeuge/inventar.py` erzeugt `werkzeuge/INVENTAR.md` neu (Handspalten bleiben).
- **App-Prüfung:** `werkzeuge/APP-PRUEFUNG.md` – Ergebnis der Prüfung aller Apps (Etappe 3), Anforderungen an
  die Engines und die Lücken im Lehrplan (Startliste für neue Apps).
- **Ein Commit pro Upload:** alle Dateien einer Etappe gemeinsam hochladen (github.dev), sonst wird jeder
  Zwischenstand einzeln geprüft und ist oft rot.
- Upload nachmittags oder abends, nie kurz vor dem Unterricht.

## Ladekette (Infrastruktur Etappe 2)

Grundsatz: **Kern sofort, Rest bei Bedarf.** Die Budgets prüft `werkzeuge/pruefen.py`, gemessen **komprimiert** (gzip, so liefert GitHub Pages aus –
das ist die Menge, die übers Schul-WLAN geht; komprimiert ≈ ein Drittel der Dateigröße).

| Was | Lädt sofort | Lädt bei Bedarf | Budget (komprimiert) |
|---|---|---|---|
| Startseite | umgebung.js, shared.js, config-api.js, pass.js | Sicherung (gleich nach dem Aufbau), Dorf-Kern (nur mit Dorf), QR (QR-Knopf), 3D-Figur und Truhe (Pass) | < 65 KB |
| Jede Lern-App | umgebung.js, navbar.js, pass.js (`SOFORT` in navbar.js) | pass-extras.js (erste Meldung), Dorf-Kern (nach der ersten Runde, nur mit Dorf), Sicherung (nur mit Karte) | < 35 KB |
| Offline-Speicher (sw.js) | `START` = Kern | `NACHLADEN` = Spiele, 3D, große Daten: gestaffelt im Hintergrund | < 300 KB |

- **Änderungen wirken sofort (seit v62):** Der Service Worker holt jede Datei mit `cache: 'no-cache'` – das iPad fragt bei
  GitHub nach, ob es eine neue Fassung gibt (meist nur ein winziges „unverändert“), statt bis zu 10 Minuten die Browser-Kopie
  zu nehmen (GitHub Pages schickt `max-age=600`). Auch der Kern beim Update (`START`) wird frisch geholt. Ausnahme: `vendor/`,
  `fonts/`, `icons/` kommen weiter direkt aus dem Speicher. Offline bzw. bei langsamem WLAN (> 4 s) gilt die gespeicherte Kopie.
  Nach einem Merge dauert es nur noch, bis GitHub Pages fertig veröffentlicht hat (meist 1–2 Minuten).

- **pass.js** rechnet und speichert nur noch. Anzeige (XP-Meldung, Lob, Konfetti), Safari-Hinweis,
  Speicher-Wartung und Diagnose stehen in **gemeinsam/pass-extras.js**. Neue Funktionen, die nicht jede App
  sofort braucht, gehören dorthin oder in ein eigenes Modul – nicht in den Kern (das Budget ist ein Polster, kein Freifahrtschein).
- **Nachladen in Seiten:** `LW.laden('gemeinsam/datei.js')` → Promise, jede Datei nur einmal.
- **Hintergrund-Laden:** Jede Seite bittet sw.js 5–25 s nach dem Öffnen (zufällig), fehlende Dateien aus
  `NACHLADEN` zu holen, eine nach der anderen, höchstens 25 s am Stück. Nach einem Schultag ist alles offline da.
  Bei einer neuen Version übernimmt sw.js, was das iPad schon hatte.
- **Speicher-Wartung:** einmal am Tag von der Startseite. Alte Ergebnis-Einträge (über 60 Tage) werden zu
  einem Eintrag pro Tag verdichtet; die Belegung wird gemessen. Ab 4 MB (oder wenn Speichern scheitert)
  warnt der Pass unter „Sicherung“.
- **Fehlerprotokoll und Diagnose:** Abstürze werden nur auf dem iPad gemerkt (höchstens 30). Ansehen:
  Pass → Sicherung → **fünfmal auf die Versionszeile tippen** (Version, Speicher, Offline-Speicher, Fehler).
  Weitergabe an den Worker ist vorbereitet (`FEHLER_SENDEN` in umgebung.js), aber aus, bis die
  Schulleitung zustimmt.

## Übungs-Rahmen und Kopfrechnen mit Stufen (Infrastruktur Etappe 4)

- **gemeinsam/ueben.js** (`LernUeben.start({...})`): Stufenwahl, Runde mit 10 Aufgaben, eigene Zifferntastatur
  (keine iPad-Tastatur), Rückmeldung **mit Erklärung**, Tipp, Ergebnis mit Themen-ID, Meisterschaft
  (2 Runden ≥ 70 % → ⭐). `LernUeben.Freigabe.erlaubt(id)` fragt seit Etappe 7 `gemeinsam/freigabe.js`
  (die App bindet sie **vor** ueben.js ein). Angelegt: `LernUeben.Fehlerheft` (sammelt schon, Anzeige Etappe 8),
  Vorlesen `?vorlesen=1`, große Schrift `?gross=1`.
- **gemeinsam/generatoren-mathe.js**: alle Rechenaufgaben – für die App **und** für die Spiele (aufgaben.js
  hat keinen eigenen Rechen-Code mehr). Neuer Aufgabentyp = eine Funktion in `G`.
- **daten/kopfrechnen.json**: Stufen je Klasse (Generatoren + Gewicht). Neue Stufe = Eintrag hier + Stufe im
  Katalog. Jede Stufe ist automatisch ein Pool in den Spielen (ID = Themen-ID), sobald ein Kind sie gemeistert hat.
- **Zwei Apps auf demselben Rahmen (Etappe 4b):**
  - `apps/mathe/kopfrechnen.html` (Klasse 5) bzw. `?klasse=1…6`: **nur Einmaleins und Grundrechenarten**
    (Einmaleins · Plus & Minus · Mal & Geteilt · Gemischt; Klassen 1–4 als leichtere Stufen).
  - `apps/mathe/mathe-trainer.html?klasse=5|6`: **Stoff der ganzen Jahrgangsstufe** (Kl. 5: große Zahlen,
    Rechenregeln, Rechenvorteile, ganze Zahlen; Kl. 6: Teilbarkeit, Brüche, Dezimalzahlen). Neue Themen des
    Schuljahres = neue Stufen in `daten/kopfrechnen.json` → `apps.trainer`.
  - `kopfrechnen_kl1–6.html` und `kopfrechnen-neu.html` sind **Weiterleitungen** (Kennzeichen `LW-WEITERLEITUNG`).
    Beim ersten Öffnen übernimmt `LernUeben.uebernehme(alt, neu)` Ergebnisse, Sterne und offene Dorf-Aufträge.
  - Die Stufen-IDs des Trainers heißen aus historischen Gründen `ma.5.kopf.…` – IDs werden nie umbenannt.

## Admin: Ordnen, Regale, Entwurf → Veröffentlichen (Infrastruktur Etappe 6)

- **Entwurf → Veröffentlichen:** Jede Änderung im Admin landet zuerst als Entwurf auf dem Gerät
  (`lernwelt-admin-entwurf`). Unten erscheint eine Leiste „✏️ n Änderungen noch nicht veröffentlicht“ mit
  **🚀 Veröffentlichen** (ein Commit für alles), **Verwerfen** und der Liste der letzten Veröffentlichungen.
  Der Entwurf überlebt Neuladen; wurde config.json inzwischen woanders geändert, fragt der Admin nach.
- **🗂 Ordnen** (ersetzt „Sichtbarkeit“): Fächer, Regale und Apps per Finger ziehen (SortableJS in `vendor/`,
  MIT-Lizenz). **Regale** = Untergruppen eines Fachs (`config.gruppen: [{ id, fach, name }]`, `apps[].gruppe`).
  Die Startseite zeigt Apps ohne Regal wie bisher und jedes Regal als eine wischbare Zeile.
- **Schülervorschau:** „👁 Vorschau öffnen“ zeigt die Startseite mit dem aktuellen Admin-Stand für eine Klasse
  (`index.html?vorschau=5`, liest `lernwelt-admin-vorschau`).
- **Suche und Filter** in der App-Liste: Name, Fach, Klasse, Sichtbarkeit.
- **Module:** `gemeinsam/admin/` – kern (Anmeldung, Laden, Entwurf), pass, spiele, dorf, uebersicht, apps,
  sichtbarkeit (alt), ordnen, tags, werkzeuge, freigaben (Etappe 7), start (immer zuletzt).
- **Worker zuerst:** Der Worker prüft seit Etappe 6 `gruppen`, `apps[].gruppe` und `catOrder`
  (`cloudflare/worker.js` bei Cloudflare einfügen, bevor der neue Admin Regale speichert).

## Freischaltung und Fokus-Modus (Infrastruktur Etappe 7)

Admin → **🎯 Unterricht** (Startseite, Fokus, Freigaben, Gruppen-Auswertung). Ohne Accounts: ein iPad weiß, wer es ist, aus der **Klasse im Pass** und – falls eine
Sicherungskarte verbunden ist – aus der **Kartengruppe** (der Sync-Worker schickt deren Kennung mit).

- **Freigaben** (`config.freigaben`): je Themen-ID, für wen was gilt.
  `{ "en.5.vok.u5": { "alle": "2026-11-10" }, "ma.6.kopf.brueche": { "k6": "zu", "g:<Gruppe>": "offen" } }`.
  Wer: `alle`, `k5` … `k13`, `g:<32 hex>`. Wert: `zu`, `offen` oder Datum (gesperrt bis zu diesem Tag).
  Es entscheidet der genaueste Eintrag: Stufe vor Thema darüber, Gruppe vor Klasse vor „Alle“.
  **Ohne Eintrag ist alles offen.** Gesperrtes erscheint mit 🔒 ohne Erklärtext.
- **Wo es wirkt:** Kopfrechnen, Mathe-Trainer und Vokabeltrainer (über ueben.js), „Meine Themen“ der Spiele
  (gesperrte Starter-Inhalte kommen nicht neu dazu). Dorf-Aufträge gelten je App – dort kann ein Kind ohnehin nur
  Freies üben. Neue Engine-Apps: Reihe in `FR_KATALOG_REIHEN` (`gemeinsam/admin/freigaben.js`) ergänzen.
- **Eine Sperre nimmt nie Fortschritt weg:** Ergebnisse, Sterne und gemeisterte Themen bleiben.
- **Fokus** (`config.fokus[]`): „für Klasse 6 / Gruppe 5a bis 13 Uhr nur diese Apps“. Die Startseite zeigt dann nur
  diese Apps mit dem Hinweis „🎯 Heute im Fokus“ und wird am Ende von selbst wieder normal. Direkte Links und
  QR-Codes funktionieren weiter.
- **Spielsperre** (`config.spielsperre`, Admin → 🎯 Unterricht → „🎮 Spiele erst nach Lern-Runden“): Spiele
  (`spiele/…`, **außer Mein Dorf**) gehen erst auf, wenn das Kind heute so viele gute Runden in Lern-Apps geschafft hat.
  `{ schwelle: 60, runden: { "alle": [Mo, Di, Mi, Do, Fr, Sa, So], "k5": […], "g:<gruppe>": […] } }` – genaueste Liste
  gilt (Gruppe vor Klasse vor alle), 0 = keine Sperre. Gezählt im Pass (`lernwelt-pass` → `today.lr`: Lern-App-Runden ab
  `schwelle` %, ohne Durchklicken; reist mit der Sicherungskarte). Startseite: 🔒-Kacheln und eine Anzeige im Kopf
  der Kategorie mit den Spielen („🎮 Spiele: 1 von 3 Runden“). Direkt geöffnete Spiele zeigen einen Hinweis
  (`gemeinsam/spielsperre.js`, lädt navbar.js nur auf Spielseiten und nur, wenn eine Sperre eingestellt ist).
  **Ausnahmen** (`spielsperre.ausnahmen`: `[{ id, wer, runden: 0–20, ab?, bis? }]`, Datum `JJJJ-MM-TT`, einschließlich; ohne
  `bis` = dauerhaft): z. B. „Gruppe 5a heute Spiele frei“ (`runden: 0`) oder „Klasse 6 bis Sonntag 2 Runden“. Eine laufende
  Ausnahme geht **allen** Wochentag-Listen vor; unter mehreren gilt die genaueste (Gruppe vor Klasse vor alle), bei gleichem
  `wer` die, die am frühesten endet. Admin: unter den Wochentagen „⭐ Ausnahmen“ (nur heute, nur morgen, bis Sonntag,
  Zeitraum, dauerhaft); abgelaufene Ausnahmen räumt der Admin beim nächsten Speichern weg. Braucht den aktuellen Worker.
- **gemeinsam/freigabe.js** (`window.LernFreigabe`): `erlaubt(id)`, `status(id)`, `wer()`, `fokus()`, `imFokus(datei)`,
  `spielSperre()`, `spielGesperrt(datei)`.
  Liest die Offline-Kopie von config.json; ist sie älter als 5 Minuten, holt sie config.json im Hintergrund.
- **Reihenfolge beim Hochladen:** zuerst `cloudflare/worker.js` **und** `cloudflare/sync.js` bei Cloudflare
  ersetzen, dann die Dateien hochladen, dann erst Freigaben speichern.

## Ökosystem: Wiederholung, Fehler-Training, „Heute für dich“, Infokarten (Infrastruktur Etappe 8)

- **Wiederholung mit Abstand:** pass.js merkt sich je gemeistertem Inhalt im Lernstand `m` (gemeistert am),
  `r` (letzte gute Runde) und `w` (geschaffte Wiederholungen). Fällig nach `RULES.wiederholung` = 7, 21, 60 Tagen ab `r`;
  eine gute Runde (ab der Spiele-Schwelle) in einem fälligen Inhalt zählt als Wiederholung, nach der dritten gilt er als
  gefestigt. Auswertung: **gemeinsam/wiederholung.js** (`LernWiederholung.faellig()`, `.inhalte()`), gesperrte
  Themen (Etappe 7) werden nie fällig.
- **Wo Fälliges auftaucht:** „Heute für dich“ auf der Startseite (Link startet die Stufe direkt, `?stufe=ID` in
  ueben.js), Dorf-Auftragsplatz 3 („Freie Wahl“) nimmt zuerst eine App mit fälliger Wiederholung, und in den Spielen
  kommen fällige Inhalte aus „Meine Themen“ doppelt so oft dran (`opts.bevorzugt` in aufgaben.js).
  Die Regeln von Dorf und Spielen ändern sich nicht – nur die Auswahl.
- **Fehler-Training** (ueben.js): Gibt es im Fehlerheft Fehler aus den Stufen einer App, erscheint oben die Kachel
  „🎯 Fehler-Training“. Sie übt genau die falsch gelösten Aufgabentypen (Mathe: `erzeugeTyp` über
  generatoren-mathe.js); jede richtige Antwort streicht einen Eintrag. Die Runde bringt XP, zählt aber nicht für die
  Meisterschaft einer Stufe. Der Vokabeltrainer hat dafür weiter „Schwierige Wörter üben“.
- **„Heute für dich“** (index.html, nur mit Pass): höchstens drei Karten – Lehrer-Zettel von heute, fällige
  Wiederholung, nächstes Ziel im Pass (Wochenziel bzw. nächstes Level). Abschaltbar im Admin unter
  „🎯 Unterricht → Startseite“ (`config.heute = false`, der Worker prüft das Feld).
- **Infokarten** (`infokarten.html`, ohne Passwort, Link im Admin oben): je App Fach, Klassen, Lehrplanbezug, Dauer,
  Einsatzidee, Stufen und QR-Code, erzeugt aus config.json und dem Katalog; filterbar, druckbar (helles Druckbild).
- **Gruppen-Auswertung** (Admin → „🎯 Unterricht“, Zustimmung der Schulleitung liegt vor): iPads **mit
  Sicherungskarte in einer Gruppe** zählen je gewerteter Runde (ohne Durchklicken) Thema bzw. App und Woche mit
  (`lernwelt-statistik`) und schicken die Summen gebündelt an `/sync/statistik` (gemeinsam/sync.js). Der Sync-Worker
  prüft die Karte und addiert auf **Gruppe × Thema × Woche** (Tabelle `sync_statistik`) – welche Karte gemeldet hat,
  wird nicht gespeichert; keine Namen, keine Einzelstände. Der Admin zeigt Runden, Aufgaben und % richtig, die
  schwächsten Themen zuerst, mit Hinweis bei Gruppen unter 5 Karten. Wochen älter als 200 Tage löscht der Cron;
  mit der Gruppe verschwinden auch ihre Zahlen. Ohne Karte wird nichts gemeldet.

## Aufgabentyp-Baukasten (Infrastruktur Etappe 9)

Eine neue App = **Inhaltsdatei + Katalog-Eintrag + Admin-Eintrag**. Kein neuer Code.

1. **Inhaltsdatei** `daten/inhalte/<fach>/<Themen-ID>.json` anlegen (Fach-Ordner = erster Teil der ID: `de`, `nut`,
   `en`, `ma`, `gpg` …). Gleicher Kopf für alle Typen:
   `{ "typ", "thema", "titel", "emoji"?, "untertitel"?, "klasse", "anweisung"?, "sprache"?, "runde"?, "stufen": [ { "id", "titel", "kurz"?, … } ] }`.
   Stufen-IDs beginnen mit der Themen-ID (`de.5.wortarten.drei`). Was je Typ in einer Stufe steht:

   | Typ | Stufe enthält | Bedienung |
   |---|---|---|
   | `zuordnen` | `aufgaben: [{ frage?, paare: [[links, rechts]] }]` **oder** Pool `paare` + `proAufgabe`; optional `ziele` | Teil antippen, dann Ziel |
   | `sortieren` | `aufgaben: [{ teile: [in richtiger Reihenfolge], loesung? }]`, optional `trenner` | Teile der Reihe nach antippen |
   | `lueckentext` | `aufgaben: [{ text: "He ___ …", antwort, optionen? }]` | Antippen (mit optionen) oder tippen |
   | `eingabe` | `aufgaben: [{ frage, antwort, einheit? }]` | Zahl → Zifferntastatur, sonst Textfeld |
   | `beschriften` | `bild: "datei.svg"`, `marken: [{ x, y (Prozent), wort }]` | markierten Teil benennen (4 Begriffe) |
   | `bildwort` | `woerter: [{ bild (Emoji oder Datei), wort, de? }]`, `richtung`: bild-wort · wort-bild · hoeren | Bild/Wort antippen, 🔊 in `sprache` |
   | `markieren` | `aufgaben: [{ satz: "She [go] to school.", richtig?, frage? }]` | das Wort in [ ] im Satz antippen (Fehler, Signalwort …) |

   **Mehrere Typen in einer Datei** (Neue Lern-Apps Etappe 6): `"typ": "gemischt"` im Kopf und `"typ"` je Stufe –
   oder `"typ"` an einer einzelnen Aufgabe (lueckentext, sortieren, eingabe, markieren), z. B. Kurzantworten als
   Lückentext in einer Satzbau-Stufe. **Mix-Stufe:** `{ "id", "titel", "mix": true, "aus"?: [Stufen- oder Themen-IDs,
   auch aus anderen Inhaltsdateien], "nurGeuebt"?: true }` zieht Aufgaben aus anderen Stufen; ohne `aus` aus allen
   Stufen der Datei, mit `nurGeuebt` nur aus schon geübten („Meine Themen“). Beispiel: `daten/inhalte/en/en.5.to-be.json`.

   **Inhalte:** `en.5.to-be` (Etappe 6), `en.5.simple-present`, `en.5.simple-past` (Etappe 7; die alten Apps
   `practice_simple_present.html` und `simple-past.html` leiten weiter, `typen.js` übernimmt ihre Ergebnisse über die
   Tabelle `UMZUG`). **„So geht's“:** `"hilfe": [{ titel, text, beispiele: [[en, de]], tabelle: [[…]] }]` im Kopf
   einer Inhaltsdatei zeigt eine Erklär-Kachel vor den Stufen.
   **Knowing English** (`apps/englisch/knowing-english.html`, Etappe 7): Übersicht aller Grammatik-Strukturen
   (14 Inhaltsdateien `en.5.*`/`en.6.*`) mit Fortschritt; „Mixed“, „Welche Zeit passt?“ und „Meine Themen“ sind
   Mix-Stufen in `en.5.knowing-english.json`. Strukturen über der Klasse aus dem Pass erscheinen nicht.
   Neue Struktur: Inhaltsdatei + Katalog + Eintrag in `STRUKTUREN` + in `aus` der Mixed-Stufen.
   **Geometrie-Trainer** (`daten/inhalte/ma/ma.5.geometrie.json`, Etappe 10): 88 SVG-Bilder `geo-*.svg` daneben, einmalig per
   Skript erzeugt (Vierecke in vielen Lagen mit Winkel- und Seitenmarken; Würfelnetze durch Falten geprüft: genau die 11 Netze,
   Fallen nur aus den 24 übrigen Hexominos). Die archivierte App `ma.5.vierecke` bleibt unangetastet.
   **Time, Dates and Numbers** (`apps/englisch/time-dates-numbers.html`, Etappe 8): eigene App auf `ueben.js` mit
   Generatoren (Zahlwörter bis 999, Ordinalzahlen, britische Uhrzeit, Datum) und einer Uhr zum Stellen (Zeiger ziehen,
   5-Minuten-Raster). Hör-Aufgaben (`tonAuto`) nur, wenn das iPad eine englische Stimme hat.

   Jede Aufgabe darf `tipp` und `erklaerung` haben (💡 und Erklärung nach falscher Antwort). Genaues Format: Kopf von
   `gemeinsam/typen/<typ>.js`. **Bilder:** Emojis (laufen überall, keine Lizenz) oder selbst gezeichnete SVG-Dateien
   neben der Inhaltsdatei; fremde Bilder nur mit freier Lizenz (CC0) und lokal, nie von fremden Servern.
2. **Katalog:** Thema mit `quelle: { "app": "apps/typen/uebung.html", "parameter": "inhalt=<Themen-ID>" }` und allen
   Stufen eintragen, mit `lehrplan`, `dauer`, `einsatz`.
3. **Admin:** neue App mit Datei `apps/typen/uebung.html?inhalt=<Themen-ID>`.
4. `python3 werkzeuge/pruefen.py` prüft jede Inhaltsdatei gegen ihren Typ, gegen den Katalog und die Einträge in
   config.json. Neue Inhaltsdateien zusätzlich in `sw.js` → `NACHLADEN` eintragen (offline).

**Was jeder Inhalt automatisch hat:** Stufenwahl, Rückmeldung mit Erklärung, Meisterschaft (⭐), Freigabe (erscheint
selbst im Admin unter „🎯 Unterricht“), Wiederholung, Fehler-Training, Infokarte, Dorf-Aufträge, Gruppen-Auswertung.

- **Technik:** `apps/typen/uebung.html?inhalt=ID` → `gemeinsam/typen.js` (`LernTypen`) lädt die Inhaltsdatei und den
  Typ (`LW.laden('gemeinsam/typen/<typ>.js')`) und startet `LernUeben.start`. Typen nutzen die Aufgabenart `eigen` des
  Übungs-Rahmens (zeichnen ihre Bedienung selbst) bzw. `wahl`/`zahl`. Neuer Typ = neue Datei in `gemeinsam/typen/`
  + Name in `NAMEN` in typen.js + Prüfung in pruefen.py (Abschnitt 12).
- **Inhalte von Claude erzeugen lassen:** Vorlage `werkzeuge/INHALT-PROMPT.md`.
- **Längeneinheiten** (`apps/mathe/laengeneinheiten.html`) läuft seit Okt. 2026 auf dem Übungs-Rahmen wie Kopfrechnen:
  Stufen in `daten/kopfrechnen.json` → `apps.laengen` (Benachbarte Einheiten, Größere Sprünge, Gemischte Angaben,
  Rechnen mit Längen, Vergleichen, Profi), Aufgaben aus `generatoren-mathe.js` (`laenge-…`). Dateiname unverändert,
  Ergebnisse und Sterne der alten App zählen weiter.
- **Entfernt (Okt. 2026):** „Regeln in unserer Gesellschaft“ (`apps/gpg/regeln-sortierer-gpg.html`, Datei und
  config.json). Die Themen-ID `gpg.5.regeln` bleibt im Katalog reserviert (ohne Quelle).
- **Länder-Finder** bleibt eigener Typ (Karte antippen) und ist an den Rahmen angeschlossen: Modi = Stufen
  `gpg.6.laender.europa` / `.bundeslaender` (Freigabe mit 🔒, Ergebnis mit Themen-ID).

## Lernwege (Stationenarbeit mit digitalem Laufzettel)

- **Seite:** `apps/typen/lernweg.html?weg=<ID>` zeigt `daten/lernwege/<ID>.json` – Laufzettel mit Stationen,
  „So arbeitest du“ zum Abhaken, Hefteinträge im Heft-Schema, Aufgaben (Lücken, Zuordnen, Sätze, Schreiben, Mediation)
  und „Fit für die Probe?“ mit Smileys. Die Kinder schreiben alles ins Heft und kontrollieren an der Kontrollstation
  mit dem gedruckten Lösungsheft; **keine automatische Kontrolle, kein Ergebnis für Pass/Sterne**.
  Gespeichert wird nur auf dem Gerät (`lernwelt-lernweg`: abgehakte Schritte, Smileys).
- **Nur für zugeteilte Gruppen:** Ein Lernweg ist keine App in config.json. Ohne Eintrag ist er gesperrt
  (`LernFreigabe.zugeteilt(id)` – umgekehrt zu `erlaubt`). Admin → Tab **🗺️ Lernwege**: Gruppe
  (Sicherungskarten) oder Klasse antippen → `freigaben[<ID>][wer] = 'offen'`, dann veröffentlichen. Zugeteilte
  Lernwege erscheinen oben auf der Startseite unter „🧭 Mein Lernweg“. Mit Admin-Anmeldung auf dem Gerät ist jeder
  Lernweg als Vorschau zu sehen (Beamer).
- **Neuer Lernweg:** JSON-Datei `daten/lernwege/<ID>.json` (ID mit `.lernweg-`, z. B. `en.6.lernweg-u2`), Thema im
  Katalog (Bereich „Lernwege“ des Fachs, `quelle: { app: "apps/typen/lernweg.html", parameter: "weg=<ID>" }`),
  Datei in `sw.js` → `NACHLADEN`. Format: siehe `daten/lernwege/en.6.lernweg-u1.json` (stationen → schritte,
  aufgaben mit art `luecken` · `wahl` · `zuordnen` · `saetze` · `sortieren` · `schreiben` · `mediation`;
  `hefteintraege` mit zeilen `[text, stil]`, stil `g` = grün, `b` = fett).
- **Bausteine (seit v58, alle freiwillig – ohne sie verhält sich ein Lernweg wie Unit 1):**
  - Kopf: `wahlAnzahl` (so viele Wahlstationen zählen), `zieleVorher: true` (Start-Einschätzung mit den `probe`-Sätzen,
    „Fit für die Probe?“ zeigt vorher/jetzt), `autostart: "taeglich"` (Startseite öffnet den Lernweg beim ersten Besuch am Tag).
  - Station: `niveaus: true` (Kind wählt ★ Basis / ★★ Standard / ★★★ Profi, Standard vorgewählt), `wahl: true` (Wahlstation),
    `schluss: true` (unter „Zum Schluss“, z. B. Checkpoint), `code` (Kontroll-Code: „kontrolliert“ erst nach Eingabe),
    `kompetenz` (Etikett, z. B. „Grammatik“). Stationen ohne Kontroll-Schritt gelten als fertig, wenn alle Schritte erledigt sind.
  - Schritt/Aufgabe: `niveau: [1, 2]` (nur auf diesen Niveaus sichtbar). Schritt `art: "app"` mit
    `ziel: { thema: <Stufen-ID>, runden, prozent }` hakt sich selbst ab: gezählt werden gute Runden ab dem ersten Öffnen des
    Lernwegs aus dem Verlauf in `lern-apps-results` (navbar.js speichert dafür je Runde die Themen-ID `s`).
  - Aufgabenart `frei` (offene Schreibaufgabe mit `text` und `beispiel`).
  - Schritt `id`: fester Schlüssel statt Position. Wer in einen Lernweg, den Kinder schon nutzen, Schritte **einfügt**, gibt allen
    bestehenden Schritten ihre alte Position als `id` ("0", "1", …) und dem neuen eine eigene (z. B. "v") – sonst verrutschen Haken.
  - Schritt `art: "vokabeln"` (📘): die Wörter der Unit **thematisch in den Stationen**, die sie brauchen – keine große
    „Schreib alle Vokabeln ab“-Station (Unit 1 hat sie als Ausnahme am Ende).
- **Zurück zum Lernweg:** Wer aus dem Lernweg eine App öffnet, bekommt dort oben den Knopf „🧭 Zurück zum Lernweg“
  (`gemeinsam/lernweg-zurueck.js`, nur nachgeladen, wenn `lernwelt-lernweg-zurueck` im Tab gesetzt ist).
- **Startseite:** zugeteilte Lernwege stehen ganz oben als großes Banner mit Fortschrittsring und nächster Station.
- **Klassen-Übersicht (Admin → Tab 🗺️ Lernwege → „📊 Stand der Klasse“):** Jedes iPad mit Sicherungskarte in einer Gruppe meldet
  je Station einmal „begonnen“ und einmal „kontrolliert“ (mit Niveau) über die vorhandene Gruppenauswertung
  (`LernSync.lernwegMelden`, Thema `lw:<ID>:<Station>:b` bzw. `:k<0–3>`). Der Worker addiert nur Summen je Gruppe – keine
  Kennung, keine Namen; dafür war keine Worker-Änderung nötig. Die normale Gruppen-Auswertung im Tab „🎯 Unterricht“
  blendet diese Einträge aus. iPads ohne Karte fehlen in der Übersicht (dafür der Klassen-Laufzettel).
- **Erster Lernweg:** `en.6.lernweg-u1` (Highlight 6, Unit 1 „Together again“, 7 Stationen; Hören macht die Lehrkraft im Unterricht,
  Extras sind nummerierte Arbeitsblätter am Pult – die Kinder haben kein Workbook).
- **Unit 2:** `en.6.lernweg-u2` (10 Stationen: 7 Pflicht mit Niveaus, 2 Wahl, Checkpoint; App-Schritte, Kontroll-Codes, Auto-Start).

## Vokabel-Engine (Infrastruktur Etappe 5)

- **apps/englisch/vokabeltrainer.html** – ein Trainer für alle Wortlisten, alle Modi wie bisher
  (Flashcards, Quiz, Memory, Fill in, Scramble, Speed, schwierige Wörter, Lese-Einstellungen):
  `?klasse=5` → `daten/vokabeln5.json`, `?klasse=6` → `daten/vokabeln6.json`, `?liste=NAME` → `daten/NAME.json`.
- Format unverändert, ergänzt um `thema` je Unit/Sonderliste (Themen-ID aus dem Katalog; pruefen.py prüft das).
  Optional: `meta.sprache`, `meta.titel`, `meta.untertitel`, `meta.vorne`/`meta.hinten`; je Wort `bild` (Emoji oder
  Datei in `daten/bilder/`), `artikel` (der/die/das, farbig), `silben` (`Ap-fel`). Beispiel: `daten/test-wortliste.json`.
- Verlauf und Statistik nutzen für Klasse 5/6 die bisherigen Schlüssel (`vokab-…-kl5/kl6`); weitere Listen
  bekommen `vokab-…-NAME` (bei Bedarf im Speicher-Register ergänzen).
- Falsche Wörter landen im Fehlerheft; Units und Sonderlisten lassen sich über die Freigabe (Etappe 7) sperren
  (🔒, fehlen dann auch im „Mix aus allen Einheiten“).
- Eine separate Vokabelabfrage-App ist bewusst nicht geplant.
- `vokabeltrainer5/6.html` sind **Weiterleitungen** (`LW-WEITERLEITUNG`) auf `?klasse=5/6`; beim ersten Öffnen übernimmt
  `LernUeben.uebernehme` Ergebnisse, Sterne und offene Dorf-Aufträge. Auf der Startseite steht je Klasse ein Trainer.

## Archiv (archiv/)

Abgelegte Apps (Etappe 3/4b): English Dialogue (Vorlagen), Rechteck-Werkstatt, Sachaufgaben Längen,
Vierecke unterscheiden. Nicht verlinkt, nicht im Admin, nicht geprüft; ihre Themen bleiben im Katalog
(`"archiv": true`). Zurückholen: Datei zurück nach `apps/<fach>/`, Admin-Eintrag anlegen, im Katalog `archiv` entfernen.

## Inhalts-Katalog (daten/katalog.json)

Jeder Lerninhalt hat eine feste **Themen-ID**. Aufbau: Fächer → Bereiche → Themen → (Stufen).

```
ma.5.kopf            Kopfrechnen Klasse 5          (Thema einer App)
ma.5.kopf.mittel     … Stufe „mittel“              (Stufe: ID des Themas + „.“ + Name)
en.5.vok.u3          Vokabeln Klasse 5, Unit 3
gpg.5.hauptstaedte   Hauptstädte (nur in den Spielen)
```

- **IDs nie umbenennen oder neu vergeben** – sie werden in Spielständen und Freigaben stehen.
  Nur kleine Buchstaben, Ziffern und „-“, Teile mit „.“, Anfang = Fach (`ma`, `en`, `gpg`, `de`, `nut`, `daz`, `allg`).
  Die Klasse in der ID ist nur Teil des Namens; maßgeblich ist das Feld `klasse`.
- Felder eines Themas: `id`, `titel`, `klasse`, optional `foerder` (Klassen 1–4), `quelle` (`app`),
  `ergebnis` (Dateiname, unter dem navbar.js Ergebnisse und Sterne speichert), `inhalt` (alte Inhalt-ID
  der Spiele, z. B. `kopf5-mittel`; `vok5:unit3` gilt auch für `vok5:unit3/theme1`), `stufen` (geordnet),
  `lehrplan`, `dauer`, `einsatz` (werden in Etappe 3 gefüllt).
- **Brücke:** Alte Ergebnisse, Sterne und „Meine Themen“ bleiben, wie sie sind. `gemeinsam/katalog.js`
  ordnet sie über `ergebnis` und `inhalt` den neuen IDs zu (`LernKatalog.zuordnen()`), `LernPass.themaStand(id)`
  liest beide Formen. Spiele übersetzen neue IDs automatisch in ihre Aufgaben-Pools.
- **Neue App:** Thema im Katalog eintragen (sonst meldet `pruefen.py` rot) und in der App
  `LernApps.saveResult({ …, thema: '<ID>' })` melden.
- Neues Fach: in `gemeinsam/shared.js` (CAT_STYLES) **und** im Katalog unter `faecher` mit gleichem Namen.

## Ergebnisse speichern (in Apps)

```js
LernApps.saveResult({ score: 8, max: 10 });                 // Minimum
LernApps.saveResult({ score: 8, max: 10, label: '8 / 10', skill: 'einmaleins-7' });
LernApps.saveResult({ score: 8, max: 10, thema: 'ma.5.kopf.mittel' });   // neue Apps: Themen-ID aus dem Katalog
```
Gespeichert wird pro Gerät im `localStorage` (`lern-apps-results`), Schlüssel =
Dateiname + URL-Parameter. Pro App: letztes Ergebnis, Bestwert, Anzahl Versuche,
Verlauf der letzten 30 Versuche. Jedes Ergebnis löst zusätzlich das Ereignis
`lernapps:result` aus (Grundlage für spätere Level/XP).

## Bildschirmtastatur (iPad/Handy)

`navbar.js` hält die Bildschirmtastatur zwischen den Aufgaben offen: Beim Prüfen (Enter oder Knopf)
springt der Fokus kurz auf ein unsichtbares Ersatzfeld und von dort ins nächste freie Eingabefeld – auch
wenn die App das Feld neu aufbaut oder sperrt. Was in der Zwischenzeit getippt wird, wandert mit. Nach
`saveResult()` (Rundenende) oder 6 s ohne neues Feld schließt die Tastatur. Apps müssen dafür nichts tun.
Wer nach dem Prüfen auf „Weiter“ wartet, sollte **Enter = Weiter** anbieten (wie Vokabeltrainer, Simple Past)
und das Enter im Eingabefeld mit `e.stopPropagation()` abschließen. Abschalten: `<body data-tastatur="aus">`.

## Links mit Voreinstellungen (Unterricht)

- `index.html?kl=5` – Startseite nur mit Klasse-5-Apps (auch als QR über „QR zur Startseite“)
- `index.html?tag=Vokabeln`, `index.html?q=rechnen`

## Sicherheit

- Passwort und GitHub-Token liegen **nur** als Secrets im Cloudflare Worker.
- Admin-Anmeldung: Das Passwort wird nicht gespeichert; das Gerät erhält einen Schlüssel, der
  7 Tage gilt. „🚫 Alle Geräte abmelden“ im Admin macht alle Schlüssel sofort ungültig.
- Der Worker schreibt ausschließlich `config.json` und prüft jedes Feld (Apps, Tags, Ankündigung,
  Pass-Schalter). Wartung und Fehlersuche: `cloudflare/ANLEITUNG.md`.
- Der GitHub-Token läuft ab – Ablaufdatum im Kalender notieren (Erneuern: siehe Anleitung).
- Alle Texte aus der Config werden auf der Seite escaped dargestellt.
- „Versteckt“ heißt nicht geschützt: Dateien sind per direkter URL erreichbar.
- Nach dem Speichern im Admin dauert es ca. 1 Minute, bis GitHub Pages die neue
  `config.json` ausliefert.

## Lernwelt-Pass

Alle Regeln (XP-Werte, Grenzen, Sterne, Wochenziel, Truhen-Abstand) stehen gesammelt
in `RULES` am Anfang von `pass.js` und können dort angepasst werden.

- **XP pro Runde:** 5 Abschluss (2 bei unter 30 %) + bis 10 Leistung (ab 30 %, anteilig
  bei Runden unter 10 Aufgaben) + 3 neuer Rekord + 5 erste gute Runde des Tages.
- **Schutz vor Durchklicken:** unter 10 s → 0 XP; unter 30 s und unter 50 % → 0 XP.
- **Grenzen:** pro App und Tag 3 Runden voll, bis 6 halb, danach 0; ab 150 XP/Tag halbe XP;
  Apps nur für niedrigere Klassen halbe XP.
- **Sterne:** 🥉 60 % / 🥈 80 % / 🥇 90 % an jeweils 2 verschiedenen Tagen.
- **Wochen-Serie:** Ziel 3 Tage mit ≥ 50 %; Wochen ganz ohne Übung pausieren die Serie.
- **Sicherung:** nur noch automatisch über die Sicherungskarte (`gemeinsam/sync.js`, Anleitung
  `SICHERUNGSKARTEN.md`). Der alte Sicherungs-QR/-Code (`LW1`–`LW3`, `#pass=…`) wurde entfernt;
  alte Karten zeigen beim Scannen nur noch einen Hinweis auf die neue Karte.
- **Truhen & Avatar-Teile:** alle 250 XP eine Truhe. Chancen 60/30/10 % (gewöhnlich/selten/episch),
  keine Dubletten; ist der Pool leer, gibt es Sternenstaub. Neun Plätze: Kopf, Gesicht, Oberteil,
  Hose, Schuhe, Rücken, In der Hand, Begleiter, Hintergrund. Die Figur selbst (Hautton, Frisur,
  Haarfarbe, Augen, Mund) ist immer frei wählbar; Startausstattung steht in `AVATAR.START`.
  Gesperrte Teile können in der Garderobe anprobiert werden.
- **Level-Truhen:** jeder Level-Aufstieg gibt zusätzlich eine Truhe (nur ab Einführung, nicht rückwirkend).
  Sie zieht aus dem normalen Truhen-Pool (ohne Event-Anteil) und wird zuerst geöffnet. Zählung in
  `levelChests`/`levelOpened`.
- **Truhe öffnen** (`chest3d.js`): 3D-Truhe im Block-Stil, dreimal antippen (das Glühen wird stärker,
  bleibt aber neutral), dann wird das Teil gezogen und gespeichert, erst danach läuft die Animation
  (Deckel, Lichtsäule, Funken, das 3D-Teil steigt auf; Stärke je Seltenheit). Tippen überspringt.
  Varianten: normal, Level-Truhe, Halloween, Weihnachten (Geschenk), Ostern – neue Varianten in `SKINS`.
  Ohne WebGL: gezeichnete Truhe. Bei „Bewegung reduzieren“: ruhige Version.
- **Pass-Reiter:** Garderobe (Start) · Truhen · Erfolge (Leiste + Abzeichen) · Sicherung (Karte verbinden
  bzw. Stand der automatischen Sicherung; „!“, wenn die verbundene Karte nicht mehr gilt).
- **Abzeichen:** schalten legendäre Set-Teile frei (Liste in `lernwelt-inhalte.json`).
- **Saison-Modus** (Admin → 🧭 Pass): Level/Titel zählen pro Schuljahr, Wechsel automatisch am
  1. August. Gesamt-XP, Sterne, Abzeichen, Truhen und Cosmetics bleiben.
- **Events** (Admin → 🧭 Pass, einzeln schaltbar): Halloween, Weihnachten, Ostern. Während eines
  Events: 60 % Event-Teile in Truhen, eine Geschenk-Truhe nach der ersten guten Runde (einmal pro
  Schuljahr), Event-Abzeichen nach 3 guten Tagen mit legendärem Teil.
- **Avatar-Auftritte** (Admin → 🧭 Pass, Schalter „Avatar nach Runden anzeigen“, Standard: an): nach
  jeder Runde erscheint die eigene Figur ca. 3 s unten rechts – jubelt ab 50 %, winkt aufmunternd darunter
  (nie traurig), feiert Level, Sterne, Abzeichen, Truhen und Geschenke länger mit goldener Sprechblase.
  Feuerwerk bei Level-Aufstieg und Abzeichen, Konfetti bei 100 %-Runden, Gold-Stern, neuer Truhe und
  epischen/legendären Teilen aus der Truhe (`LernPass.celebrate('feuerwerk'|'konfetti')`; aus bei
  „Bewegung reduzieren“ im Betriebssystem).
  Auf der Startseite begrüßt sie einmal am Tag (mit Hinweis auf offene Truhen). Kein Auftritt bei
  „zu schnell“-Runden. `avatar3d.js` und three.js werden in Apps erst beim ersten Auftritt geladen.
  Sprüche stehen in `LOB` in `pass.js`; Aufruf von Hand: `LernPass.showAvatar({ text, big, aktion })`.
- Einstellungen stehen in `config.json` unter `"pass"` und werden über das Admin-Panel gespeichert.

### Inhalte erweitern (lernwelt-inhalte.json)
- Reine Datendatei (JSON): keine Kommentare, Texte in doppelten Anführungszeichen, Kommas zwischen
  Einträgen. Nach dem Bearbeiten z. B. auf jsonlint.com prüfen.
- Neues Truhen-Teil: Eintrag in `ITEMS` mit `quelle: 'truhe'`, `slot`, `selten` und einem Modell
  (siehe „Avatar-Teile“ unten).
- Neues Event: Eintrag in `EVENTS` + Teile mit `quelle: 'event', event: '<id>'` + Abzeichen
  `typ: 'event'` + Set-Teil mit `set: 'event-<id>'`. Es erscheint automatisch im Admin.
- **IDs nie ändern oder löschen** – sonst verlieren Kinder ihre Teile.
- Speicher: `localStorage['lernwelt-pass']` (nur auf dem Gerät).
- Schutz vor Datenverlust: Symbol auf dem Home-Bildschirm (`APP-SYMBOL.md`, eigener Speicher ohne
  Safari-Löschregel), `navigator.storage.persist()`, Sicherungskarte. Achtung: App-Symbol und
  Safari haben getrennte Speicher – Übernahme per „📷 QR scannen“ (Sicherungskarte).
- **📷 QR scannen** (Startseite): öffnet gescannte Lernwelt-Apps innerhalb der Lernwelt (wichtig für das
  App-Symbol, weil die Kamera-App immer Safari öffnet), liest Sicherungskarten ein, lehnt fremde Codes ab.
- **Safari-Hinweis:** Auf iPad/iPhone in Safari (nicht im App-Symbol) erscheint oben einmal pro Tag der
  Hinweis, das Lernwelt-Symbol zu benutzen (nicht im Admin).

### Avatar-Teile (ohne Programmieren)

Jedes Teil in `ITEMS` beschreibt seine Form als Liste von Blöcken in `modell`. Einheiten sind
„Pixel“ der Figur: Beine y 0–9, Rumpf y 9–19 (Rücken bei z −2,5), Kopf 11 × 11 × 11.

```json
{"id":"k-cap","slot":"kopf","name":"Basecap Rot","selten":"gewoehnlich","quelle":"truhe",
 "versteckt":["oben"],
 "modell":[
   {"g":[12.2,3.2,12.2],"p":[0,6.4,0],"f":"#ef4444"},
   {"g":[12.2,0.7,5.5],"p":[0,5.2,8.4],"f":"#b91c1c"}
 ]}
```

| Feld | Bedeutung |
|---|---|
| `g` | Größe `[Breite, Höhe, Tiefe]` eines Blocks |
| `p` | Position `[x, y, z]` relativ zum Anker (x rechts, y oben, z nach vorne) |
| `r` | Drehung `[x, y, z]` im Bogenmaß (0.785 ≈ 45°) |
| `f` | Farbe `"#rrggbb"`, Farbwort (`haar`, `haar2`, `haut`), `"muster:ID"` oder je Seite `{"vorne":…, "sonst":…}` |
| `an` | Anker: `kopf`, `koerper`, `beine`, `armL`, `armR`, `hand`, `begleiter`, `boden` (Standard je Platz) |
| `paar` | `true` = Block wird gespiegelt ein zweites Mal gebaut (Schuhe, Flügel, Ohren …) |
| `teile` | Unterblöcke, die sich mit diesem Block mitbewegen (Gruppe) |
| `anim` | `drehen`, `pulsieren`, `blinken`, `leuchten`, `flattern`, `schlagen`, `wehen`, `flackern`, `schweben`, `wedeln`, `wackeln`, `pendeln` |
| `licht` | Leuchtstärke 0–1 · `metall`: `true` · `glas`: Deckkraft 0–1 · `kegel`: `[Radius, Höhe]` statt Block |
| `zone` | nur Frisuren: `"oben"` wird von Kopfbedeckungen mit `"versteckt":["oben"]` ausgeblendet |

- **Farbvariante:** `{"id":"k-cap-blau", …, "basis":"k-cap", "tausch":{"#ef4444":"#3b82f6"}}` übernimmt
  das Modell der Basis und ersetzt nur Farben.
- **Kleidung:** Oberteile und Hosen haben zusätzlich `kleidung` (`muster` oder `farbe`, bei Oberteilen
  `aermel`: `kurz`/`lang`/`ohne`, `bund`, `aermelFarbe`; bei Hosen `lang: false` für kurze Hosen).
- **Muster** (Pixelbilder) stehen im Teil unter `muster` oder global unter `AVATAR.MUSTER`: `w`, `h`,
  `basis` oder `verlauf`, optional `streifen`, `senkrecht`, `karo`, `punkte`, `rects` (`[Farbe, x, y, b, h]`),
  `vorne`/`hinten`/`seite` (nur auf dieser Seite) und `loecher`.
- **Hintergründe** haben `css` (Bühnenfarbe), `deko` (SVG) und `boden` (Farbe der Plattform).
- **Figur-Optionen** (`AVATAR.FRISUREN`, `AUGEN`, `MUENDER`, `HAUT`, `HAARFARBEN`) funktionieren genauso.
- Tipp: neues Teil zuerst im Admin unter 🧭 Pass → Avatar-Teile ansehen – dort erscheint die Vorschau.

## Tower Defense (spiele/burg-verteidigung.html)

Plan: Claude Doc „Aktionsplan: Tower Defense erweitern“. Seit Etappe 1–2 kommen Karten, Landschaften, Wellen,
Türme und Gegner aus `daten/tower-defense.json`. Fehlt die Datei (offline, Fehler), läuft das Spiel mit der
eingebauten Burgwiese (`EINGEBAUT` im Spiel).

- **Karten** (`karten`): `wege` (eine Liste je Höhle, Punkte in Feldern, nur waagrecht/senkrecht; alle Wege enden
  1,25 Felder vor der Burg), `plaetze`, `burg`, optional `wasser` (Fluss → Brücken entstehen automatisch),
  `sperren` (keine Deko: Höhle, Sicht auf die Burg), `tuerme` (erlaubte Türme), `rahmen` (Kamera),
  `staerke` (Lebenspunkte ×), `wellen` (Name eines Wellensatzes). Mehrere Wege: Gegnergruppen kommen abwechselnd.
- **Landschaften** (`biome`): Farben für Boden, Weg, Himmel, Licht und eine Deko-Liste. Die Deko-Namen
  (`tanne`, `kaktus`, `schilf` …) sind Funktionen in `DEKO` im Spiel.
- **Neuer Turm / Gegner:** Werte in die JSON, Aussehen und Verhalten als Eintrag in `TURM_TYPEN` bzw.
  `GEGNER_TYPEN` im Spiel. Ohne Register-Eintrag wird ein Turm/Gegner aus der JSON ignoriert.
- **Türme (Etappe 3):** Bogen, Kanone, Frost, Blitz (springt auf 3–4 Gegner), Ballista (großer Einzelschaden,
  bricht Schilde, weite Reichweite), Giftkessel (Schaden über 4 s, stapelt nicht), Banner (kein Schaden,
  Nachbartürme +25–35 %, mehrere Banner stapeln nicht). Kanone und Frost haben `nurBoden` (treffen keine
  Fledermäuse). Jede Karte erlaubt höchstens 5 Turmtypen (`tuerme`), damit das Baumenü auf dem iPad passt.
- **Gegner (Etappe 3):** Schildträger (`schild`: so viele Treffer prallen ab), Heiler (`heilung`, heilt keine
  vergifteten), Riesenschleim (`teilt`: zerfällt in 3 kleine Schleime), Fledermaus (`fliegt`). Gegner mit `info`
  bekommen beim ersten Auftauchen eine Bildkarte (Name, Satz, Tipp); gemerkt in `lern-burg-wahl` → `gesehen`.
  Runden-Wellen je Karte über `wellen` (Wellensätze `winter`, `wueste`, `herbst`, `sumpf`); die Burgwiese
  behält `standard`. Endlos mischt die neuen Monster der Karte ab Welle 4 ein (Burgwiese: unverändert).
- **Kampagne (Etappe 4):** Modus „Kampagne“ mit 10 Stationen (`kampagne.stationen`: `id`, `name`, `karte`,
  optional `wellen` und `regel` mit `text`, `startMuenzen`, `tempo`, `staerke`, `tuerme`, `bossWelle`). Nächste Station
  ab 1 Krone in der vorherigen. Türme in `kampagne.tuerme` werden ab so vielen Kronen (Summe) frei – auch in Runde und
  Endlos; Türme, die dort nicht stehen (Bogen, Kanone, Frost), sind immer frei. Die freie Kartenwahl zeigt Burgwiese,
  Karten erreichter Stationen und Karten mit eigenem Rekord; `?karte=` öffnet jede Karte. Wer schon Runden gespielt
  hat, hat Station 1 geschafft. Speicher: `lernwelt-td-kampagne` (`{ v, k: { <stations-id>: Kronen }, t: [Türme] }`),
  reist mit der Sicherungskarte. Stations-IDs nie umbenennen.
- **Abwechslung (Etappe 5):**
  - **Karte des Tages** (Modus „Heute“): Karte, Landschaft, Wellensatz und eine Regel aus `tag.regeln` werden aus dem
    Datum gewählt – alle Kinder haben am selben Tag dieselbe. Tagesrekord in `lern-burg-rekorde` → `#tag`
    (nur der heutige Tag). Türme wie sonst nach Freischaltung.
  - **Rodung:** Plätze mit `abWelle` sind zugewachsen und lassen sich ab der Bauphase vor dieser Welle für
    40 Münzen roden (`CFG.rodenPreis`). Karte „Lichtung“.
  - **Weiche:** Karten mit zwei Wegen und `weiche: [3, 5]` – vor diesen Wellen stellt die Weiche um, alle Monster
    nehmen den anderen Weg. In der Bauphase leuchtet der Weg der nächsten Welle; vor einem Wechsel gibt Abreißen
    100 % zurück. Karte „Kreuzung“.
  - **Ereignis-Wellen** (nur Endlos, jede 7. Welle, nie mit Boss, eine Bauphase vorher angekündigt): Nebel
    (Reichweite 75 %), Ansturm (viele Flitzer), Goldene Welle (kein Monster durch → +1 Herz).
  - Neue Karten werden über Kronen frei: `kampagne.karten` (Kreuzung ab 12, Lichtung ab 15).
- **IDs** von Karten, Türmen, Gegnern und Landschaften nie umbenennen oder löschen.
- **Speicher:** `lern-burg-rekorde` – Burgwiese mit den alten Schlüsseln, andere Karten mit `<karten-id>|` davor,
  beste Kronen je Karte im Feld `#kronen`. `lern-burg-wahl` merkt sich zusätzlich die Karte.
- **Link:** `burg-verteidigung.html?karte=engpass` öffnet direkt diese Karte.

## Mein Dorf (im Aufbau)

Aufbauspiel über das ganze Schuljahr: Lern-Apps erfüllen Aufträge, die Belohnungen bauen das Dorf.
Plan und Stand: Claude-Doc „Aktionsplan: Aufbauspiel „Mein Dorf““.

- `gemeinsam/dorf-kern.js` – Spielstand im `localStorage` (`lernwelt-dorf`, bewusst kompakt, weil er im
  Sicherungscode mitreist). Gespeichert wird erst, wenn ein Kind das Dorf zum ersten Mal öffnet.
- `daten/dorf-inhalte.json` – Gebäude, Stufen, Kosten, Bauplätze, Auftragswerte (reine Datendatei).
  IDs nie umbenennen, sie stehen in den Spielständen.
- `pass.js` meldet jede gewertete Runde als Ereignis `lernpass:gewertet`
  (`{ app, prozent, anzahl, dauer, blocked, inhalt, tag }`). Aufträge zählen nur Runden ohne `blocked`
  und ab der Prozent-Schwelle.
- Aufträge bekommen nur Apps, die nicht versteckt, für die Klasse freigeschaltet, keine Spiele
  (`spiele/`) und nicht mit `"dorf": false` ausgeschlossen sind. Das Feld steht im App-Eintrag in
  `config.json`, z. B. `{ "name": "…", "datei": "apps/mathe/…", …, "dorf": false }`
  (Schalter im Admin folgt in Etappe 3).
- **Auftragsbrett** (`spiele/dorf.html`): 3 Plätze – Mathematik, Englisch/GPG, freie Wahl. Eine App steht
  nie auf zwei Plätzen; ist eine Kategorie leer, nimmt der Platz eine beliebige Lern-App. Ein Auftrag =
  2 Runden mit mind. 70 % in dieser App → 15–25 Holz oder Stein (+50 %, wenn die App seit 14 Tagen nicht
  geübt wurde). Erledigte Plätze füllen sich am nächsten Tag, offene Aufträge bleiben. Tauschen: 1 pro Tag,
  bis 3 ansparbar. Aufträge, deren App versteckt oder ausgeschlossen wird, werden sofort ersetzt.
  Alle Werte in `daten/dorf-inhalte.json` → `AUFTRAEGE`.
- In den Lern-Apps erscheint unten eine kurze Meldung („Dorf-Auftrag: 1 von 2“, „Auftrag erfüllt!“).
- **Bauen:** 12 feste Bauplätze (Lage in `dorf-inhalte.json` → `BAUPLAETZE`). Platz 1 gehört dem Rathaus,
  jede Rathaus-Stufe schaltet 3–4 Plätze frei. Gebäude in `GEBAEUDE` (Name, Icon, Stufen, Ansehen, Bonus);
  Kosten je Stufe in `BAU.stufenKosten`. Der erste Bau ist sofort fertig, alle weiteren ab dem nächsten Tag.
  Sägewerk und Schmiede geben +10/20/30 % Holz bzw. Stein auf Auftragsbelohnungen. Außer Wohnhäusern
  gibt es jedes Gebäude nur einmal.
- **3D** (`dorf-szene.js`): gezeichnet wird nur bei Änderungen, Pixel-Ratio höchstens 2. Die Modelle sind
  Code (`MODELLE`), ein neues Gebäude ohne Modell erscheint als einfaches Haus. Ohne WebGL zeigt die
  Seite die Bauplätze als Knöpfe.
- **Wochenauftrag** (Montag bis Sonntag, auf dem Brett unter den Tageszetteln): automatisch „Erledige 4 Aufträge
  vom Brett“, oder von der Lehrkraft im Admin (🏘️ Dorf) je Woche und Klasse eine App oder ein Thema
  (z. B. „Vokabeln Unit 2“ = Runden, die `vok5:unit2…` melden). Belohnung 30 Holz + 30 Stein + 2 Gold – Gold
  gibt es nur hierfür. Ein neuer Auftrag der Lehrkraft ersetzt einen offenen; am Montag beginnt ein neuer.
- **Admin → 🏘️ Dorf:** Wochenaufträge, Auftragsplätze (1–3), Tausche pro Tag / höchstens, Baukosten-Faktor,
  Apps ausschließen, Übersicht der Dorf-Inhalte. Gespeichert in `config.json` → `"dorf"` und `apps[].dorf`.
  Der Worker (`cloudflare/worker.js`) prüft diese Felder ab der Version mit „Mein Dorf“ – der alte Worker
  lässt sie ungeprüft durch, beides funktioniert.
- **Bewohner:** Jede fertige Wohnhaus-Stufe bringt einen Bewohner (Reihenfolge und Texte in `BEWOHNER`;
  16 Stück = 4 Häuser × Stufe 4). Sie stehen als kleine Figuren vor ihrem Haus. Es gibt immer einen
  **Bewohner-Auftrag** mit kleiner Geschichte (2 Runden in einer Lern-App → +10 Ansehen + Sammelstück),
  der nächste kommt am Tag nach dem Erledigen.
- **Ansehen** (⭐, nur für das Kind sichtbar, kein Vergleich): gibt es für Gebäude und Bewohner-Aufträge;
  das Rathaus braucht für Stufe 2/3/4 mindestens 25/70/150 (`ansehenNoetig`).
- **Stufe 4** („Prachtstufe“, kostet zusätzlich 3 Gold) für alle Gebäude; Rathaus Stufe 4 schaltet die
  Plätze 13–16 frei. Neu: Steinbruch (+Stein), Bibliothek (4. Auftragsplatz, kostet Gold), Marktplatz
  (+Wochenauftrag, kostet Gold). Die Schmiede macht jetzt alle Bauten 5–20 % günstiger.
- **Sammelbuch** (📖 im Dorf): Sammelstücke der Bewohner und Meilensteine (`MEILENSTEINE`).
  **Postkarte** (📮): Bild vom Dorf mit Dorfname und Zahlen zum Herzeigen am Gerät – nichts wird verschickt.
- **Dorf für Kinder freischalten:** im Admin „Neue App“ → Datei `spiele/dorf.html`, Fach „Allgemein“;
  mit „versteckt“ lässt es sich vorher selbst testen.
- **Feste (Etappe 5):** Halloween, Weihnachten und Ostern kommen ins Dorf, sobald das passende Event im
  Admin unter **🧭 Pass → Events** an ist (ein Schalter für Pass und Dorf). Sind zwei an, läuft im Dorf das
  erste. Jedes Fest hat eine eigene Währung (🎃 Kürbiskerne, 🍪 Lebkuchen, 🥚 Ostereier; Startgeschenk 5,
  +3 je erfülltem Tagesauftrag), ein Festgebäude mit 3 Stufen auf der **Festwiese** (außerhalb des
  Dorfquadrats, rechts unten), 4 Deko-Stücke, einen Gast mit 5 Geschichten-Aufträgen (Sammelstücke) und
  eine Mechanik: Adventskalender (eine Tür je Übungstag) oder Suche (täglich versteckt sich etwas im Dorf).
  Nach dem Fest bleibt alles: Deko bleibt stehen (Festkiste 🎁 zum Aufstellen/Versetzen), das Festgebäude
  kommt in die Festkiste und steht beim nächsten Fest wieder da, Währung verfällt nicht. Neues Fest =
  neuer Eintrag in `dorf-inhalte.json` → `EVENTS` (Id wie in `lernwelt-inhalte.json` → `EVENTS`); Modelle
  sind dort Klötzchen-Listen (`g`/`p`/`f`, kein Code). Ein Pass-Event ohne Dorf-Eintrag bekommt Wimpel.
- **Flächenplan** (`dorf-inhalte.json` → `FLAECHEN`): Festwiese, Deko-Plätze, Verstecke und reservierte
  Umland-Bereiche für Etappe 6 (Landschaft) und 7 (neues Gebiet). Dauer-Animationen (Schnee, Blätter,
  Versteck, Begleiter) laufen mit höchstens 30 Bildern/s, nur sichtbar, mit Pause nach 60 s ohne Antippen.
- **Lebendiges Dorf (Etappe 6):** Bewohner laufen auf den Gassen zwischen den Bauplätzen (`FLAECHEN` →
  `wege.gitter`, nie durch Häuser) zu ihren Lieblingszielen (`BEWOHNER[].ziele`: Gebäude-Id, `dorfplatz`,
  `haeuser`, `festwiese` oder eine Landschafts-Id) und wieder nach Hause; die Bürgermeister·in spaziert mit
  ihrem Pass-Begleiter über den Dorfplatz. Antippen eines Bewohners zeigt, wer das ist.
  **Landschaft** (`LANDSCHAFT`): Bach, Felder, Wald, Felswand, Holzlager, Windmühle, Obstwiese, Hühner,
  Schafe, Enten und der Weg mit Schild „Hier geht es bald weiter“ wachsen ohne Kosten mit Rathaus, Ansehen,
  Bewohnern und Gebäuden (Bedingung `ab`); Neues erscheint als Neuigkeit und im Sammelbuch („Rund ums Dorf“).
  **Dorf-Deko** (`DEKO`) kommt genauso in die Kiste 🎁. Gebäude werden mit Vertex-Farben zu einem Mesh
  gebacken (weniger Draw-Calls für ältere iPads).
- **Challenges** (`CHALLENGES`, `CHALLENGE_WERTE`): je zwei Wochen, im Wechsel ab `start` oder von der Lehrkraft
  im Admin (🏘️ Dorf → 🏆 Challenges) für bestimmte Klassen gestartet (`config.json` → `dorf.challenges`,
  `dorf.challengeRotation: false` schaltet den Wechsel ab; braucht den aktuellen Worker). Arten: Aufträge,
  Übungstage, gute Runden in Fächern, verschiedene Apps, Runden ab 90 %. Belohnung: Ansehen, Gold und eine
  Trophäe (🥉🥈🥇) im Sammelbuch. **Bonus-Gebäude** (Musikpavillon ab 2, Aussichtsturm ab 5 Trophäen; Modell als
  Klötzchen in `GEBAEUDE[].stufen`). **Marktplatz:** Holz ↔ Stein tauschen, Kurs je Stufe in `MARKT`.
- **Feinschliff (Etappe 6c):** Kein Reset, alte Spielstände laufen weiter.
  - **Heute-Leiste** oben im Dorf: alle offenen Aufträge zum Antippen (`LernDorf.offeneAuftraege()`),
    „Du kannst bauen“ (`bauMoeglich()`) und das Sparziel.
  - **Bau-Tafel als Schublade:** im Hochformat von unten, im Querformat rechts; ✕ oder Esc schließt.
    Querformat (ab 900 px) mit zwei Spalten: Dorf links (bleibt stehen), Aufträge und Brett rechts.
    Neuigkeiten und „Willkommen zurück“ (eigener Speicher `lernwelt-dorf-besuch`, nicht im Sicherungscode)
    stehen in einem Kasten unter den Aufträgen.
  - **Startseite:** Zeile „🏘️ Dorf-Aufträge“ unter dem Pass und „📌 Dorf 1/2“ an den App-Kacheln
    (`index.html` lädt dafür `gemeinsam/dorf-kern.js`; nur, wenn das Dorf begonnen und freigeschaltet ist).
  - **Sparziel** (`zg` im Spielstand): „🎯 Als Ziel merken“ in der Bau-Tafel; Anzeige im Dorf und in der
    Meldung der Lern-Apps. Verschwindet von selbst, wenn gebaut.
  - **Rohstoff-Lenkung** (`AUFTRAEGE.tag.rohstoffLenkung`, Start 0,7): so viele neue Aufträge bringen den
    Rohstoff, der fürs Ziel bzw. im Vorrat fehlt.
  - **Runden je App:** Admin → 🏘️ Dorf → Apps (`apps[].dorfRunden`, 1–10), gilt für neue Aufträge.
  - **Lehrer-Zettel** (Platz 5, `config.json` → `dorf.lehrerZettel`: `{ id, start, bis, app, text, runden, klassen }`):
    im Admin unter 📣 Lehrer-Zettel; hängt von start bis bis oben am Brett, pro Kind nur einmal, Belohnung wie ein
    Tagesauftrag, kein Tausch. **Braucht den aktuellen Worker.**
  - **Fleißzettel** (Platz 6, `AUFTRAEGE.fleiss`): einmal am Tag, wenn alle Tageszettel erledigt sind, mit halber Belohnung.
  - **Werkstatt-Bonus** (`AUFTRAEGE.werkstatt`): +25 % für schon geübte Apps mit höchstens 1 Meisterschafts-Stern
    (nicht zusätzlich zum Lange-nicht-gespielt-Bonus).
  - **Briefe auf Englisch** (`BEWOHNER[].geschichten[].en`, `AUFTRAEGE.bewohner.englischAnteil` 0,5): Bewohner-Auftrag in
    einer Englisch-App → kurzer Brief auf Englisch mit aufklappbarer deutscher Fassung.
  - **Jahreszeiten** (`JAHRESZEITEN` in `dorf-inhalte.json`, nur Optik): Frühling, Sommer, Herbst, Winter nach Datum;
    ein Fest mit eigener Stimmung hat Vorrang.

## Room Detective (spiele/room-detective.html)

Englisch-Spiel mit zwei Modi, je Runde 3 Zimmer bzw. 3 Fälle, Lesen oder Hören (Sprachausgabe des iPads):

- **🏠 Zimmer einrichten:** Ein Kunde schreibt, wohin die Dinge sollen („Put the cat under the bed, please.“). Das Kind
  zieht die Dinge aus der Kiste ins Zimmer (oder: Ding antippen, dann Platz antippen; Ding im Zimmer antippen → zurück).
  Gegenstände und Möbel zeigen nur Bilder. Jeder Platz im Zimmer kennt seine Aussagen (der Platz zwischen Bett und Tisch
  ist „next to the bed“, „next to the table“ und „between the bed and the table“) – die Aufträge werden aus echten Plätzen
  gebaut, sind also immer lösbar. Stufe 1: on, under, in · 2: + next to, in front of · 3: + behind, between.
- **🕵️ Detektiv:** 4/6/8 Verdächtige als SVG-Figuren (ohne WebGL). Hinweise wie „The thief has got a dog.“ – das Kind
  streicht alle, auf die der Hinweis nicht passt. Falsch gestrichen → die Person widerspricht („But I can swim!“); nach dem
  zweiten Fehlversuch wird richtiggestellt. Stufe 1: has got · 2: + can, is wearing · 3: + Verneinungen, Haarlänge.
- **Wertung:** nur der erste Versuch je Satz bzw. Hinweis zählt (`LernSpiel.speichereRunde`, skill `room-detective:<modus>:<stufe>`).
  Ab 80 % wird die nächste Stufe frei. Spielstand `lernwelt-room-detective` (nur Stufen und Zähler, nicht im Sicherungscode –
  XP und Sterne laufen wie immer über den Pass).
- **Inhalte erweitern:** `daten/room-detective.json` – neue Gegenstände (Emoji + Wort aus dem Buch), Kundennamen, Fälle,
  Satzrahmen je Stufe. Neue Möbel brauchen zusätzlich eine Zeichnung und Plätze im Code (`MOEBEL_SVG`, `moebelPlaetze`).

## Die Insel (spiele/insel.html, im Aufbau)

Kleine, offene 3D-Welt im Klötzchen-Stil: Die Kinder laufen mit ihrer Pass-Figur per Joystick über eine Insel; das
Gelernte verändert später die Welt (Hinkommen, Bauen, Handeln – nie eingeblendete Fragen). Plan: Aktionsplan „Die
Insel“ (8 Etappen). Auf der Startseite als „Meine Insel“ (Eintrag über den Admin).

- **Stand: Etappe 6 – Kartenleser-Hochland (GPG).** Welt mit drei Gebieten aus `daten/insel.json`: **Hafendorf** (Süden,
  Startgebiet, offen), **Baumeister-Tal** (Nordwesten, hinter einem Meeresarm – öffnet in Etappe 5 die Fähre) und
  **Kartenleser-Hochland** (Nordosten, hinter Fluss und Steilkante – öffnet die Brücke aus dem Tal). Geschlossene Gebiete
  sperren den Weg (Wasser, Steilkante, Zaun am Fährsteg, Hinweis beim Anlaufen); beim Betreten eines Gebiets erscheint
  sein Name. Schilder mit 📜 lesen.
- **Aufträge im Hafendorf** (`gemeinsam/insel-auftraege.js`, Bausteine in `daten/insel-auftraege.json`): Fünf Bewohner
  (Tom, Mia, Mr Brown, Mrs Patel, Sam) mit eigenen Looks (`gemeinsam/insel-figuren.js`) geben beim Ansprechen einen
  Auftrag auf Englisch. **Person finden** („Please find the girl with a yellow T-shirt.“ → hingehen, 🔍 „Bist du es?“),
  **Ding bringen** („Please bring me three eggs. The eggs are next to the red house.“ → Warenkiste finden, ✋ genau so oft
  nehmen – die Anzahl wird vorgelesen –, 🎁 der richtigen Person geben; Korb antippen = leeren) und **Paket suchen**
  („My parcel is next to the shop.“ → 📦 das richtige Paket öffnen). Die Welt prüft: falsche Person, falsches Ding,
  falsche Anzahl oder leeres Paket = falscher Versuch (Antwort auf Englisch, der Auftrag bleibt offen). **Gewertet wird
  nur der erste Versuch**; 5 Aufträge = 1 Runde → `LernSpiel.speichereRunde` (XP, Sterne, Dorf-Aufträge; skill
  `insel:hafen:<stufe>`). Ab 4 von 5 wird die nächste Stufe frei: 1 = next to, Farben, Zahlen bis 6 · 2 = behind,
  in front of, between, has got, Zahlen bis 9 · 3 = Simple Past, Zahlen bis 12. Pausenmenü: Stufe, **Lesen oder Hören**
  (beim Hören steht der Auftrag nicht da, 🔊 spielt ihn ab), Auftrag überspringen (zählt nicht).
  Bewohner, Warenkisten und Paket-Orte stehen je mindestens 20 Blöcke auseinander, und Ziele liegen nie beim
  Auftraggeber – Durchprobieren kostet Laufweg. Je Stufe entstehen mehrere Hundert verschiedene Aufträge.
- **Bauen** (`gemeinsam/insel-bauen.js`): nur auf festen Bauplätzen (`bauplaetze` in `insel.json`). Wer auf einem
  Bauplatz steht (oder 1 Block daneben), bekommt 🧱 „Bauen“: Raster über dem Platz, die Kamera schaut steiler von oben,
  Antippen setzt einen Block (➕) bzw. entfernt ihn (➖); Material aus der Leiste (Holz, Stein, Zaun, Dach). Joystick und
  Kamera bleiben aktiv; kurzes Antippen ohne Wischen zählt als „Tippen“. Nur das betroffene Weltstück wird neu gebaut
  (≈ 1 ms). Auf den Platz, auf dem die Figur steht, kommt kein Block; Zäune kann man nicht besteigen.
  **Bauplan** am Bauplatz (`plan`): `rand` (Rand aus `block`, höchstens `tor` Lücken), `flaeche` (ganze Fläche) oder
  `muster` (`bloecke: [[dx, dy, dz, 'BLOCK'], …]`); ✅ „Prüfen“ zeigt fehlende oder falsche Stellen kurz rot.
  `vorrat: "frei"` = Material ohne Ende, sonst zählt das Inventar (`stand.inventar`, ab Etappe 5 vom Händler und aus
  Aufträgen). **Werkstatt** im Hafendorf (neben dem blauen Haus): Übungs-Bauplatz mit freiem Material und dem Bauplan
  „Zaun mit Tor“ – ohne XP. Die Bauplätze im Baumeister-Tal folgen in Etappe 5.
- **Fähre und Baumeister-Tal** (Etappe 5): Nach der ersten Runde im Hafendorf gibt Sam (Fährmann) den **Fähr-Auftrag**
  (englisch, „Please bring me four fish …“) → das Tal ist offen, der Zaun am Fährsteg verschwindet, ⛴️ „Übersetzen“ an
  beiden Stegen. Im Tal gibt **Frau Stein** (Baumeisterin) Bauaufträge auf Deutsch mit Geld fürs Material, **Herr Holz**
  verkauft im Holzhandel (Preise am Schild; Waren wählen, Münzen/Scheine auf den Tresen legen, Wechselgeld kommt zurück):
  **Zaun** (Weide a × b m, Pfosten alle 1 m → Umfang 2·(a+b) Pfosten; Stufe 3 mit Tor), **Gemüsefeld** (r Reihen mit
  je s Setzlingen; Stufe 3: n Pflanzen in r Reihen), **Lager** (Zahl in Tausender-/Hunderter-/Zehner-/Einerkisten, je
  Sorte höchstens 9; Stufe 3 als Zahlwort), **Holzhandel** (bestellte Waren kaufen und passend bezahlen – der Preis steht
  nicht dabei). ✅ auf dem Bauplatz lässt die Welt prüfen (Lücke → „die Schafe laufen weg“); zu viel gekauftes Material
  zählt als Rechenfehler. Ein neuer Auftrag räumt seinen Bauplatz frei (Material zurück ins Inventar). 5 Aufträge = 1
  Runde (`insel:tal:<stufe>`), ab 4 von 5 nächste Stufe. Nach der ersten Tal-Runde: **die Brücke ins Hochland** – Fluss
  in Metern (aus der Welt), Bretter à 50 cm, 2 Bretter je Brückenstück; trägt sie (eine Reihe über die ganze Lücke),
  ist das Kartenleser-Hochland offen (Aufträge dort ab Etappe 6). Bausteine: `daten/insel-auftraege.json` → `tal`
  (Bewohner, Preise, Namen, Satzrahmen je Art und Stufe, Fähr-Texte); Bauplätze in `insel.json` mit `material`,
  `frei` (Material ohne Kauf, z. B. Kisten) und `verbrauch` (z. B. `{ "PLANKE": 2 }`).
- **Kartenleser-Hochland** (Etappe 6, `gemeinsam/insel-karte.js`): Landmarken Turm, Steinkreis und alte Eiche, zwei
  Wegweiser. **Lea** (Kartenleserin) gibt Schatz-Aufträge auf Deutsch: **Planquadrat** (Stufe 1: „Der Schatz liegt im
  Planquadrat C1“), **Kompass und Schritte** (ab Stufe 2: „Geh vom Turm 10 Schritte nach Westen und dann 10 Schritte
  nach Norden“ – 1 Schritt = 1 Block) und **Maßstab** (Stufe 3: „vom Steinkreis aus 3 cm nach Süden, 1 cm = 5 Schritte“).
  **Kompass** am Bildschirmrand (dreht sich mit der Kamera, Norden = oben auf der Karte), **Schatzkarte** 🗺️ aus den
  Weltdaten gezeichnet (Gelände, Planquadrate A–D / 1–5, Landmarken, Nordpfeil, Maßstabsleiste) – bewusst ohne
  „Du bist hier“ und ohne Schätze. Sechs gleich aussehende Erdhügel (je mindestens 20 Blöcke auseinander, jeder in einem
  eigenen Planquadrat); ⛏️ am falschen Hügel verbraucht den ersten Versuch. Gefundene Schätze werden **Sammelstücke**
  (`funde`, 8 Stück, im Pausenmenü). 5 Schätze = 1 Runde (`insel:hochland:<stufe>`). Bausteine:
  `insel-auftraege.json` → `hochland` (Bewohner, Landmarken mit `von`, Schätze, Satzrahmen je Art und Stufe, Maßstab,
  Sammelstücke); Planquadrate: `raster` in `insel.json`. Aufträge werden aus allen Paaren Schatz–Landmarke gebildet
  (Maßstab nur bei Vielfachen von 5); derselbe Schatz kommt frühestens nach drei anderen wieder.
- **Auftrags-Bausteine erweitern** (`daten/insel-auftraege.json`): `bewohner` (Platz-ID aus `insel.json`, Look aus den
  Avatar-Teilen, `merkmale` – müssen zum Look passen und dürfen bei keinem anderen Bewohner vorkommen –, `ort`, `saetze`
  für Small Talk), `quellen` (Warenkisten: Wort `eins`/`viele`, Emoji, Farbe, Ortsangabe je Stufe), `suchorte`
  (Paket-Orte mit Ortsangabe je Stufe), `saetze` (Satzrahmen je Auftragsart und Stufe; Platzhalter `{typ} {er} {Er}
  {ihn} {m} {m2} {ort} {ort3} {kl} {n} {dinge} {viele} {qort} {port}`), `antworten`, `anzahl` je Stufe. `pruefen.py`
  prüft Plätze, Looks, eindeutige Merkmale, Abstände und Platzhalter.
- **Weltdaten (`daten/insel.json`):** von Hand gepflegt: `start`, `gebiete` (id, name, zeichen, fach, offen/hinweis),
  `vorlagen` (Gebäude-Typen: breite, tiefe, hoehe, wand, ecke, dach, boden – Blocknamen aus `LernInselWelt.BLOCK`),
  `gebaeude` (id, vorlage, x, z, tuer, Farben überschreibbar), `plaetze` (Stellen für Bewohner: an einem Gebäude oder
  frei), `wege`, `stege`, `bauplaetze` (für Etappe 4–5, werden geebnet, Pflöcke an den Ecken), `schilder`,
  `absperrungen` (Zaun, solange das Gebiet zu ist), `frei` (keine Bäume), `baeume` (seed, Dichte je Gebiet).
  Erzeugt: `hoehen` und `gebietskarte` (je 96 Zeilen à 96 Zeichen) mit `python3 werkzeuge/insel_karte.py` – das Werkzeug
  schreibt nur diese beiden Felder. **Bewohner-Plätze stehen mindestens 20 Blöcke auseinander** (Laufweg statt
  Durchprobieren); `pruefen.py` prüft das und die übrigen Angaben.
- **Spielstand `lernwelt-insel`** (in der Sicherungskarte, `gemeinsam/sync.js`): `{ v, pos, gebiete, auftraege, stufen,
  bau, funde, opt, t }` – `auftraege.hafen = { aktiv, runde: { n, richtig }, verlauf, korb, runden }`,
  `stufen.hafen = { frei, wahl }`, `opt = { seiten, vorlesen, lesart }`, `bau = { <platz-id>: [[dx, dy, dz, block], …] }`
  (nur das Gebaute, relativ zur Ecke des Bauplatzes), `inventar = { <block>: Anzahl }`, `geld` (Euro im Geldbeutel),
  `auftraege.tal`/`stufen.tal` und `auftraege.hochland`/`stufen.hochland` wie beim Hafendorf, `funde` (IDs der
  Sammelstücke). Gespeichert wird nach jedem Schritt (Position höchstens alle 5 s), beim Pausieren und beim
  Verlassen; nur Abweichungen von der Grundwelt (Bauplätze ab Etappe 4). Freischaltungen werden nie entfernt, unbekannte
  Felder bleiben erhalten; höchstens 20 000 Zeichen. Startbildschirm „Weiterspielen“ setzt an der gespeicherten Stelle
  fort (ist sie nicht mehr begehbar, geht es am Startpunkt los). Pausenmenü: offene und geschlossene Gebiete,
  Einstellungen. `?debug=1`: im Pausenmenü alle Gebiete zum Testen öffnen (wird nicht gespeichert).
- **Steuerung:** Joystick erscheint links unter dem Daumen (Totzone, ab 70 % Auslenkung rennen, Richtung relativ zur
  Kamera); rechts wischen dreht die Kamera, beim Vorwärtslaufen schwenkt sie langsam hinter die Figur. Stufen von einem
  Block steigt die Figur von selbst hoch, an Wänden gleitet sie entlang; Wasser und Inselrand sind gesperrt. Steht eine
  Wand hinter der Figur, weicht die Kamera nach oben aus. Pausenmenü: Seiten tauschen (Linkshänder), Vorlesen.
  Lehrer-PC: WASD/Pfeiltasten, Q/E Kamera, Leertaste Aktion, Esc Pause.
- **Grafik für ältere iPads:** je Weltstück ein Mesh mit Vertex-Farben (`MeshLambertMaterial`, keine Texturen, keine
  echten Schatten, nur Schattenflecken), Meer als eine Fläche, Bewohner gebacken (`LernInselWelt.backe`), Sichtweite
  32 Blöcke mit Nebel, höchstens 30 Bilder pro Sekunde, Pixel-Ratio höchstens 1,5, Pause bei verdeckter Seite. Bei
  „Bewegung reduzieren“ keine Kamerafahrten. Ohne WebGL: Ersatzanzeige mit Link zu den anderen Spielen.
- **Probelauf auf dem ältesten Schul-iPad:** `spiele/insel.html?debug=1` zeigt Bildrate, Draw-Calls, Dreiecke,
  Startzeit und Position. Go: mindestens 30 Bilder pro Sekunde, Start unter 5 Sekunden (aus dem Offline-Speicher),
  2–3 Kinder laufen ohne Erklärung los, keine hängenden Finger. 20–30 Bilder → nachbessern (Sichtweite `SICHTWEITE`,
  Pixel-Ratio, Weltgröße); unter 20 → No-Go (Gebiete als feste isometrische Szenen wie im Dorf).
  `?seed=TEXT` zeigt statt der Weltdaten die Testinsel aus Etappe 1 (ohne Gebiete, ohne Speichern).
- **Dateien:** alle Insel-Dateien (`spiele/insel.html`, `gemeinsam/insel-*.js`, `daten/insel*.json`) stehen in
  `sw.js` NACHLADEN – `pruefen.py` prüft das. Block-, Gebiets-, Platz-, Bauplatz-, Auftrags- und Sammelstück-IDs nie
  umbenennen (sie stehen im Spielstand `lernwelt-insel`); Block-Nummern in `BLOCK` nie umnummerieren.
