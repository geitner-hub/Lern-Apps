// ═══════════════════════════════════════════════════════
//  Lernwelt – pass-extras.js   (Zusatzmodul zum Lernwelt-Pass, Infrastruktur Etappe 2)
//
//  Wird NICHT direkt eingebunden: gemeinsam/pass.js lädt diese Datei beim ersten
//  Bedarf nach (LernPass.extras()). Darin steht alles, was nicht zum Rechnen und
//  Speichern gehört:
//    - XP-Meldung nach einer Runde (toast) und Avatar-Auftritt mit Lob
//    - Konfetti & Feuerwerk (celebrate)
//    - Hinweis „Du bist in Safari“ (safariHinweis)
//    - Speicher-Wartung, einmal am Tag von der Startseite (wartung)
//    - versteckte Diagnose-Ansicht im Pass (diagnose)
//
//  API (window.LernPassExtras) – Apps rufen weiter LernPass.toast / LernPass.celebrate auf:
//    toast(res, K)        K = { avatar, endlessGoodCorrect, showAvatar, celebrate }
//    celebrate(art)       'konfetti' | 'feuerwerk'
//    safariHinweis(tag)
//    wartung(tag)         → { kb, verdichtet, knapp }
//    diagnose(host)       zeichnet die Diagnose in ein Element
//    belegt()             Speicherbelegung → { bytes, liste, knapp }
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernPassExtras) return;

  // ── XP-Meldung nach einer Runde ─────────────────────────
  function toast(res, K) {
    if (!document.body || !res) return;
    let el = document.getElementById('lw-pass-toast');
    if (!el) {
      const st = document.createElement('style');
      st.textContent = `
        #lw-pass-toast{position:fixed;top:1rem;left:50%;transform:translate(-50%,-140%);z-index:10001;
          background:#1b1929;color:#f1f0fb;border:1px solid rgba(230,168,23,.45);border-radius:16px;
          box-shadow:0 12px 40px rgba(0,0,0,.45);padding:.7rem 1.1rem;min-width:220px;max-width:min(92vw,380px);
          font-family:'Nunito','Segoe UI',sans-serif;transition:transform .35s cubic-bezier(.2,.9,.3,1.2);text-align:center;}
        #lw-pass-toast.show{transform:translate(-50%,0);}
        #lw-pass-toast .t-xp{font-family:'Fredoka One','Nunito',sans-serif;font-size:1.5rem;color:#e6a817;line-height:1.1;}
        #lw-pass-toast .t-lines{font-size:.74rem;color:rgba(241,240,251,.65);margin-top:.25rem;line-height:1.35;}
        #lw-pass-toast .t-big{font-weight:900;font-size:.95rem;margin-top:.35rem;}
        #lw-pass-toast .t-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.1);margin-top:.45rem;overflow:hidden;}
        #lw-pass-toast .t-fill{height:100%;background:linear-gradient(90deg,#6366f1,#e6a817);border-radius:99px;transition:width .6s ease;}
        @media (prefers-reduced-motion: reduce){#lw-pass-toast{transition:none;}}`;
      document.head.appendChild(st);
      el = document.createElement('div');
      el.id = 'lw-pass-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    let html;
    if (res.notice) {
      html = (res.newBadges || []).map(n => `<div class="t-big">${esc(n.badge.icon)} Abzeichen „${esc(n.badge.name)}“!${n.items.length ? ' +' + n.items.length + ' Set-Teil' + (n.items.length > 1 ? 'e' : '') : ''}</div>`).join('');
    } else if (res.blocked === 'fast') {
      html = `<div class="t-xp" style="color:#f87171">0 XP</div>
              <div class="t-lines">Das ging sehr schnell. Nimm dir Zeit für die Aufgaben – dann gibt es XP!</div>`;
    } else {
      const lv = res.level;
      html = `<div class="t-xp">+${res.xp} XP</div>
              <div class="t-lines">${res.lines.map(esc).join('<br>')}</div>
              ${res.levelUp ? `<div class="t-big">🎉 Level ${lv.level}: ${esc(lv.title)}!</div>` : ''}
              ${res.starUp ? `<div class="t-big">${['', '🥉 Bronze', '🥈 Silber', '🥇 Gold'][res.starUp]}-Stern verdient!</div>` : ''}
              ${res.levelChest ? `<div class="t-big">🎁 Level-Truhe verdient!</div>` : ''}
              ${res.chest ? `<div class="t-big">🎁 Neue Truhe verdient!</div>` : ''}
              ${res.eventGift ? `<div class="t-big">${esc(res.eventGift.icon)} ${esc(res.eventGift.geschenk || res.eventGift.name + '-Geschenk')}: eine Truhe für dich!</div>` : ''}
              ${(res.newBadges || []).map(n => `<div class="t-big">${esc(n.badge.icon)} Abzeichen „${esc(n.badge.name)}“!${n.items.length ? ' +' + n.items.length + ' Set-Teil' + (n.items.length > 1 ? 'e' : '') : ''}</div>`).join('')}
              <div class="t-bar"><div class="t-fill" style="width:${lv.pct}%"></div></div>
              <div class="t-lines">Level ${lv.level} · ${lv.into} / ${lv.need} XP</div>`;
    }
    el.innerHTML = html;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(el._t);
    const big = res.levelUp || res.starUp || res.chest || res.eventGift || (res.newBadges && res.newBadges.length);
    el._t = setTimeout(() => el.classList.remove('show'), big ? 6500 : 4200);
    avatarForResult(res, K);
  }

  // ── Konfetti & Feuerwerk (Canvas, ohne 3D) ──────────────
  const FARBEN = ['#e6a817', '#f43f5e', '#6366f1', '#22c55e', '#38bdf8', '#f472b6', '#facc15', '#ffffff'];
  function celebrate(art) {
    if (!document.body || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10003';
    document.body.appendChild(cv);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const x = cv.getContext('2d'); x.scale(dpr, dpr);
    const parts = [], rnd = (a, b) => a + Math.random() * (b - a);
    const scale = Math.min(1, W / 900) * .5 + .5;
    function konfetti(ox, oy, dir, n) {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + dir * rnd(.15, .75), v = rnd(9, 17) * scale;
        parts.push({ k: 'k', x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: rnd(6, 10), h: rnd(3, 6), r: rnd(0, 6), vr: rnd(-.3, .3),
                     c: FARBEN[i % FARBEN.length], life: rnd(2.2, 3), t: 0 });
      }
    }
    function knall(ox, oy) {
      const c = FARBEN[Math.floor(Math.random() * 7)], n = 46;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, v = rnd(2.5, 5.5) * scale;
        parts.push({ k: 'f', x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: Math.random() < .25 ? '#ffffff' : c, life: rnd(1.1, 1.6), t: 0 });
      }
    }
    const rockets = [];
    if (art === 'feuerwerk') {
      for (let i = 0; i < 5; i++) rockets.push({ at: i * .38, x: rnd(W * .15, W * .85), ty: rnd(H * .15, H * .45), y: H + 10, fired: false });
    } else {
      konfetti(0, H * .75, 1, 70); konfetti(W, H * .75, -1, 70);
    }
    let t0 = performance.now(), last = t0;
    (function frame(now) {
      const dt = Math.min((now - last) / 16.7, 3), T = (now - t0) / 1000; last = now;
      x.clearRect(0, 0, W, H);
      rockets.forEach(r => {
        if (r.done || T < r.at) return;
        r.y -= (r.y - r.ty) * .09 * dt + 2 * dt;
        x.fillStyle = '#fde68a'; x.fillRect(r.x - 1.5, r.y, 3, 10);
        if (r.y <= r.ty + 4) { r.done = true; knall(r.x, r.ty); }
      });
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += dt / 60;
        if (p.t > p.life) { parts.splice(i, 1); continue; }
        const fade = Math.min(1, (p.life - p.t) * 2.5);
        x.globalAlpha = fade;
        if (p.k === 'k') {
          p.vy += .32 * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
          x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c;
          x.fillRect(-p.w / 2, -p.h / 2 * Math.abs(Math.cos(p.r * 2)), p.w, p.h * Math.abs(Math.cos(p.r * 2)) + .5); x.restore();
        } else {
          p.vy += .06 * dt; p.vx *= .97; p.vy *= .97; p.x += p.vx * dt; p.y += p.vy * dt;
          x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, 2.2, 0, 6.283); x.fill();
        }
      }
      x.globalAlpha = 1;
      if (parts.length || rockets.some(r => !r.done)) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  const pick = list => list[Math.floor(Math.random() * list.length)];
  const LOB = {
    top:  ['Super gemacht! 🌟', 'Wow, stark! 💪', 'Spitze! 🚀', 'Klasse Runde! ⭐'],
    gut:  ['Toll gemacht! 👍', 'Gute Runde! 😄', 'Richtig gut! ✨'],
    okay: ['Gut gemacht! 🙂', 'Weiter so! 👏', 'Das wird immer besser!'],
    mut:  ['Dranbleiben – du schaffst das! 💪', 'Übung macht den Meister! 🙂', 'Probier es gleich nochmal!', 'Jeder Versuch hilft dir! 👍'],
  };
  function avatarForResult(res, K) {
    if (!res || res.blocked) return;
    const badges = res.newBadges || [];
    const perfekt = !res.notice && !res.endless && Number(res.pct) === 100 && Number(res.xp) > 0;
    if (K.avatar) {
      if (res.levelUp || badges.length) celebrate('feuerwerk');
      else if (perfekt || res.starUp === 3 || res.chest || res.eventGift) celebrate('konfetti');
    }
    let text = '', big = true;
    if (res.endless && !res.levelUp && !badges.length && !res.chest && !res.eventGift) {
      text = res.newDayBest && res.correct > 0 ? pick(['Neuer Tagesrekord! 🏃', 'So weit warst du heute noch nie! 🚀', 'Stark gelaufen! 💪'])
           : res.correct >= K.endlessGoodCorrect ? pick(LOB.gut) : pick(LOB.mut);
      K.showAvatar({ text, big: false, aktion: res.correct >= K.endlessGoodCorrect ? 'jubeln' : 'winken' });
      return;
    }
    if (res.levelUp) text = `Level ${res.levelUp.level}! 🎉` + (res.levelChest ? ' + Truhe 🎁' : '');
    else if (badges.length) text = `Abzeichen: ${badges[0].badge.name}! ${badges[0].badge.icon}`;
    else if (res.starUp) text = ['', 'Bronze-Stern! 🥉', 'Silber-Stern! 🥈', 'Gold-Stern! 🥇'][res.starUp];
    else if (res.chest) text = 'Neue Truhe! 🎁';
    else if (res.eventGift) text = `${res.eventGift.icon} Geschenk-Truhe!`;
    else big = false;
    if (res.notice && !big) return;
    const pct = Number(res.pct) || 0;
    if (!big) text = perfekt ? pick(['Perfekt – alles richtig! 💯', 'Null Fehler! 💯', 'Wahnsinn, alles richtig! 🏆']) : pick(pct >= 90 ? LOB.top : pct >= 70 ? LOB.gut : pct >= 50 ? LOB.okay : LOB.mut);
    K.showAvatar({ text, big, aktion: big || pct >= 50 ? 'jubeln' : 'winken' });
  }

  // ── Hinweis in Safari (iPad/iPhone): der Pass wohnt im App-Symbol ──
  //  pass.js prüft vorher, ob er heute schon gezeigt wurde.
  function safariHinweis(tag) {
    const KEY = 'lernwelt-safari-hinweis';
    if (document.getElementById('lw-safari')) return;
    const st = document.createElement('style');
    st.textContent = `
      #lw-safari{position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:10004;
        width:min(94vw,520px);background:#fff8e6;color:#2a1d00;border:2px solid #e6a817;border-radius:16px;
        box-shadow:0 12px 36px rgba(0,0,0,.35);padding:.75rem .9rem;font:700 .86rem/1.4 'Nunito','Segoe UI',sans-serif;}
      #lw-safari b{font-weight:900;}
      #lw-safari .row{display:flex;gap:.7rem;align-items:flex-start;}
      #lw-safari .ic{font-size:1.7rem;line-height:1;}
      #lw-safari .small{font-size:.74rem;color:#6b5a2a;margin-top:.35rem;font-weight:700;}
      #lw-safari button{margin-top:.55rem;background:#e6a817;color:#2a1d00;border:0;border-radius:10px;padding:.45rem .9rem;
        font:900 .84rem 'Nunito','Segoe UI',sans-serif;cursor:pointer;}`;
    document.head.appendChild(st);
    const el = document.createElement('div');
    el.id = 'lw-safari';
    el.setAttribute('role', 'alert');
    el.innerHTML = `<div class="row"><span class="ic">🧭</span><div>
      <b>Du bist gerade in Safari.</b> Dein Lernwelt-Pass wohnt im <b>Lernwelt-Symbol</b> auf dem Home-Bildschirm –
      was du hier übst, zählt dort nicht. Öffne lieber das Symbol und scanne QR-Codes dort mit <b>📷 QR scannen</b>.
      <div class="small">Noch kein Symbol? Teilen-Knopf → „Zum Home-Bildschirm“.</div>
      <button type="button">Verstanden</button></div></div>`;
    el.querySelector('button').onclick = () => { try { localStorage.setItem(KEY, tag); } catch (e) {} el.remove(); };
    document.body.appendChild(el);
  }

  // ── Speicher-Wartung (einmal am Tag) ────────────────────
  //  1. Ergebnis-Verlauf (lern-apps-results): Einträge älter als VERDICHTEN_TAGE werden je
  //     App zu einem Eintrag pro Tag zusammengefasst (bester Wert des Tages, Anzahl n).
  //     Das Format { t, p } bleibt, damit Sterne und Statistik weiter funktionieren.
  //  2. Belegung messen und in 'lernwelt-wartung' merken. Bei knappem Speicher zeigt
  //     die Pass-Sicherung eine Warnung (index.html).
  const WARTUNG_KEY = 'lernwelt-wartung';
  const RESULTS_KEY = 'lern-apps-results';
  const VERDICHTEN_TAGE = 60;
  //  Safari erlaubt je Adresse (geitner-hub.github.io, alle Repos zusammen) etwa 5 MB.
  const SPEICHER_WARNUNG = 4 * 1024 * 1024;              // ⚙ ab hier warnt die Pass-Sicherung
  /** Belegung des Gerätespeichers → { bytes, liste:[{key, bytes}], knapp } */
  function belegt() {
    const liste = [];
    let bytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i), v = localStorage.getItem(k) || '';
        const b = (k.length + v.length) * 2;               // Zeichen werden als UTF-16 gespeichert
        bytes += b;
        liste.push({ key: k, bytes: b });
      }
    } catch (e) {}
    liste.sort((a, b) => b.bytes - a.bytes);
    const voll = !!(window.LW && LW.speicher && LW.speicher.voll());
    return { bytes, liste, knapp: voll || bytes > SPEICHER_WARNUNG };
  }
  function wartung(tag) {
    let verdichtet = 0;
    try {
      const raw = localStorage.getItem(RESULTS_KEY);
      const all = raw ? JSON.parse(raw) : null;
      if (all && typeof all === 'object') {
        const grenze = Date.now() - VERDICHTEN_TAGE * 864e5;
        const tagVon = t => { const d = new Date(t); return d.getFullYear() * 1e4 + (d.getMonth() + 1) * 100 + d.getDate(); };
        Object.values(all).forEach(r => {
          if (!r || !Array.isArray(r.history)) return;
          const alt = r.history.filter(h => h && h.t < grenze), neu = r.history.filter(h => !h || !(h.t < grenze));
          const jeTag = {};
          alt.forEach(h => {
            const k = tagVon(h.t), x = jeTag[k];
            if (!x) jeTag[k] = { t: h.t, p: h.p, n: h.n || 1 };
            else { x.p = Math.max(x.p, h.p); x.n += h.n || 1; }
          });
          const zus = Object.values(jeTag).sort((a, b) => a.t - b.t);
          if (zus.length < alt.length) { verdichtet += alt.length - zus.length; r.history = zus.concat(neu); }
        });
        if (verdichtet) localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
      }
    } catch (e) { if (window.LW && LW.speicher) LW.speicher.fehlgeschlagen(e); }
    const b = belegt();
    const info = { tag, kb: Math.round(b.bytes / 1024), verdichtet, knapp: b.knapp };
    try { localStorage.setItem(WARTUNG_KEY, JSON.stringify(info)); } catch (e) {}
    return info;
  }

  // ── Diagnose (Pass → Sicherung → 5× auf die Versionszeile tippen) ──
  //  Zeigt Version, Speicherbelegung, Offline-Speicher und das Fehlerprotokoll.
  async function diagnose(host) {
    if (!host) return;
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const LWX = window.LW || {};
    const b = belegt();
    const f = LWX.fehler ? LWX.fehler.liste().slice().reverse() : [];
    let offline = 'nicht verfügbar';
    try {
      if (window.caches) {
        const namen = await caches.keys();
        const teile = [];
        for (const n of namen) teile.push(n + ': ' + (await (await caches.open(n)).keys()).length + ' Dateien');
        offline = teile.join(' · ') || 'leer';
      }
    } catch (e) {}
    const zeit = t => new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    host.innerHTML = `
      <div class="lw-sec" style="font-size:.74rem;line-height:1.45;text-align:left">
        <h3>🔧 Diagnose</h3>
        <div><b>Version:</b> ${esc(LWX.versionText ? LWX.versionText() : '?')} · ${esc(navigator.userAgent.match(/OS [\d_]+/) ? navigator.userAgent.match(/OS [\d_]+/)[0].replace(/_/g, '.') : '')}</div>
        <div><b>Speicher:</b> ${Math.round(b.bytes / 1024)} KB belegt${b.knapp ? ' ⚠️ knapp' : ''} – größte: ${b.liste.slice(0, 4).map(x => esc(x.key) + ' ' + Math.round(x.bytes / 1024) + ' KB').join(', ')}</div>
        <div><b>Offline-Speicher:</b> ${esc(offline)}</div>
        <div style="margin-top:.4rem"><b>Fehlerprotokoll</b> (${f.length}):</div>
        ${f.length ? `<div style="max-height:180px;overflow:auto;font-family:ui-monospace,Menlo,monospace;font-size:.68rem">${f.map(x =>
          `<div style="padding:.2rem 0;border-bottom:1px solid rgba(255,255,255,.08)">${zeit(x.t)} · ${esc(x.s)} · ${esc(x.v || '')}${x.n > 1 ? ' · ' + x.n + '×' : ''}<br>${esc(x.m)}${x.w ? ' <span style="opacity:.6">(' + esc(x.w) + ')</span>' : ''}</div>`).join('')}</div>`
          : '<div>keine Einträge ✓</div>'}
        <div class="lw-btns"><button type="button" class="lw-btn" data-diagnose="leeren">Protokoll leeren</button></div>
      </div>`;
    const knopf = host.querySelector('[data-diagnose="leeren"]');
    if (knopf) knopf.onclick = () => { if (LWX.fehler) LWX.fehler.leeren(); diagnose(host); };
  }

  window.LernPassExtras = { toast, celebrate, safariHinweis, wartung, diagnose, belegt };
})();
