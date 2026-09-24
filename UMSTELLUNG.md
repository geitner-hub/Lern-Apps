# Umstellung auf die neue Version – Schritt für Schritt

Dauer: ca. 20 Minuten. Reihenfolge einhalten, dann gibt es keinen Ausfall der Startseite.

## 1. Vorbereiten (ändert noch nichts)

1. **Fine-grained GitHub-Token erstellen:** GitHub → Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → *Generate new token*
   - Name: `lernwelt-worker`, Ablauf: z. B. 1 Jahr (Termin im Kalender notieren!)
   - Repository access: *Only select repositories* → `Lern-Apps`
   - Permissions → Repository → **Contents: Read and write** (sonst nichts)
   - Token kopieren (wird nur einmal angezeigt).
2. **Neues Admin-Passwort** ausdenken: lang, z. B. vier zufällige Wörter.
   Nicht das alte Passwort verwenden – das war öffentlich lesbar.

## 2. Dateien auf GitHub hochladen

Repo `Lern-Apps` → *Add file* → *Upload files* → den **Inhalt** des ZIP-Ordners
(alle Dateien + Ordner `fonts` und `cloudflare`) hineinziehen → *Commit changes*.

Hinweis zu `config.json`: Die Datei im ZIP enthält die aufgeräumte Version
(Stand dieses Gesprächs). Falls du seitdem im Admin etwas geändert hast, lass
`config.json` beim Hochladen weg und passe die Punkte später im Admin an.

Die Startseite funktioniert sofort weiter (sie braucht den Worker nicht mehr).
Das Admin-Panel funktioniert erst nach Schritt 3.

## 3. Cloudflare Worker umstellen

1. dash.cloudflare.com → *Workers & Pages* → `lern-apps-config` öffnen.
2. **Settings → Variables and Secrets:**
   - `ADMIN_SECRET` **löschen** (war öffentlich).
   - *Add* → Typ **Secret** → Name `ADMIN_PASSWORD` → dein neues Passwort.
   - *Add* → Typ **Secret** → Name `GITHUB_TOKEN` → der neue Token aus Schritt 1.
     (Gibt es schon einen Eintrag für den alten Token unter anderem Namen, z. B.
     `GH_TOKEN`: diesen danach löschen.)
3. **Edit code** → gesamten alten Code löschen → Inhalt von `cloudflare/worker.js`
   einfügen → *Deploy*.
4. Test im Browser: `https://lern-apps-config.bennigeitner.workers.dev/`
   aufrufen → es muss `{"content":"…","sha":"…"}` erscheinen.
   Erscheint „Secrets fehlen“: Namen in Schritt 2 prüfen (Groß-/Kleinschreibung).

## 4. Alten Token entwerten (wichtig!)

GitHub → Settings → Developer settings → Tokens → den **alten** Token, den der
Worker bisher genutzt hat, *Delete/Revoke*. Erst dann ist das alte, öffentlich
gewordene Secret endgültig wertlos.

## 5. Kurztest (2 Minuten)

- [ ] `geitner-hub.github.io/Lern-Apps/` lädt, QR-Button an einer App zeigt QR-Code
- [ ] `admin.html`: falsches Passwort → „Falsches Passwort“
- [ ] richtiges Passwort → Dashboard; ⭐ bei einer App setzen → „Gespeichert“
- [ ] Dashboard → „✕ Deaktivieren“ → App des Tages weg
- [ ] Nach ca. 1 Minute Startseite neu laden → Änderung sichtbar

## Optional: dauerhafte Sperre nach Fehlversuchen

Ohne Zusatz gilt die Sperre (5 Fehlversuche → 15 Min.) nur pro Worker-Instanz.
Für eine verlässliche Sperre: *Storage & Databases → KV* → Namespace
`lernwelt-login` anlegen → im Worker unter *Settings → Bindings* → *Add* →
KV namespace, Variablenname **`LOGIN_KV`** → Deploy. Der Code nutzt ihn automatisch.

## Wenn etwas nicht geht

| Meldung im Admin | Ursache |
|---|---|
| „Worker nicht erreichbar“ | Worker-Code nicht deployt oder Adresse geändert (`WORKER_URL` in `config-api.js`) |
| „Falsches Passwort“ trotz richtigem | `ADMIN_PASSWORD` falsch geschrieben / Leerzeichen am Ende |
| „Fehler beim Speichern: GitHub: 401/403“ | Token falsch, abgelaufen oder ohne „Contents: Read and write“ |
| „Konflikt“ | `config.json` wurde woanders geändert → Seite neu laden |
