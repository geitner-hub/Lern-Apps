// ═══════════════════════════════════════════════════════
//  Lernwelt – lernweg-zurueck.js
//  Knopf „🧭 Zurück zum Lernweg“ oben auf App-Seiten, die aus einem Lernweg geöffnet wurden.
//  Der Lernweg (apps/typen/lernweg.html) merkt sich beim Antippen eines App-Links seine Adresse
//  in sessionStorage (lernwelt-lernweg-zurueck, nur dieser Tab); navbar.js lädt diese Datei nur dann.
//  English Journey (apps/englisch/english-journey.html) nutzt denselben Schlüssel: „🧭 Zurück zum Weg“,
//  nach einer Runde (lernapps:result) leuchtet der Knopf auf.
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  let ziel = '';
  try { ziel = sessionStorage.getItem('lernwelt-lernweg-zurueck') || ''; } catch (e) { return; }
  let url;
  try { url = new URL(ziel, location.href); } catch (e) { return; }
  const journey = /\/apps\/englisch\/english-journey\.html$/.test(url.pathname);
  if (url.origin !== location.origin || !(journey || /\/apps\/typen\/lernweg\.html$/.test(url.pathname))) return;
  if (document.getElementById('lw-zurueck')) return;
  const st = document.createElement('style');
  st.textContent = `#lw-zurueck{position:fixed;top:max(.6rem,env(safe-area-inset-top));right:.7rem;z-index:9998;display:flex;align-items:center;gap:.4rem;
    background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:0;border-radius:999px;padding:.55rem 1rem;font:800 .95rem 'Nunito',system-ui,sans-serif;
    box-shadow:0 6px 18px rgba(0,0,0,.35);text-decoration:none;-webkit-tap-highlight-color:transparent}
    #lw-zurueck:active{transform:scale(.96)}
    #lw-zurueck.fertig{background:linear-gradient(135deg,#e6a817,#f5c84c);color:#2b1d00;animation:lwz 1.2s ease-in-out 3}
    @keyframes lwz{50%{transform:scale(1.08)}}
    @media (prefers-reduced-motion:reduce){#lw-zurueck:active{transform:none}#lw-zurueck.fertig{animation:none}}`;
  document.head.appendChild(st);
  const a = document.createElement('a');
  a.id = 'lw-zurueck'; a.href = url.href; a.textContent = journey ? '🧭 Zurück zum Weg' : '🧭 Zurück zum Lernweg';
  document.body.appendChild(a);
  if (journey) window.addEventListener('lernapps:result', () => { a.classList.add('fertig'); a.textContent = '✓ Zurück zum Weg'; });
})();
