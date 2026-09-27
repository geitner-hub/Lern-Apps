# Lern-Apps (Lernwelt)

Sammlung interaktiver Lern-Apps für den Unterricht (Mittelschule Bayern, v. a.
5. Klasse). Gehostet über GitHub Pages unter `geitner-hub.github.io/Lern-Apps`,
verwaltet über ein eigenes Admin-Panel.

## Struktur

```
index.html            Startseite (bleibt im Hauptordner – Home-Bildschirm-Symbol!)
admin.html            Verwaltung (Login wird im Cloudflare Worker geprüft)
pass-karte.html       Druckbare Sicherungskarten (?sammel = 8 pro A4)
aufgaben-check.html   Werkzeug: Beispielaufgaben aus aufgaben.js ansehen
404.html              Leitet alte Links (vor der Ordnerstruktur) automatisch um
config.json           Zentrale Konfiguration (nur diese Datei schreibt der Worker)
sw.js                 Offline-Speicher – muss im Hauptordner liegen
manifest.webmanifest  App-Symbol (Anleitung: APP-SYMBOL.md)

apps/mathe/  apps/englisch/  apps/gpg/   Lern-Apps nach Fach
apps/vorlage/app-template.html          Vorlage für neue Apps
spiele/               RUN!, Tower Defense, Mein Dorf (dorf.html)
daten/                vokabeln5.json, vokabeln6.json, lernwelt-inhalte.json, dorf-inhalte.json
gemeinsam/            Code, den alle Seiten nutzen (siehe unten)
fonts/ icons/ vendor/ Schriften, Symbole, fremde Bibliotheken
cloudflare/           Worker-Quelltext und Anleitung
```

| Datei in `gemeinsam/` | Zweck |
|---|---|
| `shared.js` | Gemeinsame Konstanten & Helfer (Fächer, Farben, `escHtml`, `isSafeLink`, QR) – **einzige Quelle** |
| `config-api.js` | Laden (öffentlich/Admin) und Speichern über den Worker |
| `navbar.js` | Home-Button + Ergebnisspeicherung, in jeder App am Ende von `<body>`; lädt `pass.js` automatisch |
| `pass.js` | Lernwelt-Pass: XP, Level, Wochen-Serie, Meisterschafts-Sterne, Sicherungs-Code, Truhen-Zähler |
| `avatar3d.js` | 3D-Avatar aus Blöcken (lädt `vendor/three.min.js` erst bei Bedarf) |
| `chest3d.js` | 3D-Truhe zum Öffnen |
| `dorf-kern.js` | „Mein Dorf“: Spielstand, Aufträge, Bauen; von `navbar.js` in jeder App mitgeladen |
| `dorf-szene.js` | „Mein Dorf“: 3D-Dorf (Voxel-Gebäude als Code, feste Iso-Kamera), nur in `spiele/dorf.html` |
| `aufgaben.js` | Aufgaben-Pools für die Spiele („Meine Themen“) |
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
   im `<head>` `<link rel="stylesheet" href="../../gemeinsam/fonts.css">`,
   am Ende von `<body>` `<script src="../../gemeinsam/navbar.js"></script>`.
   Spiele liegen eine Ebene höher (`spiele/`) und nutzen `../gemeinsam/…`.
   Daten (JSON) aus `daten/` laden, z. B. `fetch('../../daten/vokabeln5.json')`.
   **Keine Google-Fonts-Links oder andere externe Dienste einbinden.**
2. In `admin.html` über „Neue App“ eintragen, mit Ordner: `apps/mathe/meine-app.html`
   (auch `…?parameter=wert` oder `https://…` möglich).
3. Klassenstufe(n) und Tags über 🏷 setzen – fertig.
4. Neues Fach mit eigenem Ordner? Einfach `apps/<fach>/` anlegen.

## Ergebnisse speichern (in Apps)

```js
LernApps.saveResult({ score: 8, max: 10 });                 // Minimum
LernApps.saveResult({ score: 8, max: 10, label: '8 / 10', skill: 'einmaleins-7' });
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
- **Sicherung:** QR/Code (`LW3.…` komprimiert mit `vendor/fflate.min.js`, ohne Kompression `LW2.…`;
  alte `LW1`/`LW2`-Codes werden weiter gelesen) im Pass. Der Code enthält auch das Dorf (Feld `d`).
  Scannen öffnet `index.html#pass=…` und stellt
  den Pass nach Rückfrage wieder her. Die Prüfsumme erkennt Tipp-/Kopierfehler, ist aber
  kein Schutz gegen gezieltes Manipulieren – der Pass ist ohnehin nur lokal.
- **Truhen & Avatar-Teile:** alle 250 XP eine Truhe. Chancen 60/30/10 % (gewöhnlich/selten/episch),
  keine Dubletten; ist der Pool leer, gibt es Sternenstaub. Neun Plätze: Kopf, Gesicht, Oberteil,
  Hose, Schuhe, Rücken, In der Hand, Begleiter, Hintergrund. Die Figur selbst (Hautton, Frisur,
  Haarfarbe, Augen, Mund) ist immer frei wählbar; Startausstattung steht in `AVATAR.START`.
  Gesperrte Teile können in der Garderobe anprobiert werden.
- **Level-Truhen:** jeder Level-Aufstieg gibt zusätzlich eine Truhe (nur ab Einführung, nicht rückwirkend).
  Sie zieht aus dem normalen Truhen-Pool (ohne Event-Anteil) und wird zuerst geöffnet. Zählung in
  `levelChests`/`levelOpened`, beides steckt im Sicherungs-Code (`lc`/`lo`).
- **Truhe öffnen** (`chest3d.js`): 3D-Truhe im Block-Stil, dreimal antippen (das Glühen wird stärker,
  bleibt aber neutral), dann wird das Teil gezogen und gespeichert, erst danach läuft die Animation
  (Deckel, Lichtsäule, Funken, das 3D-Teil steigt auf; Stärke je Seltenheit). Tippen überspringt.
  Varianten: normal, Level-Truhe, Halloween, Weihnachten (Geschenk), Ostern – neue Varianten in `SKINS`.
  Ohne WebGL: gezeichnete Truhe. Bei „Bewegung reduzieren“: ruhige Version.
- **Pass-Reiter:** Garderobe (Start) · Truhen · Erfolge (Leiste + Abzeichen) · Sicherung (mit Stand der
  letzten Sicherung; „!“ nach 30 Tagen ohne Sicherung bzw. ab 100 XP ohne jede Sicherung).
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
- **Wochenauftrag** (Montag bis Sonntag, auf dem Brett unter den Tageszetteln): automatisch „Erledige 5 Aufträge
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
