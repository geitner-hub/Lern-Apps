// ═══════════════════════════════════════════════════════
//  Lernwelt – Cloudflare Worker, Teil „Dateien“  (Admin-Umbau Etappe 8: Editoren)
//
//  Der Admin darf neben config.json einige Inhaltsdateien im Repo ändern – NUR diese (DATEIEN_ERLAUBT),
//  jede mit eigener Formatprüfung. Alles andere wird abgelehnt.
//    daten/katalog.json       – nur neue Stufen anhängen und Stufen-Titel ändern (für neue Vokabel-Units)
//    daten/vokabeln<5–10>.json – Units, Abschnitte und Wörter; bestehende Units/Abschnitte bleiben
//
//  Endpunkte (Header: Authorization: Bearer <schlüssel>):
//    POST /dateien/lesen      Body { pfade: [..] }  → { dateien: { pfad: { daten, sha } } }
//    POST /dateien/speichern  Body { dateien: [{ pfad, daten, sha }], text }
//                             → { ok, commit, shas: { pfad: sha } } · Konflikt → 409 { error: 'CONFLICT' }
//  Mehrere Dateien landen in EINEM Commit (Git-API: Baum → Commit → Branch vorrücken, ohne force).
//  So kommen neue Unit und ihr Katalog-Eintrag immer zusammen an – pruefen.py bleibt grün.
//
//  Kein eigenes Secret: nutzt GITHUB_TOKEN aus worker.js („Contents: Read and write“ reicht).
//  Alle Namen beginnen mit „dateien“, damit sich nichts mit worker.js überschneidet.
// ═══════════════════════════════════════════════════════

const DATEIEN_MAX_BYTES = 450_000;          // Anfrage gesamt (Katalog + eine Vokabeldatei ≈ 130 KB)
const DATEIEN_MAX_DATEI = 200_000;          // je Datei nach dem Formatieren
const DATEIEN_ID  = /^[a-z]+(?:\.[a-z0-9-]+)+$/;     // wie Katalog-IDs in pruefen.py
const DATEIEN_KEY = /^[a-z0-9_]{1,40}$/;              // Unit- und Abschnitts-Schlüssel

const DATEIEN_ERLAUBT = [
  { muster: /^daten\/katalog\.json$/,             art: 'katalog' },
  { muster: /^daten\/vokabeln(?:[5-9]|10)\.json$/, art: 'vokabeln' },
];
const dateienArt = pfad => (DATEIEN_ERLAUBT.find(e => e.muster.test(String(pfad))) || {}).art || null;

export async function handleDateien(request, env, cors, url, h) {
  const auth = await h.checkToken(request, env);
  if (!auth.ok) return h.json({ error: auth.error }, auth.status, cors);
  if (request.method !== 'POST') return h.json({ error: 'Nicht gefunden' }, 404, cors);
  const raw = await request.text();
  if (raw.length > DATEIEN_MAX_BYTES) return h.json({ error: 'Zu groß' }, 413, cors);
  let body;
  try { body = JSON.parse(raw || '{}'); } catch { return h.json({ error: 'Ungültiges JSON' }, 400, cors); }
  if (url.pathname === '/dateien/lesen')     return await dateienLesen(env, cors, body, h);
  if (url.pathname === '/dateien/speichern') return await dateienSpeichern(env, cors, body, h);
  return h.json({ error: 'Nicht gefunden' }, 404, cors);
}

