// ═══════════════════════════════════════════════════════
//  Lernwelt – Cloudflare Worker, Modul „Medien“ (medien.js)
//
//  Dateien (Bilder, Videos, Audio, PDFs, Office …) im Admin hochladen und
//  den Kindern per Kurzlink/QR-Code zeigen. Bewusst OHNE Bezug zur Lernwelt:
//  Die Kinder sehen nur den Inhalt (neutrale Seite oder direkt die Datei).
//
//  Benötigt (Worker → Settings → Bindings), siehe ANLEITUNG-MEDIEN.md:
//    MEDIEN   – R2-Bucket (z. B. „lernwelt-medien“) für die Dateien
//    SYNC_DB  – die vorhandene D1-Datenbank der Pass-Sicherung (Tabelle
//               „medien“ wird beim ersten Aufruf automatisch angelegt).
//               Alternativ eine eigene D1-Datenbank als MEDIEN_DB.
//
//  Öffentlich (ohne Anmeldung, GET/HEAD):
//    /m/<code>              → zählt den Aufruf; Datei ohne Texte → direkt zur Datei,
//                             sonst schlichte Seite mit Text + Medium (Sammlung: alle Teile)
//    /m/<code>/<dateiname>  → die Datei selbst (mit Range für Videos auf dem iPad)
//    /m/<code>/_u/untertitel.vtt → Untertitel-Spur eines Videos
//    Ausgeschaltet oder gelöscht → neutrale Hinweisseite.
//
//  Admin (Header Authorization: Bearer <Anmelde-Schlüssel>):
//    POST /medien/admin/liste              {}                          → { eintraege, belegt, grenze, basis }
//    POST /medien/admin/neu                { titel, untertitel?, info?, auftrag?, fach?, ordner?, dateiname, groesse }
//                                          → { code, mehrteilig, teilGroesse }
//    PUT  /medien/admin/datei?code=…       Body = Datei (bis MEDIEN_TEIL)
//    PUT  /medien/admin/teil?code=…&nr=N   Body = Teil N (große Dateien)          → { teil:{ partNumber, etag } }
//    POST /medien/admin/abschliessen       { code, teile:[{ partNumber, etag }] }
//    POST /medien/admin/abbrechen          { code }                    (nur unfertige Uploads)
//    PUT  /medien/admin/untertitel?code=…  Body = .vtt oder .srt (nur Videos)
//    POST /medien/admin/untertitel-loeschen { code }
//    POST /medien/admin/aendern            { code, titel?, untertitel?, info?, auftrag?, fach?, ordner?, aktiv?, inhalt? }
//    POST /medien/admin/sammlung           { titel, …, inhalt:[codes] }  → { code }
//    POST /medien/admin/loeschen           { code }                    (Datei samt Untertitel; aus Sammlungen entfernt)
//    POST /medien/admin/ordner-umbenennen  { fach, alt, neu }
//
//  Aufräumen: medienAufraeumen(env) entfernt abgebrochene Uploads (täglicher Cron).
//  Alle Namen beginnen mit „medien“, damit nichts mit worker.js/sync.js kollidiert.
// ═══════════════════════════════════════════════════════

const MEDIEN_TEIL      = 20 * 1024 * 1024;        // ab dieser Größe in Teilen hochladen (R2: Teile ≥ 5 MiB)
const MEDIEN_MAX_DATEI = 1024 * 1024 * 1024;      // 1 GB pro Datei
const MEDIEN_GRENZE    = 9.5 * 1024 ** 3;         // gesamt – bleibt unter dem Gratisrahmen von 10 GB
const MEDIEN_MAX_VTT   = 1_000_000;
const MEDIEN_MAX_JSON  = 60_000;
const MEDIEN_MAX_SAMMLUNG = 40;
const MEDIEN_ZEICHEN   = 'abcdefghjkmnpqrstuvwxyz23456789';   // ohne i, l, o, 0, 1 (verwechselbar)
const MEDIEN_CODE      = /^[a-z2-9]{5}$/;

