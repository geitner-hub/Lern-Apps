# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Überblick

„Lernwelt“: statische Lern-Apps und Spiele (Mittelschule Bayern, v. a. Klasse 5/6) für iPads, gehostet über
GitHub Pages (`geitner-hub.github.io/Lern-Apps`). Reines HTML/CSS/Vanilla-JS ohne Build-Schritt, ohne npm,
ohne Frameworks. Code, Kommentare, Bezeichner und Doku sind auf **Deutsch** – so weiterschreiben.
`README.md` ist die ausführliche Referenz (Pass-Regeln, Dorf, Avatar-Teile, Katalog); vor größeren Änderungen
den passenden Abschnitt dort lesen.

## Lernwelt – feste Regeln

- **Bestehende Apps müssen jederzeit funktionsfähig bleiben.**
- **„Mein Dorf“ und Pass:** Änderungen nur aufbauend, niemals Fortschritt zurücksetzen (siehe IDs unter Architektur).
- **Ordnerstruktur:** `apps/<fach>/`, `spiele/`, `daten/`, `gemeinsam/`. `index.html`, `admin.html`, `config.json`
  und `sw.js` bleiben im Hauptordner. Neue Apps immer in diese Struktur: Datei aus der Vorlage anlegen, Thema in
  `daten/katalog.json` eintragen, mit `thema` melden; der Eintrag in `config.json` erfolgt über den Admin. Beim
  Verschieben einer App die Weiterleitungsliste in `404.html` anpassen. Neues Fach: in `shared.js` (`CAT_STYLES`)
  **und** im Katalog unter `faecher` mit gleichem Namen.
- **Design:** dunkles Schema, Akzente Gold `#e6a817` und Indigo `#6366f1`/`#818cf8`, Schriftzug „Fredoka One“.
- **Zielgerät:** Schul-iPads (Safari, Touch, ältere Hardware). `prefers-reduced-motion` respektieren, ohne WebGL
  eine Ersatzanzeige bieten.
- **Kopfrechen-Aufgaben** müssen für Mittelschüler im Kopf lösbar sein.
- **Datenschutz (DSGVO):** keine personenbezogenen Daten speichern oder übertragen. Keine externen Dienste, CDNs
  oder Google Fonts: Schriften aus `fonts/` über `gemeinsam/fonts.css`, Bibliotheken in `vendor/`.
- **Sicherheit:** Texte aus der Config immer escapen (`escHtml`), Links über `isSafeLink` prüfen.
- **Version:** nach Änderungen an ausgelieferten Dateien `VERSION` in `sw.js` **und** in
  `gemeinsam/umgebung.js` gleich erhöhen (pruefen.py prüft das).

## Befehle

```bash
python3 werkzeuge/pruefen.py     # die einzige automatische Prüfung (läuft auch in CI: .github/workflows/pruefen.yml)
python3 werkzeuge/inventar.py    # erzeugt werkzeuge/INVENTAR.md neu (Handspalten bleiben erhalten)
python3 -m http.server 8000      # lokal ansehen; umgebung.js erkennt localhost als UMGEBUNG 'lokal'
```

Es gibt keine Unit-Tests, keinen Linter und keinen Bundler. `pruefen.py` meldet rote Fehler (Exit-Code ≠ 0)
und gelbe Hinweise. Manuelle Checkliste nach Uploads: `werkzeuge/RAUCHTEST.md`.

## Regeln, die pruefen.py erzwingt (sonst CI rot)

- Jede Seite (außer `404.html`) bindet `gemeinsam/umgebung.js` als **erstes Skript** direkt nach `<meta charset>` ein;
  jede Lern-App und jedes Spiel bindet `gemeinsam/navbar.js` am Ende von `<body>` ein (Ausnahmen: `OHNE_NAVBAR`).
- `VERSION` in `sw.js` und `gemeinsam/umgebung.js` sind gleich.
- **Speicher-Register:** jeder `localStorage`-Schlüssel muss in `SPEICHER` in `gemeinsam/umgebung.js` stehen.
  Neue Schlüssel beginnen mit `lernwelt-`; bestehende Schlüssel nie umbenennen.
- **Größenbudgets** (`BUDGETS` in pruefen.py, gemessen **komprimiert**/gzip): Zusatz je Lern-App
  (umgebung.js + navbar.js + pass.js) < 35 KB – steht bei ~27 KB. Trotzdem: neue Funktionen nicht in
  `pass.js`/`navbar.js`, sondern in `pass-extras.js` oder ein eigenes Modul und per `LW.laden('gemeinsam/datei.js')`
  nachladen. Startseite < 65 KB, sw.js-`START` < 300 KB, Einzeldatei < 55 KB, Datendatei < 130 KB.
