// ═══════════════════════════════════════════════════════
//  Admin-Modul System → Fehlerzähler  (Aktionsplan „Lernwelt – Tempo“, Etappe 8, v133)
//  Welche Skriptfehler melden die iPads? Der Worker (cloudflare/fehler.js) zählt nur Summen je Tag, Version, Seite und
//  Meldung – ohne Gerät, Karte oder Gruppe. Hier: Liste der letzten Tage, Filter nach Version, alles löschen.
//  Gemeldet wird nur im Live-Betrieb, je Fehler und Seite höchstens einmal am Tag und iPad (gemeinsam/umgebung.js).
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'fehlerzaehler', bereich: 'system', titel: 'Fehlerzähler', symbol: '🐞', reihenfolge: 31,
  suchbegriffe: ['Fehlerzähler', 'Fehler', 'Absturz', 'Skriptfehler', 'Bug', 'kaputt', 'Version', 'iPads melden'],
  zeigen(host, { store }) {
    const e = s => escHtml(String(s == null ? '' : s));
    let aktiv = true, tage = 7, zeilen = null, fehler = '', version = '';
    const datum = t => String(t || '').split('-').reverse().slice(0, 2).join('.') + '.';

    function laden() {
      zeilen = null; fehler = ''; zeichnen();
      store.worker('/fehler/admin/liste', { tage }).then(d => { zeilen = Array.isArray(d.zeilen) ? d.zeilen : []; })
        .catch(x => { zeilen = []; fehler = 'Nicht geladen: ' + (x.message || x) + ' – ist der neue Worker (v133, mit fehler.js) schon bei Cloudflare eingefügt?'; })
        .then(zeichnen);
    }
    function zeichnen() {
      if (!aktiv) return;
      const versionen = [...new Set((zeilen || []).map(z => z.version))].sort((a, b) => Number(b.slice(1)) - Number(a.slice(1)));
      const liste = (zeilen || []).filter(z => !version || z.version === version);
      const summe = liste.reduce((s, z) => s + (Number(z.anzahl) || 0), 0);
      host.innerHTML = `<div class="lw-karte"><h2>🐞 Fehlerzähler</h2>
          <p>Die iPads melden Skriptfehler, damit du nach einem Upload merkst, wenn eine Seite abstürzt. Gezählt werden nur Summen je Tag,
          Version, Seite und Meldung – kein Gerät, keine Karte, keine Gruppe. Jedes iPad meldet denselben Fehler höchstens einmal am Tag.</p>
          <div class="lw-knoepfe" style="align-items:center">
            <select data-fz-tage aria-label="Zeitraum">${[1, 7, 14, 30, 60].map(t => `<option value="${t}"${t === tage ? ' selected' : ''}>${t === 1 ? 'heute' : 'letzte ' + t + ' Tage'}</option>`).join('')}</select>
            <select data-fz-version aria-label="Version"><option value="">alle Versionen</option>${versionen.map(v => `<option${v === version ? ' selected' : ''}>${e(v)}</option>`).join('')}</select>
            <button type="button" class="lw-btn klein" data-fz-neu>↻ Aktualisieren</button>
            <button type="button" class="lw-btn klein" data-fz-loeschen>🗑 Alle löschen</button></div>
          ${fehler ? `<p style="color:#f87171;font-weight:800">⚠ ${e(fehler)}</p>` : ''}</div>
        <div class="lw-karte">${zeilen === null ? 'lädt …' : !liste.length ? '<p>✅ Keine Fehler gemeldet.</p>' : `
          <p class="lw-klein">${summe} Meldungen in ${liste.length} Zeilen. „Tage“ = an wie vielen Tagen der Fehler auftrat.</p>
          <div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:.86rem">
            <thead><tr>${['Anzahl', 'Tage', 'zuletzt', 'Version', 'Seite', 'Meldung'].map(h => `<th style="text-align:left;padding:4px 6px;white-space:nowrap">${h}</th>`).join('')}</tr></thead>
            <tbody>${liste.map(z => `<tr style="border-top:1px solid rgba(255,255,255,.1)">
              <td style="padding:4px 6px;font-weight:900">${Number(z.anzahl) || 0}</td><td style="padding:4px 6px">${Number(z.tage) || 0}</td>
              <td style="padding:4px 6px;white-space:nowrap">${e(datum(z.letzter))}</td><td style="padding:4px 6px">${e(z.version)}</td>
              <td style="padding:4px 6px;word-break:break-all">${e(z.seite)}</td><td style="padding:4px 6px;word-break:break-word">${e(z.meldung)}</td></tr>`).join('')}</tbody>
          </table></div>`}
          <p class="lw-klein" style="margin-top:.6rem">Ältere Einträge löscht der Worker nach 60 Tagen von selbst. Das Fehlerprotokoll eines einzelnen iPads
          steht weiter unter System → 🔧 Diagnose (bzw. auf dem iPad: Pass → Sicherung → 5× auf die Versionszeile).</p></div>`;
    }
    const aenderung = ev => {
      if (ev.target.matches('[data-fz-tage]')) { tage = Number(ev.target.value) || 7; laden(); }
      if (ev.target.matches('[data-fz-version]')) { version = ev.target.value; zeichnen(); }
    };
    const klick = ev => {
      if (ev.target.closest('[data-fz-neu]')) return laden();
      if (ev.target.closest('[data-fz-loeschen]')) {
        if (!confirm('Alle gezählten Fehler löschen?')) return;
        store.worker('/fehler/admin/loeschen', {}).then(laden).catch(x => { fehler = 'Nicht gelöscht: ' + (x.message || x); zeichnen(); });
      }
    };
    host.addEventListener('change', aenderung);
    host.addEventListener('click', klick);
    laden();
    return () => { aktiv = false; host.removeEventListener('change', aenderung); host.removeEventListener('click', klick); };
  },
});
