# Medienbereich – Einrichtung und Wartung

Im Admin gibt es den Tab **📁 Medien**: Bilder, Videos, Audio, PDFs und Dokumente hochladen
und den Kindern per QR-Code oder Kurzlink zeigen. Der Medienbereich hat **keinen Bezug zur
Lernwelt** – die Kinder sehen nur den Inhalt (direkt die Datei oder eine schlichte Seite mit
Text und Datei).

- **Dateien** liegen in Cloudflare **R2** (Bucket `lernwelt-medien`, Binding `MEDIEN`).
- **Titel, Texte, Ordner, Zähler** liegen in der vorhandenen D1-Datenbank der Pass-Sicherung
  (`SYNC_DB`, Tabelle `medien` – wird automatisch angelegt).
- **Code:** `cloudflare/medien.js` (Worker), `gemeinsam/admin/medien.js` (Admin).
- **Kurzlinks:** `https://lern-apps-config.bennigeitner.workers.dev/m/<code>` (5 Zeichen, z. B. `k7x2m`).

## Einrichtung (einmalig, ca. 10 Minuten)

### 1. R2 aktivieren

1. dash.cloudflare.com → links **R2 Object Storage** (ggf. unter *Storage & Databases*).
2. Beim ersten Mal fragt Cloudflare nach einer **Zahlungsart** (Kreditkarte oder PayPal) und lässt
   dich den R2-Plan aktivieren. Der Gratisrahmen (10 GB Speicher, Abrufe kostenlos) bleibt
   bestehen. Der Admin lässt höchstens **9,5 GB** zu, damit nie Kosten entstehen.

### 2. Bucket anlegen

1. **Create bucket** → Name: `lernwelt-medien`
2. *Location*: **Automatic** lassen oder – falls angeboten – als Hinweis **Western Europe (WEUR)** wählen.
   (Die Option *Jurisdiction* bitte **nicht** umstellen.)
3. *Create bucket*. Unter *Settings* **keinen** „Public access“ / „r2.dev“ einschalten – die
   Dateien laufen ausschließlich über den Worker (nur so funktionieren Ein/Aus-Schalter und Zähler).

### 3. Bucket an den Worker binden

