# Admin-Inventar (Admin-Umbau, Etappe 0)

Bestandsaufnahme des Admins vor dem Umbau (`admin.html` + `gemeinsam/admin/*.js`, Stand v70) als Grundlage für den
Umbau. Seit Etappe 2 (v73) gibt es nur noch den neuen Admin unter `admin.html`; `kern.js` und `start.js` sind
durch `store.js`, `bruecke.js` und `rahmen.js` ersetzt. **Etappe 2** hat jede Zeile abgehakt, die Funktion steht im neuen Admin (`admin.html`).
☑ = im neuen Admin vorhanden (Etappe 2, über die Brücke `gemeinsam/admin/bruecke.js`; Adresse in Klammern).
**Etappe 4** nutzt die Spalte „Suchbegriffe“ für den Suchindex.

Bereiche im neuen Admin: **Start · Inhalte · Gruppen · Motivation · Medien · System**.

## 1. Funktionen je Reiter → neuer Bereich

| Alter Reiter | Funktion | Datei (alt) | config.json / Worker | Neuer Bereich | Suchbegriffe | Umgezogen |
|---|---|---|---|---|---|---|
| (Kopf) | Anmelden mit Passwort, 7-Tage-Schlüssel, Sitzung prüfen | `kern.js`, `start.js`, `config-api.js` | `/login`, `/session` | System | Anmeldung, Passwort | ☑ System (#/system/anmeldung) |
| (Kopf) | Dieses Gerät abmelden / Alle Geräte abmelden | `kern.js` | `/logout-all` | System | Abmelden, Geräte | ☑ #/system/anmeldung |
| (Kopf) | Entwurf merken, Leiste „x Änderungen“, Verwerfen, Veröffentlichen (ein Commit) | `kern.js` | `PUT /` | Kopfleiste | Entwurf, Veröffentlichen | ☑ Kopfleiste |
| (Kopf) | Letzte 5 Veröffentlichungen (GitHub-Commits an config.json) | `kern.js` | öffentliche GitHub-API | System (Etappe 3: Versionsverlauf) | Verlauf, Historie | ☑ #/system/entwurf |
| (Kopf) | Versionsanzeige | `admin.html` (inline) | – | Kopfleiste | Version | ☑ Kopfleiste |
| (Kopf) | Links zu Sicherungskarten, Infokarten, Startseite | `admin.html` | – | Gruppen / Inhalte | Karten | ☑ #/system/seiten, #/gruppen/karten |
| 📊 Dashboard | Kennzahlen (Apps, sichtbar, versteckt, Tags, Banner), Pass-Status | `uebersicht.js` | – | Start (wird umgebaut) | Übersicht | ☑ #/start/uebersicht |
| 📊 Dashboard | App des Tages anzeigen | `uebersicht.js` | `apps[].aod` | Start | App des Tages | ☑ #/start/uebersicht |
| 📊 Dashboard | „Letzte Aktionen“ (nur diese Sitzung) | `uebersicht.js` (`logChange`) | – | Start | Aktionen | ☑ #/start/uebersicht |
| 📱 Apps | Neue App anlegen (Emoji, Name, Datei, Fach, Beschreibung) | `apps.js` | `apps[]` | Inhalte | App hinzufügen | ☑ #/inhalte/apps |
| 📱 Apps | Liste mit Suche, Fach-, Klassen-, Statusfilter | `apps.js` | – | Inhalte | Suche, Filter | ☑ #/inhalte/apps |
| 📱 Apps | Bearbeiten, Ein-/Ausblenden, App des Tages, Löschen mit Rückgängig | `apps.js` | `apps[].hidden`, `.aod` | Inhalte | bearbeiten, verstecken | ☑ #/inhalte/apps |
| 📱 Apps | QR-Code einer App zeigen/speichern | `tags.js` (`showQR`) | – | Inhalte (+ Unterrichtsmodus) | QR | ☑ #/inhalte/apps |
| 🗂 Ordnen | Fächer und Regale per Drag & Drop, Apps verschieben, Fach ausblenden | `ordnen.js`, `sichtbarkeit.js`, `vendor/Sortable.min.js` | `catOrder`, `hiddenCats`, `gruppen[]`, `apps[].gruppe` | Inhalte | Regal, Reihenfolge | ☑ #/inhalte/ordnen |
| 🗂 Ordnen | Schüler-Vorschau der Startseite je Klasse | `ordnen.js` | localStorage `lernwelt-admin-vorschau` | Inhalte | Vorschau | ☑ #/inhalte/ordnen |
| 🏷 Tags | Eigene Tags anlegen, Farbe wählen | `tags.js` | `customTags[]` | Inhalte | Tags | ☑ #/inhalte/tags |
| 🏷 Tags | Tags und Klassenstufen je App zuweisen (Modal) | `tags.js` | `apps[].customTags`, `.klassen` | Inhalte | Klasse, Tags | ☑ #/inhalte/tags |
| 📢 Banner | Ankündigungs-Banner mit Vorschau, Farbe, an/aus | `werkzeuge.js` | `announcement` | Start | Banner, Ankündigung | ☑ #/start/banner |
| 🧭 Pass | Saison-Modus, Avatar, Events an/aus | `pass.js` | `pass.seasons`, `.avatar`, `.events` | Motivation | Saison, Event | ☑ #/motivation/pass |
| 🧭 Pass | Spiele: „Meine Themen“-Schwellen, Auswahl, Starter, Wort-Units | `spiele.js` | `spiele` | Inhalte | Meine Themen, RUN, Burg | ☑ #/motivation/pass (steht im Pass-Formular) |
| 🧭 Pass | Übersicht aller Inhalte und Titel (nur Ansicht) | `uebersicht.js` | – | Motivation | Titel, Inhalte | ☑ #/motivation/pass |
| 🏘️ Dorf | Wochenauftrag | `dorf.js` | `dorf.wochen[]` | Motivation | Wochenauftrag | ☑ #/motivation/dorf |
| 🏘️ Dorf | Lehrer-Zettel am Auftragsbrett | `dorf.js` | `dorf.lehrerZettel[]` | Motivation | Zettel, Hausaufgabe | ☑ #/motivation/dorf |
| 🏘️ Dorf | Challenges (eigene starten, Rotation) | `dorf.js` | `dorf.challenges[]`, `.challengeRotation` | Motivation | Challenge, Trophäe | ☑ #/motivation/dorf |
| 🏘️ Dorf | Einstellungen (Plätze, Neu-Würfeln, Baukosten-Faktor) | `dorf.js` | `dorf.plaetze`, `.rerollsProTag`, `.rerollsMax`, `.kostenfaktor` | Motivation | Dorf | ☑ #/motivation/dorf |
| 🏘️ Dorf | Apps für Aufträge ausschließen, Runden je Auftrag | `dorf.js` | `apps[].dorf`, `.dorfRunden` | Motivation | Aufträge | ☑ #/motivation/dorf |
| 🏘️ Dorf | Übersicht Dorf-Inhalte (nur Ansicht) | `dorf.js` | – | Motivation | Gebäude | ☑ #/motivation/dorf |
| 🎯 Unterricht | Startseite: „Heute für dich“ an/aus | `freigaben.js` | `heute` | Inhalte | Heute | ☑ #/inhalte/freigaben |
| 🎯 Unterricht | Fokus „heute nur diese Apps“ je Gruppe/Klasse | `freigaben.js` | `fokus[]` | Gruppen (+ Unterrichtsmodus) | Fokus | ☑ #/gruppen/fokus |
| 🎯 Unterricht | Spielsperre je Wochentag und Gruppe/Klasse, Schwelle | `freigaben.js` | `spielsperre.schwelle`, `.runden` | Gruppen | Spielsperre | ☑ #/gruppen/spielsperre |
| 🎯 Unterricht | Ausnahmen von der Spielsperre (enden von selbst) | `freigaben.js` | `spielsperre.ausnahmen[]` | Gruppen (+ Unterrichtsmodus) | Spiele frei | ☑ #/gruppen/spielsperre |
| 🎯 Unterricht | Freigaben je Stufe/Unit (zu, offen, ab Datum) | `freigaben.js` | `freigaben` | Inhalte (Etappe 8: Katalog-Baum) | Freigabe, Sperre, Stufe | ☑ #/inhalte/freigaben |
| 🎯 Unterricht | Gruppen-Auswertung (anonyme Summen je Thema) | `freigaben.js` | `/sync/admin/statistik` | Gruppen | Auswertung, Fortschritt | ☑ #/gruppen/auswertung |
| 🗺️ Lernwege | Lernwege Gruppen/Klassen zuteilen, Vorschau, Klassen-Übersicht | `freigaben.js` (`buildLernwegeTab`) | `freigaben[ID][wer] = 'offen'`, `/sync/admin/statistik` | Gruppen | Lernweg, Stationen | ☑ #/gruppen/lernwege |
| 📁 Medien | Hochladen (auch in Teilen), Untertitel, Ordner, Sammlungen, Ein/Aus, Löschen, QR, Beamer, Speicheranzeige | `medien.js` (fertig, wirkt sofort) | `/medien/admin/*` (R2 + `SYNC_DB`) | Medien | Datei, QR, Beamer | ☑ #/medien/dateien |

**Eigene Seiten neben dem Admin** (bleiben, werden aus dem neuen Admin verlinkt):

| Seite | Zweck | Neuer Bereich |
|---|---|---|
| `admin-karten.html` | Sicherungskarten: Gruppen anlegen/umbenennen/löschen, Codes erzeugen, drucken, löschen | Gruppen |
| `infokarten.html` | Infokarten zu allen Apps (auch ohne Passwort) | Inhalte |
| `aufgaben-check.html` | Aufgaben prüfen | System |
| `sync-karte.html` | Karte für ein Kind (Sicherung) | Gruppen |
| Startseite → Pass → Sicherung → 5× Versionszeile | Diagnose und Fehlerprotokoll (`pass-extras.js`) | System (zusätzlich, ☑ #/system/diagnose – zeigt das Admin-Gerät) |

## 2. Worker-Endpunkte (`cloudflare/worker.js`, `sync.js`, `medien.js`)

| Endpunkt | Anmeldung | Zweck | Genutzt von |
|---|---|---|---|
| `GET /` | – | config.json lesen (base64 + sha) | Admin (`ConfigAPI.loadAdmin`) |
| `POST /login` | Passwort | Anmelde-Schlüssel (7 Tage) | Admin |
| `POST /session` | Schlüssel | Schlüssel noch gültig? | Admin |
| `POST /logout-all` | Schlüssel | alle Schlüssel ungültig (braucht `LOGIN_KV`) | Admin |
| `PUT /` | Schlüssel | config.json schreiben (ein Commit, sha gegen Konflikte, `validateConfig`) | Admin |
| `/sync/holen`, `/sync/speichern`, `/sync/statistik` | Code der Karte | Pass-Sicherung der Kinder | Kinder-Seite |
| `/sync/admin/gruppen`, `gruppe-anlegen`, `gruppe-umbenennen`, `gruppe-loeschen`, `code-loeschen` | Schlüssel | Sicherungskarten verwalten | `admin-karten.html`, `freigaben.js` |
| `/sync/admin/statistik` | Schlüssel | anonyme Gruppen-Auswertung | `freigaben.js` |
| `/m/<code>…` | – | öffentliche Kurzlinks zu Medien | Kinder (QR) |
| `/medien/admin/liste`, `neu`, `datei`, `teil`, `abschliessen`, `abbrechen`, `aendern`, `loeschen`, `ordner-umbenennen`, `sammlung`, `untertitel`, `untertitel-loeschen` | Schlüssel | Medienbereich | `medien.js` |
| Cron (täglich) | – | alte Pass-Stände und abgebrochene Uploads aufräumen | – |

Secrets/Bindings: `ADMIN_PASSWORD`, `GITHUB_TOKEN`, optional `LOGIN_KV`, `SYNC_DB` (D1), `MEDIEN` (R2).

## 3. Felder von config.json

| Feld | Gepflegt in | Vom Worker geprüft |
|---|---|---|
| `version` | `config-api.js` (`migrate`) | nein (harmlos) |
| `apps[]` – `name`, `datei`, `fach`, `emoji`, `beschreibung`, `klassen`, `hidden`, `aod`, `customTags`, `gruppe`, `dorf`, `dorfRunden` | Apps, Tags, Ordnen, Dorf | ja |
| `customTags[]`, `hiddenCats[]`, `catOrder[]`, `gruppen[]` | Tags, Ordnen | ja |
| `announcement` | Banner | ja |
| `pass` – `seasons`, `avatar`, `events` | Pass | ja |
| `spiele` – `auswahl`, `schwelle`, `runden`, `starter`, `wortBis` | Pass (`spiele.js`) | ja (seit Etappe 1, vorher nicht) |
| `dorf` – `plaetze`, `rerollsProTag`, `rerollsMax`, `kostenfaktor`, `wochen`, `challenges`, `challengeRotation`, `lehrerZettel` | Dorf | ja |
| `freigaben` | Unterricht, Lernwege | ja |
| `fokus[]` | Unterricht | ja |
| `spielsperre` – `schwelle`, `runden`, `ausnahmen` | Unterricht | ja |
| `heute` | Unterricht | ja (nur `false`) |
| `featureSchalter` – `{ name: true\|false }` | neu (Etappe 1), genutzt ab Etappe 10 | ja |
| andere Felder oben | – | werden seit Etappe 1 abgelehnt |

## 4. Befunde für spätere Etappen

- ~~Unbekannte Felder oben in config.json lehnt der Worker nicht ab, und `spiele` wird gar nicht geprüft.~~
  Erledigt in Etappe 1 (`validateConfig`: `spiele`, `featureSchalter`, Liste bekannter Felder). Wirkt erst, wenn der
  neue `cloudflare/worker.js` bei Cloudflare eingefügt ist.
- **Versionsverlauf gibt es schon in klein** (letzte 5 Commits über die öffentliche GitHub-API, ohne Worker).
  → Etappe 3 baut darauf auf (letzte 30, Ansehen, Wiederherstellen über einen Worker-Lese-Endpunkt).
- **„Letzte Aktionen“ im Dashboard** gilt nur für die laufende Sitzung. → Etappe 3: Änderungsprotokoll aus den Commit-Nachrichten.
- **Größte Module**: `medien.js` (781 Zeilen, 14 KB gz), `freigaben.js` (609 Zeilen, 13 KB gz). Beide liegen weit unter
  dem Budget von 55 KB je Datei. Etappe 2 hat sie deshalb nicht aufgeteilt (die Teile teilen sich Zustand wie `FR`
  und `frCfg`; Aufteilen hätte nur Risiko gebracht). Aufteilen, sobald eine davon an Funktionen wächst.
- **Alle Module teilten globale Variablen aus `kern.js`** (`CONFIG`, `ghSha`, `saveConfig`, `showToast` …).
  → Etappe 2: `bruecke.js` stellt sie bereit und schreibt über `store.js`; die Funktionsdateien blieben dadurch
  unverändert. Ein Modul darf später einzeln auf `ctx.store` umgestellt werden (dann aus der Brücke nehmen).
- **Spielsperre-Ausnahmen und Fokus haben schon `ab`/`bis`**, Freigaben kennen ein Datum („ab JJJJ-MM-TT“).
  → Etappe 6 übernimmt diese Felder, statt neue `start`/`ende` daneben zu stellen, wo es sie schon gibt.
- Speicher-Schlüssel des Admins: `lernwelt-admin-entwurf`, `lernwelt-admin-vorschau`, `lernwelt-admin-schluessel`,
  `lernwelt-config-cache(-ts)`. Der neue Admin nutzt dieselben (nie umbenennen).
