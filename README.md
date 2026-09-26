# Lern-Apps (Lernwelt)

Sammlung interaktiver Lern-Apps für den Unterricht (Mittelschule Bayern, v. a.
5. Klasse). Gehostet über GitHub Pages unter `geitner-hub.github.io/Lern-Apps`,
verwaltet über ein eigenes Admin-Panel.

## Struktur

| Datei | Zweck |
|---|---|
| `index.html` | Startseite für Schüler:innen – lädt `config.json` direkt, QR-Codes pro App |
| `admin.html` | Verwaltung (Login wird im Cloudflare Worker geprüft) |
| `config.json` | Zentrale Konfiguration aller Apps |
| `shared.js` | Gemeinsame Konstanten & Helfer (Fächer, Farben, `escHtml`, `isSafeLink`, QR) – **einzige Quelle** |
| `config-api.js` | Laden (öffentlich/Admin) und Speichern über den Worker |
| `navbar.js` | Home-Button + Ergebnisspeicherung, in jeder App am Ende von `<body>`; lädt `pass.js` automatisch |
| `pass-karte.html` | Druckbare Sicherungskarten: eigene Karte oder Sammelbogen (`?sammel`, 8 pro A4) |
| `lernwelt-inhalte.json` | **Alle Pass-Inhalte:** Titel, Abzeichen, Events, Avatar (Figur-Optionen) und alle Avatar-Teile – hier erweitern |
| `avatar3d.js` | 3D-Avatar aus Blöcken: baut Figur und Teile nur aus den Daten, drehbare Bühne, Vorschaubilder |
| `vendor/three.min.js` | three.js r128 (MIT-Lizenz), wird von `avatar3d.js` erst bei Bedarf geladen |
| `pass.js` | Lernwelt-Pass: XP, Level, Wochen-Serie, Meisterschafts-Sterne, Sicherungs-Code, Truhen-Zähler |
| `manifest.webmanifest` + `icons/` | App-Symbol für den Home-Bildschirm (Anleitung für Schul-iPads: `APP-SYMBOL.md`) |
| `vendor/jsQR.min.js` | QR-Erkennung für „📷 QR scannen“ (Apache-2.0), wird erst beim Scannen geladen |
| `sw.js` | Offline-Speicher (Service Worker): „Internet zuerst“, bei fehlendem/langsamem Netz die letzte Kopie |
| `fonts.css` + `fonts/` | Lokal gehostete Schriften (kein Google Fonts → DSGVO) |
| `qrcode.js` | QR-Code-Erzeugung im Browser (MIT-Lizenz, Kazuhiko Arase) |
| `app-template.html` | Vorlage für neue Apps |
| `cloudflare/worker.js` | Quelltext des Cloudflare Workers (Vorlage – aktiv ist der bei Cloudflare eingefügte Code) |
| `cloudflare/ANLEITUNG.md` | Wartung des Workers: Anmeldung, Token erneuern, Passwort ändern, Code aktualisieren, Fehlersuche |

## Neue App einpflegen

1. HTML-Datei ins Repo legen. Im `<head>`: `<link rel="stylesheet" href="fonts.css">`,
   am Ende von `<body>`: `<script src="navbar.js"></script>` (siehe `app-template.html`).
   **Keine Google-Fonts-Links oder andere externe Dienste einbinden.**
2. In `admin.html` über „Neue App“ eintragen. Erlaubte Links: `name.html`,
   `name.html?parameter=wert` oder `https://…`.
3. Klassenstufe(n) und Tags über 🏷 setzen – fertig.

## Ergebnisse speichern (in Apps)

```js
LernApps.saveResult({ score: 8, max: 10 });                 // Minimum
LernApps.saveResult({ score: 8, max: 10, label: '8 / 10', skill: 'einmaleins-7' });
```
Gespeichert wird pro Gerät im `localStorage` (`lern-apps-results`), Schlüssel =
Dateiname + URL-Parameter. Pro App: letztes Ergebnis, Bestwert, Anzahl Versuche,
Verlauf der letzten 30 Versuche. Jedes Ergebnis löst zusätzlich das Ereignis
`lernapps:result` aus (Grundlage für spätere Level/XP).

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
- **Sicherung:** QR/Code (`LW2.…`, alte `LW1`-Codes werden weiter gelesen) im Pass; Scannen öffnet `index.html#pass=…` und stellt
  den Pass nach Rückfrage wieder her. Die Prüfsumme erkennt Tipp-/Kopierfehler, ist aber
  kein Schutz gegen gezieltes Manipulieren – der Pass ist ohnehin nur lokal.
- **Truhen & Avatar-Teile:** alle 250 XP eine Truhe. Chancen 60/30/10 % (gewöhnlich/selten/episch),
  keine Dubletten; ist der Pool leer, gibt es Sternenstaub. Neun Plätze: Kopf, Gesicht, Oberteil,
  Hose, Schuhe, Rücken, In der Hand, Begleiter, Hintergrund. Die Figur selbst (Hautton, Frisur,
  Haarfarbe, Augen, Mund) ist immer frei wählbar; Startausstattung steht in `AVATAR.START`.
  Gesperrte Teile können in der Garderobe anprobiert werden.
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
  Safari-Löschregel), `navigator.storage.persist()`, Sicherungs-QR/-Karte. Achtung: App-Symbol und
  Safari haben getrennte Speicher – Übernahme per „📷 QR scannen“ (Sicherungskarte) oder „Code kopieren“.
- **📷 QR scannen** (Startseite): öffnet gescannte Lernwelt-Apps innerhalb der Lernwelt (wichtig für das
  App-Symbol, weil die Kamera-App immer Safari öffnet), liest Sicherungskarten ein, lehnt fremde Codes ab.
- **Safari-Hinweis:** Auf iPad/iPhone in Safari (nicht im App-Symbol) erscheint oben einmal pro Tag der
  Hinweis, das Lernwelt-Symbol zu benutzen (nicht im Admin und auf der Druckkarte).

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