// ── Lesen ──────────────────────────────────────────────
async function dateienHolen(env, h, pfad, ref) {
  const r = await h.gh(env, `contents/${pfad}?ref=${ref}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('GitHub: ' + r.status);
  const d = await r.json();
  if (typeof d.content !== 'string') throw new Error('Datei zu groß für die GitHub-API');
  return { daten: JSON.parse(h.b64ToUtf8(d.content)), sha: d.sha };
}

async function dateienLesen(env, cors, body, h) {
  const pfade = Array.isArray(body.pfade) ? body.pfade : [];
  if (!pfade.length || pfade.length > 4 || pfade.some(p => !dateienArt(p))) return h.json({ error: 'Pfad nicht erlaubt' }, 400, cors);
  const dateien = {};
  for (const p of pfade) {
    const d = await dateienHolen(env, h, p, h.BRANCH);
    if (!d) return h.json({ error: 'Datei fehlt: ' + p }, 404, cors);
    dateien[p] = d;
  }
  return h.json({ dateien }, 200, { ...cors, 'Cache-Control': 'no-store' });
}

// ── Speichern ──────────────────────────────────────────
async function dateienSpeichern(env, cors, body, h) {
  const liste = Array.isArray(body.dateien) ? body.dateien : [];
  const pfade = liste.map(d => d && d.pfad);
  if (!liste.length || liste.length > 3 || pfade.some(p => !dateienArt(p)) || new Set(pfade).size !== pfade.length)
    return h.json({ error: 'Pfad nicht erlaubt' }, 400, cors);
  if (liste.some(d => typeof d.sha !== 'string' || !/^[0-9a-f]{40}$/.test(d.sha) || !d.daten || typeof d.daten !== 'object'))
    return h.json({ error: 'daten und sha nötig' }, 400, cors);

  // Fester Ausgangspunkt: der aktuelle Commit von main – alles wird gegen genau diesen Stand geprüft
  const ref = await h.gh(env, `git/ref/heads/${h.BRANCH}`);
  if (!ref.ok) return h.json({ error: 'GitHub: ' + ref.status }, 502, cors);
  const basis = (await ref.json()).object.sha;
  const alt = {};
  for (const d of liste) {
    const a = await dateienHolen(env, h, d.pfad, basis);
    if (!a) return h.json({ error: 'Datei fehlt: ' + d.pfad }, 404, cors);
    if (a.sha !== d.sha) return h.json({ error: 'CONFLICT' }, 409, cors);      // inzwischen woanders geändert
    alt[d.pfad] = a.daten;
  }

  // Formatprüfung: Katalog zuerst (die Vokabeln verweisen auf seine IDs)
  const neuKatalog = liste.find(d => dateienArt(d.pfad) === 'katalog');
  let katalog = neuKatalog ? neuKatalog.daten : null;
  const probleme = [];
  if (neuKatalog) probleme.push(...dateienPruefeKatalog(neuKatalog.daten, alt[neuKatalog.pfad]));
  if (liste.some(d => dateienArt(d.pfad) === 'vokabeln') && !katalog) {
    const k = await dateienHolen(env, h, 'daten/katalog.json', basis);
    katalog = k ? k.daten : null;
  }
  const ids = dateienKatalogIds(katalog);
  liste.filter(d => dateienArt(d.pfad) === 'vokabeln').forEach(d => probleme.push(...dateienPruefeVokabeln(d.daten, alt[d.pfad], ids).map(x => d.pfad + ': ' + x)));
  if (probleme.length) return h.json({ error: 'Ungültig: ' + probleme.slice(0, 6).join('; ') }, 422, cors);

  const baum = liste.map(d => {
    const text = dateienArt(d.pfad) === 'vokabeln' ? dateienFormatVokabeln(d.daten) : JSON.stringify(d.daten, null, 1) + '\n';
    return { path: d.pfad, mode: '100644', type: 'blob', content: text };
  });
  if (baum.some(b => new TextEncoder().encode(b.content).length > DATEIEN_MAX_DATEI)) return h.json({ error: 'Datei zu groß' }, 413, cors);

  const commitAlt = await h.gh(env, `git/commits/${basis}`);
  if (!commitAlt.ok) return h.json({ error: 'GitHub: ' + commitAlt.status }, 502, cors);
  const tree = await h.gh(env, 'git/trees', { method: 'POST', body: JSON.stringify({ base_tree: (await commitAlt.json()).tree.sha, tree: baum }) });
  if (!tree.ok) return h.json({ error: 'GitHub: ' + tree.status }, 502, cors);
  const message = 'Admin: ' + String(body.text || 'Inhalte aktualisiert').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 100);
  const commit = await h.gh(env, 'git/commits', { method: 'POST', body: JSON.stringify({ message, tree: (await tree.json()).sha, parents: [basis] }) });
  if (!commit.ok) return h.json({ error: 'GitHub: ' + commit.status }, 502, cors);
  const neu = (await commit.json()).sha;
  const vor = await h.gh(env, `git/refs/heads/${h.BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: neu, force: false }) });
  if (vor.status === 409 || vor.status === 422) return h.json({ error: 'CONFLICT' }, 409, cors);   // main hat sich bewegt
  if (!vor.ok) return h.json({ error: 'GitHub: ' + vor.status }, 502, cors);

  const shas = {};
  for (const d of liste) { const n = await dateienHolen(env, h, d.pfad, neu); shas[d.pfad] = n ? n.sha : ''; }
  return h.json({ ok: true, commit: neu, shas }, 200, cors);
}

