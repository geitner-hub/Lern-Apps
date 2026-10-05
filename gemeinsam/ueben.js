// ═══════════════════════════════════════════════════════
//  Lernwelt – ueben.js   (Übungs-Rahmen, Infrastruktur Etappe 4)
//
//  Gemeinsamer Rahmen für Übungs-Apps: Stufenwahl, Runde, Eingabe mit eigener
//  Tastatur (kein Wegspringen der iPad-Tastatur), Rückmeldung MIT Erklärung,
//  Tipp, Ergebnis mit Themen-ID, Meisterschaft. Die App liefert nur Inhalte.
//
//  Einbinden (nach umgebung.js, vor navbar.js):
//    <script src="../../gemeinsam/ueben.js"></script>
//    LernUeben.start({
//      host: element, titel, untertitel,
//      stufen:  [{ id, titel, kurz, inhalt? }],      // Hauptstufen (Themen-IDs aus daten/katalog.json)
//      foerder: [{ id, titel, kurz, inhalt? }],      // optional, aufklappbar
//      erzeuge(stufe) → Aufgabe,                       // z. B. LernGeneratoren.ausStufe
//      pruefe(aufgabe, eingabe) → true/false,
//      runde: 10, meisterschaft: { prozent: 70, runden: 2 },
//    });
//  Aufgabe: { frage, art: 'zahl'|'bruch'|'rest'|'wahl', text, optionen?, negativ?, tipp?, erklaerung?, hinweis? }
//
//  Angelegte Anschlüsse (später eingeschaltet):
//    LernUeben.Freigabe.erlaubt(themaId)  → bis Etappe 7 immer true (gesperrt = 🔒 ohne Erklärtext)
//    LernUeben.Fehlerheft.merken(eintrag) → sammelt ab jetzt Fehler auf dem Gerät; angezeigt ab Etappe 8
//    Vorlesen (🔊) und große Schrift: standardmäßig aus; an mit ?vorlesen=1 bzw. ?gross=1
//    oder vorlesen/gross: true in der App (für DaZ und Förderung).
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernUeben) return;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const URLP = new URLSearchParams(location.search);

  // ── Anschlüsse ─────────────────────────────────────────
  const Freigabe = {
    /** Etappe 7 wertet hier die Freigaben aus config.json aus. Bis dahin: alles offen. */
    erlaubt(themaId) { return true; },
  };
  const FEHLER_KEY = 'lernwelt-fehlerheft';
  const FEHLER_MAX = 200;
  const Fehlerheft = {
    liste() { try { const l = JSON.parse(localStorage.getItem(FEHLER_KEY) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } },
    /** { thema, typ, frage, eingabe, loesung } */
    merken(e) {
      try {
        const l = this.liste();
        l.push({ t: Date.now(), thema: e.thema, typ: e.typ || '', frage: String(e.frage || '').slice(0, 80), eingabe: String(e.eingabe || '').slice(0, 30), loesung: String(e.loesung || '').slice(0, 30) });
        while (l.length > FEHLER_MAX) l.shift();
        localStorage.setItem(FEHLER_KEY, JSON.stringify(l));
      } catch (err) { if (window.LW && LW.speicher) LW.speicher.fehlgeschlagen(err); }
    },
    leeren() { try { localStorage.removeItem(FEHLER_KEY); } catch (e) {} },
  };

  // ── Aussehen ───────────────────────────────────────────
  const CSS = `
  .lu{--bg:#0f0e1a;--card:#1b1929;--card2:#252238;--line:rgba(255,255,255,.1);--txt:#f1f0fb;--mut:rgba(241,240,251,.62);
      --gold:#e6a817;--ind:#6366f1;--ind2:#818cf8;--ok:#4ade80;--bad:#f87171;
      font-family:'Nunito','Segoe UI',system-ui,sans-serif;color:var(--txt);max-width:880px;margin:0 auto;padding:1rem 1rem 5.5rem;
      min-height:100vh;box-sizing:border-box;-webkit-user-select:none;user-select:none}
  .lu *{box-sizing:border-box}
  .lu h1{font-family:'Fredoka One','Nunito',sans-serif;font-weight:400;font-size:clamp(1.6rem,4vw,2.2rem);margin:.2rem 0 .1rem;color:var(--gold)}
  .lu .sub{color:var(--mut);font-weight:700;margin:0 0 1rem}
  .lu .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.7rem}
  .lu .tile{position:relative;display:flex;gap:.75rem;align-items:center;text-align:left;background:var(--card);border:2px solid var(--line);
      border-radius:18px;padding:.85rem .95rem;color:var(--txt);font:inherit;cursor:pointer;min-height:84px;transition:transform .12s,border-color .12s}
  .lu .tile:active{transform:scale(.97)}
  .lu .tile:hover{border-color:var(--ind2)}
  .lu .tile .nr{flex:0 0 2.6rem;height:2.6rem;border-radius:12px;background:linear-gradient(135deg,var(--ind),var(--ind2));display:grid;place-items:center;
      font-family:'Fredoka One','Nunito',sans-serif;font-size:1.25rem}
  .lu .tile.f .nr{background:#334155;font-size:.95rem}
  .lu .tile b{display:block;font-size:1.02rem;line-height:1.2}
  .lu .tile small{display:block;color:var(--mut);font-weight:700;font-size:.78rem;margin-top:.15rem}
  .lu .tile .st{position:absolute;top:.45rem;right:.6rem;font-size:.75rem;font-weight:900;color:var(--gold)}
  .lu .tile.zu{opacity:.45;cursor:default}
  .lu .mehr{margin:1rem 0 .6rem;background:none;border:0;color:var(--ind2);font-weight:800;font-size:.95rem;font-family:inherit;cursor:pointer;padding:.3rem 0}
  .lu .top{display:flex;align-items:center;gap:.6rem;margin-bottom:.8rem}
  .lu .top .nm{font-weight:900;color:var(--mut);font-size:.9rem;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lu .x{background:var(--card2);border:0;color:var(--txt);border-radius:12px;width:2.6rem;height:2.6rem;font-size:1.1rem;cursor:pointer}
  .lu .dots{display:flex;gap:4px}
  .lu .dots i{width:11px;height:11px;border-radius:50%;background:var(--card2)}
  .lu .dots i.ok{background:var(--ok)} .lu .dots i.no{background:var(--bad)} .lu .dots i.jetzt{background:var(--gold)}
  .lu .frage{background:var(--card);border-radius:22px;padding:1.3rem 1rem;text-align:center;margin-bottom:.8rem;position:relative}
  .lu .frage .q{font-family:'Fredoka One','Nunito',sans-serif;font-size:clamp(1.7rem,6vw,2.7rem);line-height:1.2;word-break:break-word}
  .lu .frage .h{color:var(--mut);font-weight:800;font-size:.85rem;margin-top:.3rem}
  .lu .frage .vor{position:absolute;top:.5rem;right:.5rem}
  .lu .ant{display:flex;gap:.6rem;justify-content:center;margin-bottom:.8rem}
  .lu .feld{min-width:9rem;min-height:3.6rem;background:#0b0a14;border:3px solid var(--ind);border-radius:16px;display:flex;align-items:center;justify-content:center;
      font-family:'Fredoka One','Nunito',sans-serif;font-size:2rem;padding:0 .8rem;cursor:pointer}
  .lu .feld.leer::after{content:'?';color:rgba(255,255,255,.2)}
  .lu .feld.aktiv{border-color:var(--gold);box-shadow:0 0 0 4px rgba(230,168,23,.18)}
  .lu .feld .lab{font-family:'Nunito',sans-serif;font-size:.75rem;font-weight:900;color:var(--mut);margin-right:.4rem}
  .lu .pad{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;max-width:460px;margin:0 auto}
  .lu .pad button,.lu .opt{background:var(--card2);border:0;border-radius:14px;color:var(--txt);font:400 1.6rem 'Fredoka One','Nunito',sans-serif;
      min-height:3.5rem;cursor:pointer;touch-action:manipulation}
  .lu .pad button:active,.lu .opt:active{transform:scale(.95)}
  .lu .pad .ok{background:linear-gradient(135deg,var(--ind),var(--ind2));grid-row:span 2}
  .lu .pad .weg{font-size:1.2rem}
  .lu .pad .aus{visibility:hidden}
  .lu .opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.6rem;max-width:560px;margin:0 auto}
  .lu .opt{font-size:1.5rem;min-height:4rem}
  .lu .zeile{display:flex;gap:.6rem;justify-content:center;margin-top:.8rem;flex-wrap:wrap}
  .lu .btn{background:var(--card2);border:0;border-radius:14px;color:var(--txt);font-weight:900;font-size:1rem;font-family:inherit;padding:.75rem 1.2rem;cursor:pointer}
  .lu .btn.p{background:linear-gradient(135deg,var(--gold),#f59e0b);color:#1b1300}
  .lu .tipp{background:rgba(129,140,248,.12);border:1px solid rgba(129,140,248,.35);border-radius:14px;padding:.6rem .9rem;font-weight:800;margin:0 auto .8rem;max-width:560px;text-align:center}
  .lu .fb{border-radius:18px;padding:.9rem 1rem;margin:0 auto .8rem;max-width:560px;text-align:center;font-weight:800}
  .lu .fb.ok{background:rgba(74,222,128,.14);border:2px solid rgba(74,222,128,.5)}
  .lu .fb.no{background:rgba(248,113,113,.12);border:2px solid rgba(248,113,113,.5)}
  .lu .fb .gr{font-family:'Fredoka One','Nunito',sans-serif;font-size:1.4rem;font-weight:400}
  .lu .fb .er{margin-top:.35rem;color:var(--txt);font-size:1rem;line-height:1.4}
  .lu .erg{background:var(--card);border-radius:22px;padding:1.3rem;text-align:center}
  .lu .erg .gr{font-family:'Fredoka One','Nunito',sans-serif;font-size:3rem;color:var(--gold)}
  .lu .liste{text-align:left;max-width:560px;margin:1rem auto 0;font-size:.92rem}
  .lu .liste div{padding:.45rem 0;border-top:1px solid var(--line)}
  .lu .liste small{display:block;color:var(--mut);font-weight:700}
  .lu.gross .frage .q{font-size:clamp(2.2rem,8vw,3.4rem)} .lu.gross .fb .er{font-size:1.2rem}
  @media (max-height:700px){.lu .frage{padding:.8rem}.lu .pad button{min-height:3rem}}
  @media (prefers-reduced-motion:reduce){.lu .tile,.lu .pad button{transition:none}}`;

  // ── Vorlesen ───────────────────────────────────────────
  function sprich(text) {
    try {
      if (!window.speechSynthesis) return;
      const t = String(text).replace(/×/g, ' mal ').replace(/÷/g, ' geteilt durch ').replace(/−/g, ' minus ').replace(/≈ \?/g, 'ungefähr wie viel')
        .replace(/(\d)\/(\d+)/g, '$1 durch $2').replace(/\?/g, ' wie viel ');
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t); u.lang = 'de-DE'; u.rate = .9;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ── Rahmen ─────────────────────────────────────────────
  function start(cfg) {
    const host = cfg.host || document.body;
    if (!document.getElementById('lu-css')) { const st = document.createElement('style'); st.id = 'lu-css'; st.textContent = CSS; document.head.appendChild(st); }
    const root = document.createElement('div');
    root.className = 'lu' + ((cfg.gross || URLP.get('gross') === '1') ? ' gross' : '');
    host.appendChild(root);
    const RUNDE = Math.max(3, Number(cfg.runde) || 10);
    const MEIST = Object.assign({ prozent: 70, runden: 2 }, cfg.meisterschaft || {});
    const VORLESEN = !!cfg.vorlesen || URLP.get('vorlesen') === '1';
    const alle = [...(cfg.stufen || []), ...(cfg.foerder || [])];
    const S = { stufe: null, aufgaben: [], nr: 0, ergebnis: [], eingabe: '', rest: ['', ''], feld: 0, gesperrt: false, tipp: false, start: 0, foerderOffen: false };

    // Meisterschaft aus dem Pass (Lernstand je Thema): beste Runden ≥ Prozent
    function stand(st) {
      const P = window.LernPass;
      const e = P && P.state && P.state.lernstand ? P.state.lernstand[st.inhalt || st.id] : null;
      if (!e) return { gut: 0, best: 0 };
      return { gut: (Array.isArray(e.p) ? e.p : []).filter(x => x >= MEIST.prozent).length, best: e.best || 0 };
    }
    function kachel(st, i, foerder) {
      const frei = Freigabe.erlaubt(st.id), s = stand(st), meister = s.gut >= MEIST.runden;
      return `<button type="button" class="tile${foerder ? ' f' : ''}${frei ? '' : ' zu'}" data-stufe="${esc(st.id)}" ${frei ? '' : 'disabled aria-disabled="true"'}>
        <span class="nr">${frei ? (foerder ? '🌱' : i + 1) : '🔒'}</span>
        <span><b>${esc(st.titel)}</b><small>${esc(st.kurz || '')}</small></span>
        ${meister ? '<span class="st">⭐ geschafft</span>' : s.best ? `<span class="st" style="color:var(--mut)">${s.best} %</span>` : ''}</button>`;
    }
    function zeigeStart() {
      S.stufe = null;
      const f = cfg.foerder || [];
      root.innerHTML = `<h1>${esc(cfg.titel || 'Üben')}</h1><p class="sub">${esc(cfg.untertitel || 'Wähle eine Stufe')}</p>
        <div class="grid">${(cfg.stufen || []).map((st, i) => kachel(st, i, false)).join('')}</div>
        ${f.length ? `<button type="button" class="mehr" data-foerder>${S.foerderOffen ? '▾' : '▸'} Leichtere Stufen zum Wiederholen</button>
          ${S.foerderOffen ? `<div class="grid">${f.map((st, i) => kachel(st, i, true)).join('')}</div>` : ''}` : ''}`;
    }

    function starteRunde(id) {
      const st = alle.find(x => x.id === id);
      if (!st || !Freigabe.erlaubt(id)) return;
      S.stufe = st; S.aufgaben = []; S.ergebnis = []; S.nr = 0; S.start = Date.now();
      const fragen = new Set();
      for (let v = 0; S.aufgaben.length < RUNDE && v < RUNDE * 8; v++) {
        const a = cfg.erzeuge(st);
        if (!a) continue;
        if (fragen.has(a.frage) && v < RUNDE * 5) continue;
        fragen.add(a.frage); S.aufgaben.push(a);
      }
      if (!S.aufgaben.length) { zeigeStart(); return; }
      neueAufgabe();
    }
    function neueAufgabe() {
      S.eingabe = ''; S.rest = ['', '']; S.feld = 0; S.gesperrt = false; S.tipp = false;
      zeigeAufgabe();
      if (VORLESEN) sprich(S.aufgaben[S.nr].frage);
    }
    function punkte() {
      return S.aufgaben.map((_, i) => `<i class="${i < S.ergebnis.length ? (S.ergebnis[i].ok ? 'ok' : 'no') : i === S.nr ? 'jetzt' : ''}"></i>`).join('');
    }
    function tasten(a) {
      const komma = a.art === 'zahl' && (!Number.isInteger(a.wert) || /,/.test(a.frage));
      const t = ['7', '8', '9', 'weg', '4', '5', '6', 'ok', '1', '2', '3', a.negativ ? '−' : '', '0', a.art === 'bruch' ? '/' : komma ? ',' : '', ''];
      return `<div class="pad">${t.map(k => k === 'ok' ? '<button type="button" class="ok" data-k="ok" aria-label="Prüfen">✓</button>'
        : k === 'weg' ? '<button type="button" class="weg" data-k="weg" aria-label="Löschen">⌫</button>'
        : k === '' ? '<button type="button" class="aus" tabindex="-1" aria-hidden="true"></button>'
        : `<button type="button" data-k="${k}">${k}</button>`).join('')}</div>`;
    }
    function feldHTML(a) {
      if (a.art === 'rest') return S.rest.map((w, i) => `<div class="feld${w ? '' : ' leer'}${S.feld === i ? ' aktiv' : ''}" data-feld="${i}"><span class="lab">${i ? 'Rest' : 'Ergebnis'}</span>${esc(w)}</div>`).join('');
      return `<div class="feld aktiv${S.eingabe ? '' : ' leer'}">${esc(S.eingabe)}</div>`;
    }
    function zeigeAufgabe(fb) {
      const a = S.aufgaben[S.nr];
      root.innerHTML = `<div class="top"><button type="button" class="x" data-ende aria-label="Zur Stufenwahl">✕</button>
          <span class="nm">${esc(S.stufe.titel)}</span><span class="dots">${punkte()}</span></div>
        <div class="frage"><div class="q">${esc(a.frage)}</div>${a.hinweis ? `<div class="h">${esc(a.hinweis)}</div>` : ''}
          ${VORLESEN ? '<button type="button" class="btn vor" data-vor aria-label="Vorlesen">🔊</button>' : ''}</div>
        ${S.tipp && a.tipp && !fb ? `<div class="tipp">💡 ${esc(a.tipp)}</div>` : ''}
        ${fb || ''}
        ${fb ? '' : a.art === 'wahl'
          ? `<div class="opts">${a.optionen.map(o => `<button type="button" class="opt" data-wahl="${esc(o)}">${esc(o)}</button>`).join('')}</div>`
          : `<div class="ant">${feldHTML(a)}</div>${tasten(a)}`}
        <div class="zeile">${fb ? '<button type="button" class="btn p" data-weiter>Weiter ›</button>'
          : a.tipp && !S.tipp ? '<button type="button" class="btn" data-tipp>💡 Tipp</button>' : ''}</div>`;
      if (fb) { const w = root.querySelector('[data-weiter]'); if (w) w.focus(); }
    }
    function taste(k) {
      const a = S.aufgaben[S.nr];
      if (S.gesperrt || !a || a.art === 'wahl') return;
      if (k === 'ok') return pruefen();
      const max = 12;
      const aendern = alt => k === 'weg' ? alt.slice(0, -1)
        : k === '−' ? (alt.startsWith('−') ? alt.slice(1) : '−' + alt)
        : (k === ',' && alt.includes(',')) || (k === '/' && alt.includes('/')) || alt.length >= max ? alt : alt + k;
      if (a.art === 'rest') S.rest[S.feld] = aendern(S.rest[S.feld]); else S.eingabe = aendern(S.eingabe);
      const box = root.querySelector('.ant'); if (box) box.innerHTML = feldHTML(a);
    }
    function pruefen(wahlWert) {
      const a = S.aufgaben[S.nr];
      const eingabe = a.art === 'wahl' ? wahlWert : a.art === 'rest' ? { q: S.rest[0], r: S.rest[1] } : S.eingabe;
      if (a.art === 'rest' ? !S.rest[0] || !S.rest[1] : !String(eingabe || '').trim()) return;
      S.gesperrt = true;
      const ok = cfg.pruefe(a, eingabe);
      const eingabeText = a.art === 'rest' ? `${S.rest[0]} R ${S.rest[1]}` : String(eingabe);
      S.ergebnis.push({ ok, frage: a.frage, loesung: a.text, eingabe: eingabeText, erklaerung: a.erklaerung || '' });
      if (!ok) Fehlerheft.merken({ thema: S.stufe.id, typ: a.typ, frage: a.frage, eingabe: eingabeText, loesung: a.text });
      if (ok) {
        zeigeAufgabe(`<div class="fb ok"><div class="gr">✓ Richtig!</div></div>`);
        root.querySelector('.zeile').innerHTML = '';
        setTimeout(weiter, 650);
      } else {
        zeigeAufgabe(`<div class="fb no"><div class="gr">Richtig ist: ${esc(a.text)}</div>
          <div class="er">${esc(a.erklaerung || a.tipp || '')}</div></div>`);
      }
    }
    function weiter() {
      if (!S.stufe) return;
      S.nr++;
      if (S.nr >= S.aufgaben.length) return ende();
      neueAufgabe();
    }
    function ende() {
      const st = S.stufe, n = S.aufgaben.length, r = S.ergebnis.filter(x => x.ok).length, pct = Math.round(r / n * 100);
      try {
        if (window.LernApps) LernApps.saveResult({ score: r, max: n, label: `${r} / ${n} · ${st.titel}`, thema: st.id, ...(st.inhalt ? { inhalt: st.inhalt } : {}) });
      } catch (e) {}
      const falsch = S.ergebnis.filter(x => !x.ok);
      const lob = pct === 100 ? 'Alles richtig! 💯' : pct >= 80 ? 'Stark gerechnet! 💪' : pct >= MEIST.prozent ? 'Gut gemacht! 👍' : pct >= 40 ? 'Dranbleiben – das wird! 🙂' : 'Probier es gleich nochmal – oder eine leichtere Stufe.';
      root.innerHTML = `<div class="top"><button type="button" class="x" data-ende aria-label="Zur Stufenwahl">✕</button><span class="nm">${esc(st.titel)}</span></div>
        <div class="erg"><div class="gr">${r} / ${n}</div><div style="font-weight:900;font-size:1.15rem">${lob}</div>
          ${falsch.length ? `<div class="liste">${falsch.map(x => `<div><b>${esc(x.frage)} = ${esc(x.loesung)}</b> <small>Du hattest: ${esc(x.eingabe)}${x.erklaerung ? ' · ' + esc(x.erklaerung) : ''}</small></div>`).join('')}</div>` : ''}
          <div class="zeile"><button type="button" class="btn p" data-nochmal>🔄 Nochmal</button><button type="button" class="btn" data-ende>Andere Stufe</button></div></div>`;
      S.stufe = null;
      root.dataset.letzte = st.id;
    }

    // ── Bedienung ──
    root.addEventListener('click', e => {
      const t = e.target.closest('button, [data-feld]');
      if (!t) return;
      if (t.dataset.stufe) return starteRunde(t.dataset.stufe);
      if (t.hasAttribute('data-foerder')) { S.foerderOffen = !S.foerderOffen; return zeigeStart(); }
      if (t.hasAttribute('data-ende')) return zeigeStart();
      if (t.hasAttribute('data-nochmal')) return starteRunde(root.dataset.letzte);
      if (t.hasAttribute('data-weiter')) return weiter();
      if (t.hasAttribute('data-tipp')) { S.tipp = true; return zeigeAufgabe(); }
      if (t.hasAttribute('data-vor')) return sprich(S.aufgaben[S.nr].frage);
      if (t.dataset.wahl !== undefined) { if (!S.gesperrt) pruefen(t.dataset.wahl); return; }
      if (t.dataset.feld !== undefined) { S.feld = Number(t.dataset.feld); const a = S.aufgaben[S.nr]; root.querySelector('.ant').innerHTML = feldHTML(a); return; }
      if (t.dataset.k) taste(t.dataset.k);
    });
    document.addEventListener('keydown', e => {
      if (!S.stufe) return;
      const w = root.querySelector('[data-weiter]');
      if (w && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return weiter(); }
      const a = S.aufgaben[S.nr];
      if (!a || S.gesperrt) return;
      if (a.art === 'rest' && (e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); S.feld = 1 - S.feld; root.querySelector('.ant').innerHTML = feldHTML(a); return; }
      const k = e.key === 'Enter' ? 'ok' : e.key === 'Backspace' ? 'weg' : e.key === '-' ? '−' : e.key === '.' ? ',' : e.key;
      if (/^[0-9]$/.test(k) || ['ok', 'weg', '−', ',', '/'].includes(k)) { e.preventDefault(); taste(k); }
    });
    // Meisterschaft nachtragen, sobald der Pass geladen ist
    window.addEventListener('lernpass:ready', () => { if (!S.stufe && !root.querySelector('.erg')) zeigeStart(); });

    zeigeStart();
    return { neu: zeigeStart };
  }

  window.LernUeben = { start, Freigabe, Fehlerheft };
})();
