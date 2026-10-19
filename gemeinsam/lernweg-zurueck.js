// ═══════════════════════════════════════════════════════
//  Lernwelt – lernweg-zurueck.js
//  Knopf „🧭 Zurück zum Lernweg“ oben auf App-Seiten, die aus einem Lernweg geöffnet wurden.
//  Der Lernweg (apps/typen/lernweg.html) merkt sich beim Antippen eines App-Links seine Adresse
//  in sessionStorage (lernwelt-lernweg-zurueck, nur dieser Tab); navbar.js lädt diese Datei nur dann.
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  let ziel = '';
  try { ziel = sessionStorage.getItem('lernwelt-lernweg-zurueck') || ''; } catch (e) { return; }
  let url;
  try { url = new URL(ziel, location.href); } catch (e) { return; }
  if (url.origin !== location.origin || !/\/apps\/typen\/lernweg\.html$/.test(url.pathname)) return;
  if (document.getElementById('lw-zurueck')) return;
  const st = document.createElement('style');
  st.textContent = `#lw-zurueck{position:fixed;top:max(.6rem,env(safe-area-inset-top));right:.7rem;z-index:9998;display:flex;align-items:center;gap:.4rem;
    background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:0;border-radius:999px;padding:.55rem 1rem;font:800 .95rem 'Nunito',system-ui,sans-serif;
    box-shadow:0 6px 18px rgba(0,0,0,.35);text-decoration:none;-webkit-tap-highlight-color:transparent}
    #lw-zurueck:active{transform:scale(.96)}
    @media (prefers-reduced-motion:reduce){#lw-zurueck:active{transform:none}}`;
  document.head.appendChild(st);
  const a = document.createElement('a');
  a.id = 'lw-zurueck'; a.href = url.href; a.textContent = '🧭 Zurück zum Lernweg';
  document.body.appendChild(a);
})();
