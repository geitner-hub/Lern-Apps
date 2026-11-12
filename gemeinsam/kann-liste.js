// ═══════════════════════════════════════════════════════
//  Lernwelt – kann-liste.js   (Kann-Liste „Das kann ich“, Aktionsplan „Lernwelt – Tempo“, Etappe 5b)
//
//  Die „Ich kann …“-Sätze eines Lernwegs oder einer Unit, gefüllt aus dem Lernstand im Pass – kein eigener Speicher.
//    English Journey: units[].kann → { baustein, abschnitt } (Text in daten/journey/bausteine-en6.json); die Themen eines
//      Satzes sind die App-Schritte seines Abschnitts (Station → thema bzw. thema am Schritt).
//    2D-Lernwege (daten/wege/<id>.json): kann → { id, text, themen: [Themen-IDs] }.
//  Stand je Satz:  'neu' noch nicht geübt · 'geuebt' · 'sicher' (jedes Thema gemeistert oder Bestwert ab 80 %).
//    Ein Thema zählt mit allen seinen Stufen (Lernstand-Schlüssel = ID oder beginnt mit „ID.“).
//  Einschätzung daneben: im English Journey der Smiley aus „Fit für die Probe?“ (jw:<Baustein>.s), sonst die letzte
//    Selbsteinschätzung vor dem Üben (LernPass.einschaetzung, Etappe 4). 0 = keine.
//
//    LernKann.gruppen({ u?, weg? }) → Promise<[{ id, titel, saetze: [{ text, teil, stand, schaetz, imUnterricht }] }]>
//        alle für dieses iPad freigegebenen Units und Wege (mit Admin-Anmeldung alle); u / weg = nur diese eine
//    LernKann.stand(themen) · LernKann.schaetzung(themen)
// ═══════════════════════════════════════════════════════
'use strict';

(function () {
  if (window.LernKann) return;
  const P = () => window.LernPass, F = () => window.LernFreigabe;
  const hole = p => fetch(LW.ROOT + p).then(r => r.ok ? r.json() : Promise.reject(new Error(p + ': HTTP ' + r.status)));
  // Eine Mix-Stufe („….mix“) steht für ihr ganzes Thema: dann zählen alle Stufen der Datei
  // … und mit der alten Inhalt-ID des Themas (ganze Unit im Vokabeltrainer: 'vok6:unit1' samt 'vok6:unit1/<theme>')
  const passend = (L, id) => {
    const basis = String(id).replace(/\.mix$/, ''), K = window.LernKatalog, alt = K && K.inhaltFuer ? K.inhaltFuer(basis) : null;
    return Object.keys(L).filter(k => k === basis || k.startsWith(basis + '.') || (alt && (k === alt || k.startsWith(alt + '/'))));
  };

  function stand(themen) {
    const L = (P() && P().lernstand) || {}, l = (themen || []).filter(Boolean);
    if (!l.length) return 'neu';
    const je = l.map(id => passend(L, id).map(k => L[k]).filter(e => e && (e.n || e.best || e.f)));
    if (!je.some(x => x.length)) return 'neu';
    return je.every(x => x.some(e => e.f === true || (e.best || 0) >= 80)) ? 'sicher' : 'geuebt';
  }
  function schaetzung(themen) {
    const E = (P() && P().einschaetzung) || {};
    let neu = null;
    (themen || []).forEach(id => passend(E, id).forEach(k => { const l = E[k], x = Array.isArray(l) && l[l.length - 1]; if (x && (!neu || x[2] > neu[2])) neu = x; }));
    return neu ? neu[0] : 0;
  }
  const admin = () => !!(F() && F().admin && F().admin());
  const wer = () => (F() && F().wer && F().wer()) || ['alle'];
  const bisFuer = weg => { const c = F() && F().journey ? F().journey(weg) : null, bis = (c && c.bis) || {}, w = wer().find(x => typeof bis[x] === 'string'); return w ? bis[w] : null; };

  async function journey(nur) {
    const bis = bisFuer('journey6');
    if (!bis && !admin()) return [];
    const [J, b] = await Promise.all([hole('daten/journey6.json'), hole('daten/journey/bausteine-en6.json')]);
    const B = {}, L = (P() && P().lernstand) || {};
    (b.bausteine || []).forEach(x => { B[x.id] = x; });
    const letzte = admin() ? J.units.length - 1 : J.units.findIndex(u => (u.abschnitte || []).some(a => a.id === bis));
    return J.units.slice(0, letzte + 1).filter(u => (!nur || u.id === nur) && Array.isArray(u.kann) && u.kann.length).map(u => ({
      id: u.id, titel: `English Journey · Unit ${u.nr}: ${u.titel}`,
      saetze: u.kann.map(k => {
        const bst = B[k.baustein] || {}, a = (u.abschnitte || []).find(x => x.id === k.abschnitt);
        const themen = a ? a.schritte.filter(s => s.art === 'app' && !/\.probe-check\./.test(s.thema || ''))
          .map(s => s.thema || ((u.stationen || []).find(y => y.id === s.station) || {}).thema).filter(Boolean) : [];
        const smiley = (L['jw:' + k.baustein] || {}).s || 0;
        return { text: bst.text || '', teil: bst.teil || '', stand: stand(themen), schaetz: smiley || schaetzung(themen), imUnterricht: !!k.imUnterricht || !themen.length };
      }).filter(s => s.text),
    }));
  }
  async function wege(nur) {
    const liste = (await hole('daten/wege/liste.json').catch(() => ({}))).wege || [], out = [];
    for (const e of liste) {
      if ((nur && e.id !== nur) || (!bisFuer(e.id) && !admin()) || (e.test && !admin())) continue;
      try {
        const W = await hole('daten/wege/' + e.id + '.json');
        if (Array.isArray(W.kann) && W.kann.length) out.push({ id: W.id, titel: (W.ico ? W.ico + ' ' : '') + W.titel,
          saetze: W.kann.map(k => ({ text: k.text || '', teil: '', stand: stand(k.themen), schaetz: schaetzung(k.themen), imUnterricht: !(k.themen || []).length })) });
      } catch (err) { console.warn('[Kann-Liste]', e.id, err); }
    }
    return out;
  }
  async function gruppen(o = {}) {
    const j = o.weg ? [] : await journey(o.u).catch(e => { console.warn('[Kann-Liste]', e); return []; });
    const w = o.u ? [] : await wege(o.weg);
    return j.concat(w);
  }

  window.LernKann = { gruppen, stand, schaetzung };
})();