// Erlaubte Dateitypen: Endung → [MIME-Typ, im Browser anzeigen?]
// Bewusst NICHT: html, svg, js (könnten Skripte ausführen).
const MEDIEN_TYPEN = {
  jpg: ['image/jpeg', 1], jpeg: ['image/jpeg', 1], png: ['image/png', 1], gif: ['image/gif', 1],
  webp: ['image/webp', 1], heic: ['image/heic', 1], heif: ['image/heif', 1], avif: ['image/avif', 1],
  mp4: ['video/mp4', 1], m4v: ['video/x-m4v', 1], mov: ['video/quicktime', 1], webm: ['video/webm', 1],
  mp3: ['audio/mpeg', 1], m4a: ['audio/mp4', 1], aac: ['audio/aac', 1], wav: ['audio/wav', 1], ogg: ['audio/ogg', 1],
  pdf: ['application/pdf', 1], txt: ['text/plain; charset=utf-8', 1], csv: ['text/csv; charset=utf-8', 1],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 1],
  doc: ['application/msword', 1], xls: ['application/vnd.ms-excel', 1], ppt: ['application/vnd.ms-powerpoint', 1],
  odt: ['application/vnd.oasis.opendocument.text', 0], ods: ['application/vnd.oasis.opendocument.spreadsheet', 0],
  odp: ['application/vnd.oasis.opendocument.presentation', 0],
  pages: ['application/vnd.apple.pages', 0], key: ['application/vnd.apple.keynote', 0], numbers: ['application/vnd.apple.numbers', 0],
  zip: ['application/zip', 0], ggb: ['application/vnd.geogebra.file', 0],
};

let medienSchemaOk = false;
const medienDb = env => env.MEDIEN_DB || env.SYNC_DB || null;