// ── Prüfungen ──────────────────────────────────────────
function dateienGleich(a, b) { return dateienStabil(a) === dateienStabil(b); }
function dateienStabil(v) {
  if (Array.isArray(v)) return '[' + v.map(dateienStabil).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + dateienStabil(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
const dateienObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const dateienText = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[<>\u0000-\u001f]/.test(v);
const ohne = (o, k) => { const c = { ...o }; delete c[k]; return c; };

function dateienKatalogIds(k) {
  const ids = new Set();
  ((k && k.faecher) || []).forEach(f => (f.bereiche || []).forEach(b => (b.themen || []).forEach(t => {
    ids.add(t.id); (t.stufen || []).forEach(s => ids.add(s.id));
  })));
  return ids;
}

/** Katalog: Fächer, Bereiche und Themen unverändert; je Thema dürfen Stufen dazukommen
 *  (id, titel, inhalt) und Stufen-Titel sich ändern. Keine ID verschwindet. */
function dateienPruefeKatalog(neu, alt) {
  const p = [];
  if (!dateienObj(neu) || !Array.isArray(neu.faecher)) return ['Katalog: faecher fehlt'];
  if (!dateienGleich(ohne(ohne(neu, 'faecher'), 'stand'), ohne(ohne(alt, 'faecher'), 'stand'))) p.push('Katalog: Kopf geändert');
  if (neu.stand !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(neu.stand))) p.push('Katalog: stand ungültig');
  if (neu.faecher.length !== alt.faecher.length) return p.concat('Katalog: Fächer geändert');
  const ids = dateienKatalogIds(alt), inhalte = new Set();
  alt.faecher.forEach(f => (f.bereiche || []).forEach(b => (b.themen || []).forEach(t =>
    [t].concat(t.stufen || []).forEach(s => { if (s.inhalt) inhalte.add(s.inhalt); }))));
  neu.faecher.forEach((f, i) => {
    const fa = alt.faecher[i];
    if (!dateienObj(f) || !dateienGleich(ohne(f, 'bereiche'), ohne(fa, 'bereiche')) || !Array.isArray(f.bereiche) || f.bereiche.length !== (fa.bereiche || []).length)
      return p.push('Katalog: Fach ' + fa.id + ' geändert');
    f.bereiche.forEach((b, j) => {
      const ba = fa.bereiche[j];
      if (!dateienObj(b) || !dateienGleich(ohne(b, 'themen'), ohne(ba, 'themen')) || !Array.isArray(b.themen) || b.themen.length !== (ba.themen || []).length)
        return p.push('Katalog: Bereich ' + ba.id + ' geändert');
      b.themen.forEach((t, n) => {
        const ta = ba.themen[n];
        if (!dateienObj(t) || !dateienGleich(ohne(t, 'stufen'), ohne(ta, 'stufen'))) return p.push('Katalog: Thema ' + ta.id + ' geändert');
        const sa = ta.stufen || [], sn = t.stufen === undefined ? [] : t.stufen;
        if (!Array.isArray(sn) || sn.length > 60) return p.push('Katalog: Stufen von ' + ta.id + ' ungültig');
        const nachId = new Map(sn.filter(dateienObj).map(s => [s.id, s]));
        sa.forEach(s => {
          const x = nachId.get(s.id);
          if (!x) p.push('Katalog: Stufe ' + s.id + ' fehlt (IDs nie löschen)');
          else if (!dateienGleich(ohne(x, 'titel'), ohne(s, 'titel')) || !dateienText(x.titel, 120)) p.push('Katalog: Stufe ' + s.id + ' – nur der Titel darf sich ändern');
        });
        sn.filter(s => !sa.some(a => dateienObj(s) && a.id === s.id)).forEach(s => {
          if (!dateienObj(s) || Object.keys(s).some(k => !['id', 'titel', 'inhalt'].includes(k))) return p.push('Katalog: neue Stufe in ' + ta.id + ' – nur id, titel, inhalt');
          if (!DATEIEN_ID.test(s.id) || !s.id.startsWith(ta.id + '.') || ids.has(s.id)) return p.push('Katalog: neue Stufen-ID ' + s.id + ' ungültig oder doppelt');
          ids.add(s.id);
          if (!dateienText(s.titel, 120)) p.push('Katalog: Stufe ' + s.id + ' braucht einen Titel');
          if (s.inhalt !== undefined && (!/^vok(?:[5-9]|10):[a-z0-9_]{1,40}$/.test(s.inhalt) || inhalte.has(s.inhalt))) p.push('Katalog: inhalt von ' + s.id + ' ungültig oder doppelt');
          if (s.inhalt) inhalte.add(s.inhalt);
        });
      });
    });
  });
  return p;
}

/** Vokabeln: meta unverändert; Units { label, thema, themes { key: { label, words [{ en, de }] } } };
 *  Sonderlisten wie gehabt (nur label und words änderbar). Bestehende Units, Abschnitte und
 *  Sonderlisten bleiben mit ihrer Themen-ID erhalten. Jede Themen-ID steht im Katalog. */
function dateienPruefeVokabeln(neu, alt, ids) {
  const p = [];
  if (!dateienObj(neu) || Object.keys(neu).some(k => !['meta', 'units', 'specialLists'].includes(k))) return ['Felder oben: nur meta, units, specialLists'];
  if (!dateienGleich(neu.meta, alt.meta)) p.push('meta darf sich nicht ändern');
  if (!dateienObj(neu.units) || Object.keys(neu.units).length > 40) return p.concat('units ungültig');
  let woerter = 0;
  const themen = new Set();
  const wortListe = (w, wo) => {
    if (!Array.isArray(w) || w.length > 500) return p.push(wo + ': words ungültig');
    woerter += w.length;
    if (w.some(x => !dateienObj(x) || Object.keys(x).some(k => !['en', 'de'].includes(k)) || !dateienText(x.en, 200) || !dateienText(x.de, 200)))
      p.push(wo + ': jedes Wort braucht en und de (ohne < >, höchstens 200 Zeichen)');
  };
  const thema = (t, wo) => {
    if (!DATEIEN_ID.test(String(t)) || !ids.has(t)) p.push(wo + ': Themen-ID ' + t + ' steht nicht im Katalog');
    else if (themen.has(t)) p.push(wo + ': Themen-ID ' + t + ' doppelt');
    themen.add(t);
  };
  Object.entries(neu.units).forEach(([k, u]) => {
    const wo = 'Unit ' + k;
    if (!DATEIEN_KEY.test(k) || !dateienObj(u) || Object.keys(u).some(x => !['label', 'thema', 'themes'].includes(x))) return p.push(wo + ' ungültig');
    if (!dateienText(u.label, 120)) p.push(wo + ': label fehlt');
    thema(u.thema, wo);
    if (!dateienObj(u.themes) || !Object.keys(u.themes).length || Object.keys(u.themes).length > 30) return p.push(wo + ': themes ungültig');
    Object.entries(u.themes).forEach(([tk, t]) => {
      if (!DATEIEN_KEY.test(tk) || !dateienObj(t) || Object.keys(t).some(x => !['label', 'words'].includes(x)) || !dateienText(t.label, 120)) return p.push(wo + '/' + tk + ' ungültig');
      wortListe(t.words, wo + '/' + tk);
    });
  });
  Object.entries(alt.units || {}).forEach(([k, u]) => {
    const n = neu.units[k];
    if (!n) return p.push('Unit ' + k + ' fehlt (nie löschen)');
    if (n.thema !== u.thema) p.push('Unit ' + k + ': Themen-ID darf sich nicht ändern');
    Object.keys(u.themes || {}).forEach(tk => { if (!n.themes || !n.themes[tk]) p.push('Unit ' + k + ': Abschnitt ' + tk + ' fehlt (nie löschen)'); });
  });
  const sl = neu.specialLists, sla = alt.specialLists;
  if (sl !== undefined || sla !== undefined) {
    if (!dateienObj(sl) || !dateienObj(sla) || Object.keys(sl).sort().join() !== Object.keys(sla).sort().join()) p.push('specialLists: Listen bleiben wie sie sind');
    else Object.entries(sl).forEach(([k, l]) => {
      if (!dateienObj(l) || !dateienGleich(ohne(ohne(l, 'words'), 'label'), ohne(ohne(sla[k], 'words'), 'label')) || !dateienText(l.label, 120)) return p.push('Liste ' + k + ': nur label und words änderbar');
      thema(l.thema, 'Liste ' + k);
      wortListe(l.words, 'Liste ' + k);
    });
  }
  if (woerter > 6000) p.push('zu viele Wörter');
  return p;
}

/** Vokabeldatei lesbar halten: Einrückung 2, jedes Wort in einer Zeile */
function dateienFormatVokabeln(d) {
  const zeile = w => '{ ' + Object.keys(w).map(k => JSON.stringify(k) + ': ' + JSON.stringify(w[k])).join(', ') + ' }';
  const aus = (v, tief) => {
    const e = '  '.repeat(tief + 1), z = '  '.repeat(tief);
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      const wort = v.every(x => dateienObj(x) && Object.values(x).every(y => typeof y === 'string'));
      return '[\n' + v.map(x => e + (wort ? zeile(x) : aus(x, tief + 1))).join(',\n') + '\n' + z + ']';
    }
    if (dateienObj(v)) {
      const k = Object.keys(v);
      if (!k.length) return '{}';
      return '{\n' + k.map(x => e + JSON.stringify(x) + ': ' + aus(v[x], tief + 1)).join(',\n') + '\n' + z + '}';
    }
    return JSON.stringify(v);
  };
  return aus(d, 0) + '\n';
}
