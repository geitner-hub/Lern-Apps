// ═══════════════════════════════════════════════════════
//  Lernwelt – aufgaben.js   (Aufgaben-Baukasten für Spiele)
//
//  Liefert Aufgaben mit drei Antwortmöglichkeiten (eine richtig) aus
//  verschiedenen Pools. Gedacht für den Runner und spätere Spiele –
//  das Spiel kümmert sich um die Darstellung, hier stehen nur die Inhalte.
//
//  Klassenfilter: Es werden nur Pools bis zur Klasse aus dem Lernwelt-Pass
//  angeboten (nie Stoff aus höheren Klassen).
//
//  API (window.LernAufgaben):
//    pools({ klasse })          → Liste der Pools bis zu dieser Klasse
//    klasse()                   → Klasse aus dem Pass (oder null)
//    einheiten(poolId)          → Promise: [{ id, label }] (nur Vokabel-Pools)
//    erzeuger(ids, opts)        → Promise: { next() → Aufgabe }
//       opts: { bis: 'unit3', einheiten: ['unit1', …], richtung: 'de-en' | 'en-de',
//               themen: { vok5: ['unit1/theme1', 'unit2', 'liste/colors'] } }
//       Mit opts.themen kommen aus dem Vokabel-Pool nur diese Themen dran
//       (Eintrag ohne „/“ = ganze Unit). Jedes Thema zählt dann beim Mischen
//       so viel wie ein Rechen-Pool (gleiches Gewicht je Inhalt).
//    meineThemen({ klasse })    → { ids, opts, anzahl, inhalte } „Meine Themen“ für die Spiele:
//                                 freigeschalteter Stoff aus dem Pass + Starter-Paket
//    ausLink(location.search)   → { ids, opts } aus ?pool=vok5&bis=unit3&richtung=en-de
//    lesezeit(aufgabe)          → empfohlene Sekunden zum Lesen
//    woerter(opts)              → Promise: englische Einzelwörter für Wort-Spiele
//       opts: { meine: true }  → aus „Meine Themen“ (nur Vokabel-Pools)
//             { pools: ['vok5'], bis, einheiten, themen, klasse } → wie erzeuger()
//             min, max: Buchstaben (Standard 3–10)
//             grossgeschrieben: false → ohne Wörter, die im Buch großgeschrieben sind (Germany, Monday …)
//       → [{ wort: 'CRAB', en: 'the crab', de: 'die Krabbe', pool: 'vok5', thema: 'unit1/theme2', unit: 'unit1', gross }]
//    wortForm(en)               → 'CRAB' aus 'the crab' bzw. null, wenn kein Einzelwort
//
//  Aufgabe: { frage, antwort, optionen: [3 Texte, gemischt], pool, hinweis? }
//
//  Neue Pools: unten in POOLS eintragen. Rechen-Pools brauchen eine
//  Funktion gen() → { frage, antwort, falsch: [mind. 2 Ablenker] }.
//  Rechen-Aufgaben kommen seit Etappe 4 aus gemeinsam/generatoren-mathe.js;
//  jede Stufe aus daten/kopfrechnen.json ist automatisch ein Pool (ID = Themen-ID).
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernAufgaben) return;

  const here = (document.currentScript && document.currentScript.src) || location.href;

  // Inhalts-Katalog mitladen (Themen-IDs → Pools), falls die Seite ihn nicht schon hat
  (function () {
    if (window.LernKatalog || document.getElementById('lw-katalog-script')) return;
    const sc = document.createElement('script');
    sc.id = 'lw-katalog-script';
    sc.src = new URL('katalog.js', here).href;
    document.head.appendChild(sc);
  })();
  /** Themen-ID ('ma.5.kopf.mittel') → alte Inhalt-ID ('kopf5-mittel'); alte IDs bleiben, wie sie sind. */
  function alteForm(id) {
    if (typeof id !== 'string' || !id.includes('.') || id.includes(':')) return id;
    const K = window.LernKatalog;
    return (K && K.inhaltFuer(id)) || id;
  }
  const MAX_ANTWORT = 22;             // längere Antworten passen nicht aufs Tor
  const BRUECHE = false;              // Bruchaufgaben (Kl. 6) im Spiel? true = wieder einschalten
  const OPTIONEN = 3;

  // ── Hilfen ─────────────────────────────────────────────
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = l => l[Math.floor(Math.random() * l.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  /** Zahl deutsch schreiben: Komma, echtes Minuszeichen */
  const zahl = n => String(n).replace('-', '−').replace('.', ',');
  const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

  // ═══════════════════════════════════════════════════════
  //  RECHEN-AUFGABEN (Etappe 4: aus gemeinsam/generatoren-mathe.js – dieselbe
  //  Quelle wie der Übungs-Rahmen. Hier steht kein eigener Rechen-Code mehr.)
  // ═══════════════════════════════════════════════════════
  function laden(datei) {
    return new Promise(ok => {
      const sc = document.createElement('script');
      sc.src = new URL(datei, here).href;
      sc.onload = sc.onerror = () => ok();
      document.head.appendChild(sc);
    });
  }
  const KOPF_DATEI = new URL('../daten/kopfrechnen.json', here).href;
  // Generatoren und Stufen (daten/kopfrechnen.json) gleich beim Laden holen
  const matheBereit = Promise.all([
    window.LernGeneratoren ? null : laden('generatoren-mathe.js'),
    fetch(KOPF_DATEI, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null),
  ]).then(([, d]) => { stufenPools(d); return !!window.LernGeneratoren; });
  const G = () => window.LernGeneratoren;
  /** Spiel-Aufgabe (Text-Antwort + Ablenker) aus einem Generator; ohne Generatoren null */
  function spiel(spec) { return G() ? G().spielAufgabe(spec) : null; }
  const kopf4 = s => spiel({ typ: 'alt4', stufe: s });
  const kopf5 = s => spiel({ typ: 'alt5', stufe: s });
  function kopf6(level) {
    let arten = level === 'leicht' ? ['int', 'frac_same', 'dec1', 'mal']
              : level === 'mittel' ? ['int_neg', 'frac_diff', 'dec2', 'mal']
              : ['rat', 'frac_mul', 'frac_div', 'neg_dec'];
    if (!BRUECHE) arten = arten.filter(t => !t.startsWith('frac'));
    return spiel({ typ: 'alt6', arten });
  }
  const einmaleins = gross => spiel({ typ: '1x1', gross });

  /** Stufen der Kopfrechen-App als eigene Pools (ID = Themen-ID, z. B. ma.5.kopf.rechenregeln) */
  function stufenPools(d) {
    if (!d || !d.stufen) return;
    const klasseVon = {};
    const alleKlassen = d.apps ? Object.values(d.apps).map(a => a.klassen || {}) : [d.klassen || {}];   // Format 2: mehrere Apps
    alleKlassen.forEach(K => Object.entries(K).forEach(([k, kl]) => (kl.stufen || []).forEach(id => { if (!klasseVon[id] || +k < klasseVon[id]) klasseVon[id] = +k; })));
    Object.entries(d.stufen).forEach(([id, st]) => {
      if (POOL_BY_ID[id] || st.inhalt || !klasseVon[id]) return;      // alte Stufen (inhalt) laufen über ihre bisherigen Pools
      const pool = { id, fach: 'Mathematik', gruppe: 'Kopfrechnen', klasse: Math.max(5, klasseVon[id]), titel: st.titel, gen: () => spiel(st) };
      if (klasseVon[id] < 5) pool.klasse = klasseVon[id];
      POOLS.push(pool); POOL_BY_ID[id] = pool;
    });
  }

  // ═══════════════════════════════════════════════════════
  //  GPG-LISTEN
  // ═══════════════════════════════════════════════════════
  const HAUPTSTAEDTE_EUROPA = [
    ['Deutschland', 'Berlin', 1], ['Frankreich', 'Paris', 1], ['Italien', 'Rom', 1], ['Spanien', 'Madrid', 1],
    ['Portugal', 'Lissabon', 1], ['Vereinigtes Königreich', 'London', 1], ['Irland', 'Dublin', 1],
    ['Niederlande', 'Amsterdam', 1], ['Belgien', 'Brüssel', 1], ['Schweiz', 'Bern', 1], ['Österreich', 'Wien', 1],
    ['Polen', 'Warschau', 1], ['Tschechien', 'Prag', 1], ['Dänemark', 'Kopenhagen', 1], ['Norwegen', 'Oslo', 1],
    ['Schweden', 'Stockholm', 1], ['Finnland', 'Helsinki', 1], ['Griechenland', 'Athen', 1], ['Ungarn', 'Budapest', 1],
    ['Rumänien', 'Bukarest', 1], ['Ukraine', 'Kiew', 1], ['Russland', 'Moskau', 1], ['Island', 'Reykjavík', 1],
    ['Kroatien', 'Zagreb', 1],
    ['Albanien', 'Tirana', 2], ['Bulgarien', 'Sofia', 2], ['Bosnien und Herzegowina', 'Sarajevo', 2], ['Belarus', 'Minsk', 2],
    ['Zypern', 'Nikosia', 2], ['Estland', 'Tallinn', 2], ['Litauen', 'Vilnius', 2], ['Luxemburg', 'Luxemburg', 2],
    ['Lettland', 'Riga', 2], ['Moldau', 'Chișinău', 2], ['Nordmazedonien', 'Skopje', 2], ['Montenegro', 'Podgorica', 2],
    ['Serbien', 'Belgrad', 2], ['Slowakei', 'Bratislava', 2], ['Slowenien', 'Ljubljana', 2],
  ];
  const LANDESHAUPTSTAEDTE = [
    ['Baden-Württemberg', 'Stuttgart'], ['Bayern', 'München'], ['Berlin', 'Berlin'], ['Brandenburg', 'Potsdam'],
    ['Bremen', 'Bremen'], ['Hamburg', 'Hamburg'], ['Hessen', 'Wiesbaden'], ['Mecklenburg-Vorpommern', 'Schwerin'],
    ['Niedersachsen', 'Hannover'], ['Nordrhein-Westfalen', 'Düsseldorf'], ['Rheinland-Pfalz', 'Mainz'],
    ['Saarland', 'Saarbrücken'], ['Sachsen', 'Dresden'], ['Sachsen-Anhalt', 'Magdeburg'],
    ['Schleswig-Holstein', 'Kiel'], ['Thüringen', 'Erfurt'],
  ];

  /** Paar-Liste [[A, B], …] → Aufgabe „Hauptstadt von A?“ (oder umgekehrt) */
  function paarAufgabe(liste, vorwaerts, rueckwaerts) {
    const [a, b] = pick(liste);
    const rueck = rueckwaerts && Math.random() < .35 && a !== b;     // Stadtstaaten nur vorwärts
    if (rueck) {
      const falsch = shuffle(liste.filter(x => x[0] !== a)).map(x => x[0]);
      return { frage: rueckwaerts(b), antwort: a, falsch };
    }
    const falsch = shuffle(liste.filter(x => x[1] !== b)).map(x => x[1]);
    return { frage: vorwaerts(a), antwort: b, falsch };
  }

  // ═══════════════════════════════════════════════════════
  //  POOLS  (klasse = ab welcher Klasse der Stoff dran ist)
  // ═══════════════════════════════════════════════════════
  const STUFE = { leicht: 'leicht', mittel: 'mittel', schwer: 'schwer' };
  const POOLS = [
    ...Object.keys(STUFE).map(s => ({ id: 'kopf4-' + s, fach: 'Mathematik', gruppe: 'Kopfrechnen', klasse: 5,
      titel: `Wiederholung 4. Klasse (${s})`, gen: () => kopf4(s) })),
    ...Object.keys(STUFE).map(s => ({ id: 'kopf5-' + s, fach: 'Mathematik', gruppe: 'Kopfrechnen', klasse: 5,
      titel: `Kopfrechnen 5. Klasse (${s})`, gen: () => kopf5(s) })),
    ...Object.keys(STUFE).map(s => ({ id: 'kopf6-' + s, fach: 'Mathematik', gruppe: 'Kopfrechnen', klasse: 6,
      titel: `Kopfrechnen 6. Klasse (${s})`, gen: () => kopf6(s) })),
    { id: '1x1-klein', fach: 'Mathematik', gruppe: 'Einmaleins', klasse: 5, titel: 'Kleines Einmaleins', gen: () => einmaleins(false) },
    { id: '1x1-gross', fach: 'Mathematik', gruppe: 'Einmaleins', klasse: 5, titel: 'Großes Einmaleins (11–25)', gen: () => einmaleins(true) },

    { id: 'vok5', fach: 'Englisch', gruppe: 'Vokabeln', klasse: 5, titel: 'Vokabeln 5. Klasse', quelle: '../daten/vokabeln5.json', typ: 'vokabeln' },
    { id: 'vok6', fach: 'Englisch', gruppe: 'Vokabeln', klasse: 6, titel: 'Vokabeln 6. Klasse', quelle: '../daten/vokabeln6.json', typ: 'vokabeln' },

    { id: 'hauptstaedte-europa', fach: 'GPG', gruppe: 'Hauptstädte', klasse: 5, titel: 'Hauptstädte Europas (Start)',
      gen: () => paarAufgabe(HAUPTSTAEDTE_EUROPA.filter(x => x[2] === 1), l => `${l}: Hauptstadt?`, s => `${s} ist Hauptstadt welches Landes?`) },
    { id: 'hauptstaedte-europa-profi', fach: 'GPG', gruppe: 'Hauptstädte', klasse: 5, titel: 'Hauptstädte Europas (Profi)',
      gen: () => paarAufgabe(HAUPTSTAEDTE_EUROPA, l => `${l}: Hauptstadt?`, s => `${s} ist Hauptstadt welches Landes?`) },
    { id: 'landeshauptstaedte', fach: 'GPG', gruppe: 'Hauptstädte', klasse: 5, titel: 'Landeshauptstädte',
      gen: () => paarAufgabe(LANDESHAUPTSTAEDTE, l => `${l}: Landeshauptstadt?`, s => `${s} ist Hauptstadt welches Bundeslands?`) },
  ];
  const POOL_BY_ID = Object.fromEntries(POOLS.map(p => [p.id, p]));
  const STUFEN_ID = /^ma\.\d\.kopf\.[a-z0-9-]+$/;          // Stufen der Kopfrechen-App (Pools kommen aus daten/kopfrechnen.json)

  // ═══════════════════════════════════════════════════════
  //  VOKABELN (aus den JSON-Dateien der Vokabeltrainer)
  // ═══════════════════════════════════════════════════════
  const vokCache = {};
  function ladeVokabeln(pool) {
    if (!vokCache[pool.id]) {
      vokCache[pool.id] = fetch(new URL(pool.quelle, here).href, { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(d => {
          const units = [];                                       // [{ id, label, woerter:[{en,de,thema}] }]
          Object.entries(d.units || {}).forEach(([uid, u]) => {
            const woerter = [];
            Object.entries(u.themes || {}).forEach(([tid, t]) => (t.words || []).forEach(w => woerter.push({ en: w.en, de: w.de, thema: uid + '/' + tid })));
            (u.words || []).forEach(w => woerter.push({ en: w.en, de: w.de, thema: uid }));
            units.push({ id: uid, label: u.label || uid, woerter });
          });
          Object.entries(d.specialLists || {}).forEach(([lid, l]) => {   // Zahlen, Farben … gehören zu ihrer Unit
            const u = units.find(x => x.id === l.unit) || units[0];
            if (u) (l.words || []).forEach(w => u.woerter.push({ en: w.en, de: w.de, thema: 'liste/' + lid }));
          });
          return units;
        });
      vokCache[pool.id].catch(() => { delete vokCache[pool.id]; });
    }
    return vokCache[pool.id];
  }

  /** Unit-Auswahl: explizite Liste, sonst alle bis „bis“ (einschließlich), sonst alle */
  function waehleUnits(units, opts) {
    if (Array.isArray(opts.einheiten) && opts.einheiten.length) return units.filter(u => opts.einheiten.includes(u.id));
    if (opts.bis) {
      const bis = /^\d+$/.test(String(opts.bis)) ? 'unit' + opts.bis : String(opts.bis);
      const i = units.findIndex(u => u.id === bis);
      if (i >= 0) return units.slice(0, i + 1);
    }
    return units;
  }

  /** Filter für ein Thema: 'unit1/theme1', 'liste/colors' genau; 'unit2' = ganze Unit (ohne Sonderlisten) */
  function themaFilter(eintrag) {
    const e = String(eintrag);
    return e.includes('/') ? w => w.thema === e : w => w.thema === e || w.thema.startsWith(e + '/');
  }

  function vokabelErzeuger(units, opts, filter) {
    const richtung = opts.richtung === 'en-de' ? 'en-de' : 'de-en';
    const [von, nach] = richtung === 'de-en' ? ['de', 'en'] : ['en', 'de'];
    const alle = units.flatMap(u => u.woerter);
    // doppelte Antworten (z. B. gleiche Vokabel in zwei Listen) nur einmal
    const seen = new Set();
    const nutzbar = alle.filter(w => {
      const k = norm(w[nach]);
      if (!w[nach] || !w[von] || w[nach].length > MAX_ANTWORT || seen.has(k)) return false;
      seen.add(k); return true;
    });
    const fragen = filter ? nutzbar.filter(filter) : nutzbar;      // gefragt wird nur daraus, Ablenker aus allen
    return () => {
      if (nutzbar.length < OPTIONEN || !fragen.length) return null;
      const w = pick(fragen);
      const L = w[nach].length;
      // Ablenker: gleiches Thema bzw. gleiche Unit, ähnliche Länge, nicht bedeutungsgleich
      const kandidaten = nutzbar.filter(x => x !== w && norm(x[nach]) !== norm(w[nach]) && norm(x[von]) !== norm(w[von]));
      const score = x => (x.thema === w.thema ? 0 : x.thema.split('/')[0] === w.thema.split('/')[0] ? 1 : 3)
                       + Math.abs(x[nach].length - L) / Math.max(4, L) * 2 + Math.random() * 1.5
                       + ((/^\(to\)|^to /.test(x[nach]) === /^\(to\)|^to /.test(w[nach])) ? 0 : 1.2);   // Verben zu Verben
      const falsch = kandidaten.map(x => [score(x), x[nach]]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      return { frage: w[von], antwort: w[nach], falsch, hinweis: richtung === 'de-en' ? 'Auf Englisch?' : 'Auf Deutsch?' };
    };
  }

  // ═══════════════════════════════════════════════════════
  //  ÖFFENTLICHE FUNKTIONEN
  // ═══════════════════════════════════════════════════════
  function passKlasse() {
    try { const p = window.LernPass && window.LernPass.profile(); return p && p.klasse ? Number(p.klasse) : null; }
    catch (e) { return null; }
  }

  /** Pools bis zur Klasse (ohne Angabe: Klasse aus dem Pass; ohne Pass: alle) */
  function pools(o = {}) {
    const k = o.klasse !== undefined ? o.klasse : passKlasse();
    return POOLS.filter(p => !k || p.klasse <= k)
      .map(({ id, fach, gruppe, klasse, titel, typ }) => ({ id, fach, gruppe, klasse, titel, vokabeln: typ === 'vokabeln' }));
  }

  async function einheiten(id) {
    const p = POOL_BY_ID[id];
    if (!p || p.typ !== 'vokabeln') return [];
    return (await ladeVokabeln(p)).map(u => ({ id: u.id, label: u.label, anzahl: u.woerter.length }));
  }

  /**
   * Erzeuger für eine oder mehrere Pools. Mehrere Pools werden gemischt.
   * Unbekannte Pools und Pools über der Passklasse (bei opts.klasse bzw. Pass) werden übergangen.
   */
  async function erzeuger(ids, opts = {}) {
    await matheBereit;
    ids = (Array.isArray(ids) ? ids : [ids]).map(alteForm).filter(id => POOL_BY_ID[id]);
    const k = opts.klasse !== undefined ? opts.klasse : passKlasse();
    ids = ids.filter(id => !k || POOL_BY_ID[id].klasse <= k);
    if (!ids.length) throw new Error('Keine passenden Aufgaben gefunden.');

    const quellen = [];
    const themen = opts.themen && typeof opts.themen === 'object' ? opts.themen : {};
    for (const id of ids) {
      const p = POOL_BY_ID[id];
      if (p.typ === 'vokabeln') {
        const units = waehleUnits(await ladeVokabeln(p), opts);
        if (Array.isArray(themen[id])) {
          // eine Quelle je Thema → jedes Thema so oft wie ein Rechen-Pool
          for (const t of reduziereThemen(themen[id])) {
            const f = themaFilter(t);
            const teil = units.filter(u => u.woerter.some(f));         // Ablenker aus denselben Units
            if (!teil.length) continue;
            const g = vokabelErzeuger(teil, opts, f);
            if (g()) quellen.push({ id, gen: g, inhalt: id + ':' + t });
          }
        } else {
          const g = vokabelErzeuger(units, opts);
          if (g()) quellen.push({ id, gen: g });
        }
      } else {
        quellen.push({ id, gen: p.gen });
      }
    }
    if (!quellen.length) throw new Error('In dieser Auswahl sind zu wenige Aufgaben.');

    const zuletzt = [];                                          // keine Wiederholung der letzten Fragen
    return {
      pools: [...new Set(quellen.map(q => q.id))],
      next() {
        for (let v = 0; v < 40; v++) {
          const q = pick(quellen);
          const r = q.gen();
          if (!r || r.falsch.length < OPTIONEN - 1) continue;
          if (zuletzt.includes(r.frage) && v < 30) continue;
          zuletzt.push(r.frage); if (zuletzt.length > 12) zuletzt.shift();
          const falsch = [];
          r.falsch.forEach(f => { if (falsch.length < OPTIONEN - 1 && norm(f) !== norm(r.antwort) && !falsch.some(x => norm(x) === norm(f))) falsch.push(String(f)); });
          if (falsch.length < OPTIONEN - 1) continue;
          const a = { frage: r.frage, antwort: String(r.antwort), optionen: shuffle([String(r.antwort), ...falsch]), pool: q.id };
          if (r.hinweis) a.hinweis = r.hinweis;
          if (q.inhalt) a.inhalt = q.inhalt;
          return a;
        }
        return null;
      },
    };
  }

  /** Themen, die schon in einer freigeschalteten ganzen Unit stecken, weglassen */
  function reduziereThemen(liste) {
    const l = [...new Set((liste || []).filter(t => typeof t === 'string' && t))];
    const units = l.filter(t => !t.includes('/'));
    return l.filter(t => !t.includes('/') || t.startsWith('liste/') || !units.includes(t.split('/')[0]));
  }

  // Starter-Paket (Standard, falls der Pass keine Einstellungen liefert)
  const STARTER_STANDARD = { 5: ['kopf4-leicht', '1x1-klein'], 6: ['kopf5-leicht', '1x1-klein'] };
  function starterFuer(starter, k) {
    const s = starter && typeof starter === 'object' ? starter : STARTER_STANDARD;
    for (let kl = k || 5; kl >= 5; kl--) if (Array.isArray(s[kl])) return s[kl];
    return Array.isArray(s[5]) ? s[5] : [];
  }

  /**
   * „Meine Themen“: alles, was im Pass freigeschaltet ist, plus Starter-Paket –
   * nie Stoff über der Klasse. → { ids, opts, anzahl, inhalte }
   * inhalte = Liste der Inhalt-IDs (z. B. 'kopf5-mittel', 'vok5:unit1/theme1').
   */
  function meineThemen(o = {}) {
    const k = o.klasse !== undefined ? o.klasse : passKlasse();
    const P = window.LernPass;
    const sp = (P && P.settings && P.settings.spiele) || { starter: STARTER_STANDARD };
    let frei = [];
    try { frei = P && P.freigeschaltet ? P.freigeschaltet() : []; } catch (e) {}
    const erlaubt = id => POOL_BY_ID[id] ? (!k || POOL_BY_ID[id].klasse <= k)
      : STUFEN_ID.test(id) && (!k || Number(id.split('.')[1]) <= k);     // Pool entsteht, sobald kopfrechnen.json geladen ist
    const ids = [], themen = {}, ganz = new Set();
    const pool = id => { if (!ids.includes(id)) ids.push(id); };
    starterFuer(sp.starter, k).map(alteForm).forEach(id => {
      if (!erlaubt(id)) return;
      pool(id);
      if (POOL_BY_ID[id] && POOL_BY_ID[id].typ === 'vokabeln') ganz.add(id);   // ganzes Vokabelbuch im Starter
    });
    frei.map(alteForm).forEach(fid => {
      const m = /^(vok\d+):(.+)$/.exec(fid);
      if (m) {
        if (!erlaubt(m[1]) || POOL_BY_ID[m[1]].typ !== 'vokabeln') return;
        pool(m[1]);
        (themen[m[1]] = themen[m[1]] || []).push(m[2]);
      } else if (erlaubt(fid)) pool(fid);
    });
    ganz.forEach(id => { delete themen[id]; });
    Object.keys(themen).forEach(id => { themen[id] = reduziereThemen(themen[id]); });
    const inhalte = ids.flatMap(id => themen[id] ? themen[id].map(t => id + ':' + t) : [id]);
    return { ids, opts: { klasse: k, themen, richtung: 'de-en' }, anzahl: inhalte.length, inhalte };
  }

  /** ?pool=vok5,1x1-klein&bis=unit3&richtung=en-de  →  { ids, opts } */
  function ausLink(search) {
    const p = new URLSearchParams(search || '');
    const ids = (p.get('pool') || '').split(',').map(s => s.trim()).filter(id => POOL_BY_ID[id]);
    const opts = {};
    if (p.get('bis')) opts.bis = p.get('bis').slice(0, 20);
    if (p.get('units')) opts.einheiten = p.get('units').split(',').map(s => s.trim()).slice(0, 20);
    if (p.get('richtung') === 'en-de') opts.richtung = 'en-de';
    return { ids, opts };
  }

  /** Empfohlene Lesezeit in Sekunden (Frage + Antworten) */
  function lesezeit(a) {
    if (!a) return 2;
    const zeichen = a.frage.length + a.optionen.reduce((s, o) => s + o.length, 0);
    return Math.min(7, 1.3 + zeichen * 0.07);
  }

  // ═══════════════════════════════════════════════════════
  //  WORTQUELLE für Wort-Spiele (Wort des Tages, Zauberwort)
  // ═══════════════════════════════════════════════════════
  /**
   * Vokabel → ein Wort aus Buchstaben (Großbuchstaben) oder null.
   * 'the crab' → 'CRAB', '(to) join' → 'JOIN', 'guys (pl)' → 'GUYS';
   * Wendungen, Sätze und Einträge mit Zusätzen wie „simple past“ fallen weg.
   */
  function wortForm(en) {
    let w = String(en || '').trim();
    if (!w || /[,;/=?!]|simple past|\.\.\./i.test(w)) return null;
    w = w.replace(/\s*\((pl|sg|AE|BE|infml)\.?\)\s*$/i, '');           // Zusätze am Ende
    w = w.replace(/^\(to\)\s+/i, '').replace(/^(to|the|a|an)\s+/i, '');
    return /^[A-Za-z]+$/.test(w) ? w.toUpperCase() : null;
  }

  async function woerter(o = {}) {
    const min = Math.max(2, Number(o.min) || 3), max = Math.max(min, Number(o.max) || 10);
    let ids = o.pools, opts = { ...o };
    if (o.meine) { const m = meineThemen({ klasse: o.klasse }); ids = m.ids; opts = { ...m.opts, ...o, themen: m.opts.themen }; }
    ids = (Array.isArray(ids) ? ids : ids ? [ids] : []).filter(id => POOL_BY_ID[id] && POOL_BY_ID[id].typ === 'vokabeln');
    const k = opts.klasse !== undefined ? opts.klasse : passKlasse();
    ids = ids.filter(id => !k || POOL_BY_ID[id].klasse <= k);
    const themen = opts.themen && typeof opts.themen === 'object' ? opts.themen : {};
    const liste = [], gesehen = new Set();
    for (const id of ids) {
      let units;
      try { units = waehleUnits(await ladeVokabeln(POOL_BY_ID[id]), opts); } catch (e) { continue; }
      const filter = Array.isArray(themen[id]) && themen[id].length
        ? (fs => w => fs.some(f => f(w)))(reduziereThemen(themen[id]).map(themaFilter)) : null;
      units.forEach(u => u.woerter.forEach(w => {
        if (filter && !filter(w)) return;
        const wort = wortForm(w.en);
        if (!wort || wort.length < min || wort.length > max || !w.de) return;
        const gross = /^(\(to\)\s+|to\s+|the\s+|an?\s+)?[A-Z]/.test(String(w.en).trim()) && !/^[A-Z]+$/.test(String(w.en).trim());
        if (o.grossgeschrieben === false && gross) return;
        if (gesehen.has(wort)) return;
        gesehen.add(wort);
        liste.push({ wort, en: w.en, de: w.de, pool: id, thema: w.thema, unit: u.id, gross });
      }));
    }
    return liste;
  }

  window.LernAufgaben = { pools, klasse: passKlasse, einheiten, erzeuger, meineThemen, ausLink, lesezeit, woerter, wortForm, _POOLS: POOLS };
})();
