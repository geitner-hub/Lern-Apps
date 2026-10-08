// ═══════════════════════════════════════════════════════
//  Lernwelt – spielsperre.js   (Spiele erst nach guten Lern-Runden)
//
//  Wird von navbar.js nur auf Spielseiten (spiele/…, nicht Mein Dorf) nachgeladen,
//  wenn config.json eine Spielsperre enthält. Die Regel selbst steht in freigabe.js
//  (LernFreigabe.spielSperre), gezählt wird im Pass (today.lr).
//  Ist das Spiel heute noch gesperrt, liegt ein Hinweis über der Seite – mit dem Weg
//  zurück zu den Lern-Apps. Nichts wird gelöscht, das Spiel startet nur nicht.
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.LernFreigabe || window.__lwSpielsperre) return;
  window.__lwSpielsperre = true;

  const ROOT = (window.LW && LW.ROOT) || new URL('../', location.href).href;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let el = null;

  function schwelle() {
    try { const c = JSON.parse(localStorage.getItem('lernwelt-config-cache') || 'null'); return Number(c && c.spielsperre && c.spielsperre.schwelle) || 60; } catch (e) { return 60; }
  }
  function weg() { if (el) { el.remove(); el = null; document.documentElement.style.overflow = ''; } }
  function zeige(s) {
    const rest = s.noetig - s.geschafft;
    if (!el) {
      el = document.createElement('div');
      el.id = 'lw-spielsperre';
      el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'lw-sp-titel');
      el.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:1rem;background:rgba(15,14,26,.94);' +
        'font-family:Nunito,system-ui,sans-serif;color:#f1f0fb;';
      document.body.appendChild(el);
      document.documentElement.style.overflow = 'hidden';
    }
    const punkte = Array.from({ length: s.noetig }, (_, i) => `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;margin:0 3px;${
      i < s.geschafft ? 'background:#e6a817' : 'border:2px solid rgba(230,168,23,.6)'}"></span>`).join('');
    el.innerHTML = `<div style="width:min(420px,100%);background:#1b1929;border:1px solid rgba(230,168,23,.4);border-radius:22px;padding:1.4rem 1.3rem;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)">
      <div style="font-size:3rem;line-height:1">🔒🎮</div>
      <h1 id="lw-sp-titel" style="font-family:'Fredoka One',Nunito,sans-serif;font-weight:400;color:#e6a817;font-size:1.7rem;margin:.5rem 0 .3rem">Erst üben, dann spielen!</h1>
      <p style="font-weight:700;color:rgba(241,240,251,.8);margin:0 0 .8rem">Heute gibt es die Spiele nach ${s.noetig} guten ${s.noetig === 1 ? 'Runde' : 'Runden'} in den Lern-Apps
        (ab ${esc(schwelle())} % richtig). Noch ${rest} ${rest === 1 ? 'Runde' : 'Runden'}!</p>
      <div aria-label="${s.geschafft} von ${s.noetig} geschafft" style="margin-bottom:1rem">${punkte}</div>
      <a href="${esc(ROOT)}index.html" style="display:block;background:#e6a817;color:#231a02;font-weight:900;font-size:1.1rem;padding:.85rem;border-radius:14px;text-decoration:none">📚 Zu den Lern-Apps</a>
      <p style="font-size:.8rem;color:rgba(241,240,251,.45);margin:.7rem 0 0">Mein Dorf ist immer offen.</p></div>`;
    const a = el.querySelector('a'); if (a) a.focus();
  }
  function pruefen() {
    const s = LernFreigabe.spielSperre();
    if (s && !s.frei && LernFreigabe.spielGesperrt(location.pathname)) zeige(s); else weg();
  }
  if (document.body) pruefen(); else document.addEventListener('DOMContentLoaded', pruefen);
  window.addEventListener('lernfreigabe:neu', pruefen);
  window.addEventListener('pageshow', pruefen);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pruefen(); });
})();
