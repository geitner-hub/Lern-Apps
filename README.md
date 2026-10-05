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
apps/vorlage/app-template.html          Vorlage für neue Apps
spiele/               RUN!, Tower Defense, Mein Dorf (dorf.html), Tauziehen-Duell (tauziehen.html), Wort des Tages (wort-des-tages.html),
                      Zauberwort (zauberwort.html), Kitchen-Chaos (kitchen-chaos.html),
                      Entdecker-Expedition (expedition.html)
daten/                katalog.json (Inhalts-Katalog mit Themen-IDs), vokabeln5.json, vokabeln6.json, lernwelt-inhalte.json, dorf-inhalte.json,
                      woerter-en.json (Prüfliste fürs Wort des Tages, ENABLE-Wortliste, gemeinfrei)
                      kitchen-chaos.json (Schauplätze, Zutaten, Satzrahmen, Stufen)
                      karten.json (Europa- und Deutschlandkarte, für Länder-Finder und Expedition)
                      expedition.json (Hauptstädte, Nachbarn, Kartenmitten)
gemeinsam/            Code, den alle Seiten nutzen (siehe unten)
fonts/ icons/ vendor/ Schriften, Symbole, fremde Bibliotheken
cloudflare/           Worker-Quelltext und Anleitung
werkzeuge/            Prüfskript (pruefen.py), Inventar (inventar.py → INVENTAR.md),
                      Rauchtest (RAUCHTEST.md), Testumgebung (TESTUMGEBUNG.md)
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
| `karten-ansicht.js` | Karten laden, zoomen, verschieben, antippen (Länder-Finder, Expedition) |
| `spiel-hilfen.js` | Kleine Bausteine für die neuen Spiele: Runde melden, Endlos-XP, robuste Zeiger (mehrere Finger), wiederholbarer Zufall |
| `qrcode.js` | QR-Code-Erzeugung im Browser (MIT-Lizenz, Kazuhiko Arase) |
| `fonts.css` | Lokal gehostete Schriften aus `fonts/` (kein Google Fonts → DSGVO) |

Die Skripte in `gemeinsam/` finden den Hauptordner selbst (über ihren eigenen Ort).
Deshalb funktionieren sie aus jeder Ordnertiefe – nur der Pfad beim Einbinden ändert sich.

**Wichtig:** Ergebnisse und Pass-Fortschritt werden nach dem **Dateinamen** gespeichert
(ohne Ordner). Jeder Dateiname darf also nur einmal vorkommen – und eine App darf später
in einen anderen Ordner umziehen, ohne dass Fortschritt verloren geht (dann `config.json`
über den Admin und die Liste in `404.html` anpassen).

## Neue App einpflegen

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
- **Inventar:** `python3 werkzeuge/inventar.py` erzeugt `werkzeuge/INVENTAR.md` neu (Handspalten bleiben).
- **App-Prüfung:** `werkzeuge/APP-PRUEFUNG.md` – Ergebnis der Prüfung aller Apps (Etappe 3), Anforderungen an
  die Engines und die Lücken im Lehrplan (Startliste für neue Apps).
- **Ein Commit pro Upload:** alle Dateien einer Etappe gemeinsam hochladen (github.dev), sonst wird jeder
  Zwischenstand einzeln geprüft und ist oft rot.
- Upload nachmittags oder abends, nie kurz vor dem Unterricht.

## Ladekette (Infrastruktur Etappe 2)

Grundsatz: **Kern sofort, Rest bei Bedarf.** Die Budgets prüft `werkzeuge/pruefen.py`.

| Was | Lädt sofort | Lädt bei Bedarf | Budget |
|---|---|---|---|
| Startseite | umgebung.js, shared.js, config-api.js, pass.js | Sicherung (gleich nach dem Aufbau), Dorf-Kern (nur mit Dorf), QR (QR-Knopf), 3D-Figur und Truhe (Pass) | < 200 KB |
| Jede Lern-App | umgebung.js, navbar.js, pass.js (`SOFORT` in navbar.js) | pass-extras.js (erste Meldung), Dorf-Kern (nach der ersten Runde, nur mit Dorf), Sicherung (nur mit Karte) | < 80 KB |
| Offline-Speicher (sw.js) | `START` = Kern | `NACHLADEN` = Spiele, 3D, große Daten: gestaffelt im Hintergrund | < 800 KB |

- **pass.js** rechnet und speichert nur noch. Anzeige (XP-Meldung, Lob, Konfetti), Safari-Hinweis,
  Speicher-Wartung und Diagnose stehen in **gemeinsam/pass-extras.js**. Neue Funktionen, die nicht jede App
  sofort braucht, gehören dorthin oder in ein eigenes Modul – nicht in den Kern (das Budget hat kaum Luft).
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
  (2 Runden ≥ 70 % → ⭐). Angelegt, noch ohne Wirkung: `LernUeben.Freigabe.erlaubt(id)` (Etappe 7),
  `LernUeben.Fehlerheft` (sammelt schon, Anzeige Etappe 8), Vorlesen `?vorlesen=1`, große Schrift `?gross=1`.
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
