// ═══════════════════════════════════════════════════════
//  Lernwelt – Lernweg im English Journey  (Aktionsplan „Lernweg im English Journey“, Etappe 2)
//
//    await LW.laden('gemeinsam/journey-lernweg.js');
//    LernJourneyWeg.zeige(host, { J, unit, bausteine, cfg, admin, z, link, starte, abschnitt });
//    LernJourneyWeg.aktualisieren();             // nach Pass-Änderungen / Rückkehr aus einer App
//
//  Der Laufzettel einer Unit: Abschnitte wie im Buch, je Abschnitt die Kette 📖 Buch → 📒 Hefteintrag → ✏️ Übung → 🎮 App.
//  Daten: units[].abschnitte in daten/journey6.json, Inhalte aus daten/journey/bausteine-en6.json (README → Lernweg im
//  English Journey). Die Kinder arbeiten im Heft und im Übungsheft und kontrollieren selbst: „Ins Übungsheft geschrieben“
//  → Lösung aufklappen → mit Grün verbessern → fertig. Keine automatische Kontrolle, kein saveResult, kein XP.
//  Gespeichert wird nur im Pass (LernPass.wegMerken → Lernstand jw:<ID>, reist mit der Sicherungskarte):
//    Hefteintrag → jw:<Baustein-ID> (derselbe Eintrag zählt in jedem Abschnitt) · andere Schritte → jw:<Schritt-ID>
//    Niveau eines Abschnitts → jw:<Abschnitt-ID> { nv } · Kann-Satz → jw:<Baustein-ID> { s (jetzt), v (vorher) }
//  App-Schritte haken sich selbst ab: Station = im Pass gemeistert, Thema = so viele gute Runden im Lernstand.
//  Sichtbar ist ein Abschnitt, wenn config.journey.wege.journey6.bis ihn (oder einen späteren) für das Gerät freigibt –
//  Vorrang wie bei den Freigaben: Gruppe vor Klasse vor „alle“. Ohne Eintrag nichts, mit Admin-Anmeldung immer alles.
//  Nicht freigegebene Hefteinträge bleiben unsichtbar.
//
//    LernJourneyWeg.uebernehmen(J)      → Zahl – einmalig die Haken aus dem alten Lernweg (lernwelt-lernweg) in den Pass
//    LernJourneyWeg.stand({ J, z, cfg }) → { unit, fertig, soll, naechste } für das Banner auf der Startseite
//    LernJourneyWeg.bezug({ J, cfg, station | abschnitt }) → { unit, abschnitt, he: [{ id, nr, erledigt }], heHier, buch, buchUebung } oder null
//        heHier = false: die Station ist nicht die erste des Abschnitts – der Hefteintrag wird dort nur noch einmal gelesen
//        – wozu gehört eine Station/App? Nur freigegebene Abschnitte (Etappe 4: Verzahnung, Hilfe-Knopf und Rückverweis in den Apps)
//    LernJourneyWeg.heZeigen(baustein, nr) → Hefteintrag groß über der Seite (auch auf App-Seiten)
//    LernJourneyWeg.plaetze({ J, cfg, z, admin }) → { Stations-ID: { abschnitte: [IDs], tafel, werkbank } } – Tafel (Hefteintrag) und
//        Werkbank (Übungen) im 3D-Ort: 'offen' | 'fertig' | fehlt. Abschnitte ohne eigene App-Station stehen an `platz` bzw. an der
//        Station des Abschnitts davor (sonst danach) – „Auch an diesem Platz“.
//
//  Abschnitt-Kette (v109): Pflicht-Abschnitte öffnen sich nacheinander innerhalb einer Unit – config.journey…reihenfolge je Gruppe/Klasse
//  'schritt' (Standard: alles außer Apps abgehakt) | 'streng' (auch Apps) | 'frei'. Gesperrte stehen mit 🔒 im Laufzettel.
//    LernJourneyWeg.sperre({ J, cfg, z, admin, station }) → { abschnitt, durch } oder null (Karte und Start im Weg)
//
//  Etappe 5 (alles in die Stationen): zeige(host, { …, panel: true, schliessen }) zeigt einen Abschnitt als Seitenleiste am 3D-Ort
//  (✕ statt „‹ Laufzettel“); als Liste ersetzt der Laufzettel die Stationsliste (o.fuss() → HTML unter dem Laufzettel, z. B. die Brücke).
//
//  Verzahnung (Etappe 4): eine Kennung überall – „📒 HE 4 · Titel“ am Hefteintrag, „Nutze 📒 HE 4“ an jeder Übung des Abschnitts,
//  „📒 HE 4 zuerst“ an den App-Schritten, bis der Hefteintrag erledigt ist (empfehlen, nicht sperren), Buchleiste über dem
//  Laufzettel, Kann-Sätze mit Brücken zu Hefteintrag, Buchseite und App.
// ═══════════════════════════════════════════════════════
'use strict';