- Alle Dateien aus `config.json`, `sw.js` (`START`, `NACHLADEN`) und `LW.laden(…)` müssen existieren.
- **Inhalts-Katalog** (`daten/katalog.json`): jede Lern-App aus `config.json` braucht ein Thema; IDs eindeutig,
  Format `fach.klasse.thema[.stufe]` (klein, Ziffern, `-`). Stufen in `daten/kopfrechnen.json` und Units in
  `daten/vokabeln*.json` müssen auf Katalog-IDs bzw. existierende Generatoren verweisen.

## Architektur

- **Seiten:** `index.html` (Startseite, liest `config.json`), `admin.html` (Admin-Panel), `apps/<fach>/*.html`
  (Lern-Apps), `spiele/*.html` (Spiele), `archiv/` (abgelegt, nicht geprüft). Vorlage für neue Apps:
  `apps/vorlage/app-template.html`. Pfade relativ: Apps nutzen `../../gemeinsam/…`, Spiele `../gemeinsam/…`;
  die Skripte in `gemeinsam/` finden den Hauptordner selbst (`LW.ROOT`).
- **gemeinsam/** – geteilter Code, globale Objekte statt Module: `LW` (umgebung.js: Umgebung live/test/lokal,
  Version, Speicher-Register, `LW.laden`), `LernApps` (navbar.js: Home-Button, `saveResult`), `LernPass`
  (pass.js: XP/Level/Sterne, Regeln in `RULES`), `LernKatalog` (katalog.js), `LernUeben` (ueben.js: Übungsrahmen
  mit Stufen), `LernFreigabe` (freigabe.js: Freigaben je Themen-ID und Fokus-Modus aus config.json),
  `LernWiederholung` (wiederholung.js: fällige Wiederholungen aus dem Lernstand), `LernDorf` (dorf-kern.js). `shared.js` ist die einzige Quelle für Fächer/Farben/`escHtml`/`isSafeLink`.
- **Ergebnisfluss:** App → `LernApps.saveResult({ score, max, thema })` → `localStorage` (`lern-apps-results`,
  Schlüssel = **Dateiname** ohne Ordner + URL-Parameter) → Ereignis `lernapps:result` → pass.js wertet aus und
  feuert `lernpass:gewertet` → dorf-kern.js zählt Aufträge. Dateinamen müssen daher repo-weit eindeutig sein.
- **Ladekette:** „Kern sofort, Rest bei Bedarf“. `sw.js` (muss im Hauptordner liegen) cached `START` sofort und
  holt `NACHLADEN` gestaffelt im Hintergrund. Schweres (three.js, 3D-Avatar, Truhe, QR, Dorf-Szene) wird lazy geladen.
- **Daten:** reine JSON-Dateien in `daten/` (keine Kommentare). Katalog-IDs, Item-IDs, Gebäude-IDs usw. **nie
  umbenennen oder löschen** – sie stehen in Spielständen der Kinder. Alte IDs (z. B. `ma.5.kopf.…` im Trainer)
  bleiben aus historischen Gründen.
- **Engines statt Einzel-Apps:** `apps/mathe/kopfrechnen.html` und `mathe-trainer.html` laufen über `ueben.js`
  + `generatoren-mathe.js` (neuer Aufgabentyp = Funktion in `G`) + Stufen in `daten/kopfrechnen.json`;
  `apps/englisch/vokabeltrainer.html?klasse=5|6|liste=NAME` für alle Wortlisten. Alte Apps werden zu
  Weiterleitungen (Kennzeichen `LW-WEITERLEITUNG`, Übernahme per `LernUeben.uebernehme`).
- **Backend:** nur ein Cloudflare Worker (`cloudflare/worker.js`, wird von Hand bei Cloudflare eingefügt). Er
  prüft Admin-Login und schreibt ausschließlich `config.json` per GitHub-API; jedes Feld wird validiert. Neue
  Config-Felder müssen auch im Worker erlaubt/geprüft werden. Sicherungskarten-Sync: `cloudflare/sync.js`,
  `gemeinsam/sync.js`.
- **Admin:** `admin.html` lädt `gemeinsam/admin/*.js` in fester Reihenfolge (`kern` zuerst, `start` zuletzt);
  Änderungen landen als Entwurf (`lernwelt-admin-entwurf`) und werden gesammelt veröffentlicht.
- **Testumgebung:** Kopie im Repo `Lern-Apps-test`; umgebung.js erkennt das am Repo-Namen, setzt das
  Präfix `lwtest-` vor alle Speicherschlüssel und sperrt Schreibzugriffe auf den Worker.
