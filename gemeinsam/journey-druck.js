// ═══════════════════════════════════════════════════════
//  Lernwelt – journey-druck.js   (Lernweg im English Journey, Etappe 6: Druckansichten)
//
//  Druckfertige Seiten je Unit aus daten/journey6.json und daten/journey/bausteine-en6.json – für die Lehrkraft
//  (Admin → Inhalte → 🧭 English Journey → Drucken). Kein Speicher, kein Netz: nur HTML aus den Daten.
//
//    LernJourneyDruck.loesungsheft(J, B, unitId, cfg) → HTML-Dokument: je Abschnitt Station(en) und Buchseiten, die
//        Aufgaben der Reihe nach – Buchaufgaben mit Platz für die Lösung aus dem Lehrerband, eigene Übungen mit Lösung
//    LernJourneyDruck.laufzettel(J, B, unitId, cfg)   → Papier-Laufzettel zum Abhaken (optional, z. B. ohne iPad)
//    LernJourneyDruck.hefteintraege(J, B, unitId, cfg) → alle Hefteinträge der Unit im Heft-Schema, groß
//  J = journey6.json, B = { Baustein-ID: Baustein }, cfg = config.journey.wege.journey6 (für die HE-Nummern)
//  Lösungen der Buchaufgaben stehen bewusst nicht in der App – sie liegen im Klassenzimmer aus.
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.LernJourneyDruck) return;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STERNE = n => Array.isArray(n) && n.length < 3 ? ' ' + n.map(x => '★'.repeat(x)).join(' / ') : '';
  const seiten = b => b ? (b.bis && b.bis !== b.seite ? `S. ${b.seite}–${b.bis}` : `S. ${b.seite}`) : '';
  const seitenA = a => a.buch ? (a.buch.von === a.buch.bis ? `S. ${a.buch.von}` : `S. ${a.buch.von}–${a.buch.bis}`) : '';
  const heNr = (cfg, id) => (cfg && cfg.he && cfg.he[id]) || null;
  const heName = (cfg, id) => heNr(cfg, id) ? 'HE ' + heNr(cfg, id) : 'Hefteintrag';

  function seite(titel, inhalt, extraCss = '') {
    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${esc(titel)}</title><style>
      @page { size: A4; margin: 14mm 14mm 16mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Nunito', 'Segoe UI', Arial, sans-serif; color: #111; font-size: 11pt; line-height: 1.4; margin: 0; }
      h1 { font-size: 18pt; margin: 0 0 2mm; } .unter { color: #555; margin: 0 0 6mm; font-size: 10pt; }
      h2 { font-size: 13pt; margin: 6mm 0 1mm; padding-top: 2mm; border-top: 2px solid #111; break-after: avoid; }
      .ort { color: #333; font-size: 10pt; margin-bottom: 2mm; } .ort b { color: #111; }
      .auf { margin: 2.5mm 0 0 0; break-inside: avoid; } .auf > b { display: block; }
      ol { margin: 1mm 0 0 6mm; padding-left: 4mm; } li { margin: .5mm 0; }
      .muster { white-space: pre-line; margin: 1mm 0 0 6mm; }
      .leer { border: 1px dashed #999; border-radius: 2mm; height: 14mm; margin: 1mm 0 0 6mm; color: #888; font-size: 9pt; padding: 1mm 2mm; }
      .tag { font-size: 9pt; color: #555; } .wahl { font-size: 9pt; border: 1px solid #555; border-radius: 1mm; padding: 0 1.5mm; margin-left: 2mm; }
      .knopf { position: fixed; top: 4mm; right: 4mm; } @media print { .knopf { display: none; } }
      ${extraCss}</style></head><body><button class="knopf" onclick="print()">🖨️ Drucken</button>${inhalt}</body></html>`;
  }
  const unitVon = (J, id) => (J.units || []).find(u => u.id === id);
  const stationen = (u, a) => a.schritte.filter(s => s.station).map(s => (u.stationen.find(x => x.id === s.station) || {}).titel || s.station);

  function loesungAus(b) {
    const l = b.loesung;
    if (Array.isArray(l) && l.length) return `<ol>${l.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
    if (typeof l === 'string' && l.trim()) return `<div class="muster">${esc(l)}</div>`;
    return '<div class="leer">Lösung fehlt noch</div>';
  }

  function loesungsheft(J, B, unitId, cfg) {
    const u = unitVon(J, unitId); if (!u) return '';
    const teile = (u.abschnitte || []).map(a => {
      let nr = 0;
      const auf = a.schritte.map(s => {
        if (s.art === 'hefteintrag') return `<div class="auf"><b>📒 ${esc(heName(cfg, s.baustein))} · ${esc((B[s.baustein] || {}).titel || '')}${s.wiederholen ? ' (noch einmal lesen)' : ''}</b><span class="tag">Kontrolle mit der Vorlage im Laufzettel bzw. „Groß zeigen“.</span></div>`;
        if (s.art === 'uebung' && s.baustein) {
          const b = B[s.baustein] || {};
          return `<div class="auf"><b>${++nr}. ✏️ ${esc(b.titel || '')}${STERNE(s.niveau)}</b>${loesungAus(b)}</div>`;
        }
        if (s.art === 'uebung' && s.buch) return `<div class="auf"><b>${++nr}. 📖 Buch ${esc(seiten(s.buch))}${s.buch.uebung ? ' Ü ' + esc(s.buch.uebung) : ''}${STERNE(s.niveau)}</b>
          <span class="tag">${esc(s.text || '')}</span><div class="leer">Lösung aus dem Lehrerband (Kopie anheften)</div></div>`;
        return '';
      }).join('');
      const st = stationen(u, a);
      return `<section><h2>${esc(a.ico || '')} ${esc(a.titel)}${a.wahl ? '<span class="wahl">Wahl / Extra</span>' : ''}</h2>
        <div class="ort">${st.length ? `🎮 Station: <b>${esc(st.join(' · '))}</b> · ` : ''}${a.buch ? `📖 Buch <b>${esc(seitenA(a))}</b>` : ''}</div>
        ${auf || '<div class="tag">Keine Aufgaben zum Kontrollieren – nur Lesen, Vokabeln oder App.</div>'}</section>`;
    }).join('');
    return seite(`Lösungsheft Unit ${u.nr}`, `<h1>Lösungsheft · Unit ${u.nr}: ${esc(u.titel)}</h1>
      <p class="unter">English Journey · ${esc(J.buch || '')} · Kontrollstation: Vergleiche mit deinem Übungsheft und verbessere mit Grün.</p>${teile}`);
  }

  function laufzettel(J, B, unitId, cfg) {
    const u = unitVon(J, unitId); if (!u) return '';
    const name = s => s.art === 'hefteintrag' ? `📒 ${heName(cfg, s.baustein)} · ${(B[s.baustein] || {}).titel || ''}`
      : s.art === 'uebung' ? (s.baustein ? `✏️ ${(B[s.baustein] || {}).titel || ''}` : `📖 Buch ${seiten(s.buch)}${s.buch.uebung ? ' Ü ' + s.buch.uebung : ''}`)
      : s.art === 'app' ? `🎮 ${s.station ? (u.stationen.find(x => x.id === s.station) || {}).titel || '' : 'Lernwelt: ' + (s.text || s.thema)}`
      : `${{ lesen: '📖', vokabeln: '📘', partner: '👥', hoeren: '🎧', extra: '⭐' }[s.art] || '•'} ${(s.buch ? 'Buch ' + seiten(s.buch) + ': ' : '') + (s.text || '')}`;
    const teile = (u.abschnitte || []).map(a => `<section><h2>${esc(a.ico || '')} ${esc(a.titel)}${a.wahl ? '<span class="wahl">Wahl / Extra</span>' : ''}</h2>
      <div class="ort">${a.buch ? `📖 Buch <b>${esc(seitenA(a))}</b>` : ''}</div>
      ${a.schritte.map(s => `<div class="haken"><span class="box"></span>${esc(name(s))}${STERNE(s.niveau)}</div>`).join('')}</section>`).join('');
    return seite(`Laufzettel Unit ${u.nr}`, `<h1>Laufzettel · Unit ${u.nr}: ${esc(u.titel)}</h1><p class="unter">Name: ______________________ · Klasse: ______</p>${teile}`,
      '.haken { display: flex; gap: 2.5mm; align-items: flex-start; margin: 1.2mm 0; break-inside: avoid; } .box { width: 4.5mm; height: 4.5mm; border: 1.5px solid #111; border-radius: 1mm; flex-shrink: 0; margin-top: .6mm; }');
  }

  function hefteintraege(J, B, unitId, cfg) {
    const u = unitVon(J, unitId); if (!u) return '';
    const ids = [...new Set((u.abschnitte || []).flatMap(a => a.schritte.filter(s => s.art === 'hefteintrag').map(s => s.baustein)))];
    const zeile = z => `<p>${z.map(([t, s]) => s ? `<span class="${s === 'g' ? 'g' : 'f'}">${esc(t)}</span>` : esc(t)).join('')}</p>`;
    const he = ids.map(id => { const b = B[id] || {}; return `<div class="papier"><div class="ue"><span class="kreis">${esc(heNr(cfg, id) || '')}</span><span class="ti">${esc(b.titel || '')}</span><span class="datum"></span></div>
      <p></p>${(b.zeilen || []).map(zeile).join('')}${b.merke ? `<p><span class="merke">Merke:</span> <span class="mu">${esc(b.merke)}</span></p>` : ''}</div>`; }).join('');
    return seite(`Hefteinträge Unit ${u.nr}`, `<h1>Hefteinträge · Unit ${u.nr}: ${esc(u.titel)}</h1>${he || '<p>Keine Hefteinträge.</p>'}`,
      `.papier { break-inside: avoid; margin: 0 0 8mm; } .papier .ue { display: flex; align-items: center; gap: 3mm; border-bottom: 2.5px solid #111; height: 13mm; }
       .papier .kreis { width: 9mm; height: 9mm; border: 2.5px solid #00a651; border-radius: 50%; display: grid; place-items: center; font-weight: 700; }
       .papier .ti { color: #3d9b3d; font-weight: 700; font-size: 14pt; flex: 1; } .papier .datum { border-bottom: 1.5px solid #111; width: 22mm; height: 5mm; }
       .papier p { border-bottom: 1px solid #b9c2cf; height: 9mm; line-height: 11mm; margin: 0; white-space: pre; font-size: 12pt; }
       .papier .g { color: #3d9b3d; font-weight: 700; } .papier .f { font-weight: 700; } .papier .merke { color: #e53935; font-weight: 700; }
       .papier .mu { text-decoration: underline; text-decoration-color: #e53935; text-decoration-thickness: 2px; text-underline-offset: 3px; }`);
  }

  window.LernJourneyDruck = { loesungsheft, laufzettel, hefteintraege };
})();
