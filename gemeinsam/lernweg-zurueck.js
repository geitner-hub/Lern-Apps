// ═══════════════════════════════════════════════════════
//  Lernwelt – lernweg-zurueck.js
//  Knopf „🧭 Zurück zum Weg“ oben auf App-Seiten, die aus dem English Journey (apps/englisch/english-journey.html,
//  auch aus dem Laufzettel) geöffnet wurden. Der Weg merkt sich vorher seine Adresse in sessionStorage
//  (lernwelt-lernweg-zurueck, nur dieser Tab; Name aus der Zeit der Lernwege); navbar.js lädt diese Datei nur dann.
//  Nach einer Runde (lernapps:result) leuchtet der Knopf auf.
//  Verzahnung (Lernweg im Journey, Etappe 4): Gehört die Station (#s=…) bzw. der Abschnitt (#w=…) zu einem freigegebenen
//  Abschnitt des Laufzettels, steht daneben „📒 HE 4“ – der Hefteintrag groß, mit der Buchaufgabe darunter. Nach einer Runde
//  unter 70 % kommt der Rückverweis „Schau nochmal in 📒 HE 4 und mach 📖 S. 34 Ü 2“. Daten und journey-lernweg.js laden
//  erst hier nach (aus dem Offline-Speicher).
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  let ziel = '';
  try { ziel = sessionStorage.getItem('lernwelt-lernweg-zurueck') || ''; } catch (e) { return; }
  let url;
  try { url = new URL(ziel, location.href); } catch (e) { return; }
  if (url.origin !== location.origin || !/\/apps\/englisch\/english-journey\.html$/.test(url.pathname)) return;
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
  a.id = 'lw-zurueck'; a.href = url.href; a.textContent = '🧭 Zurück zum Weg';
  document.body.appendChild(a);
  window.addEventListener('lernapps:result', () => { a.classList.add('fertig'); a.textContent = '✓ Zurück zum Weg'; });

  // ── Hilfe-Knopf und Rückverweis ───────────────────
  const h = new URLSearchParams(url.hash.slice(1)), station = h.get('s'), abschnitt = h.get('w');
  if ((!station && !abschnitt) || !window.LW || !LW.laden || !LW.ROOT) return;
  let bz = null, B = {};
  const laden = p => fetch(LW.ROOT + p).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  Promise.all([laden('daten/journey6.json'), laden('daten/journey/bausteine-en6.json'),
    window.LernFreigabe ? null : LW.laden('gemeinsam/freigabe.js'), LW.laden('gemeinsam/journey-lernweg.js')]).then(([J, b]) => {
    (b.bausteine || []).forEach(x => { B[x.id] = x; });
    const cfg = window.LernFreigabe && LernFreigabe.journey ? LernFreigabe.journey('journey6') : null;
    bz = LernJourneyWeg.bezug(station ? { J, cfg, station } : { J, cfg, abschnitt });
    if (!bz || !bz.he.length) return;
    const k = document.createElement('button');
    k.type = 'button'; k.id = 'lw-he'; k.textContent = '📒 ' + heName(bz.he[0]);
    k.title = 'Hefteintrag ansehen';
    k.addEventListener('click', () => zeigen());
    document.body.appendChild(k);
  }).catch(e => console.warn('[Zurück zum Weg] Hefteintrag', e));
  const heName = x => x.nr ? 'HE ' + x.nr : 'Hefteintrag';
  const buch = () => bz && bz.buchUebung ? LernJourneyWeg.buchKurz(bz.buchUebung) : bz && bz.buch ? '📖 Buch ' + LernJourneyWeg.seitenA(bz.abschnitt) : '';
  function zeigen() {
    if (!bz) return;
    bz.he.forEach((x, i) => { if (B[x.id]) LernJourneyWeg.heZeigen(B[x.id], x.nr, i === 0 && buch() ? `<p class="jw-unten">Dazu im Buch: ${buch()}</p>` : ''); });
  }
  const st2 = document.createElement('style');
  st2.textContent = `#lw-he{position:fixed;top:calc(max(.6rem,env(safe-area-inset-top)) + 3.1rem);right:.7rem;z-index:9998;background:#fde68a;color:#3b2a00;border:0;
    border-radius:999px;padding:.5rem .9rem;font:900 .92rem 'Nunito',system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.3);cursor:pointer}
    #lw-rueck{position:fixed;left:50%;bottom:calc(max(1rem,env(safe-area-inset-bottom)) + 4rem);transform:translateX(-50%);z-index:9998;width:min(520px,calc(100% - 1.6rem));
    background:#fbf3e1;color:#2b2118;border-radius:16px;padding:.9rem 1rem;box-shadow:0 14px 34px rgba(0,0,0,.4);font:800 1rem/1.4 'Nunito',system-ui,sans-serif}
    #lw-rueck .z{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.6rem}
    #lw-rueck button{border:0;border-radius:999px;padding:.55rem 1rem;font:900 .95rem 'Nunito',sans-serif;cursor:pointer;background:#eadcbd;color:#2b2118}
    #lw-rueck button.an{background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff}`;
  document.head.appendChild(st2);
  // Unter 70 %: zurück zu Hefteintrag und Buchaufgabe (einmal je Runde)
  window.addEventListener('lernapps:result', e => {
    const p = Number(e.detail && e.detail.percent);
    if (!bz || !(p < 70) || (!bz.he.length && !buch())) return;
    const alt = document.getElementById('lw-rueck'); if (alt) alt.remove();
    const d = document.createElement('div');
    d.id = 'lw-rueck'; d.setAttribute('role', 'status');
    const he = bz.he.length ? '📒 ' + heName(bz.he[0]) : '';
    d.innerHTML = `💡 Das war noch nicht ganz sicher. Schau nochmal ${he ? 'in ' + he : ''}${he && buch() ? ' und mach ' : buch() ? 'ins Buch: ' : ''}${buch()}.
      <div class="z">${he ? `<button type="button" class="an" data-he>${he} ansehen</button>` : ''}<button type="button" data-zu>OK</button></div>`;
    d.addEventListener('click', x => { if (x.target.closest('[data-he]')) zeigen(); if (x.target.closest('button')) d.remove(); });
    document.body.appendChild(d);
  });
})();