*Workers & Pages* → `lern-apps-config` → *Settings* → *Bindings* → **Add** → **R2 bucket**
→ Variablenname **`MEDIEN`** (genau so, Großbuchstaben) → Bucket `lernwelt-medien` → speichern/*Deploy*.

Prüfen: Unter *Bindings* stehen jetzt `SYNC_DB` (D1) **und** `MEDIEN` (R2).

### 4. Code einbauen

Cloudflare → Worker → **Edit code**:

1. Links im Dateibaum neben `worker.js` und `sync.js` eine neue Datei **`medien.js`** anlegen →
   kompletten Inhalt von `cloudflare/medien.js` einfügen.
2. `worker.js` öffnen → **alles markieren** → durch den kompletten Inhalt von
   `cloudflare/worker.js` aus dem Repo ersetzen. (`sync.js` bleibt unverändert.)
3. **Deploy**.

> Falls `localhost` zum Testen in `ALLOWED_ORIGINS` einkommentiert war: nach dem Ersetzen
> wieder so einstellen wie vorher.

### 5. Testen

1. Admin öffnen → Tab **📁 Medien** → oben steht „0 KB von 9,5 GB belegt“.
   (Steht dort „Dafür fehlt der Dateispeicher MEDIEN“ → Schritt 3 prüfen.)
2. Ein kleines Bild hochladen → **📲 QR** → mit dem iPad scannen → das Bild öffnet sich.
3. Schalter ausschalten → Link erneut öffnen → „Gerade nicht freigegeben“.

Der tägliche Cron-Trigger der Pass-Sicherung räumt jetzt zusätzlich abgebrochene Uploads auf –
dafür ist nichts einzustellen.

## So funktioniert es im Alltag

| Was | Wie |
|---|---|
| **Hochladen** | Dateien in die Fläche ziehen oder antippen (mehrere auf einmal möglich), Fach und Ordner wählen, optional Untertitel, Infotext, Arbeitsauftrag. Große Videos werden in Teilen hochgeladen – die Seite dabei offen lassen. |
| **Direkt oder mit Seite** | Ohne Texte öffnet der Link **direkt die Datei**. Mit Untertitel/Info/Auftrag (oder Untertitel-Spur) sehen die Kinder eine schlichte Seite: Titel, Medium, Info-Kasten, Arbeitsauftrag. |
| **Sammlungen** | 📚 Neue Sammlung: mehrere Dateien unter **einem** QR-Code (z. B. Stationen), Reihenfolge mit ↑↓. Ausgeschaltete Dateien fehlen in der Sammlung automatisch. |
| **Ein/Aus** | Schalter je Zeile. Aus = Link zeigt „Gerade nicht freigegeben“, gedruckte QR-Codes bleiben gültig und gehen beim Einschalten wieder. Wirkt sofort. |
| **QR-Code** | 📲 QR: PNG nur mit Code oder mit Titel und Kurzlink (fürs Arbeitsblatt), Link kopieren, 🖥 Beamer-Großansicht (Vollbild, Esc schließt). |
| **Kurzlink** | Zum Abtippen, falls die Kamera streikt, z. B. `lern-apps-config.bennigeitner.workers.dev/m/k7x2m`. |
| **Aufrufe** | 👁 zählt jedes Öffnen des Links (anonym, ohne Gerät oder Namen). |
| **Untertitel-Spur** | Für Videos eine `.vtt`- oder `.srt`-Datei (z. B. aus YouTube Studio oder einem Untertitel-Programm). `.srt` wird automatisch umgewandelt. Nachträglich über ✏️. |
| **Löschen** | 🗑 löscht die Datei endgültig (auch aus Sammlungen). Gedruckte QR-Codes zeigen danach „Nicht gefunden“. |
| **Ordner umbenennen** | ✏️ neben dem Ordnernamen. Leerer Name = Ordner auflösen. |

**Erlaubte Dateitypen:** jpg, png, gif, webp, heic, avif · mp4, m4v, mov, webm · mp3, m4a, aac, wav, ogg ·
pdf · docx, xlsx, pptx, doc, xls, ppt, odt, ods, odp · pages, key, numbers · txt, csv, zip, ggb.
Nicht erlaubt (Sicherheit): html, svg, js. Höchstens **1 GB pro Datei**.

**Datenschutz:** Wer den Link hat, kann den Inhalt öffnen (Codes sind zufällig und nicht erratbar,
aber weitergebbar). Keine Fotos oder Videos hochladen, auf denen Kinder erkennbar sind, und keine
personenbezogenen Dokumente. Der Worker speichert beim Abruf nichts über die Kinder.

## Fehlersuche

| Meldung im Admin | Ursache / Lösung |
|---|---|
| „Dafür fehlt der Dateispeicher MEDIEN (R2)“ | Binding fehlt oder heißt anders → Schritt 3. Danach *Deploy*. |
| „Dafür fehlt die Datenbank (SYNC_DB)“ | Die Pass-Sicherung ist nicht eingerichtet → `ANLEITUNG-SYNC.md`, Schritte 1–2. |
| „Nicht gefunden“ beim Laden der Liste | Neuer Code ist noch nicht im Worker → Schritt 4. |
| „Speicher voll“ | Über 9,5 GB → alte Dateien löschen (größte zuerst, steht in jeder Zeile). |
| Upload bricht ab | WLAN-Abbruch oder iPad gesperrt. Einfach noch einmal hochladen; Reste werden nachts entfernt. Große Teile werden automatisch bis zu 3× wiederholt. |
| Video lädt auf dem iPad nicht | Format prüfen: am sichersten **MP4 (H.264)**. iPhone-Videos (.mov/HEVC) laufen auf iPads meist auch. |

Kosten im Blick: dash.cloudflare.com → R2 → *Overview* zeigt Speicher und Abrufe. Im Gratisrahmen
fallen bis 10 GB und viele Millionen Abrufe keine Kosten an.
