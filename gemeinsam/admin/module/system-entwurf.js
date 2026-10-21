// ═══════════════════════════════════════════════════════
//  Admin-Modul System → Entwurf und Versionen  (Admin-Umbau Etappe 1, ausgebaut in Etappe 3)
//  - Entwurf: Änderungen, geänderte Werte, „Jetzt prüfen“ (dieselbe Prüfung wie beim Veröffentlichen)
//  - Änderungsprotokoll: die letzten 30 Veröffentlichungen (Commits an config.json) mit Datum und Bereich
//  - Jede Fassung ansehen (Unterschiede zum aktuellen Stand) und mit einem Klick als Entwurf wiederherstellen
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'entwurf', bereich: 'system', titel: 'Entwurf und Versionen', symbol: '🕓', reihenfolge: 20,
  suchbegriffe: ['Entwurf', 'Veröffentlichen', 'Verlauf', 'Version', 'Unterschiede', 'Protokoll', 'Rückgängig', 'Wiederherstellen', 'Prüfen'],
  zeigen(host, { store, toast }) {
    let aktiv = true, verlauf = null, verlaufFehler = '', pruefung = null, offen = '', ansicht = null;
    const zeit = d => d.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    const werte = u => `<ul class="lw-liste lw-klein">${u.slice(0, 200).map(x =>
      `<li><code>${escHtml(x.pfad || '(alles)')}</code> ${escHtml(LWAdmin.kurz(x.alt))} → ${escHtml(LWAdmin.kurz(x.neu))}</li>`).join('')}${u.length > 200 ? '<li>…</li>' : ''}</ul>`;
    // Bereiche aus dem Text („Inhalte: …“, bei mehreren Änderungen auch mehrere)
    const bereicheIn = text => LWAdmin.BEREICHE.filter(b => text.includes(b.titel + ': '));
    const ohneBereich = text => LWAdmin.BEREICHE.reduce((t, b) => t.split(b.titel + ': ').join(''), text);

    function zeichnen() {
      if (!aktiv) return;
      const a = store.aenderungen().reverse(), u = store.unterschiede();
      const prf = pruefung ? `<div class="lw-karte" style="margin:.8rem 0 0;padding:.8rem 1rem">${
        pruefung.fehler.length || pruefung.warnungen.length
          ? (pruefung.fehler.length ? `<b>⛔ ${pruefung.fehler.length} Fehler</b> (Veröffentlichen gesperrt)<ul class="lw-liste lw-rot">${pruefung.fehler.map(x => `<li>${escHtml(x)}</li>`).join('')}</ul>` : '')
            + (pruefung.warnungen.length ? `<b>⚠️ ${pruefung.warnungen.length} Warnungen</b><ul class="lw-liste">${pruefung.warnungen.map(x => `<li>${escHtml(x)}</li>`).join('')}</ul>` : '')
          : '✅ Keine Fehler, keine Warnungen.'}</div>` : '';
      const liste = verlauf === null ? '<p>lädt …</p>' : verlaufFehler ? `<p>⚠ ${escHtml(verlaufFehler)}</p>` : !verlauf.length ? '<p>–</p>' :
        verlauf.map((v, i) => `<div class="lw-version">
          <div class="lw-version-text"><span class="lw-klein">${escHtml(zeit(v.zeit))}${i === 0 ? ' · aktuell' : ''}</span><br>
            ${bereicheIn(v.text).map(b => `<span class="lw-marke">${b.symbol} ${escHtml(b.titel)}</span>`).join('')}${escHtml(ohneBereich(v.text))}
            ${offen === v.sha ? `<div style="margin-top:.4rem">${ansicht === null ? 'lädt …' : typeof ansicht === 'string' ? '⚠ ' + escHtml(ansicht)
              : ansicht.length ? `<b>${ansicht.length} Unterschiede</b> zum aktuellen Stand (links diese Fassung, rechts jetzt):` + werte(ansicht) : 'Gleich wie der aktuelle Stand.'}</div>` : ''}</div>
          ${v.sha ? `<button class="lw-btn klein" data-ansehen="${escHtml(v.sha)}">${offen === v.sha ? 'Zuklappen' : 'Ansehen'}</button>
            ${i > 0 ? `<button class="lw-btn klein" data-zurueck="${escHtml(v.sha)}" data-zeit="${escHtml(zeit(v.zeit))}">↺ Wiederherstellen</button>` : ''}` : ''}
        </div>`).join('');
      host.innerHTML = `
        <div class="lw-karte">
          <h2>✏️ Entwurf</h2>
          ${a.length ? `<p>${a.length === 1 ? '1 Änderung' : a.length + ' Änderungen'} auf diesem Gerät, noch nicht veröffentlicht:</p>
            <ul class="lw-liste">${a.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>
            <h3>Geänderte Werte (${u.length})</h3>${werte(u)}`
          : '<p>Kein Entwurf – alles ist veröffentlicht.</p>'}
          <div class="lw-knoepfe"><button class="lw-btn" data-pruefen>🔎 Jetzt prüfen</button></div>${prf}
        </div>
        <div class="lw-karte">
          <h2>🕓 Änderungsprotokoll</h2>
          <p class="lw-klein">Jede Veröffentlichung ist ein Commit an config.json. „Wiederherstellen“ legt eine frühere Fassung als
            Entwurf an – sie gilt erst nach „Veröffentlichen“ (mit Prüfung) und lässt sich genauso wieder zurücknehmen.</p>
          ${liste}
        </div>`;
    }

    const klick = async e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-pruefen')) {
        b.disabled = true; b.textContent = 'Prüfe …';
        pruefung = await LWAdmin.pruefen(store.daten()).catch(err => ({ fehler: [], warnungen: ['Prüfung nicht möglich: ' + err.message] }));
        zeichnen();
      } else if (b.dataset.ansehen) {
        const sha = b.dataset.ansehen;
        if (offen === sha) { offen = ''; zeichnen(); return; }
        offen = sha; ansicht = null; zeichnen();
        try { const alt = await store.fassung(sha); if (offen === sha) ansicht = store.vergleichen(alt, store.daten()); }
        catch (err) { if (offen === sha) ansicht = err.message || String(err); }
        zeichnen();
      } else if (b.dataset.zurueck) {
        const n = store.anzahl();
        const ok = await LWAdmin.dialog({ titel: 'Fassung wiederherstellen?', ja: '↺ Als Entwurf übernehmen',
          text: `Die Fassung vom ${b.dataset.zeit} wird als Entwurf übernommen.` + (n ? ` Dein aktueller Entwurf mit ${n} Änderung${n === 1 ? '' : 'en'} wird dabei ersetzt.` : '') +
            ' Erst „Veröffentlichen“ macht sie für die Kinder gültig.' });
        if (!ok) return;
        try { const zahl = await store.wiederherstellen(b.dataset.zurueck, b.dataset.zeit); toast(`↺ Fassung als Entwurf übernommen (${zahl} geänderte Werte) – jetzt prüfen und veröffentlichen`); }
        catch (err) { toast('⚠ ' + (err.message || err), true); }
      }
    };
    host.addEventListener('click', klick);

    zeichnen();
    store.historie(30)
      .then(l => { verlauf = l; })
      .catch(err => { verlauf = []; verlaufFehler = err.status === 401 ? 'Sitzung abgelaufen – bitte neu anmelden' : 'nicht abrufbar (offline oder zu viele Abfragen)'; })
      .then(zeichnen);
    const ab = store.abonnieren(() => { pruefung = null; zeichnen(); });
    return () => { aktiv = false; ab(); host.removeEventListener('click', klick); };   // Modul verlassen: nicht mehr in den gemeinsamen Bereich zeichnen
  },
});