(function () {
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NIVEAU = { 1: ['★', 'Basis'], 2: ['★★', 'Standard'], 3: ['★★★', 'Profi'] };
  const SMILEY = ['😟', '😐', '😀'];
  const SYM = { hefteintrag: '📒', uebung: '✏️', app: '🎮', lesen: '📖', vokabeln: '📘', partner: '👥', hoeren: '🎧', extra: '⭐' };
  let O = null, host = null, offen = null, ansicht = 'zettel', geschrieben = new Set();

  // ── Speicher (Pass) ──────────────────────────────────
  const P = () => window.LernPass;
  const lies = id => { const L = P() && P().lernstand; return (L && L['jw:' + id]) || null; };
  const merke = (id, wert) => { if (P() && P().wegMerken) P().wegMerken(id, wert); };
  // Merker „schon gemeldet“ bleiben beim Ab- und Anhaken erhalten (jedes iPad zählt nur einmal)
  const merker = id => { const w = lies(id) || {}, o = {}; ['m', 'f', 'r', 'nv'].forEach(k => { if (w[k]) o[k] = w[k]; }); return o; };
  // ── Klassen-Übersicht: anonym über die Gruppenauswertung (LernSync.lernwegMelden), nur iPads in einer Gruppe ──
  function meldeStand() {
    const S = window.LernSync;
    if (!S || !S.lernwegMelden || !O || !O.J || O.admin) return;
    (O.J.units || []).forEach(u => (u.abschnitte || []).forEach(a => {
      if (!sichtbar(a)) return;
      const vorher = O.unit; O.unit = u;
      a.schritte.forEach(s => {
        if (s.art === 'app' || s.art === 'extra') return;
        const k = schluessel(s), w = lies(k);
        if (w && w.e && !w.m && S.lernwegMelden('jw:' + k)) merke(k, Object.assign({}, w, { m: 1 }));
      });
      const w = lies(a.id) || {};
      if (!w.f && fortschritt(a).fertig && S.lernwegMelden('jw:' + a.id + ':f' + (a.niveaus ? niveau(a) : 0))) merke(a.id, Object.assign({}, w, { f: 1 }));
      O.unit = vorher;
    }));
  }
  const schluessel = s => s.art === 'hefteintrag' ? s.baustein : s.id;

  // ── Freigabe „bis Abschnitt“ und HE-Nummern (config.journey.wege.journey6) ──
  const alleAbschnitte = () => O.J.units.flatMap(u => u.abschnitte || []);
  function sichtbarBis() {
    if (O.admin) return Infinity;
    const bis = O.cfg && O.cfg.bis && typeof O.cfg.bis === 'object' ? O.cfg.bis : {};
    const wer = (window.LernFreigabe && LernFreigabe.wer && LernFreigabe.wer()) || ['alle'];
    const w = wer.find(x => typeof bis[x] === 'string');
    return w ? alleAbschnitte().map(a => a.id).indexOf(bis[w]) : -1;
  }
  const sichtbar = a => alleAbschnitte().indexOf(a) <= sichtbarBis();
  const heNr = bid => (O && O.cfg && O.cfg.he && O.cfg.he[bid]) || null;
  const heName = bid => { const n = heNr(bid); return n ? `HE ${n}` : 'Hefteintrag'; };

  // ── Niveau und Schritte eines Abschnitts ─────────────
  // Mindestniveau der Lehrkraft (config.journey…niveau, Gruppe vor Klasse vor „alle“): das Kind wählt frei, aber nicht darunter
  function mindest() {
    const m = O.cfg && O.cfg.niveau && typeof O.cfg.niveau === 'object' ? O.cfg.niveau : {};
    const wer = (window.LernFreigabe && LernFreigabe.wer && LernFreigabe.wer()) || ['alle'];
    const w = wer.find(x => [1, 2, 3].includes(m[x]));
    return w ? m[w] : 1;
  }
  const niveau = a => a.niveaus ? Math.max(mindest(), (lies(a.id) || {}).nv || 2) : 0;
  // Reihenfolge (config.journey…reihenfolge je Gruppe/Klasse, Vorrang wie oben): 'frei' | 'schritt' (Standard) | 'streng'
  function reihenfolge() {
    const r = O.cfg && O.cfg.reihenfolge && typeof O.cfg.reihenfolge === 'object' ? O.cfg.reihenfolge : {};
    const wer = (window.LernFreigabe && LernFreigabe.wer && LernFreigabe.wer()) || ['alle'];
    const w = wer.find(x => ['frei', 'schritt', 'streng'].includes(r[x]));
    return w ? r[w] : 'schritt';
  }
  const passt = (s, nv) => !nv || !Array.isArray(s.niveau) || s.niveau.includes(nv);
  const schritte = a => a.schritte.filter(s => passt(s, niveau(a)));
  function themaGeschafft(s) {
    const e = P() && P().lernstand && P().lernstand[s.thema], z = s.ziel || {};
    return !!e && Array.isArray(e.p) && e.p.filter(p => p >= (z.prozent || 70)).length >= Math.min(3, z.runden || 1);
  }
  function erledigt(s) {
    if (s.art === 'app') return s.station ? !!(O.z[s.station] && O.z[s.station].zustand === 'gemeistert') : themaGeschafft(s);
    return !!(lies(schluessel(s)) || {}).e;
  }
  // ── Abschnitt-Kette: ein Pflicht-Abschnitt öffnet sich, wenn die Pflicht-Abschnitte davor (in derselben Unit) fertig sind –
  //  „Schritt für Schritt“: alles außer Apps abgehakt (Apps laufen nebenher), „streng“: auch die Apps, „frei“: keine Kette.
  //  Wahl/Extra hält nicht auf und ist nie gesperrt. Mit Admin-Anmeldung offen. → der Abschnitt, der aufhält, oder null
  function kettenFertig(x) {
    const streng = reihenfolge() === 'streng';
    return schritte(x).filter(s => s.art !== 'extra' && (streng || s.art !== 'app')).every(erledigt);
  }
  function gesperrtDurch(a) {
    if (!O || O.admin || a.wahl || reihenfolge() === 'frei') return null;
    const u = (O.J.units || []).find(x => (x.abschnitte || []).includes(a)); if (!u) return null;
    const vorher = O.unit; O.unit = u;
    try {
      for (const x of u.abschnitte) { if (x === a) return null; if (!x.wahl && sichtbar(x) && !kettenFertig(x)) return x; }
      return null;
    } finally { O.unit = vorher; }
  }
  function fortschritt(a) {
    const l = schritte(a).filter(s => s.art !== 'extra');
    const n = l.filter(erledigt).length;
    return { n, von: l.length, fertig: l.length > 0 && n === l.length };
  }

  // Wahlabschnitte: so viele zählen (wahlAnzahl, Standard 1; 0 = alle Wahlabschnitte sind freiwilliges Extra)
  const wahlSoll = u => (Number.isInteger(u.wahlAnzahl) && u.wahlAnzahl >= 0 ? u.wahlAnzahl : 1);

  // ── Hefteinträge eines Abschnitts (Reihenfolge wie im Abschnitt) ──
  const heIn = a => [...new Set(a.schritte.filter(s => s.art === 'hefteintrag').map(s => s.baustein))];
  const heErledigt = bid => !!(lies(bid) || {}).e;
  // Hefteintrag gehört zur ersten App-Station des Abschnitts; weitere Stationen verweisen nur zum Lesen darauf (nicht doppelt „zuerst“)
  const heStation = a => (a.schritte.find(s => s.art === 'app' && s.station) || {}).station || null;
  const heChip = (bid, text) => `<button type="button" class="jw-chip" data-jw-gross="${esc(bid)}">📒 ${esc(text || '')}${esc(heName(bid))}</button>`;

  // ── Platz eines Abschnitts im Ort: platz, eigene App-Station, sonst die Station des Abschnitts davor (bzw. danach) ──
  function platzVon(u, a) {
    const eigen = x => x.platz || (x.schritte.find(s => s.station) || {}).station || null;
    if (eigen(a)) return eigen(a);
    const l = u.abschnitte || [], i = l.indexOf(a);
    for (let k = i - 1; k >= 0; k--) if (eigen(l[k])) return eigen(l[k]);
    for (let k = i + 1; k < l.length; k++) if (eigen(l[k])) return eigen(l[k]);
    return null;
  }

  // ── Texte aus den Daten ──────────────────────────────
  const seiten = b => b ? (b.bis && b.bis !== b.seite ? `S. ${b.seite}–${b.bis}` : `S. ${b.seite}`) : '';
  const buchText = b => `📖 Buch ${seiten(b)}${b.uebung ? ' Ü ' + esc(b.uebung) : ''}`;
  const seitenA = a => a.buch ? (a.buch.von === a.buch.bis ? `S. ${a.buch.von}` : `S. ${a.buch.von}–${a.buch.bis}`) : '';
  function material(a) {
    const l = schritte(a), m = [];
    if (a.buch || l.some(s => s.buch)) m.push(`📖 Buch ${seitenA(a) || seiten(l.find(s => s.buch).buch)}`);
    if (l.some(s => s.art === 'hefteintrag')) m.push('📒 Heft');
    if (l.some(s => s.art === 'uebung')) m.push('✏️ Übungsheft');
    if (l.some(s => s.art === 'vokabeln')) m.push('📘 Vokabelheft');
    if (l.some(s => s.art === 'partner')) m.push('👥 Partner');
    return m.length ? `<div class="jw-material" aria-label="Das brauchst du">${m.map(x => `<span>${x}</span>`).join('')}</div>` : '';
  }

  // ── Hefteintrag (Heft-Schema wie im echten Heft) und eigene Aufgaben (wie im alten Lernweg) ──
  function papier(b, gross, nr) {
    const zeile = z => `<p>${z.map(([t, s]) => s ? `<span class="${s === 'g' ? 'g' : 'b'}">${esc(t)}</span>` : esc(t)).join('')}</p>`;
    const n = nr !== undefined ? nr : heNr(b.id);
    return `<div class="jw-papier${gross ? ' gross' : ''}"><div class="ue"><span class="kreis">${n || '📒'}</span><span class="ti">${esc(b.titel)}</span><span class="datum"></span></div>
      <p></p>${(b.zeilen || []).map(zeile).join('')}${b.merke ? `<p><span class="merke">Merke:</span> <span class="mu">${esc(b.merke)}</span></p>` : ''}</div>`;
  }
  const luecken = t => esc(t).replace(/_{2,}/g, '<span class="jw-luecke"></span>').replace(/\*([^*]+)\*/g, '<u>$1</u>');
  const kasten = l => l && l.length ? `<div class="jw-kasten">${l.map(w => `<span>${esc(w)}</span>`).join('')}</div>` : '';
  function aufgabe(a) {
    let h = '';
    if (a.heft) h += `<p class="jw-heft">${esc(a.heft)}</p>`;
    if (a.tipp && a.typ !== 'mediation') h += `<p class="jw-tipp">💡 ${esc(a.tipp)}</p>`;
    if (a.beispiel && a.typ !== 'frei') h += `<div class="jw-beispiel"><b>Beispiel:</b> ${esc(a.beispiel)}</div>`;
    const gleich = a.typ === 'wahl' && a.items.length > 1 && a.items[0].o.length > 2 && a.items.every(x => x.o.join('|') === a.items[0].o.join('|'));
    if (gleich) h += kasten(a.items[0].o);
    if (a.typ !== 'sortieren') h += kasten(a.kasten);
    const sp = a.spalten === 2 ? ' sp2' : a.spalten === 4 ? ' sp4' : '';
    if (a.lesetext) h += `<div class="jw-lesetext">${a.lesetext.split('\n').map(z => `<p>${esc(z)}</p>`).join('')}</div>`;
    if (a.typ === 'luecken' || a.typ === 'saetze') h += `<ol class="jw-liste${sp}">${a.items.map(x => `<li><span>${luecken(x)}</span></li>`).join('')}</ol>`;
    else if (a.typ === 'wahl') h += `<ol class="jw-liste">${a.items.map(x => `<li><span>${luecken(x.t)}${gleich ? '' : ` <span class="jw-opt">( ${x.o.map(esc).join(' / ')} )</span>`}</span></li>`).join('')}</ol>`;
    else if (a.typ === 'zuordnen') h += `<div class="jw-zwei"><ol class="jw-liste">${a.links.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ol>
        <ol class="jw-abc">${a.rechts.map((x, i) => `<li><b>${String.fromCharCode(97 + i)}</b><span>${esc(x)}</span></li>`).join('')}</ol></div>`;
    else if (a.typ === 'sortieren') h += kasten(a.kasten) + `<div class="jw-spalten">${(a.spalten || []).map(s => `<div>${esc(s)}</div>`).join('')}</div>`;
    else if (a.typ === 'frei') h += `<p>${esc(a.text)}</p>${a.beispiel ? `<div class="jw-beispiel"><b>Beispiel:</b> ${esc(a.beispiel)}</div>` : ''}${a.hilfe ? `<ul class="jw-hilfe">${a.hilfe.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
    else if (a.typ === 'mediation') h += `<div class="jw-plakat">${(a.plakat || []).map(([t, s]) => `<div class="${s === 'h' ? 'h' : s === 'b' ? 'b' : ''}">${esc(t)}</div>`).join('')}</div>
        <p>${esc(a.text)}</p>${a.tipp ? `<p class="jw-tipp">💡 ${esc(a.tipp)}</p>` : ''}<ol class="jw-liste">${(a.items || []).map(x => `<li><span>„${esc(x)}“</span></li>`).join('')}</ol>`;
    else if (a.typ === 'schreiben') h += `<p>${esc(a.text)}</p>${a.regel ? `<p><b>${esc(a.regel)}</b></p>` : ''}
        ${a.hilfe ? `<div class="jw-beispiel"><b>Hilfe – Satzanfänge:</b><ul class="jw-hilfe">${a.hilfe.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${a.anfang ? `<p class="jw-heft">Fang so an: ${esc(a.anfang)}</p>` : ''}
        ${a.checkliste ? `<p><b>Checkliste (du und dein Partner):</b></p><ul class="jw-hilfe">${a.checkliste.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
    return h;
  }
  function loesung(b) {
    const l = b.loesung;
    if (Array.isArray(l) && l.length) return `<ol class="jw-liste jw-loesung">${l.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ol>`;
    if (typeof l === 'string' && l.trim()) return `<div class="jw-loesung">${l.split('\n').map(z => `<p>${esc(z)}</p>`).join('')}</div>`;
    return '';
  }

  // ── Ein Schritt als Karte ────────────────────────────
  function haken(s, text) {
    const an = erledigt(s);
    return `<button type="button" class="jw-haken${an ? ' an' : ''}" data-jw-haken="${esc(s.id)}" aria-pressed="${an}"><i>${an ? '✓' : ''}</i>${esc(an ? 'Erledigt' : text)}</button>`;
  }
  function schrittHTML(s, a) {
    const an = erledigt(s), nv = Array.isArray(s.niveau) && s.niveau.length < 3 ? `<span class="jw-nv">${s.niveau.map(n => NIVEAU[n][0]).join(' / ')}</span>` : '';
    let kopf = '', innen = '', fuss = '';
    if (s.art === 'hefteintrag') {
      const b = O.bausteine[s.baustein] || {};
      kopf = `📒 ${heName(s.baustein)} · ${esc(b.titel || '')}`;
      if (!b.zeilen || !b.zeilen.length) innen = `<p>Dieser Hefteintrag steht schon in deinem Heft. Lies ihn dir noch einmal genau durch.</p>`;
      else innen = (s.wiederholen ? '<p>Lies deinen Hefteintrag noch einmal genau durch.</p>' : '<p>Schreibe den Hefteintrag genau so in dein Heft: mit Farbe, den Merksatz mit Rot.</p>')
        + papier(b) + `<button type="button" class="jw-neben" data-jw-gross="${esc(s.baustein)}">🖥️ Groß zeigen</button>`;
      fuss = haken(s, s.wiederholen || !b.zeilen || !b.zeilen.length ? 'Gelesen' : 'Steht in meinem Heft');
    } else if (s.art === 'uebung') {
      const b = s.baustein ? O.bausteine[s.baustein] || {} : null;
      kopf = b ? `✏️ ${esc(b.titel || 'Übung')}` : `✏️ ${buchText(s.buch)}`;
      innen = (s.text ? `<p>${esc(s.text)}</p>` : '') + (b ? aufgabe(b) : '')
        + (heIn(a).length ? `<div class="jw-chips">${heIn(a).map(h => heChip(h, 'Nutze ')).join('')}</div>` : '');
      if (an) fuss = haken(s, '');
      else if (b && geschrieben.has(s.id)) {
        const l = loesung(b);
        fuss = `<div class="jw-loesung-box"><b>✅ Lösung – vergleiche und verbessere mit Grün:</b>${l || '<p>Die Lösung kommt noch. Zeig dein Übungsheft deiner Lehrkraft.</p>'}</div>`
          + `<button type="button" class="jw-haken" data-jw-haken="${esc(s.id)}"><i></i>Verbessert – fertig</button>`;
      } else if (b) fuss = `<button type="button" class="jw-haken" data-jw-geschrieben="${esc(s.id)}"><i></i>Ins Übungsheft geschrieben</button>`;
      else fuss = haken(s, 'Ins Übungsheft geschrieben');
    } else if (s.art === 'app') {
      if (s.station) {
        const x = O.z[s.station] || {}, st = O.unit.stationen.find(y => y.id === s.station) || {};
        kopf = `🎮 ${esc(st.titel || s.station)}`;
        const offenHE = heIn(a).filter(h => !heErledigt(h)), heHier = heStation(a) === s.station;
        if (heHier && offenHE.length && !an) kopf += ` <span class="jw-schild">📒 ${esc(heName(offenHE[0]))} zuerst</span>`;
        const titelVon = id => { for (const u of O.J.units) for (const y of u.stationen) if (y.id === id) return y.titel; return id; };
        innen = x.grund === 'heft' ? `<p>🔒 Erst müssen alle Hefteinträge der Unit in deinem Heft stehen:</p><div class="jw-chips">${(x.heft || []).map(h => heChip(h)).join('')}</div>`
          : x.grund === 'vorgaenger' ? `<p>🔒 Die App öffnet sich, wenn du davor ⭐ geholt hast – Hefteintrag und Übungen kannst du schon machen:</p>
            <div class="jw-chips">${(x.fehlt || []).map(f => `<button type="button" class="jw-chip" data-jw-station="${esc(f)}">🎮 ${esc(titelVon(f))}</button>`).join('')}</div>`
          : x.grund === 'lehrer' ? '<p>🔒 Deine Lehrkraft gibt diese App bald frei. Hefteintrag und Übungen kannst du schon machen.</p>'
          : `<p>${x.zustand === 'gemeistert' ? '⭐ Gemeistert! Du kannst jederzeit wieder üben.' : x.zustand === 'zu' ? '🔒 Diese Station ist noch zu.' : x.zustand === 'bau' ? '🚧 Wird gebaut.' : 'Übe in der Lernwelt: 2 Runden mit mindestens 70 % – dann ist die Station gemeistert.'}</p>`;
        if (!heHier && heIn(a).length && !an) innen += `<div class="jw-chips">${heIn(a).map(h => heChip(h, 'Lies vorher noch einmal ')).join('')}</div>`;
        fuss = `<div class="jw-auto${an ? ' an' : ''}"><i>${an ? '✓' : ''}</i>${an ? 'Gemeistert' : 'Hakt sich selbst ab'}</div>`
          + (x.zustand === 'offen' || x.zustand === 'gemeistert' ? `<button type="button" class="jw-los" data-jw-station="${esc(s.station)}">${an ? '🔁 Nochmal' : '▶ Los geht\'s'}</button>` : '');
      } else {
        const t = window.LernKatalog && LernKatalog.thema(s.thema), z = s.ziel || {};
        kopf = `🎮 ${esc(t ? t.titel : s.thema)}`;
        innen = `<p>${esc(s.text || '')}</p><p class="jw-klein">Ziel: ${z.runden || 1} ${z.runden > 1 ? 'Runden' : 'Runde'} mit mindestens ${z.prozent || 70} %.</p>`;
        fuss = `<div class="jw-auto${an ? ' an' : ''}"><i>${an ? '✓' : ''}</i>${an ? 'Geschafft' : 'Hakt sich selbst ab'}</div>`
          + (t ? `<button type="button" class="jw-los" data-jw-thema="${esc(s.thema)}">${an ? '🔁 Nochmal' : '▶ Los geht\'s'}</button>` : '');
      }
    } else {
      kopf = `${SYM[s.art] || '•'} ${s.buch ? buchText(s.buch) : { lesen: 'Lesen', vokabeln: 'Vokabelheft', partner: 'Mit Partner', hoeren: 'Hören', extra: 'Extra' }[s.art] || ''}`;
      innen = `<p>${esc(s.text || '')}</p>`;
      if (s.art === 'extra' && s.thema && window.LernKatalog && LernKatalog.thema(s.thema)) innen += `<button type="button" class="jw-neben" data-jw-thema="${esc(s.thema)}">🎮 In der Lernwelt üben</button>`;
      fuss = haken(s, s.art === 'lesen' ? 'Gelesen' : s.art === 'extra' ? 'Gemacht (freiwillig)' : 'Gemacht');
    }
    return `<article class="jw-schritt jw-${s.art}${an ? ' fertig' : ''}" id="jw-${esc(s.id)}"><h4>${kopf}${nv}</h4>${innen}<div class="jw-fuss">${fuss}</div></article>`;
  }

  // ── Kann-Sätze (Fit für die Probe?) ──────────────────
  function kannHTML(u, feld) {
    const l = (u.kann || []).filter(k => !k.abschnitt || sichtbar((u.abschnitte || []).find(a => a.id === k.abschnitt) || {}));
    if (!l.length) return '';
    const titel = feld === 'v' ? '🎯 Meine Ziele: Wie gut kannst du das schon?' : '🎯 Fit für die Probe?';
    return `<section class="jw-kann"><h3>${titel}</h3>${feld === 's' ? '<p class="jw-klein">Kreuze ehrlich an. Bei 😟 oder 😐: schau dir den Abschnitt noch einmal an.</p>' : ''}
      ${l.map(k => {
        const b = O.bausteine[k.baustein] || {}, w = lies(k.baustein) || {}, a = (u.abschnitte || []).find(x => x.id === k.abschnitt);
        return `<div class="jw-kann-zeile"><div><small>${esc(b.teil || '')}</small>Ich kann ${esc(b.text || '')}
          ${feld === 's' && w.v ? `<span class="jw-klein"> · vorher ${SMILEY[w.v - 1]}</span>` : ''}
          ${k.imUnterricht ? '<span class="jw-klein"> · im Unterricht</span>' : ''}
          ${feld === 's' && a ? bruecken(a, w.s && w.s < 3) : ''}</div>
          <div class="jw-smileys">${SMILEY.map((x, i) => `<button type="button" data-jw-kann="${esc(k.baustein)}" data-feld="${feld}" data-wert="${i + 1}" class="${w[feld] === i + 1 ? 'an' : ''}"
            aria-label="${['noch schwer', 'geht so', 'kann ich gut'][i]}">${x}</button>`).join('')}</div></div>`;
      }).join('')}</section>`;
  }

  // Brücken eines Kann-Satzes: Hefteintrag, Buchseite, App und der Abschnitt selbst – bei 😟/😐 hervorgehoben
  function bruecken(a, nachschauen) {
    const app = a.schritte.find(s => s.art === 'app' && s.station && O.z[s.station] && ['offen', 'gemeistert'].includes(O.z[s.station].zustand));
    const st = app && O.unit.stationen.find(y => y.id === app.station);
    const l = heIn(a).map(h => heChip(h))
      .concat(seitenA(a) ? [`<span class="jw-chip still">📖 Buch ${esc(seitenA(a))}</span>`] : [])
      .concat(app ? [`<button type="button" class="jw-chip" data-jw-station="${esc(app.station)}">🎮 ${esc(st ? st.titel : app.station)}</button>`] : [])
      .concat([`<button type="button" class="jw-chip" data-jw-abschnitt="${esc(a.id)}">→ ${esc(a.titel)}</button>`]);
    return `<div class="jw-chips${nachschauen ? ' hervor' : ''}">${nachschauen ? '<b>👉 Schau hier nach:</b>' : ''}${l.join('')}</div>`;
  }

  // Buchleiste: die Seiten der Unit in Weg-Reihenfolge – frei bis wohin, wo das Kind gerade ist
  function buchleiste(u) {
    const ab = (u.abschnitte || []).filter(a => a.buch);
    if (!ab.length) return '';
    const von = Math.min(...ab.map(a => a.buch.von)), bis = Math.max(...ab.map(a => a.buch.bis));
    const jetzt = ab.find(a => sichtbar(a) && !a.wahl && !fortschritt(a).fertig);
    return `<div class="jw-buchleiste" aria-label="Buch Seite ${von} bis ${bis}"><span class="jw-klein">📖 S. ${von}</span><div>${ab.map(a => {
      const k = !sichtbar(a) ? 'zu' : a === jetzt ? 'jetzt' : fortschritt(a).fertig ? 'fertig' : 'frei';
      return `<i class="${k}" style="flex:${a.buch.bis - a.buch.von + 1}" title="${esc(seitenA(a))}: ${esc(a.titel)}${k === 'zu' ? ' (noch nicht frei)' : ''}"></i>`;
    }).join('')}</div><span class="jw-klein">S. ${bis}</span></div>
      ${jetzt ? `<p class="jw-klein">Du bist gerade bei 📖 ${esc(seitenA(jetzt))}: ${esc(jetzt.titel)}</p>` : ''}`;
  }

  // ── Ansichten ────────────────────────────────────────
  function zeileHTML(a) {
    const f = fortschritt(a), l = schritte(a).filter(s => s.art !== 'extra'), zu = gesperrtDurch(a);
    return `<button type="button" class="jw-zeile${f.fertig ? ' fertig' : zu ? ' zu' : f.n ? ' arbeit' : ''}" data-jw-abschnitt="${esc(a.id)}">
      <span class="jw-ico">${f.fertig ? '✅' : zu ? '🔒' : esc(a.ico || '📍')}</span>
      <span class="jw-txt"><b>${esc(a.titel)}</b><small>${zu ? `Erst „${esc(zu.titel)}“ fertig machen` : esc([seitenA(a) && '📖 ' + seitenA(a), a.kurz].filter(Boolean).join(' · '))}</small>
        <span class="jw-punkte" aria-hidden="true">${l.map(s => `<i class="${erledigt(s) ? 'an' : ''}" title="${esc(s.art)}">${SYM[s.art]}</i>`).join('')}</span></span>
      <span class="jw-zahl">${f.n}/${f.von}</span></button>`;
  }
  function zettel() {
    const u = O.unit, ab = (u.abschnitte || []).filter(sichtbar);
    const pflicht = ab.filter(a => !a.wahl && !a.schluss), wahl = ab.filter(a => a.wahl), schluss = ab.filter(a => a.schluss);
    const alle = pflicht.concat(schluss).map(fortschritt), fertig = alle.filter(f => f.fertig).length;
    const zieleVorher = u.zieleVorher && !(u.kann || []).some(k => (lies(k.baustein) || {}).v);
    const fin = u.stationen.find(st => st.art === 'finale'), fz = fin && O.z[fin.id];
    return `<div class="jw-kopf"><h2>Unit ${u.nr}: ${esc(u.titel)}</h2><p class="jw-klein">📍 ${esc(u.ort || '')} · 📒 Laufzettel</p>
        <p class="jw-klein">${fertig} von ${alle.length} Abschnitten fertig${wahl.length && wahlSoll(u) ? ` · dazu ${wahlSoll(u)} von ${wahl.length} Wahlstationen` : ''}. Arbeite der Reihe nach – alles kommt in dein Heft oder Übungsheft.</p>
        ${O.admin ? '<p class="jw-vorschau">👀 Vorschau (Admin): alle Abschnitte sichtbar</p>' : ''}
        ${buchleiste(u)}
        <div class="jw-knoepfe"><button type="button" class="jw-neben" data-jw-spiegel>📒 Mein Heft</button></div></div>
      ${fz && fz.grund === 'heft' ? `<div class="jw-hinweis">🏁 Das Finale öffnet sich, wenn alle Hefteinträge in deinem Heft stehen. Noch abhaken:
        <div class="jw-chips">${(fz.heft || []).map(h => heChip(h)).join('')}</div></div>` : ''}
      ${zieleVorher ? kannHTML(u, 'v') : ''}
      ${pflicht.map(zeileHTML).join('') || '<p class="jw-klein">Deine Lehrkraft gibt die ersten Abschnitte bald frei.</p>'}
      ${wahl.length ? `<h3 class="jw-gruppe">${wahlSoll(u) ? `⭐ Wahlstationen – such dir ${wahlSoll(u)} aus` : '⭐ Extra – freiwillig'}</h3>${wahl.map(zeileHTML).join('')}` : ''}
      ${schluss.length ? `<h3 class="jw-gruppe">🎯 Zum Schluss</h3>${schluss.map(zeileHTML).join('')}` : ''}
      ${O.fuss ? O.fuss() : ''}`;
  }
  function gesperrtHTML(a, zu) {
    return `${O.panel ? '<button type="button" class="jw-zurueck" data-jw-zu>✕ Schließen</button>' : '<button type="button" class="jw-zurueck" data-jw-zettel>‹ Laufzettel</button>'}
      <div class="jw-kopf"><h2>🔒 ${esc(a.titel)}</h2><p class="jw-klein">${esc(seitenA(a) ? '📖 ' + seitenA(a) : '')}</p></div>
      <div class="jw-hinweis">Dieser Abschnitt öffnet sich, wenn du „${esc(zu.titel)}“ fertig hast: ${reihenfolge() === 'streng' ? 'Hefteintrag, Übungen und die App' : 'Hefteintrag und Übungen'} abhaken.
        <div class="jw-chips"><button type="button" class="jw-chip" data-jw-abschnitt="${esc(zu.id)}">→ ${esc(zu.ico || '')} ${esc(zu.titel)}</button></div></div>`;
  }
  function abschnittHTML(a) {
    const zu = gesperrtDurch(a);
    if (zu) return gesperrtHTML(a, zu);
    const u = O.unit, f = fortschritt(a), nv = niveau(a);
    const platz = platzVon(u, a), auch = O.panel && platz ? (u.abschnitte || []).filter(x => x !== a && sichtbar(x) && platzVon(u, x) === platz) : [];
    return `${O.panel ? '<button type="button" class="jw-zurueck" data-jw-zu>✕ Schließen</button>' : '<button type="button" class="jw-zurueck" data-jw-zettel>‹ Laufzettel</button>'}
      <div class="jw-kopf"><h2>${esc(a.ico || '')} ${esc(a.titel)}</h2>
        <p class="jw-klein">${esc(a.kurz || a.kompetenz || '')} · ${f.n} von ${f.von} erledigt</p>${material(a)}</div>
      ${a.niveaus ? `<div class="jw-niveaus"><b>Mein Niveau:</b>${mindest() > 1 ? `<span class="jw-klein"> Deine Lehrkraft: mindestens ${NIVEAU[mindest()][0]}</span>` : ''}
        <div>${[1, 2, 3].map(n => `<button type="button" class="${nv === n ? 'an' : ''}" data-jw-niveau="${n}"${n < mindest() ? ' disabled' : ''}>
        ${NIVEAU[n][0]}<small>${NIVEAU[n][1]}</small></button>`).join('')}</div></div>` : ''}
      ${a.merk ? `<div class="jw-merk">${a.merk.map(m => `<div>${esc(m)}</div>`).join('')}</div>` : ''}
      ${schritte(a).map(s => schrittHTML(s, a)).join('')}
      ${a.schluss ? kannHTML(u, 's') : ''}
      ${f.fertig ? '<p class="jw-geschafft">✅ Abschnitt geschafft – weiter so!</p>' : ''}
      ${auch.length ? `<div class="jw-auch"><b>📍 Auch an diesem Platz:</b>${auch.map(x => `<button type="button" class="jw-chip" data-jw-abschnitt="${esc(x.id)}">${esc(x.ico || '')} ${esc(x.titel)}${fortschritt(x).fertig ? ' ✅' : ''}</button>`).join('')}</div>` : ''}`;
  }
  function spiegel() {
    // Alle freigegebenen Hefteinträge des Schuljahres in Weg-Reihenfolge (jeder einmal) – so sieht dein Heft jetzt aus
    const gesehen = new Set(), l = [];
    O.J.units.forEach(u => (u.abschnitte || []).filter(sichtbar).forEach(a => a.schritte.forEach(s => {
      if (s.art !== 'hefteintrag' || gesehen.has(s.baustein)) return;
      gesehen.add(s.baustein); l.push({ b: O.bausteine[s.baustein] || { id: s.baustein }, u, a });
    })));
    return `<button type="button" class="jw-zurueck" data-jw-zettel>‹ Laufzettel</button>
      <div class="jw-kopf"><h2>📒 So sieht dein Heft jetzt aus</h2><p class="jw-klein">Alle Hefteinträge bis jetzt, der Reihe nach. Fehlt dir einer? Tippe ihn an und schreib ihn ab.</p></div>
      ${l.map(x => { const an = !!(lies(x.b.id) || {}).e;
        return `<button type="button" class="jw-zeile${an ? ' fertig' : ''}" data-jw-abschnitt="${esc(x.a.id)}" data-jw-ziel="${esc(x.b.id)}">
          <span class="jw-ico">${an ? '✅' : '📒'}</span><span class="jw-txt"><b>${esc(heName(x.b.id))} · ${esc(x.b.titel || '')}</b>
          <small>Unit ${x.u.nr} · ${esc(x.a.titel)}</small></span><span class="jw-zahl">${an ? 'im Heft' : ''}</span></button>`; }).join('') || '<p class="jw-klein">Noch keine Hefteinträge.</p>'}`;
  }
  function zeichne() {
    if (!host || !O) return;
    const a = offen && (O.unit.abschnitte || []).find(x => x.id === offen && sichtbar(x));
    host.innerHTML = `<div class="jw">${ansicht === 'spiegel' ? spiegel() : a ? abschnittHTML(a) : zettel()}</div>`;
    try { meldeStand(); } catch (e) { console.warn('[Laufzettel] Meldung', e); }
  }
  function grossZeigen(bid) { const b = O.bausteine[bid]; if (b) heZeigen(b, heNr(bid)); }
  function heZeigen(b, nr, unten) {
    stile();
    const d = document.createElement('div');
    d.className = 'jw-gross'; d.setAttribute('role', 'dialog');
    d.innerHTML = `<button type="button" class="jw-x" aria-label="Schließen">✕</button>${papier(b, true, nr || null)}${unten || ''}`;
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('.jw-x')) d.remove(); });
    document.body.appendChild(d);
  }

  // ── Bedienung ────────────────────────────────────────
  function klick(e) {
    const b = e.target.closest('button'); if (!b || !host.contains(b)) return;
    const d = b.dataset, findeSchritt = id => (O.unit.abschnitte || []).flatMap(a => a.schritte).find(s => s.id === id);
    if (d.jwAbschnitt) {
      const x = O.J.units.find(u => (u.abschnitte || []).some(a => a.id === d.jwAbschnitt));
      if (x && x !== O.unit && O.wechsleUnit) return O.wechsleUnit(x, d.jwAbschnitt);
      offen = d.jwAbschnitt; ansicht = 'abschnitt'; zeichne(); host.scrollTop = 0;
      if (d.jwZiel) { const s = (O.unit.abschnitte.find(a => a.id === offen) || { schritte: [] }).schritte.find(y => y.baustein === d.jwZiel), el = s && document.getElementById('jw-' + s.id); if (el) el.scrollIntoView({ block: 'start' }); }
      return;
    }
    if (d.jwZu !== undefined || (O.panel && d.jwZettel !== undefined)) { if (O.schliessen) O.schliessen(); return; }
    if (d.jwZettel !== undefined) { offen = null; ansicht = 'zettel'; zeichne(); host.scrollTop = 0; return; }
    if (d.jwSpiegel !== undefined) { ansicht = 'spiegel'; zeichne(); host.scrollTop = 0; return; }
    if (d.jwNiveau) { merke(offen, Object.assign(merker(offen), { nv: Number(d.jwNiveau) })); return zeichne(); }
    if (d.jwGeschrieben) { geschrieben.add(d.jwGeschrieben); return zeichne(); }
    if (d.jwHaken) {
      const s = findeSchritt(d.jwHaken); if (!s) return;
      const k = schluessel(s);
      merke(k, erledigt(s) ? merker(k) : Object.assign(merker(k), { e: 1 }));
      geschrieben.delete(s.id);
      return zeichne();
    }
    if (d.jwKann) { const w = Object.assign({}, lies(d.jwKann) || {}); w[d.feld] = Number(d.wert); delete w.d; merke(d.jwKann, w); return zeichne(); }
    if (d.jwGross) return grossZeigen(d.jwGross);
    if (d.jwStation && O.starte) return O.starte({ station: d.jwStation }, offen);
    if (d.jwThema && O.starte) return O.starte({ thema: d.jwThema }, offen);
  }

  // ── Stile (einmal) ───────────────────────────────────
  function stile() {
    if (document.getElementById('jw-stil')) return;
    const st = document.createElement('style'); st.id = 'jw-stil';
    st.textContent = `
.jw { max-width: 820px; margin: 0 auto; user-select: text; -webkit-user-select: text; }
.jw h2 { font-family: 'Fredoka One', 'Nunito', sans-serif; font-weight: 400; color: var(--accent); font-size: 1.5rem; line-height: 1.2; }
.jw-kopf { margin-bottom: 1rem; } .jw-klein { color: var(--text2); font-weight: 700; font-size: .9rem; margin: .25rem 0; }
.jw-vorschau { background: rgba(230,168,23,.15); border: 1px solid rgba(230,168,23,.5); border-radius: 12px; padding: .4rem .7rem; font-size: .85rem; font-weight: 800; color: var(--accent); margin-top: .5rem; }
.jw-knoepfe { display: flex; gap: .5rem; margin-top: .6rem; flex-wrap: wrap; }
.jw-gruppe { font-family: 'Fredoka One', 'Nunito', sans-serif; font-weight: 400; color: var(--accent2); font-size: 1.15rem; margin: 1.2rem 0 .5rem; }
.jw-zeile { width: 100%; display: flex; align-items: center; gap: .8rem; text-align: left; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: .75rem .9rem; margin-bottom: .55rem; }
.jw-zeile.zu { opacity: .6; }
.jw-zeile.arbeit { border-color: rgba(129,140,248,.6); } .jw-zeile.fertig { border-color: rgba(74,222,128,.55); background: linear-gradient(135deg, rgba(74,222,128,.1), var(--surface)); }
.jw-ico { font-size: 1.8rem; width: 2.4rem; text-align: center; flex-shrink: 0; }
.jw-txt { flex: 1; min-width: 0; } .jw-txt b { display: block; font-size: 1.05rem; } .jw-txt small { color: var(--text2); font-weight: 700; }
.jw-punkte { display: flex; flex-wrap: wrap; gap: 3px; margin-top: .3rem; } .jw-punkte i { font-style: normal; font-size: .8rem; width: 1.5rem; height: 1.5rem; display: grid; place-items: center; border-radius: 7px; background: rgba(255,255,255,.06); opacity: .5; }
.jw-punkte i.an { background: rgba(74,222,128,.28); opacity: 1; }
.jw-zahl { font-weight: 900; color: var(--text2); white-space: nowrap; }
.jw-zurueck, .jw-neben { background: var(--surface2); border-radius: 12px; padding: .55rem .95rem; font-weight: 900; margin-bottom: .8rem; }
.jw-neben { margin: .2rem 0 .4rem; }
.jw-material { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .6rem; } .jw-material span { background: rgba(230,168,23,.14); border: 1px solid rgba(230,168,23,.4); border-radius: 999px; padding: .25rem .7rem; font-weight: 800; font-size: .9rem; }
.jw-niveaus { background: var(--surface); border-radius: 16px; padding: .8rem; margin-bottom: .9rem; } .jw-niveaus > div { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; margin-top: .4rem; }
.jw-niveaus button { background: var(--surface2); border: 2px solid transparent; border-radius: 14px; padding: .55rem; font-weight: 900; } .jw-niveaus button small { display: block; color: var(--muted); font-size: .78rem; }
.jw-niveaus button:disabled { opacity: .35; } .jw-niveaus button.an { border-color: var(--accent); background: rgba(230,168,23,.16); }
.jw-merk { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .5rem; margin-bottom: .9rem; } .jw-merk div { background: rgba(230,168,23,.14); border: 1px solid rgba(230,168,23,.4); border-radius: 12px; padding: .6rem; font-weight: 900; text-align: center; }
.jw-schritt { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 1rem 1.1rem; margin-bottom: .8rem; }
.jw-schritt.fertig { border-color: rgba(74,222,128,.5); } .jw-schritt h4 { font-size: 1.08rem; font-weight: 900; margin-bottom: .35rem; } .jw-schritt > p { color: var(--text2); font-weight: 700; margin: .3rem 0; line-height: 1.4; }
.jw-nv { margin-left: .5rem; font-size: .8rem; color: var(--accent); font-weight: 900; }
.jw-fuss { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-top: .7rem; } .jw-fuss > .jw-loesung-box { flex-basis: 100%; }
.jw-haken, .jw-auto { display: inline-flex; align-items: center; gap: .55rem; background: var(--surface2); border-radius: 12px; padding: .55rem .9rem; font-weight: 900; }
.jw-haken i, .jw-auto i { width: 1.6rem; height: 1.6rem; border-radius: 8px; border: 2px solid var(--muted); display: grid; place-items: center; font-style: normal; }
.jw-auto i { border-style: dashed; } .jw-haken.an, .jw-auto.an { color: var(--gruen); } .jw-haken.an i, .jw-auto.an i { background: var(--gruen); border-color: var(--gruen); color: #052e12; }
.jw-auto { background: transparent; color: var(--text2); }
.jw-los { background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff; border-radius: 999px; padding: .6rem 1.2rem; font-weight: 900; }
.jw-link { color: var(--indigo2); font-weight: 900; margin-left: .3rem; }
.jw-loesung-box { background: rgba(74,222,128,.1); border: 1px solid rgba(74,222,128,.4); border-radius: 12px; padding: .7rem .9rem; } .jw-loesung-box > b { display: block; margin-bottom: .4rem; color: var(--gruen); }
.jw-loesung, .jw-loesung li { color: #bbf7d0; font-weight: 800; }
.jw-heft { color: var(--accent); font-weight: 800; font-size: .92rem; margin: .1rem 0 .6rem; } .jw-heft::before { content: '✏️ '; }
.jw-tipp { color: var(--text2); font-size: .92rem; margin-bottom: .5rem; }
.jw-beispiel { background: rgba(99,102,241,.14); border-radius: 12px; padding: .5rem .8rem; margin: .4rem 0 .7rem; }
.jw-kasten { display: flex; flex-wrap: wrap; gap: .4rem; justify-content: center; border: 2px dashed rgba(129,140,248,.5); border-radius: 14px; padding: .6rem; margin: .4rem 0 .8rem; }
.jw-kasten span { background: var(--surface2); border-radius: 10px; padding: .25rem .65rem; font-weight: 800; }
ol.jw-liste { list-style: none; counter-reset: n; display: grid; gap: .5rem; } ol.jw-liste > li { counter-increment: n; display: flex; gap: .6rem; line-height: 1.45; font-size: 1.08rem; }
ol.jw-liste > li::before { content: counter(n); flex-shrink: 0; width: 1.8rem; height: 1.8rem; border-radius: 50%; background: rgba(255,255,255,.08); display: grid; place-items: center; font-weight: 900; font-size: .9rem; color: var(--text2); }
ol.jw-liste.sp2 { grid-template-columns: repeat(2, 1fr); } ol.jw-liste.sp4 { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 640px) { ol.jw-liste.sp2 { grid-template-columns: 1fr; } ol.jw-liste.sp4 { grid-template-columns: repeat(2, 1fr); } .jw-zwei { grid-template-columns: 1fr !important; } }
.jw-luecke { display: inline-block; min-width: 4.5rem; border-bottom: 2px solid var(--accent); margin: 0 .15rem; } .jw-opt { color: var(--indigo2); font-weight: 900; white-space: nowrap; }
.jw u { text-decoration-thickness: 2px; text-underline-offset: 3px; font-weight: 900; }
.jw-zwei { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } ol.jw-abc { list-style: none; display: grid; gap: .5rem; } ol.jw-abc li { display: flex; gap: .6rem; font-size: 1.08rem; } ol.jw-abc b { color: var(--indigo2); width: 1.4rem; }
.jw-spalten { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; } .jw-spalten div { border: 2px solid var(--line); border-radius: 12px; padding: .6rem; text-align: center; font-weight: 900; min-height: 4rem; }
.jw-plakat { background: #e8f5e3; color: #17331a; border-radius: 14px; padding: 1rem; text-align: center; margin-bottom: .8rem; line-height: 1.5; } .jw-plakat .h { font-family: 'Fredoka One', sans-serif; font-size: 1.3rem; } .jw-plakat .b { font-weight: 900; }
ul.jw-hilfe { list-style: none; display: grid; gap: .3rem; margin: .4rem 0 .7rem; } ul.jw-hilfe li::before { content: '→ '; color: var(--accent); font-weight: 900; }
.jw-lesetext { background: #fffef8; color: #111; border-radius: 12px; padding: .8rem 1rem; margin-bottom: .8rem; line-height: 1.55; }
.jw-papier { background: #fffef8; color: #111; border-radius: 10px; padding: 1rem 1.2rem 1.4rem; margin: .5rem 0 .6rem; font-family: 'Atkinson Hyperlegible', 'Nunito', sans-serif; overflow-x: auto; }
.jw-papier .ue { display: flex; align-items: center; gap: .7rem; border-bottom: 3px solid #111; padding-bottom: .35rem; height: 3.4rem; }
.jw-papier .kreis { width: 2.4rem; height: 2.4rem; border: 3px solid #00a651; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 1.2rem; flex-shrink: 0; }
.jw-papier .ti { color: #3d9b3d; font-weight: 700; font-size: 1.25rem; flex: 1; } .jw-papier .datum { border-bottom: 2px solid #111; width: 4.5rem; height: 1.2rem; }
.jw-papier p { border-bottom: 1px solid #b9c2cf; height: 2.3rem; line-height: 2.85rem; font-size: 1.08rem; white-space: pre; }
.jw-papier .g { color: #3d9b3d; font-weight: 700; } .jw-papier .b { font-weight: 700; } .jw-papier .merke { color: #ff5050; font-weight: 700; }
.jw-papier .mu { text-decoration: underline; text-decoration-color: #ff5050; text-decoration-thickness: 2px; text-underline-offset: 4px; }
.jw-papier.gross { font-size: 1.6em; max-width: 1200px; margin: 0 auto; } .jw-papier.gross p { height: 3.6rem; line-height: 4.4rem; font-size: 1.7rem; } .jw-papier.gross .ue { height: 5rem; } .jw-papier.gross .ti { font-size: 2rem; }
.jw-gross { position: fixed; inset: 0; z-index: 10000; background: rgba(15,14,26,.92); overflow: auto; padding: 3.5rem 1rem 2rem; font-family: 'Nunito', system-ui, sans-serif; }
.jw-gross .jw-unten { max-width: 1200px; margin: 1rem auto 0; color: #f1f0fb; font-weight: 800; font-size: 1.15rem; line-height: 1.5; }
.jw-x { position: fixed; top: 1rem; right: 1rem; width: 3rem; height: 3rem; border-radius: 50%; border: 0; background: var(--surface, #1b1929); color: #fff; font-weight: 900; font-size: 1.2rem; cursor: pointer; }
.jw-chips { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; margin-top: .45rem; } .jw-chips.hervor { background: rgba(230,168,23,.14); border-radius: 12px; padding: .4rem .5rem; }
.jw-chips b { font-size: .88rem; color: var(--accent2); }
.jw-chip { background: rgba(99,102,241,.2); border: 1px solid rgba(129,140,248,.45); color: var(--text); border-radius: 999px; padding: .3rem .75rem; font-weight: 800; font-size: .88rem; }
.jw-chip.still { background: rgba(230,168,23,.12); border-color: rgba(230,168,23,.4); }
.jw-schild { display: inline-block; margin-left: .4rem; background: #fde68a; color: #3b2a00; border-radius: 8px; padding: .1rem .5rem; font-size: .82rem; font-weight: 900; transform: rotate(-2deg); }
.jw-buchleiste { display: flex; align-items: center; gap: .5rem; margin-top: .6rem; } .jw-buchleiste > div { flex: 1; display: flex; gap: 2px; height: .9rem; }
.jw-buchleiste i { border-radius: 3px; background: rgba(129,140,248,.45); min-width: 4px; } .jw-buchleiste i.fertig { background: var(--gruen); }
.jw-buchleiste i.jetzt { background: var(--accent); box-shadow: 0 0 0 2px rgba(230,168,23,.45); } .jw-buchleiste i.zu { background: rgba(255,255,255,.1); }
.jw-kann { background: linear-gradient(135deg, rgba(99,102,241,.25), rgba(230,168,23,.12)); border: 1px solid rgba(129,140,248,.45); border-radius: 16px; padding: 1rem; margin: 1rem 0; }
.jw-kann h3 { font-family: 'Fredoka One', 'Nunito', sans-serif; font-weight: 400; font-size: 1.25rem; margin-bottom: .3rem; }
.jw-kann-zeile { display: flex; justify-content: space-between; align-items: center; gap: .8rem; flex-wrap: wrap; padding: .6rem 0; border-top: 1px solid var(--line); font-weight: 800; }
.jw-kann-zeile > div:first-child { flex: 1 1 16rem; } .jw-smileys { flex-shrink: 0; }
.jw-kann-zeile small { display: block; color: var(--accent); font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; }
.jw-smileys { display: flex; gap: .4rem; } .jw-smileys button { font-size: 1.6rem; width: 3rem; height: 3rem; border-radius: 14px; background: var(--surface2); border: 2px solid transparent; filter: grayscale(.6); opacity: .65; }
.jw-smileys button.an { border-color: var(--accent); filter: none; opacity: 1; background: rgba(230,168,23,.18); }
.jw-hinweis { background: rgba(230,168,23,.14); border: 1px solid rgba(230,168,23,.45); border-radius: 14px; padding: .7rem .9rem; margin: .6rem 0 1rem; font-weight: 800; }
.jw-auch { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; margin: 1rem 0; padding-top: .8rem; border-top: 1px dashed var(--line); }
.jw-geschafft { text-align: center; font-weight: 900; color: var(--gruen); font-size: 1.1rem; margin: 1rem 0; }
@media (prefers-reduced-motion: reduce) { .jw * { scroll-behavior: auto; } }`;
    document.head.appendChild(st);
  }

  // ── Einmalige Übernahme aus dem alten Lernweg (apps/typen/lernweg.html, Speicher lernwelt-lernweg nur auf dem Gerät) ──
  //  Jeder Schritt kennt in „alt“ seinen alten Schlüssel „<Station>.<Schritt>“ (werkzeuge: Umwandlung Etappe 1). Abgehakt
  //  oder an der alten Station kontrolliert → erledigt. Niveau je Station → Niveau des Abschnitts, Smileys „Fit für die Probe?“
  //  (p) und „vorher“ (v) → Kann-Sätze in derselben Reihenfolge. Danach steht _journey im alten Speicher: nie ein zweites Mal.
  function uebernehmen(J) {
    let alt = null;
    try { alt = JSON.parse(localStorage.getItem('lernwelt-lernweg') || 'null'); } catch (e) { return 0; }
    if (!alt || typeof alt !== 'object' || alt._journey || !P() || !P().wegMerken) return 0;
    let n = 0;
    (J.units || []).forEach(u => {
      const st = u.alt && alt[u.alt];
      if (!st || typeof st !== 'object' || !Array.isArray(u.abschnitte)) return;
      const s = st.s || {}, kontrolle = {};
      u.abschnitte.forEach(a => { if (a.alt && a.alt.kontrolle && s[a.alt.kontrolle]) kontrolle[a.alt.nr] = true; });
      u.abschnitte.forEach(a => {
        a.schritte.forEach(x => {
          if (!x.alt || x.art === 'app') return;
          const k = x.art === 'hefteintrag' ? x.baustein : x.id;
          if ((s[x.alt] || kontrolle[x.alt.split('.')[0]]) && !(lies(k) || {}).e) { merke(k, { e: 1 }); n++; }
        });
        const nv = a.alt && st.n && Number(st.n[a.alt.nr]);
        if (a.niveaus && nv >= 1 && nv <= 3 && !lies(a.id)) merke(a.id, { nv });
      });
      (u.kann || []).forEach((k, i) => {
        const w = { s: st.p && st.p[i], v: st.v && st.v[i] };
        if ((w.s || w.v) && !lies(k.baustein)) merke(k.baustein, w);
      });
    });
    alt._journey = new Date().toISOString().slice(0, 10);
    try { localStorage.setItem('lernwelt-lernweg', JSON.stringify(alt)); } catch (e) {}
    return n;
  }

  // ── Stand für die Startseite: aktuelle Unit = Unit des letzten freigegebenen Abschnitts ──
  function stand(o) {
    const vorher = O; O = Object.assign({ admin: false }, o);
    try {
      const ab = alleAbschnitte().filter(sichtbar);
      if (!ab.length) return null;
      const unit = O.J.units.find(u => (u.abschnitte || []).includes(ab[ab.length - 1]));
      O.unit = unit;
      const eigene = (unit.abschnitte || []).filter(sichtbar), pf = eigene.filter(a => !a.wahl), wa = eigene.filter(a => a.wahl);
      const wSoll = Math.min(wahlSoll(unit), wa.length);
      const fertig = pf.filter(a => fortschritt(a).fertig).length + Math.min(wSoll, wa.filter(a => fortschritt(a).fertig).length);
      const naechste = ab.find(a => !a.wahl && !fortschritt(a).fertig) || null;
      return { unit, fertig, soll: pf.length + wSoll, naechste, naechsteUnit: naechste && O.J.units.find(u => (u.abschnitte || []).includes(naechste)) };
    } finally { O = vorher; }
  }

  // ── Wozu gehört eine Station oder ein Abschnitt? (Hilfe-Knopf und Rückverweis auf App-Seiten, Karte im Weg) ──
  function bezug(o) {
    const vorher = O; O = Object.assign({ admin: false, z: {} }, o);
    try {
      let a = null;
      for (const u of O.J.units || []) for (const x of u.abschnitte || []) {
        if ((o.abschnitt && x.id === o.abschnitt) || (o.station && x.schritte.some(s => s.station === o.station))) { a = x; break; }
      }
      if (!a || !sichtbar(a)) return null;
      const unit = O.J.units.find(u => (u.abschnitte || []).includes(a));
      O.unit = unit;
      const nv = niveau(a);
      const buchUebung = a.schritte.find(s => s.art === 'uebung' && s.buch && passt(s, nv)) || null;
      // Finale („Zum Schluss“): alle freigegebenen Hefteinträge der Unit – Wiederholung vor der Probe
      const he = a.schluss ? [...new Set(unit.abschnitte.filter(x => sichtbar(x)).flatMap(heIn))] : heIn(a);
      const heHier = !o.station || !heStation(a) || heStation(a) === o.station;   // false: Hefteintrag nur noch einmal lesen
      return { unit, abschnitt: a, he: he.map(id => ({ id, nr: heNr(id), erledigt: heErledigt(id) })), heHier, buch: a.buch || null, buchUebung };
    } finally { O = vorher; }
  }
  // ── Tafel und Werkbank je Station im 3D-Ort ──
  function plaetze(o) {
    const vorher = O; O = Object.assign({ admin: false, z: {} }, o);
    const out = {};
    try {
      (O.J.units || []).forEach(u => (u.abschnitte || []).forEach(a => {
        if (!sichtbar(a)) return;
        const p = platzVon(u, a); if (!p) return;
        O.unit = u;
        const x = out[p] || (out[p] = { abschnitte: [], he: [], ue: [] });
        x.abschnitte.push(a.id);
        schritte(a).forEach(s => { if (s.art === 'hefteintrag') x.he.push(s); else if (s.art === 'uebung') x.ue.push(s); });
      }));
      Object.values(out).forEach(x => {
        x.tafel = x.he.length ? (x.he.every(erledigt) ? 'fertig' : 'offen') : null;
        x.werkbank = x.ue.length ? (x.ue.every(erledigt) ? 'fertig' : 'offen') : null;
        delete x.he; delete x.ue;
      });
      return out;
    } finally { O = vorher; }
  }
  const buchKurz = s => s && s.buch ? `📖 ${seiten(s.buch)}${s.buch.uebung ? ' Ü ' + esc(s.buch.uebung) : ''}` : '';   // fertiges HTML (escapt)

  /** Ist der Abschnitt einer Station gerade gesperrt (Abschnitt-Kette)? → { abschnitt, durch } oder null */
  function sperre(o) {
    const vorher = O; O = Object.assign({ admin: false, z: {} }, o);
    try {
      for (const u of O.J.units || []) for (const a of u.abschnitte || []) if (a.schritte.some(s => s.station === o.station)) {
        if (!sichtbar(a)) return null;
        const d = gesperrtDurch(a);
        return d ? { abschnitt: a, durch: d } : null;
      }
      return null;
    } finally { O = vorher; }
  }

  window.LernJourneyWeg = {
    sperre,
    uebernehmen, stand, bezug, heZeigen, buchKurz, seitenA, plaetze,
    /** Hefteintrag im Heft-Schema als HTML (Vorschau im Admin-Editor); lädt die Stile mit */
    papierHTML(b, nr) { stile(); return papier(b, false, nr || null); },
    /** Abschnitt-ID zu einer Station (oder null) – für das Antippen im 3D-Ort */
    abschnittVon(J, station) { for (const u of J.units) for (const a of u.abschnitte || []) if (a.schritte.some(s => s.station === station)) return a.id; return null; },
    /** Laufzettel in host zeichnen. o: { J, unit, bausteine: { id: Baustein }, cfg (journey.wege.journey6), admin,
     *  z (Zustände der Stationen), starte(ziel, abschnittId), wechsleUnit(unit, abschnittId), abschnitt? } */
    zeige(h, o) {
      stile();
      if (host !== h) { if (host) host.removeEventListener('click', klick); host = h; host.addEventListener('click', klick); }
      if (O && O.unit !== o.unit) { offen = null; ansicht = 'zettel'; }
      O = o;
      if (o.abschnitt !== undefined) { offen = o.abschnitt; ansicht = o.abschnitt ? 'abschnitt' : 'zettel'; }
      zeichne();
    },
    aktualisieren(o) { if (o) O = Object.assign(O || {}, o); zeichne(); },
    /** Hat die Unit einen Laufzettel? */
    hat: u => !!(u && Array.isArray(u.abschnitte) && u.abschnitte.length),
  };
})();
