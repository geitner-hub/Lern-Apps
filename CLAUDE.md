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
  Verschieben einer App die Weiterleitungsliste in `404.html` anpassen. Hat die App Stellschrauben für die Lehrkraft,
  bringt sie ein Manifest mit (`daten/apps/<id>.json` + `daten/apps/liste.json`, Vorlage `apps/vorlage/manifest-beispiel.json`). Neues Fach: in `shared.js` (`CAT_STYLES`)
  **und** im Katalog unter `faecher` mit gleichem Namen.
- **Design:** dunkles Schema, Akzente Gold `#e6a817` und Indigo `#6366f1`/`#818cf8`, Schriftzug „Fredoka One“.
- **Zielgerät:** Schul-iPads (Safari, Touch, ältere Hardware). `prefers-reduced-motion` respektieren, ohne WebGL
  eine Ersatzanzeige bieten.
- **Kopfrechen-Aufgaben** müssen für Mittelschüler im Kopf lösbar sein.
- **Datenschutz (DSGVO):** keine personenbezogenen Daten speichern oder übertragen. Keine externen Dienste, CDNs
  oder Google Fonts: Schriften aus `fonts/` über `gemeinsam/fonts.css`, Bibliotheken in `vendor/`.
- **Bilder:** selbst gezeichnete SVG, Gemeinfreies, CC0 oder CC BY mit `nachweis` – immer lokal im Repo, nie Schulbuch-Abbildungen.
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
  `LernWiederholung` (wiederholung.js: fällige Wiederholungen aus dem Lernstand), `LernTypen` (typen.js:
  Aufgabentyp-Baukasten), `LernDorf` (dorf-kern.js). `shared.js` ist die einzige Quelle für Fächer/Farben/`escHtml`/`isSafeLink`.
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
- **Aufgabentyp-Baukasten (bevorzugt für neue Apps):** `apps/typen/uebung.html?inhalt=<Themen-ID>` zeigt
  `daten/inhalte/<fach>/<Themen-ID>.json` mit einem der Typen in `gemeinsam/typen/` (zuordnen, sortieren, lueckentext,
  eingabe, beschriften, bildwort). Neue App = Inhaltsdatei + Katalog-Thema (quelle uebung.html, parameter
  `inhalt=<ID>`) + Eintrag in `sw.js` NACHLADEN; Format: README → Aufgabentyp-Baukasten, Vorlage für Claude:
  `werkzeuge/INHALT-PROMPT.md`. Eine eigene App nur, wenn kein Typ passt (Spiele, besondere Mechaniken).
- **Lernwege** (`apps/typen/lernweg.html?weg=<ID>` + `daten/lernwege/<ID>.json`, ID mit `.lernweg-`): Stationenarbeit
  mit digitalem Laufzettel, Arbeit im Heft, Kontrolle mit gedrucktem Lösungsheft – bewusst ohne automatische Kontrolle und
  ohne `saveResult`. **Keine normale App** (nicht in config.json): ohne Zuteilung gesperrt (`LernFreigabe.zugeteilt`,
  umgekehrt zu `erlaubt`); Zuteilung im Admin unter Gruppen → 🗺️ Lernwege schreibt `freigaben[ID][wer] = 'offen'`.
  Zugeteilte Lernwege zeigt die Startseite unter „🧭 Mein Lernweg“; mit Admin-Anmeldung immer als Vorschau.
  Neuer Lernweg = JSON-Datei + Katalog-Thema (quelle `apps/typen/lernweg.html`, parameter `weg=<ID>`) + sw.js NACHLADEN.
  Bausteine (Niveaus, Wahl, App-Schritte mit Auto-Haken, Kontroll-Code, Auto-Start): README → Lernwege. Bestehende Lernwege
  ohne diese Felder müssen unverändert funktionieren (die Kinder nutzen sie).
- **English Journey Year 6** (`daten/journey6.json`, pruefen.py Regel 22): Stationen durch Highlight 6 mit `thema`, `braucht`,
  optional `start`. Kein eigener Spielstand – liest nur die Meisterschaft aus dem Pass; Lehrer-Freigabe zuerst, dann Vorgänger.
  Theme-Stufen `en.6.vok.uN.<abschnitt>` im Vokabeltrainer (`?stufe=`). 3D-Weg: `apps/englisch/english-journey.html` +
  `gemeinsam/journey-welt.js` (Orte in `SZENEN`); Rückweg über `lernwelt-lernweg-zurueck`. README → English Journey Year 6.
- **Live-Abfrage** (Unterrichtsmodus → 📊, Kinder-Seite `apps/typen/live.html?raum=CODE`, keine App in config.json, ohne Navbar):
  Worker-Teil `cloudflare/live.js` (Räume, Antworten, Quizze, Rückblicke in `SYNC_DB`; Räume nach dem Beenden gelöscht),
  Fragetypen `gemeinsam/live-fragen.js` (`LernLive`), Beamer `gemeinsam/admin/live.js`, Quiz-Editor Inhalte → Live-Quizze.
  Speicher nur `lernwelt-live` (sessionStorage). README → Live-Abfrage.
