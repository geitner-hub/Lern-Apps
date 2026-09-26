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
| `POST /login` | mit Passwort | prüft das Passwort beim Anmelden im Admin |
| `PUT /` | mit Passwort | speichert `config.json`, nach Prüfung jedes Feldes |

Nur Anfragen von `https://geitner-hub.github.io` werden angenommen. Nach 5 falschen
Passwörtern ist das Gerät 15 Minuten gesperrt.

## Einstellungen bei Cloudflare

dash.cloudflare.com → *Workers & Pages* → `lern-apps-config` → *Settings*

| Name | Art | Inhalt |
|---|---|---|
| `ADMIN_PASSWORD` | Secret | Admin-Passwort |
| `GITHUB_TOKEN` | Secret | Fine-grained Token, nur Repo `Lern-Apps`, Berechtigung *Contents: Read and write* |
| `LOGIN_KV` | Binding (KV), optional | macht die Sperre nach Fehlversuchen dauerhaft (sonst gilt sie nur pro Worker-Instanz) |

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
Wirkt sofort; im Admin einmal ab- und wieder anmelden.

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
| „Zu viele Fehlversuche“ | 15 Minuten warten |
| „GitHub: 401/403“ | Token abgelaufen, falsch oder ohne *Contents: Read and write* → Token erneuern (oben) |
| „Konflikt“ | `config.json` wurde inzwischen woanders geändert → Admin neu laden, Änderung wiederholen |
| „Ungültige Config: …“ | Ein Feld hat die Prüfung nicht bestanden. Kommt nach einem Update vor, wenn der Admin neue Felder speichert, der Worker-Code bei Cloudflare aber noch alt ist → Worker-Code aktualisieren (oben) |
| Seite zeigt Änderung nicht | GitHub Pages braucht ca. 1 Minute; danach neu laden |
| „Secrets fehlen“ beim Test im Browser | Namen der Secrets prüfen (Groß-/Kleinschreibung) |
