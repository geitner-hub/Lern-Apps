# Lern-Apps

Sammlung interaktiver Lern-Apps für den Unterricht (Mittelschule Bayern, v. a.
5. Klasse). Gehostet über GitHub Pages unter `geitner-hub.github.io/Lern-Apps`,
verwaltet über ein eigenes Admin-Panel.

## Struktur

| Datei | Zweck |
|---|---|
| `index.html` | Startseite/App-Übersicht für die Schüler:innen |
| `admin.html` | Verwaltungsoberfläche – Apps anlegen/bearbeiten, sichtbar/versteckt schalten, Tags, Ankündigung, „App des Tages" |
| `config.json` | Zentrale Konfiguration aller Apps (Quelle für `index.html` und `admin.html`) |
| `config-api.js` | Lädt/speichert `config.json` über einen Cloudflare Worker |
| `navbar.js` | Gemeinsamer Home-Button + Ergebnis-Badge, wird von jeder App per `<script src="navbar.js">` eingebunden |
| `shared.js` | Gemeinsame Konstanten/Hilfsfunktionen (Fach-Farben, Tag-Farben) |
| `app-template.html` | Vorlage für neue Apps (Grundgerüst, Farbvariablen, `LernApps.saveResult()`) |
| `*.html` (übrige) | Die einzelnen Lern-Apps, z. B. `kopfrechnen.html`, `rechen-arena.html` |

## Neue App einpflegen

**1. Datei ins Repo legen**
Neue HTML-Datei (z. B. `rechen-arena.html`) in den Root des Repos hochladen/committen.
Es müssen dafür **keine weiteren Dateien angepasst werden** – `navbar.js` sorgt
automatisch für den Home-Button, solange die App es am Ende von `<body>` einbindet
(`<script src="navbar.js"></script>`, siehe `app-template.html`).

**2. App in `config.json` eintragen**
Erst dieser Schritt lässt die App auf der Startseite erscheinen. Zwei Wege:

- **Über `admin.html` (empfohlen):** Seite öffnen, neue App über das Formular
  anlegen, Felder ausfüllen, speichern. Das Admin-Panel schreibt automatisch in
  `config.json` im Repo (über den Cloudflare Worker aus `config-api.js`,
  der die GitHub-API nutzt) – kein manueller Commit nötig.
- **Manuell:** Neuen Eintrag von Hand in das `apps`-Array von `config.json`
  ergänzen und committen/pushen (siehe Beispiel unten).

**3. Fertig**
Die App erscheint automatisch auf der Startseite, sobald `hidden: false` gesetzt
und mindestens eine passende Klassenstufe unter `klassen` eingetragen ist.

## Felder eines App-Eintrags in `config.json`

| Feld | Bedeutung |
|---|---|
| `name` | Anzeigename auf der Startseite |
| `datei` | Dateiname der HTML-App, z. B. `"rechen-arena.html"` |
| `fach` | Fach-Kategorie: `Mathematik`, `Englisch`, `Deutsch`, `WiB`, `Sport`, `Informatik` oder `GPG` |
| `emoji` | Icon (aktuell im Repo einheitlich `📱`) |
| `beschreibung` | Kurzer Beschreibungstext unter dem Namen |
| `hidden` | `true` = App (noch) nicht auf der Startseite sichtbar |
| `klassen` | Array der Klassenstufen, z. B. `[5]` – leer `[]`, solange `hidden: true` |
| `customTags` | Zusätzliche farbige Tags, z. B. `{ "name": "Kopfrechnen", "color": 5 }` |
| `aod` | „App des Tages"-Markierung ⭐ (im Admin-Panel togglebar, nur eine App gleichzeitig) |

Die verfügbaren `customTags` und ihre Farben werden zusätzlich im Top-Level-Feld
`customTags` von `config.json` verwaltet (Farbpalette siehe `TAG_COLORS` in
`shared.js`).

## Beispiel-Eintrag: Rechen-Arena

```json
{
  "name": "Rechen-Arena",
  "datei": "rechen-arena.html",
  "fach": "Mathematik",
  "emoji": "📱",
  "beschreibung": "4 Mini-Spiele zum Üben der Grundrechenarten – Wiederholung 4. Klasse.",
  "hidden": false,
  "klassen": [5],
  "customTags": [{ "name": "Kopfrechnen", "color": 5 }],
  "aod": false
}
```

Falls der Tag `"Kopfrechnen"` (Farbe 5) im Top-Level-`customTags`-Array von
`config.json` noch nicht existiert, muss er dort einmalig ergänzt werden –
über `admin.html` geschieht das automatisch beim Speichern.

## Sonstiges

- Ergebnisse (`LernApps.saveResult()`) werden pro Gerät im `localStorage` des
  Browsers gespeichert, nicht zentral/serverseitig.
- Schreibzugriff auf `config.json` läuft ausschließlich über den Cloudflare
  Worker aus `config-api.js` (`WORKER_URL`); die Zugriffskontrolle dafür ist
  nicht Teil dieses Repos.