- **Backend:** nur ein Cloudflare Worker (`cloudflare/worker.js`, wird von Hand bei Cloudflare eingefügt). Er
  prüft Admin-Login und schreibt ausschließlich `config.json` per GitHub-API; jedes Feld wird validiert. Neue
  Config-Felder müssen auch im Worker erlaubt/geprüft werden. Sicherungskarten-Sync: `cloudflare/sync.js`,
  `gemeinsam/sync.js`. Medienbereich (Dateien per QR-Code/Kurzlink `/m/<code>`, ohne Bezug zur Lernwelt):
  `cloudflare/medien.js` (R2-Binding `MEDIEN`, Tabelle `medien` in `SYNC_DB`) + Admin-Modul Medien → Dateien (`gemeinsam/admin/medien.js`);
  läuft nicht über config.json, Einrichtung: `cloudflare/ANLEITUNG-MEDIEN.md`.
- **Admin:** `admin.html` – sechs Bereiche (Start, Inhalte, Gruppen, Motivation, Medien, System), Adressen
  `#/bereich/modul`. Datenschicht `gemeinsam/admin/store.js` (`LWAdmin.store`): alle Änderungen landen als Entwurf
  (`lernwelt-admin-entwurf`) und werden gesammelt veröffentlicht. Modul-System `module.js`, Rahmen `rahmen.js`
  (zuletzt laden). Neues Modul = Datei unter `gemeinsam/admin/module/` mit `LWAdmin.modul({…})` + Zeile in
  `admin.html` (pruefen.py prüft das). Die Funktionsdateien `gemeinsam/admin/*.js` (apps, ordnen, tags, freigaben,
  dorf, medien …) laufen über `bruecke.js` (globale `CONFIG`, `saveConfig`, `buildAll` – schreibt über den Store);
  ihr HTML steht versteckt in `#lw-park` von `admin.html` (feste ids), `LWAdmin.altModul({ teil })` hängt es ein.
  Stile: `gemeinsam/admin/admin.css`. Bestandsaufnahme und Plan: `werkzeuge/admin-inventar.md`.
  Vor dem Veröffentlichen prüft `gemeinsam/admin/pruefung.js` (`LWAdmin.pruefen`) dieselben config-Regeln wie
  pruefen.py – neue Regel in pruefen.py zu config.json → auch dort ergänzen. Versionsverlauf: Worker `/verlauf`, `/fassung`.
  Dashboard-Kachel = Datei `module/kachel-<name>.js` mit `LWAdmin.kachel({…})`; Suche `suche.js` (Strg+K) findet Module
  über `suchbegriffe` – neue Module darum mit guten Suchbegriffen anmelden. Unterrichtsmodus `#/unterricht`
  (`module/unterricht-stunde.js`): sofort wirkende Änderungen über `store.sofort(text, fn)` – fn läuft auf Stand
  und Entwurf, darum IDs/Zeiten vor fn erzeugen. Zeitpläne (Etappe 6): `LW.zeitplanAktiv(v)` in umgebung.js –
  `true` oder `{ ab, bis }` (JJJJ-MM-TT einmalig, MM-TT jedes Jahr); Termine für Kalender/Dashboard: `termine.js`.
  App-Einstellungen (Etappe 7): Schema in `daten/apps/<id>.json`, Werte in `config.appEinstellungen`, in der App
  `await LernEinstellungen.anwenden('<id>', CFG)` (`gemeinsam/einstellungen.js`), Formular `admin/formular.js`.
  Editoren (Etappe 8): Katalog-Baum und Vokabel-Editor speichern **direkt ins Repo** über `admin/dateien.js`
  (`LWAdmin.dateien`) und den Worker-Teil `cloudflare/dateien.js` (feste Pfadliste + Formatprüfung je Datei, ein Commit).
  Etappe 9: Aufgaben-Pools der Spiele (`daten/aufgaben-pools.json`, geladen von `aufgaben.js`) und Loot-Pool/Titel
  (`daten/lernwelt-inhalte.json`, neue Teile nur als Farbvariante `basis` + `tausch`) ebenso.
  `daten/katalog.json`, `daten/vokabeln*.json`, `daten/aufgaben-pools.json` und `daten/lernwelt-inhalte.json` sind damit **admin-gepflegt**: vor Änderungen den Stand von main holen,
  nie mit altem Stand überschreiben (pruefen.py Regel 19 warnt). Neue beschreibbare Datei = Muster in `DATEIEN_ERLAUBT`
  + eigene Prüffunktion dort.
- **Rollen (Etappe 10):** Hauptzugang und Kollegen-Zugänge (`cloudflare/kollegen.js`, Admin System → Kollegen). Kollegen
  sehen nur Module mit `rechte: ['haupt', 'kollege']` (heute nur der Unterrichtsmodus); der Worker lässt sie nur Fokus und
  Spielsperre-Ausnahmen ihrer Gruppen schreiben. Neuer Worker-Endpunkt mit Schlüssel → `checkHaupt` (Kollegen gesperrt),
  außer er gehört ausdrücklich zum Unterrichtsmodus. Feature-Schalter: `LernFreigabe.feature('<id>')` + `daten/features.json`.
  Anleitung für die Lehrkraft: `werkzeuge/ADMIN-ANLEITUNG.md`.
- **Testumgebung:** Kopie im Repo `Lern-Apps-test`; umgebung.js erkennt das am Repo-Namen, setzt das
  Präfix `lwtest-` vor alle Speicherschlüssel und sperrt Schreibzugriffe auf den Worker.
