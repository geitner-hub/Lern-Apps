// ═══════════════════════════════════════════════════════
//  Lernwelt – Cloudflare Worker, Teil „Dateien“  (Admin-Umbau Etappe 8: Editoren)
//
//  Der Admin darf neben config.json einige Inhaltsdateien im Repo ändern – NUR diese (DATEIEN_ERLAUBT),
//  jede mit eigener Formatprüfung. Alles andere wird abgelehnt.
//    daten/katalog.json       – nur neue Stufen anhängen und Stufen-Titel ändern (für neue Vokabel-Units)
//    daten/vokabeln<5–10>.json – Units, Abschnitte und Wörter; bestehende Units/Abschnitte bleiben
//    daten/aufgaben-pools.json – Frage-Antwort-Pools der Spiele; bestehende Pool-IDs bleiben (Etappe 9)
//    daten/lernwelt-inhalte.json – nur ITEMS (Loot-Pool) und TITEL: neue Teile als Farbvariante eines
//                               vorhandenen Teils; bestehende Teile behalten ID und Platz (Etappe 9)
//    daten/journey6.json      – English Journey: nur Abschnitte, Kann-Sätze und Wahl-Anzahl je Unit; die Stationen
//                               (Meisterschaft, braucht, 3D-Plätze) bleiben, wie sie sind; Abschnitt-IDs bleiben
//    daten/journey/bausteine-en6.json – Hefteinträge, eigene Übungen, Kann-Sätze; bestehende IDs und Arten bleiben
//                               (Lernweg im English Journey, Etappe 6 – gleiche Regeln wie pruefen.py Regel 23)
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
  { muster: /^daten\/aufgaben-pools\.json$/,       art: 'aufgaben' },
  { muster: /^daten\/lernwelt-inhalte\.json$/,     art: 'inhalte' },
  { muster: /^daten\/journey6\.json$/,              art: 'journey' },
  { muster: /^daten\/journey\/bausteine-en6\.json$/, art: 'bausteine' },
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
  if (liste.some(d => ['vokabeln', 'aufgaben'].includes(dateienArt(d.pfad))) && !katalog) {
    const k = await dateienHolen(env, h, 'daten/katalog.json', basis);
    katalog = k ? k.daten : null;
  }
  const ids = dateienKatalogIds(katalog);
  liste.filter(d => dateienArt(d.pfad) === 'vokabeln').forEach(d => probleme.push(...dateienPruefeVokabeln(d.daten, alt[d.pfad], ids).map(x => d.pfad + ': ' + x)));
  liste.filter(d => dateienArt(d.pfad) === 'aufgaben').forEach(d => probleme.push(...dateienPruefeAufgaben(d.daten, alt[d.pfad], ids).map(x => d.pfad + ': ' + x)));
  liste.filter(d => dateienArt(d.pfad) === 'inhalte').forEach(d => probleme.push(...dateienPruefeInhalte(d.daten, alt[d.pfad]).map(x => d.pfad + ': ' + x)));
  // English Journey: Weg und Bausteine gehören zusammen – fehlt einer in der Anfrage, gilt der Stand von main
  const jw = liste.find(d => dateienArt(d.pfad) === 'journey'), bs = liste.find(d => dateienArt(d.pfad) === 'bausteine');
  if (jw || bs) {
    const wegDaten = jw ? jw.daten : (await dateienHolen(env, h, 'daten/journey6.json', basis) || {}).daten;
    const bausteine = bs ? bs.daten : (await dateienHolen(env, h, 'daten/journey/bausteine-en6.json', basis) || {}).daten;
    if (!katalog) { const k = await dateienHolen(env, h, 'daten/katalog.json', basis); katalog = k ? k.daten : null; }
    if (bs) probleme.push(...dateienPruefeBausteine(bs.daten, alt[bs.pfad]).map(x => bs.pfad + ': ' + x));
    probleme.push(...dateienPruefeJourney(wegDaten, jw ? alt[jw.pfad] : wegDaten, bausteine, dateienKatalogIds(katalog)).map(x => 'daten/journey6.json: ' + x));
  }
  if (probleme.length) return h.json({ error: 'Ungültig: ' + probleme.slice(0, 6).join('; ') }, 422, cors);

  const baum = liste.map(d => {
    const art = dateienArt(d.pfad);
    const text = art === 'vokabeln' ? dateienFormatVokabeln(d.daten) : art === 'katalog' ? JSON.stringify(d.daten, null, 1) + '\n'
      : art === 'aufgaben' ? dateienFormatPools(d.daten) : art === 'journey' || art === 'bausteine' ? JSON.stringify(d.daten, null, 1) + '\n'
      : dateienFormatZeilen(d.daten);
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

/** Aufgaben-Pools: { hinweis, pools: [{ id, fach, gruppe?, klasse, titel, thema?, aufgaben: [{ frage, antwort, falsch[] }] }] }.
 *  Bestehende Pool-IDs bleiben; thema (falls da) steht im Katalog. */
function dateienPruefeAufgaben(neu, alt, ids) {
  const p = [];
  if (!dateienObj(neu) || Object.keys(neu).some(k => !['hinweis', 'pools'].includes(k))) return ['Felder oben: nur hinweis, pools'];
  if (neu.hinweis !== alt.hinweis) p.push('hinweis darf sich nicht ändern');
  if (!Array.isArray(neu.pools) || neu.pools.length > 60) return p.concat('pools ungültig');
  const gesehen = new Set();
  neu.pools.forEach((x, i) => {
    const wo = 'Pool ' + (x && x.id || i + 1);
    if (!dateienObj(x) || Object.keys(x).some(k => !['id', 'fach', 'gruppe', 'klasse', 'titel', 'thema', 'aufgaben'].includes(k))) return p.push(wo + ' ungültig');
    if (!/^[a-z0-9-]{3,40}$/.test(String(x.id)) || gesehen.has(x.id)) p.push(wo + ': ID ungültig oder doppelt');
    gesehen.add(x.id);
    if (!dateienText(x.fach, 40) || (x.gruppe !== undefined && !dateienText(x.gruppe, 40)) || !dateienText(x.titel, 80)) p.push(wo + ': fach/gruppe/titel ungültig');
    if (!Number.isInteger(x.klasse) || x.klasse < 1 || x.klasse > 13) p.push(wo + ': klasse 1–13');
    if (x.thema !== undefined && (!DATEIEN_ID.test(String(x.thema)) || !ids.has(x.thema))) p.push(wo + ': Themen-ID ' + x.thema + ' steht nicht im Katalog');
    if (!Array.isArray(x.aufgaben) || x.aufgaben.length < 2 || x.aufgaben.length > 300) return p.push(wo + ': 2–300 Aufgaben');
    if (x.aufgaben.some(a => !dateienObj(a) || Object.keys(a).some(k => !['frage', 'antwort', 'falsch'].includes(k)) || !dateienText(a.frage, 200) || !dateienText(a.antwort, 60)
      || !Array.isArray(a.falsch) || a.falsch.length > 5 || a.falsch.some(f => !dateienText(f, 60))))
      p.push(wo + ': jede Aufgabe braucht frage, antwort und falsch [höchstens 5] (ohne < >)');
  });
  (alt.pools || []).forEach(x => { if (!gesehen.has(x.id)) p.push('Pool ' + x.id + ' fehlt (IDs nie löschen)'); });
  return p;
}

/** Loot-Pool (lernwelt-inhalte.json): nur ITEMS und TITEL ändern sich. Bestehende Teile: nur name, selten,
 *  quelle, event, set (Varianten auch tausch). Neue Teile: Farbvariante { id, slot, name, selten, quelle,
 *  event?, set?, basis, tausch } eines vorhandenen Teils ohne eigene Basis, gleicher Platz, kein Hintergrund. */
function dateienPruefeInhalte(neu, alt) {
  const p = [];
  if (!dateienObj(neu) || Object.keys(neu).sort().join() !== Object.keys(alt).sort().join()) return ['Felder oben dürfen sich nicht ändern'];
  Object.keys(alt).filter(k => !['ITEMS', 'TITEL'].includes(k)).forEach(k => { if (!dateienGleich(neu[k], alt[k])) p.push(k + ' darf sich nicht ändern'); });
  if (!Array.isArray(neu.TITEL) || neu.TITEL.length < alt.TITEL.length || neu.TITEL.length > 80 || neu.TITEL.some(t => !dateienText(t, 40))) p.push('TITEL: Liste von Texten (höchstens 40 Zeichen), keiner weniger als vorher');
  if (!Array.isArray(neu.ITEMS) || neu.ITEMS.length > 400) return p.concat('ITEMS ungültig');
  const altBy = new Map(alt.ITEMS.map(i => [i.id, i])), gesehen = new Set();
  const seltenheiten = Object.keys(alt.SELTENHEIT || {}).filter(k => k !== 'basis');
  const events = new Set((alt.EVENTS || []).map(e => e.id)), abzeichen = new Set((alt.ABZEICHEN || []).map(a => a.id));
  const farbe = /^#[0-9a-fA-F]{6}$/;
  const tauschOk = t => dateienObj(t) && Object.keys(t).length >= 1 && Object.keys(t).length <= 16 && Object.entries(t).every(([a, b]) => farbe.test(a) && farbe.test(b));
  const herkunftOk = (i, wo) => {
    if (!dateienText(i.name, 40)) p.push(wo + ': name fehlt (höchstens 40 Zeichen)');
    if (i.quelle === 'event' ? !events.has(i.event) || i.set !== undefined : i.event !== undefined) p.push(wo + ': event passt nicht zur quelle');
    if (i.quelle === 'set' ? !abzeichen.has(i.set) : i.set !== undefined) p.push(wo + ': set passt nicht zur quelle');
  };
  neu.ITEMS.forEach((i, n) => {
    const wo = 'Teil ' + (i && i.id || n + 1);
    if (!dateienObj(i) || typeof i.id !== 'string' || gesehen.has(i.id)) return p.push(wo + ': ID fehlt oder doppelt');
    gesehen.add(i.id);
    const a = altBy.get(i.id);
    if (a) {                                                          // bestehendes Teil
      const fest = o => { const c = { ...o }; ['name', 'selten', 'quelle', 'event', 'set'].concat(o.basis ? ['tausch'] : []).forEach(k => delete c[k]); return c; };
      if (!dateienGleich(fest(i), fest(a))) return p.push(wo + ': nur Name, Seltenheit, Herkunft (und Farben einer Variante) änderbar');
      if (a.quelle === 'start' || a.selten === 'basis') { if (i.quelle !== a.quelle || i.selten !== a.selten) p.push(wo + ': Startausstattung bleibt Startausstattung'); }
      else {
        if (!seltenheiten.includes(i.selten) || !['truhe', 'event', 'set'].includes(i.quelle)) p.push(wo + ': selten/quelle ungültig');
      }
      if (a.basis && !tauschOk(i.tausch)) p.push(wo + ': tausch ungültig');
      herkunftOk(i, wo);
      return;
    }
    if (Object.keys(i).some(k => !['id', 'slot', 'name', 'selten', 'quelle', 'event', 'set', 'basis', 'tausch'].includes(k))) return p.push(wo + ': neue Teile nur als Farbvariante (id, slot, name, selten, quelle, event, set, basis, tausch)');
    if (!/^[a-z0-9-]{2,40}$/.test(i.id)) p.push(wo + ': ID ungültig');
    const b = altBy.get(i.basis);
    if (!b || b.basis || b.slot !== i.slot || i.slot === 'hintergrund') p.push(wo + ': basis muss ein vorhandenes Teil ohne eigene Basis mit gleichem Platz sein (kein Hintergrund)');
    if (!seltenheiten.includes(i.selten) || !['truhe', 'event', 'set'].includes(i.quelle)) p.push(wo + ': selten/quelle ungültig');
    if (!tauschOk(i.tausch)) p.push(wo + ': tausch ungültig (1–16 Farben #rrggbb)');
    herkunftOk(i, wo);
  });
  alt.ITEMS.forEach(i => { if (!gesehen.has(i.id)) p.push('Teil ' + i.id + ' fehlt (IDs nie löschen)'); });
  return p;
}

// ── English Journey (Lernweg im Journey, Etappe 6) ──
const DATEIEN_JID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dateienZeile = (v, max) => typeof v === 'string' && v.length <= max && !/[<>\u0000-\u001f]/.test(v);   // darf leer sein
const DATEIEN_UEBUNGEN = ['wahl', 'zuordnen', 'luecken', 'saetze', 'sortieren', 'schreiben', 'mediation', 'frei'];
const DATEIEN_SCHRITTE = ['hefteintrag', 'uebung', 'app', 'lesen', 'vokabeln', 'partner', 'hoeren', 'extra'];

/** Bausteine: Hefteinträge (zeilen [[text, ''|'g'|'b']]), eigene Übungen (typ, loesung), Kann-Sätze. IDs bleiben (Lernstand jw:<ID>). */
function dateienPruefeBausteine(neu, alt) {
  const p = [];
  if (!dateienObj(neu) || neu.weg !== alt.weg || !Array.isArray(neu.bausteine) || neu.bausteine.length > 600) return ['Aufbau ungültig (weg, bausteine)'];
  const altBy = new Map((alt.bausteine || []).map(b => [b.id, b])), ids = new Set();
  const mehrzeilig = (v, max) => typeof v === 'string' && v.length <= max && !/[<>\u0000-\u0009\u000b-\u001f]/.test(v);   // Zeilenumbruch erlaubt (Mustertexte)
  const textTief = (v, tiefe = 0) => tiefe > 4 ? false : typeof v === 'string' ? mehrzeilig(v, 3000)
    : typeof v === 'number' || typeof v === 'boolean' || v === null ? true
    : Array.isArray(v) ? v.length <= 60 && v.every(x => textTief(x, tiefe + 1))
    : dateienObj(v) ? Object.keys(v).length <= 30 && Object.values(v).every(x => textTief(x, tiefe + 1)) : false;
  neu.bausteine.forEach((b, i) => {
    const wo = 'Baustein ' + (b && b.id || i + 1);
    if (!dateienObj(b) || typeof b.id !== 'string' || !DATEIEN_JID.test(b.id) || b.id.length > 60 || ids.has(b.id)) return p.push(wo + ': ID fehlt, ungültig oder doppelt');
    ids.add(b.id);
    const a = altBy.get(b.id);
    if (a && a.art !== b.art) return p.push(wo + ': die Art darf sich nicht ändern');
    if (!textTief(b)) return p.push(wo + ': Texte ungültig (keine < >, nicht zu lang)');
    if (b.art === 'hefteintrag') {
      if (!dateienText(b.titel, 80)) p.push(wo + ': Titel fehlt');
      if (!Array.isArray(b.zeilen) || b.zeilen.length > 30 || !b.zeilen.every(z => Array.isArray(z) && z.length <= 12
          && z.every(t => Array.isArray(t) && t.length === 2 && dateienZeile(t[0], 200) && ['', 'g', 'b'].includes(t[1])))) p.push(wo + ': Zeilen ungültig');
      if (b.merke !== undefined && !dateienZeile(b.merke, 200)) p.push(wo + ': Merksatz ungültig');
    } else if (b.art === 'uebung') {
      if (!DATEIEN_UEBUNGEN.includes(b.typ) || !dateienText(b.titel, 200)) p.push(wo + ': typ oder Titel ungültig');
      const l = b.loesung;
      if (l !== undefined && !(mehrzeilig(l, 3000) && l.trim()) && !(Array.isArray(l) && l.length && l.length <= 40 && l.every(x => dateienText(x, 300)))) p.push(wo + ': Lösung ungültig');
    } else if (b.art === 'kann') {
      if (!dateienText(b.teil, 40) || !dateienText(b.text, 200)) p.push(wo + ': teil und text nötig');
    } else p.push(wo + ': art muss hefteintrag, uebung oder kann sein');
  });
  altBy.forEach((_, id) => { if (!ids.has(id)) p.push('Baustein ' + id + ' fehlt (IDs nie löschen – Erledigtes steht im Pass)'); });
  return p;
}

/** Weg: nur abschnitte, kann, wahlAnzahl je Unit ändern sich; Stationen bleiben; Abschnitt-IDs bleiben; IDs eindeutig */
function dateienPruefeJourney(neu, alt, bausteine, katalogIds) {
  const p = [];
  if (!dateienObj(neu) || !Array.isArray(neu.units) || neu.units.length !== alt.units.length) return ['Units dürfen sich nicht ändern'];
  if (!dateienGleich(ohne(neu, 'units'), ohne(alt, 'units'))) p.push('Kopf der Datei darf sich nicht ändern');
  const B = new Map(((bausteine || {}).bausteine || []).map(b => [b.id, b]));
  const ids = new Set(B.keys()), altAb = new Set(alt.units.flatMap(u => (u.abschnitte || []).map(a => a.id)));
  const fest = u => { const c = { ...u }; ['abschnitte', 'kann', 'wahlAnzahl'].forEach(k => delete c[k]); return c; };
  const id = (v, wo) => { if (typeof v !== 'string' || !DATEIEN_JID.test(v) || v.length > 80 || ids.has(v)) { p.push(wo + ': ID fehlt, ungültig oder doppelt (' + v + ')'); return false; } ids.add(v); return true; };
  const zahl = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  const buchOk = b => dateienObj(b) && zahl(b.seite, 1, 400) && (b.bis === undefined || zahl(b.bis, b.seite, 400))
    && (b.uebung === undefined || dateienText(b.uebung, 40)) && Object.keys(b).every(k => ['seite', 'bis', 'uebung'].includes(k));
  neu.units.forEach((u, ui) => {
    const a0 = alt.units[ui];
    if (!dateienObj(u) || !dateienGleich(fest(u), fest(a0))) return p.push('Unit ' + (a0.id || ui + 1) + ': nur Abschnitte, Kann-Sätze und Wahl-Anzahl änderbar');
    if (u.wahlAnzahl !== undefined && !zahl(u.wahlAnzahl, 0, 10)) p.push('Unit ' + u.id + ': wahlAnzahl 0–10');
    const st = new Set(u.stationen.map(s => s.id)), inAb = new Set();
    if (u.abschnitte === undefined) return;
    if (!Array.isArray(u.abschnitte) || u.abschnitte.length > 40) return p.push('Unit ' + u.id + ': abschnitte ungültig');
    u.abschnitte.forEach(a => {
      const wo = 'Abschnitt ' + (a && a.id);
      if (!dateienObj(a) || !id(a.id, wo)) return;
      if (!dateienText(a.titel, 120)) p.push(wo + ': Titel fehlt');
      ['kurz', 'ico', 'kompetenz'].forEach(k => { if (a[k] !== undefined && !dateienZeile(a[k], 120)) p.push(wo + ': ' + k + ' ungültig'); });
      if (a.buch !== undefined && !(dateienObj(a.buch) && zahl(a.buch.von, 1, 400) && zahl(a.buch.bis, a.buch.von, 400) && Object.keys(a.buch).length === 2)) p.push(wo + ': Buchseiten ungültig');
      if (a.platz !== undefined && !st.has(a.platz)) p.push(wo + ': platz ist keine Station der Unit');
      if (a.merk !== undefined && !(Array.isArray(a.merk) && a.merk.length <= 6 && a.merk.every(x => dateienText(x, 120)))) p.push(wo + ': merk ungültig');
      if (!Array.isArray(a.schritte) || !a.schritte.length || a.schritte.length > 40) return p.push(wo + ': Schritte fehlen');
      a.schritte.forEach(s => {
        const ws = 'Schritt ' + (s && s.id);
        if (!dateienObj(s) || !id(s.id, ws)) return;
        if (!DATEIEN_SCHRITTE.includes(s.art)) return p.push(ws + ': art ungültig');
        if (s.niveau !== undefined && !(Array.isArray(s.niveau) && s.niveau.length && s.niveau.every(n => [1, 2, 3].includes(n)))) p.push(ws + ': niveau ungültig');
        if (s.buch !== undefined && !buchOk(s.buch)) p.push(ws + ': Buchverweis ungültig');
        if (s.text !== undefined && !dateienZeile(s.text, 600)) p.push(ws + ': Text ungültig');
        if (s.he !== undefined && !(s.he === false && ['uebung', 'app'].includes(s.art))) p.push(ws + ': he nur als false bei Übung und App');
        if (s.art === 'hefteintrag' || (s.art === 'uebung' && s.baustein !== undefined)) {
          const b = B.get(s.baustein);
          if (!b || b.art !== s.art) p.push(ws + ': Baustein ' + s.baustein + ' fehlt oder passt nicht');
          if (s.art === 'hefteintrag' && a.wahl) p.push(ws + ': Hefteinträge nur in Pflicht-Abschnitten');
        } else if (s.art === 'uebung' && s.buch === undefined) p.push(ws + ': Übung braucht Buchverweis oder Baustein');
        if (s.art === 'app') {
          if ((s.station === undefined) === (s.thema === undefined)) p.push(ws + ': station oder thema');
          else if (s.station !== undefined && (!st.has(s.station) || inAb.has(s.station))) p.push(ws + ': Station fehlt oder steht doppelt');
          else if (s.thema !== undefined && katalogIds && !katalogIds.has(s.thema)) p.push(ws + ': Thema fehlt im Katalog');
          if (s.station) inAb.add(s.station);
        }
      });
    });
    if (u.kann !== undefined && !(Array.isArray(u.kann) && u.kann.length <= 30 && u.kann.every(k => dateienObj(k) && B.has(k.baustein) && B.get(k.baustein).art === 'kann'
        && (k.abschnitt == null || u.abschnitte.some(a => a.id === k.abschnitt))))) p.push('Unit ' + u.id + ': Kann-Sätze ungültig');
  });
  altAb.forEach(x => { if (!ids.has(x)) p.push('Abschnitt ' + x + ' fehlt (IDs nie löschen)'); });
  return p;
}

/** Datendateien mit Listen lesbar halten: jeder Eintrag einer Liste von Objekten in einer Zeile */
function dateienFormatZeilen(d) {
  const zeile = v => JSON.stringify(v);
  return '{\n' + Object.keys(d).map(k => {
    const v = d[k];
    if (Array.isArray(v) && v.length && v.every(dateienObj)) return JSON.stringify(k) + ': [\n' + v.map(zeile).join(',\n') + '\n]';
    return JSON.stringify(k) + ': ' + zeile(v);
  }).join(',\n') + '\n}\n';
}

/** Aufgaben-Pools: Kopf des Pools in einer Zeile, darunter jede Aufgabe in einer Zeile */
function dateienFormatPools(d) {
  const kopf = x => JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'aufgaben'))).slice(1, -1).replace(/":/g, '": ').replace(/,"/g, ', "');
  const zeile = a => JSON.stringify(a).replace(/":/g, '": ').replace(/,"/g, ', "').replace(/","/g, '", "');
  return '{\n "hinweis": ' + JSON.stringify(d.hinweis) + ',\n "pools": [\n' + d.pools.map(x =>
    '  {' + kopf(x) + ', "aufgaben": [\n' + x.aufgaben.map(a => '   ' + zeile(a)).join(',\n') + '\n  ]}').join(',\n') + '\n ]\n}\n';
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
