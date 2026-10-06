// ═══════════════════════════════════════════════════════
//  Lernwelt – ziffernblock.js   (großer Ziffernblock für Mathe-Apps, Neue Lern-Apps Etappe 9)
//
//  Genutzt von: apps/mathe/zahlenstrahl.html, apps/mathe/stellenwerttafel.html
//  Großer Ziffernblock 0–9 mit Löschen und Fertig – die iPad-Tastatur öffnet sich nie
//  (keine <input>-Felder). Die Felder sind beliebige Elemente der Seite:
//    • Tippen einer Ziffer füllt das aktive Feld und springt zum nächsten (einstellig)
//      bzw. hängt an (mehrstellig, z. B. ein Zahlenfeld).
//    • Ein angetipptes Feld wird aktiv und lässt sich korrigieren.
//  Auch mit der Tastatur bedienbar (Ziffern, Rücktaste, Enter, Pfeile).
//
//  API (window.LernZiffernblock):
//    erstelle({ box, felder: [Element …], einstellig: true|false, max: 12,
//               gruppieren: true (Tausender-Abstand im Feld), start: 0,
//               fertig(werte) })   → { werte(), aktiv(i), leeren(), weg() }
//    werte: Liste der Texte je Feld ('' = leer)
//    format(zahl|text)  → „3 400 000“ (schmales Leerzeichen als Tausender-Abstand)
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernZiffernblock) return;

  const CSS = `
  .zb{display:grid;grid-template-columns:repeat(6,1fr);gap:.4rem;max-width:560px;margin:.6rem auto 0}
  .zb button{min-height:3.2rem;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:#252238;color:#f1f0fb;
     font:900 1.5rem 'Nunito',system-ui,sans-serif;cursor:pointer;touch-action:manipulation}
  .zb button:active{transform:scale(.95)}
  .zb .zb-weg{background:rgba(248,113,113,.18)} .zb .zb-ok{background:#e6a817;color:#231a02}
  .zb-feld{cursor:pointer}
  .zb-feld.zb-aktiv{outline:3px solid #e6a817;outline-offset:-3px;background:rgba(230,168,23,.12)}
  @media (max-width:420px){.zb button{min-height:2.8rem;font-size:1.3rem}}
  @media (prefers-reduced-motion:reduce){.zb button:active{transform:none}}`;

  const DUENN = ' ';
  function format(z) {
    const s = String(z == null ? '' : z).replace(/\D/g, '');
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, DUENN);
  }

  let laufend = null;                                    // nur ein Block hört auf die Tastatur
  document.addEventListener('keydown', e => {
    if (!laufend || !document.body.contains(laufend.box)) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); laufend.taste(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); laufend.taste('weg'); }
    else if (e.key === 'Enter') { e.preventDefault(); laufend.taste('ok'); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); laufend.schiebe(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); laufend.schiebe(-1); }
  });

  function erstelle(o) {
    if (!document.getElementById('zb-css')) { const st = document.createElement('style'); st.id = 'zb-css'; st.textContent = CSS; document.head.appendChild(st); }
    const felder = o.felder || [], einstellig = o.einstellig !== false && felder.length > 1, max = o.max || 12;
    const werte = felder.map(() => '');
    let i = Math.max(0, Math.min(felder.length - 1, o.start || 0));
    const zeig = k => { const f = felder[k]; f.textContent = o.gruppieren ? format(werte[k]) : werte[k]; f.classList.toggle('zb-leer', !werte[k]); };
    function aktiv(k) {
      i = Math.max(0, Math.min(felder.length - 1, k));
      felder.forEach((f, n) => f.classList.toggle('zb-aktiv', n === i));
    }
    felder.forEach((f, n) => { f.classList.add('zb-feld'); f.addEventListener('click', () => aktiv(n)); zeig(n); });
    const box = document.createElement('div');
    box.className = 'zb';
    box.innerHTML = ['1', '2', '3', '4', '5', 'weg', '6', '7', '8', '9', '0', 'ok'].map(k =>
      k === 'weg' ? '<button type="button" class="zb-weg" data-k="weg" aria-label="Löschen">⌫</button>'
      : k === 'ok' ? '<button type="button" class="zb-ok" data-k="ok" aria-label="Fertig">✓</button>'
      : `<button type="button" data-k="${k}">${k}</button>`).join('');
    o.box.appendChild(box);
    const api = {
      box,
      taste(k) {
        if (k === 'ok') { if (o.fertig) o.fertig(werte.slice()); return; }
        if (k === 'weg') {
          if (einstellig) { if (!werte[i] && i > 0) aktiv(i - 1); werte[i] = ''; }
          else werte[i] = werte[i].slice(0, -1);
          return zeig(i);
        }
        if (einstellig) { werte[i] = k; zeig(i); if (i < felder.length - 1) aktiv(i + 1); }
        else if (werte[i].length < max) { werte[i] = (werte[i] === '0' ? '' : werte[i]) + k; zeig(i); }
      },
      schiebe(d) { aktiv(i + d); },
    };
    box.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) api.taste(b.dataset.k); });
    laufend = api;
    aktiv(i);
    return {
      werte: () => werte.slice(),
      aktiv,
      leeren() { werte.fill(''); felder.forEach((f, n) => zeig(n)); aktiv(0); },
      weg() { if (laufend === api) laufend = null; box.remove(); },
    };
  }

  window.LernZiffernblock = { erstelle, format };
})();
