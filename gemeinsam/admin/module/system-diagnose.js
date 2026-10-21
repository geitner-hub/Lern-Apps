// Admin-Modul System → Diagnose (Admin-Umbau Etappe 2): dieselbe Diagnose wie auf der Startseite
// (Pass → Sicherung → 5× auf die Versionszeile), hier ohne Versteck. Zeigt Version, Speicher und
// Fehlerprotokoll DIESES Geräts.
'use strict';

LWAdmin.modul({
  id: 'diagnose', bereich: 'system', titel: 'Diagnose', symbol: '🔧', reihenfolge: 30,
  suchbegriffe: ['Diagnose', 'Fehler', 'Fehlerprotokoll', 'Speicher', 'Version'],
  zeigen(host) {
    host.innerHTML = `<div class="lw-karte"><h2>🔧 Diagnose dieses Geräts</h2>
      <p class="lw-klein">Für ein Schüler-iPad: dort auf der Startseite Pass → Sicherung → 5× auf die Versionszeile tippen.</p>
      <div id="sys-diagnose">lädt …</div></div>`;
    const box = host.querySelector('#sys-diagnose');     // eigenes Element: nach dem Verlassen zeichnet diagnose() ins Leere
    if (!window.LernPass || !LernPass.extras) { box.textContent = 'nicht verfügbar'; return; }
    LernPass.extras().then(E => E.diagnose(box)).catch(e => { box.textContent = '⚠ ' + (e.message || e); });
  },
});