async function medienSchema(db) {
  if (medienSchemaOk) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS medien (
      code TEXT PRIMARY KEY, art TEXT NOT NULL, titel TEXT NOT NULL,
      untertitel TEXT NOT NULL DEFAULT '', info TEXT NOT NULL DEFAULT '', auftrag TEXT NOT NULL DEFAULT '',
      fach TEXT NOT NULL DEFAULT '', ordner TEXT NOT NULL DEFAULT '',
      dateiname TEXT, typ TEXT, groesse INTEGER NOT NULL DEFAULT 0, schluessel TEXT,
      vtt TEXT, vtt_groesse INTEGER NOT NULL DEFAULT 0,
      inhalt TEXT, aktiv INTEGER NOT NULL DEFAULT 1, aufrufe INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'fertig', upload TEXT,
      erstellt INTEGER NOT NULL, geaendert INTEGER NOT NULL)`),
    db.prepare('CREATE INDEX IF NOT EXISTS medien_ordner ON medien(fach, ordner)'),
  ]);
  medienSchemaOk = true;
}

// ═══ Öffentlich: /m/… ═══════════════════════════════════
export async function handleMedienOeffentlich(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Nur GET', { status: 405 });
  const db = medienDb(env);
  if (!db || !env.MEDIEN) return medienHinweis('Noch nicht eingerichtet', 'Der Medienbereich ist noch nicht eingerichtet.', 503);
  await medienSchema(db);

  const teile = url.pathname.split('/').filter(Boolean);           // ['m', code, …]
  const code = String(teile[1] || '').toLowerCase();
  if (!MEDIEN_CODE.test(code)) return medienNichtDa();
  const e = await db.prepare('SELECT * FROM medien WHERE code = ?').bind(code).first();
  if (!e || e.status !== 'fertig') return medienNichtDa();
  if (!e.aktiv) return medienHinweis('Gerade nicht freigegeben', 'Dieser Inhalt ist gerade nicht freigegeben. Frag deine Lehrkraft.', 403);

  // Einstieg: /m/<code>
  if (teile.length === 2) {
    if (request.method === 'GET') {
      await db.prepare('UPDATE medien SET aufrufe = aufrufe + 1 WHERE code = ?').bind(code).run();
    }
    if (e.art === 'datei' && !medienHatText(e) && !e.vtt) {
      return new Response(null, { status: 302, headers: {
        'Location': `/m/${code}/${encodeURIComponent(e.dateiname)}`, 'Cache-Control': 'no-store' } });
    }
    return medienSeiteZeigen(e, db);
  }

  if (e.art !== 'datei') return medienNichtDa();
  // Untertitel-Spur
  if (teile[2] === '_u') {
    if (!e.vtt) return medienNichtDa();
    return medienDateiSenden(request, env, { schluessel: e.vtt, typ: 'text/vtt; charset=utf-8', groesse: e.vtt_groesse,
      dateiname: 'untertitel.vtt', anzeigen: true, etag: `"${code}-u${e.geaendert}"` });
  }
  const t = MEDIEN_TYPEN[medienEndung(e.dateiname)] || ['application/octet-stream', 0];
  return medienDateiSenden(request, env, { schluessel: e.schluessel, typ: e.typ, groesse: e.groesse,
    dateiname: e.dateiname, anzeigen: !!t[1], etag: `"${code}"` });
}

/** Datei aus R2 ausliefern – mit Range (Safari spielt Videos nur so ab) */
async function medienDateiSenden(request, env, d) {
  const basis = {
    'Content-Type': d.typ,
    'Accept-Ranges': 'bytes',
    'ETag': d.etag,
    'Cache-Control': 'no-cache',                    // jedes Mal kurz nachfragen → Ausschalten wirkt sofort
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `${d.anzeigen ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(d.dateiname)}`,
    'Referrer-Policy': 'no-referrer',
  };
  const range = request.headers.get('Range');
  if (!range && request.headers.get('If-None-Match') === d.etag) return new Response(null, { status: 304, headers: basis });
  const r = medienBereich(range, d.groesse);
  if (r === 'ungueltig') return new Response(null, { status: 416, headers: { ...basis, 'Content-Range': `bytes */${d.groesse}` } });
  if (request.method === 'HEAD') return new Response(null, { status: 200, headers: { ...basis, 'Content-Length': String(d.groesse) } });

  if (r) {
    const obj = await env.MEDIEN.get(d.schluessel, { range: { offset: r.start, length: r.end - r.start + 1 } });
    if (!obj) return medienNichtDa();
    return new Response(obj.body, { status: 206, headers: { ...basis,
      'Content-Range': `bytes ${r.start}-${r.end}/${d.groesse}`, 'Content-Length': String(r.end - r.start + 1) } });
  }
  const obj = await env.MEDIEN.get(d.schluessel);
  if (!obj) return medienNichtDa();
  return new Response(obj.body, { status: 200, headers: { ...basis, 'Content-Length': String(d.groesse) } });
}

/** „bytes=a-b“ → { start, end } | null (ganze Datei) | 'ungueltig' */
function medienBereich(h, groesse) {
  if (!h) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(h).trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;   // mehrere Bereiche o. Ä. → ganze Datei
  let start, end;
  if (m[1] === '') {                                      // „bytes=-500“ = die letzten 500 Bytes
    const n = Number(m[2]);
    if (!n) return 'ungueltig';
    start = Math.max(0, groesse - n); end = groesse - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? groesse - 1 : Math.min(Number(m[2]), groesse - 1);
  }
  if (!(start >= 0) || start >= groesse || start > end) return 'ungueltig';
  return { start, end };
}

// ── Schlichte Anzeigeseite (ohne Lernwelt-Design, ohne Skripte) ──
async function medienSeiteZeigen(e, db) {
  let teile = '';
  if (e.art === 'sammlung') {
    const codes = medienListe(e.inhalt);
    let zeilen = [];
    if (codes.length) {
      const r = await db.prepare(`SELECT * FROM medien WHERE code IN (${codes.map(() => '?').join(',')})`).bind(...codes).all();
      zeilen = r.results || [];
    }
    const nachCode = new Map(zeilen.map(z => [z.code, z]));
    const sichtbar = codes.map(c => nachCode.get(c)).filter(z => z && z.aktiv && z.status === 'fertig' && z.art === 'datei');
    teile = sichtbar.length
      ? sichtbar.map(z => `<section class="teil">${medienKopf(z, 'h2')}${medienMedium(z)}${medienTexte(z)}</section>`).join('')
      : '<p class="leer">Hier ist gerade nichts freigegeben.</p>';
    return medienSeite(e.titel, `${medienKopf(e, 'h1')}${medienTexte(e)}${teile}`);
  }
  return medienSeite(e.titel, `${medienKopf(e, 'h1')}${medienMedium(e)}${medienTexte(e)}`);
}

function medienKopf(e, h) {
  return `<${h}>${medienEsc(e.titel)}</${h}>` + (e.untertitel ? `<p class="unter">${medienZeilen(e.untertitel)}</p>` : '');
}
function medienTexte(e) {
  let s = '';
  if (e.info)    s += `<div class="box info"><div class="marke">ℹ️ Info</div>${medienZeilen(e.info)}</div>`;
  if (e.auftrag) s += `<div class="box auftrag"><div class="marke">📝 Arbeitsauftrag</div>${medienZeilen(e.auftrag)}</div>`;
  return s;
}
function medienMedium(e) {
  const src = `/m/${e.code}/${encodeURIComponent(e.dateiname)}`;
  const typ = String(e.typ || '');
  const name = medienEsc(e.dateiname);
  if (typ.startsWith('image/')) return `<a class="bild" href="${src}"><img src="${src}" alt="${medienEsc(e.titel)}"></a>`;
  if (typ.startsWith('video/')) {
    const spur = e.vtt ? `<track kind="subtitles" srclang="de" label="Untertitel" src="/m/${e.code}/_u/untertitel.vtt" default>` : '';
    return `<video controls playsinline preload="metadata" src="${src}">${spur}</video>`;
  }
  if (typ.startsWith('audio/')) return `<audio controls preload="metadata" src="${src}"></audio>`;
  const icon = typ === 'application/pdf' ? '📄' : '📎';
  return `<a class="knopf" href="${src}">${icon} ${name} öffnen</a>`;
}

function medienSeite(titel, inhalt, status = 200) {
  const css = `
    :root{color-scheme:light dark;--bg:#f6f6f8;--karte:#fff;--text:#1d1d22;--leise:#5f6070;--rand:#dcdce4;--info:#eef3ff;--auftrag:#fff6e0;--knopf:#2f5bd8}
    @media(prefers-color-scheme:dark){:root{--bg:#121216;--karte:#1d1d24;--text:#f0f0f5;--leise:#a4a4b4;--rand:#33333f;--info:#1c2540;--auftrag:#3a2f12;--knopf:#6f8cff}}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:18px/1.5 -apple-system,system-ui,"Segoe UI",Roboto,sans-serif;-webkit-text-size-adjust:100%}
    main{max-width:900px;margin:0 auto;padding:24px 16px 48px}
    h1{font-size:1.7rem;line-height:1.2;margin:0 0 .3rem}h2{font-size:1.3rem;margin:0 0 .2rem}
    .unter{color:var(--leise);margin:0 0 1rem;font-size:1.05rem}
    img,video{display:block;width:100%;height:auto;max-height:80vh;object-fit:contain;border-radius:12px;background:#000;margin:.6rem 0 1rem}
    img{background:transparent}audio{width:100%;margin:.6rem 0 1rem}
    .box{border-radius:12px;padding:12px 16px;margin:.6rem 0;border:1px solid var(--rand)}
    .box.info{background:var(--info)}.box.auftrag{background:var(--auftrag)}
    .marke{font-weight:700;font-size:.85rem;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.25rem;color:var(--leise)}
    .knopf{display:inline-block;background:var(--knopf);color:#fff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px;margin:.6rem 0 1rem;word-break:break-word}
    .teil{background:var(--karte);border:1px solid var(--rand);border-radius:16px;padding:16px;margin:1.2rem 0}
    .leer{color:var(--leise)}`;
  return new Response(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${medienEsc(titel)}</title><style>${css}</style></head><body><main>${inhalt}</main></body></html>`, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
const medienHinweis = (titel, text, status) => medienSeite(titel, `<h1>${medienEsc(titel)}</h1><p class="unter">${medienEsc(text)}</p>`, status);
const medienNichtDa = () => medienHinweis('Nicht gefunden', 'Diesen Inhalt gibt es nicht (mehr). Prüfe den Code oder frag deine Lehrkraft.', 404);

// ═══ Admin: /medien/admin/… ═════════════════════════════
export async function handleMedienAdmin(request, env, cors, url, deps) {
  const auth = await deps.checkToken(request, env);
  if (!auth.ok) return medienJson({ error: auth.error }, auth.status, cors);
  const db = medienDb(env);
  if (!db) return medienJson({ error: 'Dafür fehlt die Datenbank (SYNC_DB) – siehe cloudflare/ANLEITUNG-MEDIEN.md' }, 501, cors);
  if (!env.MEDIEN) return medienJson({ error: 'Dafür fehlt der Dateispeicher MEDIEN (R2) – siehe cloudflare/ANLEITUNG-MEDIEN.md' }, 501, cors);
  await medienSchema(db);
  const p = url.pathname;
  const ctx = { request, env, db, cors, url };

  if (request.method === 'PUT') {
    if (p === '/medien/admin/datei')      return medienDateiHochladen(ctx);
    if (p === '/medien/admin/teil')       return medienTeilHochladen(ctx);
    if (p === '/medien/admin/untertitel') return medienUntertitelHochladen(ctx);
    return medienJson({ error: 'Nicht gefunden' }, 404, cors);
  }
  if (request.method !== 'POST') return medienJson({ error: 'Nur POST/PUT' }, 405, cors);

  const raw = await request.text();
  if (raw.length > MEDIEN_MAX_JSON) return medienJson({ error: 'Zu groß' }, 413, cors);
  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch { return medienJson({ error: 'Ungültiges JSON' }, 400, cors); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return medienJson({ error: 'Ungültige Anfrage' }, 400, cors);
  ctx.body = body;

  switch (p) {
    case '/medien/admin/liste':               return medienListeHolen(ctx);
    case '/medien/admin/neu':                 return medienNeu(ctx);
    case '/medien/admin/abschliessen':        return medienAbschliessen(ctx);
    case '/medien/admin/abbrechen':           return medienAbbrechen(ctx);
    case '/medien/admin/untertitel-loeschen': return medienUntertitelLoeschen(ctx);
    case '/medien/admin/aendern':             return medienAendern(ctx);
    case '/medien/admin/sammlung':            return medienSammlungNeu(ctx);
    case '/medien/admin/loeschen':            return medienLoeschen(ctx);
    case '/medien/admin/ordner-umbenennen':   return medienOrdnerUmbenennen(ctx);
  }
  return medienJson({ error: 'Nicht gefunden' }, 404, cors);
}

// ── Liste & Speicher ───────────────────────────────────
async function medienListeHolen({ db, cors, url }) {
  const r = await db.prepare(`SELECT code, art, titel, untertitel, info, auftrag, fach, ordner, dateiname, typ, groesse,
      vtt IS NOT NULL AS hat_vtt, vtt_groesse, inhalt, aktiv, aufrufe, status, erstellt, geaendert
    FROM medien ORDER BY fach, ordner, titel COLLATE NOCASE`).all();
  const eintraege = (r.results || []).map(z => ({
    code: z.code, art: z.art, titel: z.titel, untertitel: z.untertitel, info: z.info, auftrag: z.auftrag,
    fach: z.fach, ordner: z.ordner, dateiname: z.dateiname, typ: z.typ, groesse: z.groesse,
    untertitelDatei: !!z.hat_vtt, inhalt: z.art === 'sammlung' ? medienListe(z.inhalt) : undefined,
    aktiv: !!z.aktiv, aufrufe: z.aufrufe, fertig: z.status === 'fertig', erstellt: z.erstellt, geaendert: z.geaendert,
    belegt: z.groesse + z.vtt_groesse,
  }));
  return medienJson({ ok: true, eintraege, belegt: await medienBelegt(db), grenze: MEDIEN_GRENZE,
    gratis: 10 * 1024 ** 3, maxDatei: MEDIEN_MAX_DATEI, basis: url.origin + '/m/', typen: Object.keys(MEDIEN_TYPEN) }, 200, cors);
}
async function medienBelegt(db) {
  const r = await db.prepare('SELECT COALESCE(SUM(groesse + vtt_groesse), 0) AS s FROM medien').first();
  return Number(r && r.s) || 0;
}

// ── Neue Datei anmelden ────────────────────────────────
async function medienNeu({ env, db, cors, body }) {
  const felder = medienFelder(body, true);
  if (felder.fehler) return medienJson({ error: felder.fehler }, 400, cors);
  const original = String(body.dateiname || '');
  const endung = medienEndung(original);
  const typ = MEDIEN_TYPEN[endung];
  if (!typ) return medienJson({ error: `Dateityp „.${endung || '?'}“ ist nicht erlaubt` }, 400, cors);
  const groesse = body.groesse;
  if (!Number.isInteger(groesse) || groesse < 1) return medienJson({ error: 'Datei ist leer' }, 400, cors);
  if (groesse > MEDIEN_MAX_DATEI) return medienJson({ error: 'Datei ist größer als 1 GB – bitte vorher verkleinern' }, 413, cors);
  if (await medienBelegt(db) + groesse > MEDIEN_GRENZE) {
    return medienJson({ error: 'Speicher voll – bitte zuerst alte Dateien löschen' }, 507, cors);
  }

  const code = await medienNeuerCode(db);
  const dateiname = medienSichererName(original, endung);
  const schluessel = `d/${code}/${dateiname}`;
  let upload = null;
  if (groesse > MEDIEN_TEIL) {
    const mp = await env.MEDIEN.createMultipartUpload(schluessel, { httpMetadata: { contentType: typ[0] } });
    upload = mp.uploadId;
  }
  const jetzt = Date.now();
  await db.prepare(`INSERT INTO medien (code, art, titel, untertitel, info, auftrag, fach, ordner, dateiname, typ, groesse,
      schluessel, status, upload, erstellt, geaendert) VALUES (?, 'datei', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'hochladen', ?, ?, ?)`)
    .bind(code, felder.titel || dateiname.replace(/\.[^.]+$/, ''), felder.untertitel, felder.info, felder.auftrag,
      felder.fach, felder.ordner, dateiname, typ[0], groesse, schluessel, upload, jetzt, jetzt).run();
  return medienJson({ ok: true, code, mehrteilig: !!upload, teilGroesse: MEDIEN_TEIL }, 200, cors);
}

async function medienUnfertig(db, url) {
  const code = String(url.searchParams.get('code') || '');
  if (!MEDIEN_CODE.test(code)) return null;
  const e = await db.prepare('SELECT * FROM medien WHERE code = ?').bind(code).first();
  return e && e.status === 'hochladen' ? e : null;
}
const medienLaenge = request => Number(request.headers.get('Content-Length') || -1);

// Kleine Datei in einem Stück
async function medienDateiHochladen({ request, env, db, cors, url }) {
  const e = await medienUnfertig(db, url);
  if (!e || e.upload) return medienJson({ error: 'Upload unbekannt' }, 404, cors);
  if (medienLaenge(request) !== e.groesse || !request.body) return medienJson({ error: 'Größe stimmt nicht' }, 400, cors);
  await env.MEDIEN.put(e.schluessel, request.body, { httpMetadata: { contentType: e.typ } });
  return medienFertigMelden(env, db, e, cors);
}

// Großer Upload: ein Teil
async function medienTeilHochladen({ request, env, db, cors, url }) {
  const e = await medienUnfertig(db, url);
  if (!e || !e.upload) return medienJson({ error: 'Upload unbekannt' }, 404, cors);
  const nr = Number(url.searchParams.get('nr'));
  const anzahl = Math.ceil(e.groesse / MEDIEN_TEIL);
  if (!Number.isInteger(nr) || nr < 1 || nr > anzahl) return medienJson({ error: 'Teilnummer ungültig' }, 400, cors);
  const soll = nr < anzahl ? MEDIEN_TEIL : e.groesse - (anzahl - 1) * MEDIEN_TEIL;
  if (medienLaenge(request) !== soll || !request.body) return medienJson({ error: 'Teilgröße stimmt nicht' }, 400, cors);
  const mp = env.MEDIEN.resumeMultipartUpload(e.schluessel, e.upload);
  const t = await mp.uploadPart(nr, request.body);
  return medienJson({ ok: true, teil: { partNumber: t.partNumber, etag: t.etag } }, 200, cors);
}

async function medienAbschliessen({ env, db, cors, body }) {
  const code = String(body.code || '');
  if (!MEDIEN_CODE.test(code)) return medienJson({ error: 'Code ungültig' }, 400, cors);
  const e = await db.prepare('SELECT * FROM medien WHERE code = ?').bind(code).first();
  if (!e || e.status !== 'hochladen' || !e.upload) return medienJson({ error: 'Upload unbekannt' }, 404, cors);
  const anzahl = Math.ceil(e.groesse / MEDIEN_TEIL);
  const teile = Array.isArray(body.teile) ? body.teile : [];
  const ok = teile.length === anzahl && teile.every((t, i) => t && t.partNumber === i + 1 && typeof t.etag === 'string' && t.etag.length < 200);
  if (!ok) return medienJson({ error: 'Teile unvollständig' }, 400, cors);
  const mp = env.MEDIEN.resumeMultipartUpload(e.schluessel, e.upload);
  await mp.complete(teile.map(t => ({ partNumber: t.partNumber, etag: t.etag })));
  return medienFertigMelden(env, db, e, cors);
}

async function medienFertigMelden(env, db, e, cors) {
  const kopf = await env.MEDIEN.head(e.schluessel);
  if (!kopf || kopf.size !== e.groesse) {
    await env.MEDIEN.delete(e.schluessel);
    await db.prepare('DELETE FROM medien WHERE code = ?').bind(e.code).run();
    return medienJson({ error: 'Datei kam unvollständig an – bitte noch einmal hochladen' }, 500, cors);
  }
  await db.prepare("UPDATE medien SET status = 'fertig', upload = NULL, geaendert = ? WHERE code = ?").bind(Date.now(), e.code).run();
  return medienJson({ ok: true, code: e.code }, 200, cors);
}

async function medienAbbrechen({ env, db, cors, body }) {
  const code = String(body.code || '');
  if (!MEDIEN_CODE.test(code)) return medienJson({ error: 'Code ungültig' }, 400, cors);
  const e = await db.prepare('SELECT * FROM medien WHERE code = ?').bind(code).first();
  if (!e) return medienJson({ ok: true }, 200, cors);
  if (e.status !== 'hochladen') return medienJson({ error: 'Datei ist schon fertig – zum Entfernen „Löschen“ nutzen' }, 409, cors);
  await medienUnfertigEntfernen(env, db, e);
  return medienJson({ ok: true }, 200, cors);
}
async function medienUnfertigEntfernen(env, db, e) {
  if (e.upload) { try { await env.MEDIEN.resumeMultipartUpload(e.schluessel, e.upload).abort(); } catch (err) {} }
  try { await env.MEDIEN.delete(e.schluessel); } catch (err) {}
  await db.prepare('DELETE FROM medien WHERE code = ?').bind(e.code).run();
}

// ── Untertitel (.vtt oder .srt) für Videos ─────────────
async function medienUntertitelHochladen({ request, env, db, cors, url }) {
  const code = String(url.searchParams.get('code') || '');
  if (!MEDIEN_CODE.test(code)) return medienJson({ error: 'Code ungültig' }, 400, cors);
  const e = await db.prepare('SELECT * FROM medien WHERE code = ?').bind(code).first();
  if (!e || e.art !== 'datei' || !String(e.typ).startsWith('video/')) return medienJson({ error: 'Untertitel gibt es nur für Videos' }, 400, cors);
  const n = medienLaenge(request);
  if (n < 1 || n > MEDIEN_MAX_VTT) return medienJson({ error: 'Untertitel-Datei zu groß (max. 1 MB)' }, 413, cors);
  let text = (await request.text()).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (!/^WEBVTT/.test(text)) {
    // SRT → WebVTT: Zeitstempel „00:00:01,000“ → „00:00:01.000“
    if (!/\d{2}:\d{2}:\d{2},\d{3}\s*-->/.test(text)) return medienJson({ error: 'Das ist keine Untertitel-Datei (.vtt oder .srt)' }, 400, cors);
    text = 'WEBVTT\n\n' + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  }
  const bytes = new TextEncoder().encode(text);
  const schluessel = `d/${code}/_untertitel.vtt`;
  await env.MEDIEN.put(schluessel, bytes, { httpMetadata: { contentType: 'text/vtt; charset=utf-8' } });
  await db.prepare('UPDATE medien SET vtt = ?, vtt_groesse = ?, geaendert = ? WHERE code = ?').bind(schluessel, bytes.length, Date.now(), code).run();
  return medienJson({ ok: true }, 200, cors);
}
async function medienUntertitelLoeschen({ env, db, cors, body }) {
  const code = String(body.code || '');
  if (!MEDIEN_CODE.test(code)) return medienJson({ error: 'Code ungültig' }, 400, cors);
  const e = await db.prepare('SELECT vtt FROM medien WHERE code = ?').bind(code).first();
  if (e && e.vtt) await env.MEDIEN.delete(e.vtt);
  await db.prepare('UPDATE medien SET vtt = NULL, vtt_groesse = 0, geaendert = ? WHERE code = ?').bind(Date.now(), code).run();
  return medienJson({ ok: true }, 200, cors);
}

// ── Ändern, Sammlungen, Löschen, Ordner ────────────────
async function medienAendern({ db, cors, body }) {
  const code = String(body.code || '');
  if (!MEDIEN_CODE.test(code)) return medienJson({ error: 'Code ungültig' }, 400, cors);
  const e = await db.prepare('SELECT art FROM medien WHERE code = ?').bind(code).first();
  if (!e) return medienJson({ error: 'Nicht gefunden' }, 404, cors);
  const f = medienFelder(body, false);
  if (f.fehler) return medienJson({ error: f.fehler }, 400, cors);
  const satz = [], werte = [];
  ['titel', 'untertitel', 'info', 'auftrag', 'fach', 'ordner'].forEach(k => {
    if (body[k] !== undefined) {
      if (k === 'titel' && !f.titel) return;
      satz.push(k + ' = ?'); werte.push(f[k]);
    }
  });
  if (body.aktiv !== undefined) {
    if (typeof body.aktiv !== 'boolean') return medienJson({ error: 'aktiv ungültig' }, 400, cors);
    satz.push('aktiv = ?'); werte.push(body.aktiv ? 1 : 0);
  }
  if (body.inhalt !== undefined) {
    if (e.art !== 'sammlung') return medienJson({ error: 'Nur Sammlungen haben einen Inhalt' }, 400, cors);
    const inhalt = await medienInhaltPruefen(db, body.inhalt);
    if (inhalt.fehler) return medienJson({ error: inhalt.fehler }, 400, cors);
    satz.push('inhalt = ?'); werte.push(JSON.stringify(inhalt.codes));
  }
  if (!satz.length) return medienJson({ ok: true }, 200, cors);
  satz.push('geaendert = ?'); werte.push(Date.now());
  await db.prepare(`UPDATE medien SET ${satz.join(', ')} WHERE code = ?`).bind(...werte, code).run();
  return medienJson({ ok: true }, 200, cors);
}

async function medienSammlungNeu({ db, cors, body }) {
  const f = medienFelder(body, true);
  if (f.fehler) return medienJson({ error: f.fehler }, 400, cors);
  if (!f.titel) return medienJson({ error: 'Titel fehlt' }, 400, cors);
  const inhalt = await medienInhaltPruefen(db, body.inhalt);
  if (inhalt.fehler) return medienJson({ error: inhalt.fehler }, 400, cors);
  const code = await medienNeuerCode(db);
  const jetzt = Date.now();
  await db.prepare(`INSERT INTO medien (code, art, titel, untertitel, info, auftrag, fach, ordner, inhalt, status, erstellt, geaendert)
      VALUES (?, 'sammlung', ?, ?, ?, ?, ?, ?, ?, 'fertig', ?, ?)`)
    .bind(code, f.titel, f.untertitel, f.info, f.auftrag, f.fach, f.ordner, JSON.stringify(inhalt.codes), jetzt, jetzt).run();
  return medienJson({ ok: true, code }, 200, cors);
}
async function medienInhaltPruefen(db, liste) {
  if (!Array.isArray(liste) || liste.length > MEDIEN_MAX_SAMMLUNG) return { fehler: `Eine Sammlung hat höchstens ${MEDIEN_MAX_SAMMLUNG} Dateien` };
  const codes = [...new Set(liste.map(String))];
  if (!codes.every(c => MEDIEN_CODE.test(c))) return { fehler: 'Unbekannte Datei in der Sammlung' };
  if (!codes.length) return { codes };
  const r = await db.prepare(`SELECT code FROM medien WHERE art = 'datei' AND code IN (${codes.map(() => '?').join(',')})`).bind(...codes).all();
  const da = new Set((r.results || []).map(z => z.code));
  return { codes: codes.filter(c => da.has(c)) };
}

async function medienLoeschen({ env, db, cors, body }) {
  const code = String(body.code || '');
  if (!MEDIEN_CODE.test(code)) return medienJson({ error: 'Code ungültig' }, 400, cors);
  const e = await db.prepare('SELECT * FROM medien WHERE code = ?').bind(code).first();
  if (!e) return medienJson({ ok: true }, 200, cors);
  if (e.art === 'datei') {
    if (e.status === 'hochladen') { await medienUnfertigEntfernen(env, db, e); return medienJson({ ok: true }, 200, cors); }
    await env.MEDIEN.delete([e.schluessel, e.vtt].filter(Boolean));
    // aus allen Sammlungen nehmen
    const r = await db.prepare("SELECT code, inhalt FROM medien WHERE art = 'sammlung'").all();
    const updates = (r.results || []).filter(s => medienListe(s.inhalt).includes(code))
      .map(s => db.prepare('UPDATE medien SET inhalt = ? WHERE code = ?').bind(JSON.stringify(medienListe(s.inhalt).filter(c => c !== code)), s.code));
    if (updates.length) await db.batch(updates);
  }
  await db.prepare('DELETE FROM medien WHERE code = ?').bind(code).run();
  return medienJson({ ok: true }, 200, cors);
}

async function medienOrdnerUmbenennen({ db, cors, body }) {
  const fach = medienText(body.fach, 40), alt = medienText(body.alt, 60), neu = medienText(body.neu, 60);
  if (fach === null || alt === null || neu === null) return medienJson({ error: 'Angaben ungültig' }, 400, cors);
  await db.prepare('UPDATE medien SET ordner = ?, geaendert = ? WHERE fach = ? AND ordner = ?').bind(neu, Date.now(), fach, alt).run();
  return medienJson({ ok: true }, 200, cors);
}

// ── Aufräumen (Cron): Uploads, die nie fertig wurden ──
export async function medienAufraeumen(env) {
  const db = medienDb(env);
  if (!db || !env.MEDIEN) return;
  await medienSchema(db);
  const r = await db.prepare("SELECT * FROM medien WHERE status = 'hochladen' AND erstellt < ?").bind(Date.now() - 86400 * 1000).all();
  for (const e of r.results || []) await medienUnfertigEntfernen(env, db, e);
}

// ── Hilfsfunktionen ────────────────────────────────────
/** Text prüfen: null = ungültig, sonst gekürzter String */
function medienText(v, max) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string' || v.length > max) return null;
  return v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
}
function medienFelder(b, neu) {
  const f = {
    titel: medienText(b.titel, 120), untertitel: medienText(b.untertitel, 200),
    info: medienText(b.info, 2000), auftrag: medienText(b.auftrag, 2000),
    fach: medienText(b.fach, 40), ordner: medienText(b.ordner, 60),
  };
  const kaputt = Object.entries(f).find(([, v]) => v === null);
  if (kaputt) return { fehler: `Feld „${kaputt[0]}“ ist zu lang oder ungültig` };
  if (!neu && b.titel !== undefined && !f.titel) return { fehler: 'Titel darf nicht leer sein' };
  return f;
}
function medienHatText(e) { return !!(e.untertitel || e.info || e.auftrag); }
function medienListe(json) {
  try { const l = JSON.parse(json || '[]'); return Array.isArray(l) ? l.filter(c => MEDIEN_CODE.test(c)) : []; } catch (e) { return []; }
}
function medienEndung(name) {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(String(name || ''));
  return m ? m[1].toLowerCase() : '';
}
function medienSichererName(original, endung) {
  let stamm = String(original).replace(/\.[^.]*$/, '').normalize('NFC')
    .replace(/[^\p{L}\p{N} ._-]+/gu, '_').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!stamm || /^[._]/.test(stamm)) stamm = 'datei' + (stamm ? '-' + stamm.replace(/^[._]+/, '') : '');
  return stamm + '.' + endung;
}
async function medienNeuerCode(db) {
  for (let i = 0; i < 8; i++) {
    const b = crypto.getRandomValues(new Uint8Array(5));
    const code = Array.from(b, x => MEDIEN_ZEICHEN[x % MEDIEN_ZEICHEN.length]).join('');
    const da = await db.prepare('SELECT 1 FROM medien WHERE code = ?').bind(code).first();
    if (!da) return code;
  }
  throw new Error('Kein freier Code gefunden');
}
function medienEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const medienZeilen = s => medienEsc(s).replace(/\n/g, '<br>');
function medienJson(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
