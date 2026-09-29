# Pass-Sicherung (Sync) – Einrichtung und Wartung

Die automatische Pass-Sicherung läuft im bestehenden Worker `lern-apps-config`.
Der Code steht in `cloudflare/sync.js`, der Einstieg in `cloudflare/worker.js`.
Die Stände liegen **verschlüsselt** in einer D1-Datenbank. Der Worker kann sie nicht
lesen; Namen werden nie gespeichert.

## Einrichtung (einmalig, ca. 10 Minuten)

### 1. Datenbank anlegen

1. dash.cloudflare.com → *Storage & Databases* → *D1 SQL Database* → *Create*
2. Name: `lernwelt-sync` → *Create*. Region automatisch lassen (oder *Western Europe*, falls angeboten).

Die Tabellen legt der Worker beim ersten Aufruf selbst an.

### 2. Datenbank an den Worker binden

*Workers & Pages* → `lern-apps-config` → *Settings* → *Bindings* → *Add* → *D1 database*
→ Variablenname **`SYNC_DB`** (genau so) → Datenbank `lernwelt-sync` → speichern/*Deploy*.

### 3. Code einbauen

**a) `sync.js` hinzufügen**

Cloudflare → Worker → *Edit code* → links im Dateibaum neben `worker.js` eine neue Datei
**`sync.js`** anlegen → Inhalt von `cloudflare/sync.js` einfügen.

**b) In `worker.js` den Block `export default { … };` ersetzen**

Den kompletten Block von `export default {` bis zur zugehörigen `};` (direkt vor
`// ── GET: config.json lesen`) markieren und durch Folgendes ersetzen:

```js
import { handleSync, syncAufraeumen } from './sync.js';

// ── Einstieg ───────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors   = corsHeaders(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    // Browser-Anfragen von fremden Webseiten ablehnen
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: 'Origin nicht erlaubt' }, 403, cors);
    }

    if (!env.GITHUB_TOKEN || !env.ADMIN_PASSWORD) {
      return json({ error: 'Worker nicht konfiguriert (Secrets fehlen)' }, 500, cors);
    }

    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/sync/'))                      return await handleSync(request, env, cors, url, { checkToken });
      if (request.method === 'GET' && url.pathname === '/')       return await handleGet(env, cors);
      if (request.method === 'POST' && url.pathname === '/login') return await handleLogin(request, env, cors);
      if (request.method === 'POST' && url.pathname === '/session') return await handleSession(request, env, cors);
      if (request.method === 'POST' && url.pathname === '/logout-all') return await handleLogoutAll(request, env, cors);
      if (request.method === 'PUT' && url.pathname === '/')       return await handlePut(request, env, cors);
      return json({ error: 'Nicht gefunden' }, 404, cors);
    } catch (e) {
      console.error(e);
      return json({ error: 'Interner Fehler' }, 500, cors);
    }
  },

  // Täglicher Cron: alte Pass-Stände löschen (siehe ANLEITUNG-SYNC.md)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncAufraeumen(env));
  },
};
```

Neu sind nur drei Stellen: die `import`-Zeile, die Zeile mit `/sync/` und der Teil `scheduled`.
Danach *Deploy*. Dieselbe Änderung auch in `cloudflare/worker.js` im Repo machen.

> **Falls sich im Editor keine zweite Datei anlegen lässt:** Inhalt von `sync.js`
> ganz ans Ende von `worker.js` kopieren und im Block oben die `import`-Zeile weglassen.
> Alle Namen in `sync.js` beginnen mit „sync“, es gibt also keine Konflikte.

### 4. Täglichen Aufräum-Termin einstellen

Worker → *Settings* → *Trigger Events* (bzw. *Triggers*) → *Cron Triggers* → *Add*
→ `0 3 * * *` (jeden Tag 3 Uhr UTC) → speichern.

Gelöscht werden Stände, die **2 Jahre** nicht gesichert wurden, nie benutzte Codes nach
2 Jahren und danach leere alte Gruppen. Die Dauer steht als `SYNC_AUFBEWAHRUNG_TAGE`
oben in `sync.js`.

### 5. Testen

`https://geitner-hub.github.io/Lern-Apps/cloudflare/sync-test.html` öffnen →
Admin-Passwort eingeben → *Test starten*. Alle Zeilen müssen ✓ zeigen.
Der Test legt eine Gruppe „Sync-Test“ an und löscht sie am Ende wieder.

## Was der Sync-Teil tut

| Anfrage | Wer | Zweck |
|---|---|---|
| `POST /sync/holen` | Gerät (Code) | neuesten Stand holen; `rev 0` = Karte noch leer |
| `POST /sync/speichern` | Gerät (Code) | Stand speichern; war der Server inzwischen weiter → Konflikt mit Server-Stand |
| `POST /sync/admin/gruppen` | Admin | alle Gruppen mit Codes, verbunden ja/nein, letzte Sicherung |
| `POST /sync/admin/gruppe-anlegen` | Admin | neue Gruppe mit Codes oder Codes zu Gruppe hinzufügen |
| `POST /sync/admin/gruppe-umbenennen` | Admin | Gruppennamen ändern |
| `POST /sync/admin/gruppe-loeschen` | Admin | Gruppe samt allen Ständen löschen |
| `POST /sync/admin/code-loeschen` | Admin | einzelne Karte ungültig machen |

Schutz: höchstens 1 Speichern pro Code alle 10 Sekunden, Stand höchstens ca. 64 KB,
unbekannter Code und falsches Token sehen gleich aus („Code ungültig“), nur Anfragen von
`https://geitner-hub.github.io`.

## Kosten

Der kostenlose Tarif reicht für eine Schule bei Weitem. Die aktuellen D1-Grenzen stehen unter
*D1 → Pricing* in der Cloudflare-Dokumentation; die Nutzung siehst du unter
*D1* → `lernwelt-sync` → *Metrics*.

## Wenn etwas nicht geht

| Meldung | Ursache und Lösung |
|---|---|
| „Dafür fehlt die Datenbank SYNC_DB“ | Binding fehlt oder heißt anders → Schritt 2 |
| „Nicht gefunden“ bei `/sync/…` | Einstiegs-Block nicht ersetzt oder nicht deployt → Schritt 3b |
| „Interner Fehler“ direkt nach dem Einbau | `sync.js` fehlt im Editor oder heißt anders → Schritt 3a |
| „Sitzung abgelaufen“ beim Test | Passwort falsch oder Anmeldung abgelaufen → neu eingeben |
| „Code ungültig“ | Karte gelöscht, Gruppe gelöscht oder Code falsch abgetippt |
