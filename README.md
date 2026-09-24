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
| `pass.js` | Lernwelt-Pass: XP, Level, Wochen-Serie, Meisterschafts-Sterne, Sicherungs-Code, Truhen-Zähler |
| `fonts.css` + `fonts/` | Lokal gehostete Schriften (kein Google Fonts → DSGVO) |
| `qrcode.js` | QR-Code-Erzeugung im Browser (MIT-Lizenz, Kazuhiko Arase) |
| `app-template.html` | Vorlage für neue Apps |
| `cloudflare/worker.js` | Quelltext des Cloudflare Workers (dort einfügen, nicht auf GitHub Pages nötig) |

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
- Der Worker schreibt ausschließlich `config.json` und prüft jeden Inhalt.
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
- **Sicherung:** QR/Code (`LW1.…`) im Pass; Scannen öffnet `index.html#pass=…` und stellt
  den Pass nach Rückfrage wieder her. Die Prüfsumme erkennt Tipp-/Kopierfehler, ist aber
  kein Schutz gegen gezieltes Manipulieren – der Pass ist ohnehin nur lokal.
- **Vorbereitet für Cosmetics:** `inventory`, `equipped`, `badges`, `chestsOpened` sind
  bereits im Speicher und im Sicherungs-Code enthalten. Truhen werden aus den XP berechnet
  (alle 250 XP eine) – schon jetzt verdiente Truhen können später geöffnet werden.
- Speicher: `localStorage['lernwelt-pass']` (nur auf dem Gerät).
