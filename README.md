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
| `navbar.js` | Home-Button + Ergebnisspeicherung, in jeder App am Ende von `<body>` |
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
