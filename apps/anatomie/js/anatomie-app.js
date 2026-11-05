/* ═══════════════════════════════════════════════════════
   Lernwelt – apps/anatomie/js/anatomie-app.js
   Anatomie-Testat-Trainer: Tafeln (echte Abbildungen mit Masken und Pins), Karteikarten,
   Testatfragen, Sortieren, Lückentabellen, Bildnachweise. Ohne Abhängigkeiten.
   Meldet bewusst KEIN Ergebnis an die Lernwelt (kein LernApps.saveResult):
   die App ist für eine erwachsene Person und zählt nicht für Pass, XP, Spielsperre oder Dorf.
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const KAP = (window.KAPITEL_LISTE || [])[0];
  const NACHWEIS = window.ANATOMIE_BILDNACHWEISE || {};
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sicher = u => /^https:\/\/(commons|upload)\.wikimedia\.org\//.test(String(u || '')) || /^https:\/\/creativecommons\.org\//.test(String(u || ''));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const refHtml = r => `<span class="ref">Prometheus <b>${esc(r)}</b></span>`;
  const kurz = id => KAP.strukturen[id].lat.replace(/\s*\(.*\)$/, '');
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- Speicher (nur dieses Gerät, nicht in der Sicherungskarte) ----------
     lernwelt-anatomie = { kap: { <kapitel-id>: { str, box, quiz, sort, ui } }, thema: 'dunkel'|'hell' } */
  const SPEICHER_KEY = 'lernwelt-anatomie';
  let alles = { kap: {} };
  try { const raw = localStorage.getItem(SPEICHER_KEY); if (raw) alles = Object.assign(alles, JSON.parse(raw)); } catch (e) { /* ohne Speicher weiter */ }
  if (!alles.kap || typeof alles.kap !== 'object') alles.kap = {};
  let store = Object.assign({ str: {}, box: {}, quiz: {}, sort: {}, ui: {} }, alles.kap[KAP.id] || {});
  alles.kap[KAP.id] = store;
  const save = () => { try { localStorage.setItem(SPEICHER_KEY, JSON.stringify(alles)); } catch (e) { } };

  /* ---------- Hell/Dunkel (Lernwelt: dunkel als Standard) ---------- */
  const themaKnopf = $('#themaKnopf');
  const setzeThema = t => {
    document.documentElement.dataset.theme = t === 'hell' ? 'light' : 'dark';
    themaKnopf.textContent = t === 'hell' ? '☾' : '☀';
    themaKnopf.setAttribute('aria-label', t === 'hell' ? 'Dunkles Schema' : 'Helles Schema');
  };
  setzeThema(alles.thema || 'dunkel');
  themaKnopf.onclick = () => { alles.thema = alles.thema === 'hell' ? 'dunkel' : 'hell'; save(); setzeThema(alles.thema); };
  const markStr = (id, ok) => { const s = store.str[id] || { r: 0, f: 0 }; ok ? s.r++ : s.f++; s.last = ok ? 1 : 0; store.str[id] = s; save(); };
  const strState = id => { const s = store.str[id]; if (!s) return ''; return s.last ? 'ok' : 'bad'; };

  /* ---------- Kopf ---------- */
  $('#crumbs').innerHTML = `<span>Prometheus</span><span>${esc(KAP.band)}</span><span>${esc(KAP.teil)}</span>`;
  $('#kapTitel').innerHTML = `${esc(KAP.titel)}<small>${esc(KAP.seiten)}</small>`;
  const app = $('#app');
  const views = { start: vStart, tafeln: vTafeln, karten: vKarten, fragen: vFragen, sortieren: vSortieren, tabellen: vTabellen, bilder: vBilder };
  function route() {
    const name = (location.hash || '#start').slice(1);
    const v = views[name] ? name : 'start';
    document.querySelectorAll('#tabs a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + v ? 'page' : 'false'));
    zoomAus();
    app.innerHTML = ''; views[v]();
  }
  window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

  /* ---------- Übersicht ---------- */
  function vStart() {
    const strIds = new Set(); KAP.tafeln.forEach(t => t.pins.forEach(p => strIds.add(p[0])));
    const strOk = [...strIds].filter(id => strState(id) === 'ok').length;
    const kartOk = KAP.karten.filter(k => (store.box[k.id] || 0) >= 3).length;
    const fragOk = KAP.fragen.filter(f => store.quiz[f.id] === 1).length;
    const sortOk = KAP.sortieren.items.filter(i => store.sort[i.id] === 1).length;
    const pct = (a, b) => Math.round(100 * a / b);
    app.innerHTML = `
      <section class="intro">
        <div>
          <p>Lerntrainer für das Testat zum Rumpfskelett: Wirbelsäule, Bandscheibe, Bänder, Kopfgelenke, Thorax, Becken und Iliosakralgelenk. Die Tafeln sind echte anatomische Abbildungen (Gray’s Anatomy, 1918) mit abgedeckter Beschriftung. Jede Struktur, Tafel und Frage verweist auf Seite und Abbildung im Prometheus.</p>
          <p class="hint">Tipp: Erst eine Tafel im Modus „Erkunden“ ansehen, dann „Zuordnen“ und „Benennen“. Karteikarten täglich kurz wiederholen.</p>
        </div>
        <div class="panel">
          <h2>Dein Stand</h2>
          <div class="ref" style="margin-bottom:8px">gespeichert in diesem Browser</div>
          ${[['Strukturen sicher', strOk, strIds.size], ['Karten ab Fach 3', kartOk, KAP.karten.length], ['Testatfragen richtig', fragOk, KAP.fragen.length], ['Merkmale sortiert', sortOk, KAP.sortieren.items.length]]
            .map(([t, a, b]) => `<div style="margin:8px 0"><div class="row" style="justify-content:space-between"><span>${t}</span><span class="ref">${a} / ${b}</span></div><div class="meter"><i style="width:${pct(a, b)}%"></i></div></div>`).join('')}
        </div>
      </section>
      <section class="modes">
        <a class="mode" href="#tafeln"><h3>Tafeln beschriften</h3><p>${KAP.tafeln.length} Tafeln: erkunden, Begriffe an die Struktur ziehen, Strukturen finden und benennen.</p></a>
        <a class="mode" href="#karten"><h3>Karteikarten</h3><p>${KAP.karten.length} Karten mit Wiederholung in fünf Fächern.</p></a>
        <a class="mode" href="#fragen"><h3>Testatfragen</h3><p>${KAP.fragen.length} Fragen mit Erklärung, nach Lerneinheit filterbar.</p></a>
        <a class="mode" href="#sortieren"><h3>Merkmale sortieren</h3><p>Ordne ${KAP.sortieren.items.length} Merkmale Hals-, Brust-, Lendenwirbel oder Kreuzbein zu.</p></a>
        <a class="mode" href="#tabellen"><h3>Lückentabellen</h3><p>Bewegungsausmaß, Beckenmaße und Rippen-Wirbel-Verbindungen.</p></a>
      </section>
      <h2>Lerneinheiten im Buch</h2>
      <ul class="units">${KAP.einheiten.map(u => `<li><span class="nr">${u.nr}</span><span>${esc(u.titel)}</span><span class="pg">S. ${u.seite}</span></li>`).join('')}</ul>`;
  }

  /* ---------- Tafeln ----------
     Jede Tafel: bild (Pfad), w/h (Pixel des Originals), masken [[x,y,b,h], …] decken die Original-
     beschriftung ab, pins [[strukturId, x, y], …] in Pixeln des Originals, nachweis = Schlüssel in
     data/anatomie-bildnachweise.js. */
  let tState = { idx: Math.min(store.ui.tafel || 0, KAP.tafeln.length - 1), mode: store.ui.tmode || 'erkunden' };
  function vTafeln() {
    const lay = el('div', { class: 'tafel-layout' });
    lay.innerHTML = `<div class="tafel-list" id="tlist"></div>
      <div><div class="toolbar">
        <select class="tafel-pick" id="tpick" aria-label="Tafel wählen"></select>
        <div class="seg" id="tmode" role="group" aria-label="Modus">
          ${[['erkunden', 'Erkunden'], ['zuordnen', 'Zuordnen'], ['finden', 'Finden'], ['benennen', 'Benennen']].map(([k, t]) => `<button data-m="${k}">${t}</button>`).join('')}
        </div></div>
        <figure class="plate" id="plate"><div class="plate-head"><h2 id="ttitle"></h2><span class="view" id="tview"></span></div>
        <div class="fig" id="fig"></div>
        <figcaption><div class="row" style="justify-content:space-between;margin-top:8px"><span id="tref"></span><span class="ref" id="tunit"></span></div>
        <div class="row" style="justify-content:space-between;margin-top:4px"><button class="quelle" id="tquelle" type="button" aria-expanded="false">Bildquelle</button><span class="hint">Zoom: ＋/−, Doppeltipp oder zwei Finger</span></div>
        <div id="tquellbox" hidden></div></figcaption></figure>
      </div>
      <aside class="side" id="side"></aside>`;
    app.appendChild(lay);
    const list = $('#tlist'), pick = $('#tpick');
    KAP.tafeln.forEach((t, i) => {
      const done = t.pins.filter(p => strState(p[0]) === 'ok').length;
      const b = el('button', { 'data-i': i }, `<span class="n">${i + 1}</span><span class="t">${esc(t.title)}</span><span class="d">${esc(t.ref)}</span><span class="dots">${t.pins.map(p => `<i class="${strState(p[0]) === 'ok' ? 'ok' : ''}"></i>`).join('')}</span>`);
      b.title = `${done} von ${t.pins.length} Strukturen sicher`;
      b.onclick = () => { tState.idx = i; store.ui.tafel = i; save(); renderTafel(); };
      list.appendChild(b);
      pick.appendChild(el('option', { value: i }, `${i + 1} · ${esc(t.title)}`));
    });
    pick.onchange = () => { tState.idx = +pick.value; store.ui.tafel = tState.idx; save(); renderTafel(); };
    $('#tmode').querySelectorAll('button').forEach(b => b.onclick = () => { tState.mode = b.dataset.m; store.ui.tmode = tState.mode; save(); renderTafel(); });
    $('#tquelle').onclick = () => {
      const box = $('#tquellbox'); box.hidden = !box.hidden;
      $('#tquelle').setAttribute('aria-expanded', String(!box.hidden));
    };
    renderTafel();
  }

  function nachweisHtml(key) {
    const n = NACHWEIS[key];
    if (!n) return '<div class="quellbox">Kein Nachweis hinterlegt.</div>';
    const link = sicher(n.seite) ? `<a href="${esc(n.seite)}" target="_blank" rel="noopener">${esc(n.titel)}</a>` : esc(n.titel);
    const liz = sicher(n.lizenzUrl) ? `<a href="${esc(n.lizenzUrl)}" target="_blank" rel="noopener">${esc(n.lizenz)}</a>` : esc(n.lizenz);
    return `<div class="quellbox">${link}<br>${esc(n.autor)} · ${liz}${n.aenderung ? '<br><span class="muted">' + esc(n.aenderung) + '</span>' : ''}</div>`;
  }

  /* --- Zoom: viewBox verschieben/skalieren; Pins und Schilder behalten ihre Bildschirmgröße --- */
  let Z = null;                              // { t, svg, fig, x, y, s }  s = Zoomfaktor
  const ZMAX = 6, PIN_PX = 11;
  function zoomAus() { if (Z && Z.ende) Z.ende(); Z = null; }
  function setView() {
    if (!Z) return;
    const { t, svg } = Z;
    const vw = t.w / Z.s, vh = t.h / Z.s;
    Z.x = Math.max(0, Math.min(t.w - vw, Z.x)); Z.y = Math.max(0, Math.min(t.h - vh, Z.y));
    svg.setAttribute('viewBox', `${Z.x} ${Z.y} ${vw} ${vh}`);
    const breite = svg.getBoundingClientRect().width || 600;
    const k = (vw / breite) * (PIN_PX / 10);           // Einheit „10“ in Pin-Koordinaten ≈ PIN_PX Bildschirmpixel
    svg.querySelectorAll('.pin, .tag').forEach(g => g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${k})`));
    Z.fig.classList.toggle('zoomed', Z.s > 1.01);
    const zi = Z.fig.querySelector('.zoomhint'); if (zi) zi.textContent = Z.s > 1.01 ? Math.round(Z.s * 10) / 10 + '×' : '';
    Z.fig.querySelector('[data-z="aus"]').disabled = Z.s <= 1.01;
    Z.fig.querySelector('[data-z="ein"]').disabled = Z.s >= ZMAX - .01;
  }
  // Punkt (Bildschirm) → Bildkoordinate
  function bildPunkt(cx, cy) {
    const r = Z.svg.getBoundingClientRect(), vw = Z.t.w / Z.s, vh = Z.t.h / Z.s;
    // preserveAspectRatio xMidYMid meet: Rand ausrechnen
    const m = Math.min(r.width / vw, r.height / vh), ox = (r.width - vw * m) / 2, oy = (r.height - vh * m) / 2;
    return [Z.x + (cx - r.left - ox) / m, Z.y + (cy - r.top - oy) / m, m];
  }
  function zoomUm(faktor, cx, cy) {
    const alt = Z.s, neu = Math.max(1, Math.min(ZMAX, alt * faktor));
    if (neu === alt) return;
    const r = Z.svg.getBoundingClientRect();
    if (cx == null) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
    const [bx, by] = bildPunkt(cx, cy);
    const fx = (bx - Z.x) / (Z.t.w / alt), fy = (by - Z.y) / (Z.t.h / alt);   // Anteil im Ausschnitt bleibt gleich
    Z.s = neu; Z.x = bx - fx * Z.t.w / neu; Z.y = by - fy * Z.t.h / neu;
    setView();
  }
  function zoomStart(t, svg, fig) {
    const behalten = Z && Z.t === t ? { x: Z.x, y: Z.y, s: Z.s } : { x: 0, y: 0, s: 1 };
    zoomAus();
    Z = Object.assign({ t, svg, fig }, behalten);
    const zb = el('div', { class: 'zoom' }, '<button type="button" data-z="ein" aria-label="Vergrößern">＋</button><button type="button" data-z="aus" aria-label="Verkleinern">−</button><button type="button" data-z="gross" aria-label="Vollbild" title="Vollbild">⛶</button>');
    fig.appendChild(zb); fig.appendChild(el('div', { class: 'zoomhint' }));
    zb.querySelector('[data-z="ein"]').onclick = () => zoomUm(1.6);
    zb.querySelector('[data-z="aus"]').onclick = () => zoomUm(1 / 1.6);
    zb.querySelector('[data-z="gross"]').onclick = () => {
      const p = $('#plate'), an = !p.classList.contains('gross');
      p.classList.toggle('gross', an); document.body.style.overflow = an ? 'hidden' : '';
      zb.querySelector('[data-z="gross"]').textContent = an ? '✕' : '⛶';
      zb.querySelector('[data-z="gross"]').setAttribute('aria-label', an ? 'Vollbild schließen' : 'Vollbild');
      requestAnimationFrame(setView);
    };
    // Gesten: Maus ziehen (gezoomt), Touch: ein Finger verschiebt (gezoomt), zwei Finger zoomen, Doppeltipp zoomt
    let zug = null, verschoben = false, letzterTipp = 0;
    const unterdruecke = e => { if (verschoben) { e.stopPropagation(); e.preventDefault(); verschoben = false; } };
    fig.addEventListener('click', unterdruecke, true);
    fig.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || Z.s <= 1.01 || e.target.closest('.zoom')) return;
      zug = { x: e.clientX, y: e.clientY, zx: Z.x, zy: Z.y }; verschoben = false;
    });
    const mausZug = e => {
      if (!zug) return;
      const dx = e.clientX - zug.x, dy = e.clientY - zug.y;
      if (!verschoben && Math.hypot(dx, dy) < 6) return;
      verschoben = true;
      const m = bildPunkt(0, 0)[2]; Z.x = zug.zx - dx / m; Z.y = zug.zy - dy / m; setView();
    };
    const mausEnde = () => { zug = null; setTimeout(() => { verschoben = false; }, 0); };
    window.addEventListener('pointermove', mausZug); window.addEventListener('pointerup', mausEnde);
    let tz = null;
    const abst = ts => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
    fig.addEventListener('touchstart', e => {
      if (e.target.closest('.zoom')) return;
      if (e.touches.length === 2) { tz = { art: 2, d: abst(e.touches), s: Z.s }; verschoben = true; }
      else if (e.touches.length === 1) {
        const p = e.touches[0];
        tz = { art: 1, x: p.clientX, y: p.clientY, zx: Z.x, zy: Z.y, zeit: Date.now() }; verschoben = false;
      }
    }, { passive: true });
    fig.addEventListener('touchmove', e => {
      if (!tz) return;
      if (tz.art === 2 && e.touches.length === 2) {
        e.preventDefault();
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2, my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        zoomUm((tz.s * abst(e.touches) / tz.d) / Z.s, mx, my);
      } else if (tz.art === 1 && Z.s > 1.01) {
        e.preventDefault();
        const p = e.touches[0], dx = p.clientX - tz.x, dy = p.clientY - tz.y;
        if (!verschoben && Math.hypot(dx, dy) < 8) return;
        verschoben = true;
        const m = bildPunkt(0, 0)[2]; Z.x = tz.zx - dx / m; Z.y = tz.zy - dy / m; setView();
      }
    }, { passive: false });
    fig.addEventListener('touchend', e => {
      if (tz && tz.art === 1 && !verschoben && e.changedTouches.length === 1 && !e.target.closest('.pin, .zoom')) {
        const jetzt = Date.now(), p = e.changedTouches[0];
        if (jetzt - letzterTipp < 320) { e.preventDefault(); Z.s >= ZMAX - .01 ? (Z.s = 1, setView()) : zoomUm(2, p.clientX, p.clientY); letzterTipp = 0; }
        else letzterTipp = jetzt;
      }
      if (e.touches.length === 0) { tz = null; setTimeout(() => { verschoben = false; }, 350); }
    });
    fig.addEventListener('dblclick', e => { if (e.target.closest('.pin, .zoom')) return; Z.s >= ZMAX - .01 ? (Z.s = 1, setView()) : zoomUm(2, e.clientX, e.clientY); });
    fig.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); zoomUm(Math.exp(-e.deltaY / 200), e.clientX, e.clientY); }, { passive: false });
    const neu = () => setView();
    window.addEventListener('resize', neu);
    Z.ende = () => {
      window.removeEventListener('pointermove', mausZug); window.removeEventListener('pointerup', mausEnde); window.removeEventListener('resize', neu);
      document.body.style.overflow = '';
    };
    setView();
  }

  function drawFigure(t, opts = {}) {
    let pins = '';
    t.pins.forEach(([id, x, y], i) => {
      pins += `<g class="pin" data-id="${id}" data-i="${i}" data-x="${x}" data-y="${y}" tabindex="0" role="button" aria-label="Struktur ${i + 1}"><circle class="hit" r="17"/><circle class="dot" r="10"/><text style="font-size:11px">${opts.noNumbers ? '' : i + 1}</text></g>`;
    });
    const masken = (t.masken || []).map(([x, y, w, h, f]) => `<rect class="maske" x="${x}" y="${y}" width="${w}" height="${h}"${/^#[0-9a-f]{3,6}$/i.test(f || '') ? ` style="fill:${f}"` : ''}/>`).join('');
    const fig = $('#fig');
    fig.className = 'fig';
    fig.innerHTML = `<svg viewBox="0 0 ${t.w} ${t.h}" role="img" aria-label="${esc(t.title)}, ${esc(t.view)}" style="aspect-ratio:${t.w}/${t.h}">
      <image href="${esc(t.bild)}" x="0" y="0" width="${t.w}" height="${t.h}" preserveAspectRatio="none"/>
      <g class="masken">${masken}</g><g class="tags"></g>${pins}</svg>`;
    const svg = $('svg', fig);
    zoomStart(t, svg, fig);
    return { svg };
  }
  function tagFor(svg, t, id, zeig) {
    const p = t.pins.find(p => p[0] === id); if (!p) return;
    const name = kurz(id);
    const g = document.createElementNS(SVGNS, 'g'); g.setAttribute('class', 'tag' + (zeig ? ' zeig' : ''));
    g.dataset.x = p[1]; g.dataset.y = p[2];
    const tw = name.length * 6.6 + 12, links = p[1] > t.w * 0.62;
    const x = links ? -13 - tw : 13;
    g.innerHTML = `<rect x="${x}" y="-10" width="${tw}" height="20" rx="4"/><text x="${x + 6}" y="0">${esc(name)}</text>`;
    $('.tags', svg).appendChild(g);
    setView();
  }
  function highlight() { /* Bilder haben keine einzelnen Flächen – die Auswahl zeigt der Pin */ }

  function renderTafel() {
    const t = KAP.tafeln[tState.idx];
    const p = $('#plate'); if (p.classList.contains('gross')) { p.classList.remove('gross'); document.body.style.overflow = ''; }
    $('#tlist').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === tState.idx ? 'true' : 'false'));
    $('#tpick').value = tState.idx;
    $('#tmode').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === tState.mode));
    $('#ttitle').textContent = `Tafel ${tState.idx + 1} · ${t.title}`;
    $('#tview').textContent = t.view;
    $('#tref').innerHTML = refHtml(t.ref);
    $('#tunit').textContent = 'Lerneinheit ' + t.unit;
    $('#tquellbox').innerHTML = nachweisHtml(t.nachweis);
    ({ erkunden: mErkunden, zuordnen: mZuordnen, finden: mFinden, benennen: mBenennen })[tState.mode](t);
  }

  function infoBox(id) {
    const s = KAP.strukturen[id];
    return `<div class="panel info"><span class="lat">${esc(s.lat)}</span><div class="de">${esc(s.de)}</div><p>${esc(s.info)}</p>${refHtml(s.ref)}</div>`;
  }
  const onPin = (svg, fn) => svg.querySelectorAll('.pin').forEach(p => {
    p.addEventListener('click', () => fn(p));
    p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(p); } });
  });

  function mErkunden(t) {
    const { svg } = drawFigure(t);
    const side = $('#side');
    side.innerHTML = `<div id="ibox"><div class="panel hint">Tippe auf eine Nummer oder einen Begriff in der Liste.</div></div>
      <div class="panel"><div class="row" style="justify-content:space-between;margin-bottom:8px"><strong>Strukturen</strong><button class="btn ghost" id="allTags" style="padding:4px 12px;font-size:13px">Beschriftung zeigen</button></div>
      <ul class="legend">${t.pins.map(([id], i) => `<li data-id="${id}"><span class="k">${i + 1}</span><span class="lat">${esc(KAP.strukturen[id].lat)}</span><span class="st ${strState(id)}"></span></li>`).join('')}</ul></div>`;
    let shown = false, cur = null;
    const select = id => {
      if (cur) highlight(svg, cur, false);
      cur = id;
      svg.querySelectorAll('.pin').forEach(p => p.classList.toggle('sel', p.dataset.id === id));
      side.querySelectorAll('.legend li').forEach(li => li.classList.toggle('on', li.dataset.id === id));
      highlight(svg, id, true);
      $('#ibox').innerHTML = infoBox(id);
    };
    onPin(svg, p => select(p.dataset.id));
    side.querySelectorAll('.legend li').forEach(li => li.onclick = () => select(li.dataset.id));
    $('#allTags').onclick = () => {
      shown = !shown; $('.tags', svg).innerHTML = '';
      if (shown) t.pins.forEach(([id]) => tagFor(svg, t, id, true));
      $('#allTags').textContent = shown ? 'Beschriftung ausblenden' : 'Beschriftung zeigen';
    };
  }

  function mZuordnen(t) {
    const { svg } = drawFigure(t);
    const side = $('#side');
    const ids = t.pins.map(p => p[0]);
    let errors = 0, done = 0, selChip = null;
    side.innerHTML = `<div class="panel"><div class="prompt">Ziehe jeden Begriff auf seine Nummer. Oder tippe erst den Begriff, dann die Nummer.</div></div>
      <div class="panel"><div class="chips" id="chips">${shuffle(ids).map(id => `<button class="chip" data-id="${id}">${esc(KAP.strukturen[id].lat.replace(/\s*\(.*\)$/, ''))}</button>`).join('')}</div></div>
      <div id="zfb"></div>`;
    const finish = () => {
      $('#zfb').innerHTML = `<div class="panel"><div class="score">${ids.length - Math.min(errors, ids.length)} / ${ids.length}</div><p>${errors === 0 ? 'Alles auf Anhieb richtig.' : errors + ' Fehlversuch' + (errors > 1 ? 'e' : '') + '.'}</p><button class="btn primary" id="again">Noch einmal</button></div>`;
      $('#again').onclick = renderTafel;
    };
    const tryDrop = (chipId, pin) => {
      if (!pin || pin.classList.contains('ok')) return;
      const chip = side.querySelector(`.chip[data-id="${chipId}"]`);
      if (pin.dataset.id === chipId) {
        pin.classList.add('ok'); chip.classList.add('gone'); tagFor(svg, t, chipId, false); done++;
        markStr(chipId, !chip.dataset.miss);
        if (done === ids.length) finish();
      } else {
        errors++; chip.dataset.miss = 1; chip.classList.add('shake'); setTimeout(() => chip.classList.remove('shake'), 400);
        pin.classList.add('bad'); setTimeout(() => pin.classList.remove('bad'), 500);
      }
      selChip = null; side.querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
    };
    onPin(svg, p => { if (selChip) tryDrop(selChip, p); });
    side.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        selChip = selChip === chip.dataset.id ? null : chip.dataset.id;
        side.querySelectorAll('.chip').forEach(c => c.classList.toggle('sel', c.dataset.id === selChip));
      });
      chip.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        const sx = e.clientX, sy = e.clientY; let ghost = null;
        const move = ev => {
          if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
          if (!ghost) { ghost = chip.cloneNode(true); ghost.classList.add('drag-ghost'); document.body.appendChild(ghost); }
          ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
          svg.querySelectorAll('.pin').forEach(p => p.classList.remove('sel'));
          const over = document.elementFromPoint(ev.clientX, ev.clientY); const pin = over && over.closest && over.closest('.pin');
          if (pin) pin.classList.add('sel');
        };
        const up = ev => {
          document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
          if (!ghost) return;
          ghost.remove(); svg.querySelectorAll('.pin').forEach(p => p.classList.remove('sel'));
          const over = document.elementFromPoint(ev.clientX, ev.clientY);
          tryDrop(chip.dataset.id, over && over.closest && over.closest('.pin'));
          chip.addEventListener('click', ev2 => ev2.stopImmediatePropagation(), { once: true, capture: true });
        };
        document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
      });
    });
  }

  function roundQueue(t) { return shuffle(t.pins.map(p => p[0])); }

  function mFinden(t) {
    const { svg } = drawFigure(t, { noNumbers: true });
    const side = $('#side');
    let queue = roundQueue(t), cur = null, first = 0, total = queue.length, missed = new Set(), locked = false;
    const next = () => {
      locked = false;
      svg.querySelectorAll('.pin').forEach(p => p.classList.remove('bad', 'sel'));
      if (!queue.length) {
        side.innerHTML = `<div class="panel"><div class="score">${first} / ${total}</div><p>beim ersten Versuch gefunden.</p><button class="btn primary" id="again">Neue Runde</button></div>`;
        $('#again').onclick = renderTafel; return;
      }
      cur = queue.shift();
      side.innerHTML = `<div class="panel prompt">Tippe auf:<span class="lat">${esc(KAP.strukturen[cur].lat)}</span><span class="muted">${esc(KAP.strukturen[cur].de)}</span></div>
        <div id="ffb"></div><div class="ref">${total - queue.length} von ${total} · Fehler kommen am Ende noch einmal</div>`;
    };
    onPin(svg, p => {
      if (locked || p.classList.contains('ok')) return;
      if (p.dataset.id === cur) {
        locked = true; p.classList.add('ok');
        if (!missed.has(cur)) first++;
        markStr(cur, !missed.has(cur));
        $('#ffb').innerHTML = `<div class="fb ok">Richtig. ${esc(KAP.strukturen[cur].info)}</div>`;
        setTimeout(next, 1100);
      } else {
        p.classList.add('bad'); setTimeout(() => p.classList.remove('bad'), 600);
        if (!missed.has(cur)) { missed.add(cur); queue.push(cur); }
        const s = KAP.strukturen[p.dataset.id];
        $('#ffb').innerHTML = `<div class="fb bad">Das ist <span class="lat">${esc(s.lat)}</span>. Versuch es noch einmal.</div>`;
      }
    });
    next();
  }

  function mBenennen(t) {
    const { svg } = drawFigure(t, { noNumbers: true });
    const side = $('#side');
    const ids = t.pins.map(p => p[0]);
    let queue = shuffle(ids), first = 0, total = queue.length, missed = new Set();
    const pool = Object.keys(KAP.strukturen);
    const next = () => {
      svg.querySelectorAll('.pin').forEach(p => { p.classList.remove('ask'); p.classList.toggle('dim', !p.classList.contains('ok')); });
      if (!queue.length) {
        side.innerHTML = `<div class="panel"><div class="score">${first} / ${total}</div><p>beim ersten Versuch richtig benannt.</p><button class="btn primary" id="again">Neue Runde</button></div>`;
        $('#again').onclick = renderTafel; return;
      }
      const cur = queue.shift();
      const pin = svg.querySelector(`.pin[data-id="${cur}"]`); pin.classList.remove('dim'); pin.classList.add('ask');
      // Ablenker bevorzugt von derselben Tafel, sonst aus dem Kapitel
      const same = shuffle(ids.filter(i => i !== cur && KAP.strukturen[i].lat !== KAP.strukturen[cur].lat));
      const other = shuffle(pool.filter(i => !ids.includes(i)));
      const opts = shuffle([cur, ...same.slice(0, 2), ...(same.length > 2 ? same.slice(2, 3) : other.slice(0, 1))]);
      side.innerHTML = `<div class="panel prompt">Wie heißt die markierte Struktur?</div>
        <div class="opts">${opts.map(o => `<button class="opt" data-id="${o}">${esc(KAP.strukturen[o].lat)}</button>`).join('')}</div><div id="bfb"></div>
        <div class="ref">${total - queue.length} von ${total}</div>`;
      side.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (b.dataset.id === cur) {
          b.classList.add('ok'); pin.classList.remove('ask'); pin.classList.add('ok');
          if (!missed.has(cur)) first++;
          markStr(cur, !missed.has(cur));
          side.querySelectorAll('.opt').forEach(x => x.disabled = true);
          $('#bfb').innerHTML = `<div class="fb ok" style="margin-top:8px"><strong>${esc(KAP.strukturen[cur].de)}.</strong> ${esc(KAP.strukturen[cur].info)}<br>${refHtml(KAP.strukturen[cur].ref)}</div><button class="btn primary" id="nx" style="margin-top:10px">Weiter</button>`;
          $('#nx').onclick = next; $('#nx').focus();
        } else {
          b.classList.add('bad'); b.disabled = true;
          if (!missed.has(cur)) { missed.add(cur); queue.push(cur); }
        }
      });
    };
    next();
  }

  /* ---------- Karteikarten (5 Fächer) ---------- */
  function unitSelect(id, cur) {
    return `<select id="${id}" aria-label="Lerneinheit"><option value="">Alle Lerneinheiten</option>${KAP.einheiten.map(u => `<option value="${u.nr}" ${u.nr === cur ? 'selected' : ''}>${u.nr} ${esc(u.titel)}</option>`).join('')}</select>`;
  }
  function vKarten() {
    const unit = store.ui.kunit || '';
    const pool = KAP.karten.filter(k => !unit || k.e === unit);
    app.innerHTML = `<div class="toolbar"><div class="row">${unitSelect('kunit', unit)}</div><span class="hint">Fach 1 kommt am häufigsten dran, Fach 5 am seltensten.</span></div>
      <div class="cards-wrap"><div id="cardArea"></div><aside class="panel"><strong>Fächer</strong><div style="height:26px"></div><div class="boxes" id="boxes"></div><div class="boxlabels"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
      <p class="hint" style="margin:14px 0 0">„Gewusst“ schiebt die Karte ein Fach weiter, „Nicht gewusst“ zurück in Fach 1.</p></aside></div>`;
    $('#kunit').onchange = e => { store.ui.kunit = e.target.value; save(); vKartenRefresh(); };
    const drawBoxes = () => {
      const c = [0, 0, 0, 0, 0]; pool.forEach(k => c[Math.min(4, (store.box[k.id] || 0))]++);
      const max = Math.max(1, ...c);
      $('#boxes').innerHTML = c.map(n => `<div style="height:${8 + 82 * n / max}%"><span>${n}</span></div>`).join('');
    };
    // gewichtete Auswahl: niedrige Fächer häufiger
    let last = null;
    const pickCard = () => {
      const weights = pool.map(k => k === last && pool.length > 1 ? 0 : [16, 8, 4, 2, 1][Math.min(4, store.box[k.id] || 0)]);
      let sum = weights.reduce((a, b) => a + b, 0), x = Math.random() * sum;
      for (let i = 0; i < pool.length; i++) { x -= weights[i]; if (x <= 0) return pool[i]; }
      return pool[0];
    };
    const show = () => {
      drawBoxes();
      if (!pool.length) { $('#cardArea').innerHTML = '<div class="panel">Keine Karten für diese Auswahl.</div>'; return; }
      const k = pickCard(); last = k;
      const area = $('#cardArea');
      area.innerHTML = `<div class="card" id="card" tabindex="0" role="button" aria-label="Karte umdrehen"><div class="ref">Lerneinheit ${k.e} · Fach ${Math.min(4, store.box[k.id] || 0) + 1}</div><div class="q">${esc(k.f)}</div><div class="a" hidden id="ans">${esc(k.a)}</div>
        <div class="meta"><span class="hint" id="flipHint">Antippen zum Umdrehen</span>${refHtml(k.ref)}</div></div>
        <div class="rate" id="rate" hidden style="margin-top:12px"><button class="btn no" data-v="0">Nicht gewusst</button><button class="btn" data-v="1">Unsicher</button><button class="btn yes" data-v="2">Gewusst</button></div>`;
      const flip = () => { $('#ans').hidden = false; $('#rate').hidden = false; $('#flipHint').hidden = true; };
      $('#card').onclick = flip; $('#card').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
      $('#rate').querySelectorAll('button').forEach(b => b.onclick = () => {
        const v = +b.dataset.v, cur = store.box[k.id] || 0;
        store.box[k.id] = v === 0 ? 0 : v === 2 ? Math.min(4, cur + 1) : cur; save(); show();
      });
    };
    show();
  }
  function vKartenRefresh() { app.innerHTML = ''; vKarten(); }

  /* ---------- Testatfragen ---------- */
  function vFragen() {
    const unit = store.ui.funit || '';
    app.innerHTML = `<div class="quiz"><div class="toolbar"><div class="row">${unitSelect('funit', unit)}
      <div class="seg" id="flen">${[10, 20, 0].map(n => `<button data-n="${n}" aria-pressed="${(store.ui.flen ?? 10) === n}">${n || 'Alle'}</button>`).join('')}</div></div></div><div id="qArea"></div></div>`;
    $('#funit').onchange = e => { store.ui.funit = e.target.value; save(); vFragenRefresh(); };
    $('#flen').querySelectorAll('button').forEach(b => b.onclick = () => { store.ui.flen = +b.dataset.n; save(); vFragenRefresh(); });
    let pool = KAP.fragen.filter(f => !unit || f.e === unit);
    const n = store.ui.flen ?? 10;
    // offene und falsch beantwortete zuerst
    pool = shuffle(pool).sort((a, b) => (store.quiz[a.id] === 1) - (store.quiz[b.id] === 1));
    runQuiz(n ? pool.slice(0, n) : pool);
  }
  function vFragenRefresh() { app.innerHTML = ''; vFragen(); }
  function runQuiz(list) {
    let i = 0, right = 0; const wrong = [];
    const area = $('#qArea');
    const show = () => {
      if (i >= list.length) {
        area.innerHTML = `<div class="panel"><div class="score">${right} / ${list.length}</div><p>${right === list.length ? 'Alle richtig.' : 'Die falschen Fragen kannst du direkt wiederholen.'}</p>
          <div class="row">${wrong.length ? '<button class="btn primary" id="rep">Falsche wiederholen</button>' : ''}<button class="btn" id="neu">Neue Runde</button></div></div>`;
        if (wrong.length) $('#rep').onclick = () => runQuiz(shuffle(wrong));
        $('#neu').onclick = vFragenRefresh; return;
      }
      const f = list[i];
      const order = shuffle(f.o.map((t, k) => k));
      area.innerHTML = `<div class="progress"><i style="width:${100 * i / list.length}%"></i></div>
        <div class="qhead"><span class="ref">Frage ${i + 1} von ${list.length} · Lerneinheit ${f.e}</span></div>
        <p class="qtext">${esc(f.f)}</p>
        <div class="qopts">${order.map((k, j) => `<button data-k="${k}"><b>${'ABCD'[j]}</b><span>${esc(f.o[k])}</span></button>`).join('')}</div><div id="qfb"></div>`;
      area.querySelectorAll('.qopts button').forEach(b => b.onclick = () => {
        const k = +b.dataset.k, ok = k === f.r;
        area.querySelectorAll('.qopts button').forEach(x => { x.disabled = true; if (+x.dataset.k === f.r) x.classList.add('ok'); });
        if (!ok) { b.classList.add('bad'); wrong.push(f); } else right++;
        store.quiz[f.id] = ok ? 1 : 0; save();
        $('#qfb').innerHTML = `<div class="fb ${ok ? 'ok' : 'bad'}" style="margin-top:12px"><strong>${ok ? 'Richtig.' : 'Leider falsch.'}</strong> ${esc(f.x)}<br>${refHtml(f.ref)}</div><button class="btn primary" id="qn" style="margin-top:12px">Weiter</button>`;
        $('#qn').onclick = () => { i++; show(); }; $('#qn').focus();
      });
    };
    show();
  }

  /* ---------- Sortieren ---------- */
  function vSortieren() {
    const S = KAP.sortieren;
    let queue = shuffle(S.items), right = 0;
    const placed = S.kategorien.map(() => []);
    app.innerHTML = `<div class="toolbar"><h2 style="margin:0">${esc(S.titel)}</h2>${refHtml(S.ref)}</div>
      <div class="sort-stage"><div class="sort-card" id="scard"></div><div id="sfb" class="hint">Wähle den passenden Abschnitt.</div></div>
      <div class="sort-cols" id="scols">${S.kategorien.map((k, i) => `<div class="sort-col"><button data-k="${i}">${esc(k)}</button><ul id="sc${i}"></ul></div>`).join('')}</div>`;
    let cur = null;
    const next = () => {
      cur = queue.shift();
      if (!cur) {
        $('#scard').innerHTML = `${right} / ${S.items.length} richtig`;
        $('#sfb').innerHTML = '<button class="btn primary" id="sagain">Noch einmal</button>';
        $('#sagain').onclick = () => { app.innerHTML = ''; vSortieren(); };
        $('#scols').querySelectorAll('button').forEach(b => b.disabled = true); return;
      }
      $('#scard').textContent = cur.t;
    };
    $('#scols').querySelectorAll('button').forEach(b => b.onclick = () => {
      if (!cur) return;
      const k = +b.dataset.k, ok = k === cur.k;
      if (ok) right++;
      store.sort[cur.id] = ok ? 1 : 0; save();
      const li = el('li', ok ? {} : { class: 'bad' }, esc(cur.t));
      $('#sc' + cur.k).appendChild(li);
      $('#sfb').innerHTML = ok ? `<span style="color:var(--ok)">Richtig: ${esc(S.kategorien[cur.k])}</span>` : `<span style="color:var(--bad)">Gehört zu: ${esc(S.kategorien[cur.k])}</span>`;
      next();
    });
    next();
  }

  /* ---------- Lückentabellen ---------- */
  function vTabellen() {
    const idx = store.ui.tab || 0;
    app.innerHTML = `<div class="toolbar"><div class="seg" id="tabsel">${KAP.tabellen.map((t, i) => `<button data-i="${i}" aria-pressed="${i === idx}">${esc(t.titel.replace(/\s*\(.*\)$/, ''))}</button>`).join('')}</div>
      <div class="seg" id="gap">${[['wenig', 0.35], ['viele', 0.7], ['alle', 1]].map(([t, v]) => `<button data-v="${v}" aria-pressed="${(store.ui.gap ?? 0.35) === v}">Lücken: ${t}</button>`).join('')}</div></div><div class="panel" id="tbl"></div>`;
    $('#tabsel').querySelectorAll('button').forEach(b => b.onclick = () => { store.ui.tab = +b.dataset.i; save(); vTabellenRefresh(); });
    $('#gap').querySelectorAll('button').forEach(b => b.onclick = () => { store.ui.gap = +b.dataset.v; save(); vTabellenRefresh(); });
    const T = KAP.tabellen[idx], gap = store.ui.gap ?? 0.35;
    const cells = []; T.zeilen.forEach((z, r) => z[1].forEach((v, c) => cells.push([r, c])));
    const blanks = new Set(shuffle(cells).slice(0, Math.max(1, Math.round(cells.length * gap))).map(([r, c]) => r + ':' + c));
    $('#tbl').innerHTML = `<div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(T.titel)}</h2>${refHtml(T.ref)}</div>
      <div class="tbl-wrap"><table><thead><tr><th></th>${T.spalten.map(s => `<th>${esc(s)}</th>`).join('')}</tr></thead><tbody>
      ${T.zeilen.map((z, r) => `<tr><th>${esc(z[0])}</th>${z[1].map((v, c) => blanks.has(r + ':' + c)
        ? `<td><input id="t${idx}-${r}-${c}" data-a="${esc(v)}" autocomplete="off" inputmode="${/^[\d–,-]+$/.test(v) ? 'decimal' : 'text'}" aria-label="${esc(z[0])}, ${esc(T.spalten[c])}"></td>`
        : `<td><span class="given">${esc(v)}</span></td>`).join('')}</tr>`).join('')}
      </tbody></table></div><p class="hint">${esc(T.fuss)} Ein Gedankenstrich bedeutet: keine Bewegung bzw. trifft nicht zu.</p>
      <div class="row"><button class="btn primary" id="tcheck">Prüfen</button><button class="btn" id="tsol">Lösung zeigen</button><button class="btn ghost" id="tnew">Neue Lücken</button><span id="tres" class="ref"></span></div>`;
    const norm = s => s.toLowerCase().replace(/\s+/g, '').replace(/[-–—]/g, '–').replace(/^(-|–|0|keine?)$/, '–').replace(/\./g, ',');
    $('#tcheck').onclick = () => {
      let ok = 0, all = 0;
      $('#tbl').querySelectorAll('input').forEach(inp => { all++; const good = norm(inp.value) === norm(inp.dataset.a); inp.classList.toggle('ok', good); inp.classList.toggle('bad', !good); if (good) ok++; });
      $('#tres').textContent = `${ok} von ${all} richtig`;
    };
    $('#tsol').onclick = () => $('#tbl').querySelectorAll('input').forEach(inp => { if (!inp.classList.contains('ok')) { inp.value = inp.dataset.a; inp.classList.remove('bad'); } });
    $('#tnew').onclick = vTabellenRefresh;
  }
  function vTabellenRefresh() { app.innerHTML = ''; vTabellen(); }

  /* ---------- Bildnachweise ---------- */
  function vBilder() {
    const benutzt = {};
    KAP.tafeln.forEach((t, i) => { (benutzt[t.nachweis] = benutzt[t.nachweis] || []).push(i + 1); });
    const keys = Object.keys(NACHWEIS).filter(k => benutzt[k]);
    app.innerHTML = `<h2>Bildnachweise</h2>
      <p class="hint" style="max-width:70ch">Alle Tafeln sind Originalabbildungen von Wikimedia Commons. Die Beschriftungen sind in der App
      mit weißen Flächen abgedeckt (das Bild selbst ist unverändert verkleinert gespeichert). Keine Abbildung stammt aus dem Prometheus
      oder einem anderen geschützten Atlas.</p>
      <ul class="nachweise">${keys.map(k => {
        const n = NACHWEIS[k];
        return `<li><img src="${esc(n.bild)}" alt="" loading="lazy"><div><strong>${esc(n.titel)}</strong> <span class="ref">· Tafel ${benutzt[k].join(', ')}</span>${nachweisHtml(k)}</div></li>`;
      }).join('')}</ul>`;
  }

  route();
})();
