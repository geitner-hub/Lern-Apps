// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Beamer-Großansicht mit QR-Code  (Admin-Umbau Etappe 4, auch für den Unterrichtsmodus)
//
//    LWAdmin.beamer({ titel, unter, link })   // weiß, bildschirmfüllend, QR-Code + Kurzform des Links
//
//  Antippen oder Esc schließt. Der QR-Code entsteht lokal (qrcode.js, renderQR aus shared.js).
// ═══════════════════════════════════════════════════════
'use strict';

window.LWAdmin = window.LWAdmin || {};

(() => {
  let el = null;
  function anlegen() {
    el = document.createElement('div');
    el.id = 'lw-beamer';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Beamer-Ansicht');
    el.innerHTML = '<div class="lw-beamer-titel"></div><div class="lw-beamer-unter"></div><canvas></canvas>' +
      '<div class="lw-beamer-link"></div><div class="lw-beamer-hinweis">Antippen oder Esc zum Schließen</div>';
    el.addEventListener('click', zu);
    document.body.appendChild(el);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) zu(); });
    document.addEventListener('fullscreenchange', () => { if (!el.hidden && !document.fullscreenElement) el.hidden = true; });
  }
  function zu() {
    el.hidden = true;
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.webkitFullscreenElement) document.webkitExitFullscreen();
    } catch (e) {}
  }
  LWAdmin.beamer = ({ titel, unter = '', link }) => {
    if (!el) anlegen();
    el.querySelector('.lw-beamer-titel').textContent = titel || '';
    el.querySelector('.lw-beamer-unter').textContent = unter;
    el.querySelector('.lw-beamer-link').textContent = String(link).replace(/^https:\/\//, '');
    if (!renderQR(el.querySelector('canvas'), link, 1100)) return false;
    el.hidden = false;
    try { (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); } catch (e) {}
    return true;
  };
})();
