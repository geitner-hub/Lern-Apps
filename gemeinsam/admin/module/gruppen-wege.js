// ═══════════════════════════════════════════════════════
//  Admin-Modul Gruppen → Klassenübersicht  (Aktionsplan „Lernwelt – Tempo“, Etappe 6a)
//  Wo steht jede Karte einer Gruppe auf einem Lernweg? Ein Raster: Zeile je Sicherungskarte (nur die Nummer in der Gruppe –
//  welches Kind das ist, weiß nur die Lehrkraft), Spalte je Abschnitt, in Ampelfarben.
//  Daten: Die iPads mit Karte melden je Lernweg ihre erledigten Schritte und fertigen Abschnitte an den Worker
//  (gemeinsam/sync.js wegMelden → cloudflare/sync.js /sync/weg, lesbar, ohne Namen und ohne Punkte); hier gelesen über
//  /sync/admin/weg (nur Hauptzugang). Gemeldet wird beim Öffnen der Startseite bzw. beim Verlassen eines 2D-Wegs.
//  Wege: English Journey (daten/journey6.json) und die 2D-Lernwege (daten/wege/). Nur lesen – ändert nichts.
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'klassenuebersicht', bereich: 'gruppen', titel: 'Klassenübersicht', symbol: '🚦', reihenfolge: 4,
  suchbegriffe: ['Klassenübersicht', 'Fortschritt', 'Lernweg', 'Laufzettel', 'wer hängt', 'Ampel', 'Raster', 'Stolperstelle', 'Karte', 'Stand der Klasse', 'English Journey'],
  zeigen(host, { store }) {
    const e = s => escHtml(String(s == null ? '' : s));
    const ROOT = new URL('./', location.href).href, WOCHE = 7 * 864e5;
    let aktiv = true, gruppen = [], wege = [], gruppe = '', weg = '', karten = null, fehler = '', laedt = false, filter = '';

    const holeJson = p => fetch(ROOT + p, { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)));
    /** Weg → einheitlich { id, titel, abschnitte: [{ id, titel, gruppe, wahl, schritte: [{ id, text, zaehlt }] }] } */
    const schrittText = (s, B) => s.text || (B[s.baustein] && B[s.baustein].titel) || s.titel || s.station || s.thema || s.art;
    function ausJourney(J, B) {
      return { id: 'journey6', titel: '🧭 English Journey Year 6', abschnitte: J.units.flatMap(u => (u.abschnitte || []).map(a => ({
        id: a.id, titel: a.titel, gruppe: 'Unit ' + u.nr, wahl: !!a.wahl,
        schritte: a.schritte.map(s => ({ id: s.id, text: schrittText(s, B), zaehlt: s.art !== 'extra' })) }))) };
    }
    function ausWeg(W, B) {
      return { id: W.id, titel: (W.ico ? W.ico + ' ' : '🗺️ ') + W.titel, abschnitte: W.abschnitte.filter(a => !a.aus).map(a => Object.assign({}, a, { schritte: a.schritte.filter(s => !s.aus) })).map(a => ({
        id: a.id, titel: a.titel, gruppe: '', wahl: false, stern: a.schritte.filter(s => s.stufe === 'stern').map(s => s.id),
        schritte: a.schritte.map(s => ({ id: s.id, text: schrittText(s, B), zaehlt: s.stufe !== 'stern' && s.stufe !== 'wahl' })) })) };
    }
    const bausteine = p => holeJson(p).then(d => { const B = {}; (d.bausteine || []).forEach(x => { B[x.id] = x; }); return B; }).catch(() => ({}));
    const W = () => wege.find(x => x.id === weg);
    /** Bis wohin ist der Weg für diese Gruppe frei? (Index des Abschnitts, -1 = nichts; Gruppe vor „alle“) */
    function freiBis() {
      const w = W(), bis = ((((store.daten() || {}).journey || {}).wege || {})[weg] || {}).bis || {};
      const aid = bis['g:' + gruppe] || bis.alle;
      return w && aid ? w.abschnitte.findIndex(a => a.id === aid) : -1;
    }

    function laden() {
      if (!gruppe || !weg) return;
      laedt = true; fehler = ''; zeichnen();
      store.worker('/sync/admin/weg', { gruppeId: gruppe, weg }).then(d => { karten = Array.isArray(d.karten) ? d.karten : []; })
        .catch(x => { karten = null; fehler = 'Stände nicht geladen: ' + (x.message || x) + ' – ist der neue Worker (v125) schon bei Cloudflare eingefügt?'; })
        .then(() => { laedt = false; zeichnen(); });
    }

    function zeichnen() {
      if (!aktiv) return;
      const wahl = `<div class="lw-knoepfe" style="align-items:center">
          <select data-ku-gruppe aria-label="Gruppe"><option value="">— Gruppe wählen —</option>${gruppen.map(g => `<option value="${e(g.id)}"${g.id === gruppe ? ' selected' : ''}>🪪 ${e(g.name)} (${g.codes.length})</option>`).join('')}</select>
          <select data-ku-weg aria-label="Lernweg"><option value="">— Lernweg wählen —</option>${wege.map(w => `<option value="${e(w.id)}"${w.id === weg ? ' selected' : ''}>${e(w.titel)}</option>`).join('')}</select>
          ${gruppe && weg ? '<button type="button" class="lw-btn klein" data-ku-neu>↻ Aktualisieren</button>' : ''}</div>`;
      const kopf = `<div class="lw-karte"><h2>🚦 Klassenübersicht je Lernweg</h2>
        <p>Zeile je Sicherungskarte, Spalte je Abschnitt. Die iPads melden ihren Stand, wenn die Startseite geöffnet wird – nur welche Schritte
        erledigt sind, ohne Namen und ohne Punkte. Welche Karte welchem Kind gehört, steht nur auf deiner Liste.</p>${wahl}
        ${fehler ? `<p style="color:#f87171;font-weight:800">⚠ ${e(fehler)}</p>` : ''}</div>`;
      const w = W();
      if (!gruppe || !w || !karten) { host.innerHTML = kopf + (laedt ? '<div class="lw-karte">lädt …</div>' : ''); return; }

      const bis = freiBis(), ab = w.abschnitte, jetzt = Date.now();
      const frei = ab.filter((a, i) => i <= bis), pflicht = frei.filter(a => !a.wahl);
      const zeilen = karten.map(k => {
        const E = new Set(k.e), F = new Set(k.f);
        const zellen = ab.map(a => F.has(a.id) ? 'fertig' : a.schritte.some(s => E.has(s.id)) ? 'dran' : 'offen');
        const allesPflicht = pflicht.length > 0 && pflicht.every(a => F.has(a.id));
        const haengt = !!k.geaendert && !allesPflicht && jetzt - k.geaendert > WOCHE;
        const stern = ab.some(a => (a.stern || []).some(id => E.has(id)));
        return { k, zellen, allesPflicht, haengt, stern, nie: !k.gesehen, fertig: frei.filter(a => F.has(a.id)).length };
      });
      const sichtbar = zeilen.filter(z => filter === 'haengt' ? z.haengt : filter === 'pflicht' ? z.allesPflicht : filter === 'stern' ? z.stern : filter === 'nie' ? z.nie : true);
      const hatStern = ab.some(a => (a.stern || []).length);
      const tage = t => { const d = Math.floor((jetzt - t) / 864e5); return d <= 0 ? 'heute' : d === 1 ? 'gestern' : 'vor ' + d + ' Tagen'; };
      const farbe = { fertig: '#22c55e', dran: '#eab308', offen: 'rgba(255,255,255,.1)' };
      const zelle = (st, i, titel) => `<td title="${e(titel)}" style="padding:2px"><span style="display:block;width:100%;min-width:14px;height:20px;border-radius:5px;background:${farbe[st]};${i > bis ? 'opacity:.3' : ''}"></span></td>`;
      // Zeile für die ganze Gruppe: Anteil fertig und häufigste Stolperstelle (Schritt, der bei begonnenen, nicht fertigen Karten am öftesten fehlt)
      const mit = zeilen.filter(z => !z.nie);
      const gruppenZeile = ab.map((a, i) => {
        const n = mit.filter(z => z.zellen[i] === 'fertig').length, pct = mit.length ? Math.round(100 * n / mit.length) : 0;
        const dran = mit.filter(z => z.zellen[i] === 'dran'), fehlt = {};
        dran.forEach(z => { const E = new Set(z.k.e); a.schritte.forEach(s => { if (s.zaehlt && !E.has(s.id)) fehlt[s.id] = (fehlt[s.id] || 0) + 1; }); });
        const top = Object.entries(fehlt).sort((x, y) => y[1] - x[1])[0], sch = top && a.schritte.find(s => s.id === top[0]);
        return { pct, n, stolper: top && top[1] >= 2 && sch ? `${top[1]}× offen: ${String(sch.text).slice(0, 70)}` : '' };
      });
      const stolper = gruppenZeile.map((g, i) => g.stolper && i <= bis ? `<li><b>${e(ab[i].titel)}</b> – ${e(g.stolper)}</li>` : '').join('');
      const knopf = (id, text, n) => `<button type="button" class="lw-btn klein${filter === id ? ' gold' : ''}" data-ku-filter="${id}" aria-pressed="${filter === id}">${text} (${n})</button>`;
      let gruppeVorher = null;
      const gruppenKopf = ab.map(a => a.gruppe).some(Boolean) ? `<tr><th></th><th></th>${ab.map(a => { const neu = a.gruppe !== gruppeVorher; gruppeVorher = a.gruppe; return neu ? `<th colspan="${ab.filter(x => x.gruppe === a.gruppe).length}" style="font-size:.72rem;text-align:left;padding:2px 4px;border-left:2px solid rgba(255,255,255,.25)">${e(a.gruppe)}</th>` : ''; }).join('')}</tr>` : '';
      host.innerHTML = kopf + `<div class="lw-karte">
          <div class="lw-knoepfe" style="margin-bottom:.6rem">${knopf('', 'Alle', zeilen.length)}${knopf('haengt', '⏳ hängt seit über einer Woche', zeilen.filter(z => z.haengt).length)}
            ${knopf('pflicht', '✅ Pflicht erledigt', zeilen.filter(z => z.allesPflicht).length)}${hatStern ? knopf('stern', '⭐ Stern genutzt', zeilen.filter(z => z.stern).length) : ''}
            ${knopf('nie', '∅ noch nie gemeldet', zeilen.filter(z => z.nie).length)}</div>
          ${bis < 0 ? '<p class="lw-klein">Für diese Gruppe ist auf diesem Weg noch nichts freigegeben (Gruppen → 📒 Laufzettel).</p>' : ''}
          <div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:.85rem">
            <thead>${gruppenKopf}<tr><th style="text-align:left;padding:2px 6px;white-space:nowrap">Karte</th><th style="text-align:left;padding:2px 6px;white-space:nowrap">zuletzt weiter</th>
              ${ab.map((a, i) => `<th title="${e(a.titel)}" style="padding:2px;font-weight:800;font-size:.7rem;${i > bis ? 'opacity:.4' : ''}">${i + 1}</th>`).join('')}</tr></thead>
            <tbody>${sichtbar.map(z => `<tr><td style="padding:2px 6px;white-space:nowrap"><b>Nr. ${Number(z.k.nr)}</b></td>
                <td style="padding:2px 6px;white-space:nowrap;${z.haengt ? 'color:#f87171;font-weight:800' : ''}">${z.nie ? '<span class="lw-klein">noch nie</span>' : e(tage(z.k.geaendert)) + (z.haengt ? ' ⏳' : '')}</td>
                ${z.zellen.map((st, i) => zelle(st, i, `Nr. ${z.k.nr} · ${ab[i].titel}: ${{ fertig: 'fertig', dran: 'begonnen', offen: 'noch nicht begonnen' }[st]}`)).join('')}</tr>`).join('')
              || `<tr><td colspan="${ab.length + 2}" class="lw-klein" style="padding:.6rem">Keine Karte passt zu diesem Filter.</td></tr>`}
              <tr><td colspan="2" style="padding:6px 6px 2px;white-space:nowrap"><b>Gruppe</b> <span class="lw-klein">fertig in %</span></td>
                ${gruppenZeile.map((g, i) => `<td title="${e(ab[i].titel)}: ${g.n} von ${mit.length} fertig" style="padding:6px 1px 2px;text-align:center;font-size:.68rem;font-weight:800;${i > bis ? 'opacity:.4' : ''}">${g.pct}</td>`).join('')}</tr>
            </tbody></table></div>
          <p class="lw-klein" style="margin-top:.6rem">🟩 fertig · 🟨 begonnen · ⬜ noch nicht begonnen · blass = noch nicht freigegeben. Die Zahl über einer Spalte ist der Abschnitt in Weg-Reihenfolge (Titel beim Darüberfahren bzw. unten).
            „Zuletzt weiter“ = wann sich der Stand zuletzt geändert hat.</p>
          ${stolper ? `<h3 style="margin:.8rem 0 .2rem">🪨 Häufigste Stolperstellen</h3><ul style="margin-left:1.2rem;line-height:1.6">${stolper}</ul>` : ''}
          <details style="margin-top:.6rem"><summary class="lw-klein" style="cursor:pointer">Abschnitte dieses Wegs</summary>
            <ol style="margin:.4rem 0 0 1.4rem;line-height:1.6;font-size:.88rem">${ab.map((a, i) => `<li${i > bis ? ' style="opacity:.5"' : ''}>${a.gruppe ? e(a.gruppe) + ' · ' : ''}${e(a.titel)}${a.wahl ? ' (Wahl)' : ''}</li>`).join('')}</ol></details>
        </div>`;
    }

    const aenderung = ev => {
      const t = ev.target;
      if (t.matches('[data-ku-gruppe]')) { gruppe = t.value; karten = null; filter = ''; laden(); zeichnen(); }
      if (t.matches('[data-ku-weg]')) { weg = t.value; karten = null; filter = ''; laden(); zeichnen(); }
    };
    const klick = ev => {
      const t = ev.target.closest('[data-ku-filter],[data-ku-neu]');
      if (!t) return;
      if (t.hasAttribute('data-ku-neu')) return laden();
      filter = t.dataset.kuFilter; zeichnen();
    };
    host.addEventListener('change', aenderung);
    host.addEventListener('click', klick);
    zeichnen();
    LWAdmin.quellen.gruppen().then(g => { gruppen = g; }).catch(x => { fehler = 'Gruppen nicht geladen: ' + (x.message || x); }).then(zeichnen);
    Promise.all([
      Promise.all([holeJson('daten/journey6.json'), bausteine('daten/journey/bausteine-en6.json')]).then(([J, B]) => ausJourney(J, B)).catch(() => null),
      holeJson('daten/wege/liste.json').then(l => Promise.all((l.wege || []).map(x => Promise.all([holeJson('daten/wege/' + x.id + '.json'), bausteine('daten/wege/bausteine-' + x.id + '.json')])
        .then(([Wd, B]) => ausWeg(Wd, B)).catch(() => null)))).catch(() => []),
    ]).then(([j, l]) => { wege = [j].concat(l).filter(Boolean); if (!weg && wege.length) weg = wege[0].id; }).then(zeichnen);
    return () => { aktiv = false; host.removeEventListener('change', aenderung); host.removeEventListener('click', klick); };
  },
});
