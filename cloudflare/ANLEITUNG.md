# Cloudflare Worker – Wartung

Der Worker `lern-apps-config` ist die einzige Stelle, die `config.json` im Repo ändern darf.
Die Startseite und alle Apps brauchen ihn **nicht** – sie lesen `config.json` direkt von
GitHub Pages. Fällt der Worker aus, funktioniert nur das Speichern im Admin nicht.

- Adresse: `https://lern-apps-config.bennigeitner.workers.dev`
  (steht als `WORKER_URL` in `config-api.js`)
- Quelltext: `cloudflare/worker.js` im Repo. Die Datei im Repo ist nur die Vorlage –
  **aktiv ist der Code, der bei Cloudflare eingefügt ist.**

## Was der Worker tut

| Anfrage | Wer | Zweck |
|---|---|---|
| `GET /` | öffentlich | liest `config.json` (Admin lädt damit den neuesten Stand) |
| `POST /login` | mit Passwort | prüft das Passwort und stellt einen Anmelde-Schlüssel aus (7 Tage gültig) |
| `POST /session` | mit Schlüssel | prüft beim Öffnen des Admins, ob der Schlüssel noch gilt |
| `POST /logout-all` | mit Schlüssel | meldet alle Geräte ab (braucht `LOGIN_KV`) |
| `PUT /` | mit Schlüssel | speichert `config.json`, nach Prüfung jedes Feldes |

Nur Anfragen von `https://geitner-hub.github.io` werden angenommen. Nach 5 falschen
Passwörtern ist das Gerät 15 Minuten gesperrt.

## Anmeldung im Admin

- Das Passwort wird nur beim Anmelden gesendet und **nirgends gespeichert**. Das Gerät
  behält nur einen signierten Schlüssel, der nach **7 Tagen** abläuft – dann fragt der Admin
  wieder nach dem Passwort. Oben im Admin steht „Angemeldet bis …“.
- **🔒 Abmelden** meldet nur dieses Gerät ab.
- **🚫 Alle Geräte abmelden** macht sofort jeden Schlüssel ungültig – auf allen Geräten,
  auch auf diesem. Wirkt überall innerhalb von ca. 1 Minute. Danach kommt nur noch hinein,
  wer das Passwort kennt. Braucht den KV-Speicher `LOGIN_KV` (unten).
- **Passwort ändern** (unten) meldet ebenfalls alle Geräte ab – das ist der Notfallweg,
  wenn jemand das Passwort kennen könnte.
- Die Dauer steht als `SESSION_DAYS` oben in `worker.js`.

## Einstellungen bei Cloudflare

dash.cloudflare.com → *Workers & Pages* → `lern-apps-config` → *Settings*

| Name | Art | Inhalt |
|---|---|---|
| `ADMIN_PASSWORD` | Secret | Admin-Passwort |
| `GITHUB_TOKEN` | Secret | Fine-grained Token, nur Repo `Lern-Apps`, Berechtigung *Contents: Read and write* |
| `LOGIN_KV` | Binding (KV) | nötig für „Alle Geräte abmelden“; macht außerdem die Sperre nach Fehlversuchen dauerhaft |

### KV-Speicher `LOGIN_KV` einrichten (einmalig, ca. 3 Minuten)

1. Cloudflare → *Storage & Databases* → *Workers KV* → *Create* (Namespace) →
   Name `lernwelt-login` → erstellen.
2. *Workers & Pages* → `lern-apps-config` → *Settings* → *Bindings* → *Add* → *KV namespace*
   → Variablenname **`LOGIN_KV`** (genau so) → Namespace `lernwelt-login` auswählen → speichern/*Deploy*.
3. Test: Im Admin „🚫 Alle Geräte abmelden“ → „✓ Alle Geräte wurden abgemeldet“.
   Ohne Binding erscheint „Dafür fehlt der KV-Speicher LOGIN_KV“.

Der kostenlose Tarif reicht bei Weitem (Lesen bei jedem Speichern, Schreiben nur beim Abmelden).

## Regelmäßig: GitHub-Token erneuern

Der Token läuft ab (Ablaufdatum beim Erstellen gewählt). Danach meldet der Admin beim
Speichern „GitHub: 401“. **Ablaufdatum im Kalender notieren** und vorher erneuern:

1. GitHub → *Settings* → *Developer settings* → *Personal access tokens* → *Fine-grained tokens*
   → Token `lernwelt-worker` öffnen → *Regenerate token* (oder neuen Token mit denselben
   Einstellungen erstellen: nur `Lern-Apps`, *Contents: Read and write*).
2. Neuen Token kopieren (wird nur einmal angezeigt).
3. Cloudflare → Worker → *Settings* → *Variables and Secrets* → `GITHUB_TOKEN` → *Edit* →
   neuen Token einfügen → speichern.
4. Im Admin eine Kleinigkeit speichern (z. B. ⭐ setzen und wieder entfernen) → „Gespeichert“.

## Passwort ändern

Cloudflare → Worker → *Settings* → *Variables and Secrets* → `ADMIN_PASSWORD` → *Edit*.
Wirkt sofort und meldet dabei alle Geräte ab (alte Schlüssel sind mit dem alten Passwort
signiert). Danach im Admin mit dem neuen Passwort anmelden.

## Worker-Code aktualisieren

Nur nötig, wenn sich `cloudflare/worker.js` im Repo ändert (steht dann in der Übergabe dabei).

1. Cloudflare → Worker → *Edit code*
2. Gesamten Code markieren und löschen → Inhalt von `cloudflare/worker.js` einfügen → *Deploy*
3. Test: `https://lern-apps-config.bennigeitner.workers.dev/` im Browser öffnen →
   es erscheint `{"content":"…","sha":"…"}`
4. Im Admin etwas speichern → „Gespeichert“

Secrets und Bindings bleiben beim Code-Tausch erhalten.

## Wenn etwas nicht geht

| Meldung im Admin | Ursache und Lösung |
|---|---|
| „Worker nicht erreichbar“ | Code nicht deployt, Adresse geändert (`WORKER_URL` in `config-api.js`) oder Cloudflare-Störung |
| „Falsches Passwort“ trotz richtigem | `ADMIN_PASSWORD` falsch geschrieben oder Leerzeichen am Ende |
| „Der Worker bei Cloudflare ist noch die alte Version“ | `admin.html`/`config-api.js` sind neuer als der Worker → Worker-Code aktualisieren (oben) |
| „Anmeldung abgelaufen“ | 7 Tage um, „Alle Geräte abmelden“ gedrückt oder Passwort geändert → Passwort eingeben |
| „Dafür fehlt der KV-Speicher LOGIN_KV“ | Binding fehlt oder heißt anders → KV einrichten (oben) |
| „Zu viele Fehlversuche“ | 15 Minuten warten |
| „GitHub: 401/403“ | Token abgelaufen, falsch oder ohne *Contents: Read and write* → Token erneuern (oben) |
| „Konflikt“ | `config.json` wurde inzwischen woanders geändert → Admin neu laden, Änderung wiederholen |
| „Ungültige Config: …“ | Ein Feld hat die Prüfung nicht bestanden. Kommt nach einem Update vor, wenn der Admin neue Felder speichert, der Worker-Code bei Cloudflare aber noch alt ist → Worker-Code aktualisieren (oben) |
| Seite zeigt Änderung nicht | GitHub Pages braucht ca. 1 Minute; danach neu laden |
| „Secrets fehlen“ beim Test im Browser | Namen der Secrets prüfen (Groß-/Kleinschreibung) |
