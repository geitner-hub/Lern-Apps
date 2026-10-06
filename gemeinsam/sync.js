// ═══════════════════════════════════════════════════════
//  Lernwelt – sync.js   (automatische Pass-Sicherung mit Sicherungskarte)
//
//  Wird geladen von:
//    - index.html (direkt, nach sync-code.js)
//    - jeder App automatisch über navbar.js
//  Braucht: sync-code.js (LernSyncCode). pass.js ist hilfreich, aber nicht nötig.
//
//  Gesichert werden die Speicherstände UNVERÄNDERT (verlustfrei):
//    'lernwelt-pass', 'lernwelt-dorf', 'lernwelt-expedition', 'lern-apps-results'
//
//  Gruppenauswertung (Etappe 8): Ist die Karte in einer Gruppe, gehen zusätzlich nur Zahlen
//  je Thema und Woche an den Worker (Runden, Aufgaben, richtig) – siehe statMerken().
//  komprimiert und mit AES-GCM verschlüsselt. Der Schlüssel entsteht aus dem
//  Code der Karte und verlässt das Gerät nie.
//
//  Ablauf:
//    - Karte scannen (…/#sync=CODE) → verbinden (leere Karte: eigener Stand wird
//      hochgeladen; belegte Karte: nach Rückfrage wird deren Stand geladen)
//    - Holen: beim Öffnen und beim Zurückkehren (höchstens 1× pro Minute)
//    - Senden: nach Änderungen gebündelt (20 s), beim Verlassen sofort,
//      zusätzlich jede Minute prüfen (fängt auch Dorf/Expedition ab)
//    - Konflikt (anderes iPad war weiter): der Stand mit mehr Fortschritt
//      gewinnt (1. XP, 2. Runden; bei Gleichstand der Server-Stand)
//    - Einen fremden Stand ÜBERNEHMEN (Speicher ersetzen + neu laden) darf nur
//      die Startseite. In Apps wird nur gesendet; die Startseite holt nach.
//
//  API (für die Startseite, Etappe 4):
//    LernSync.status()         → { verbunden, code, letzteSicherung, ausstehend, ungueltig, offline, fehler }
//    LernSync.verbinden(code)  → startet den Verbinden-Dialog
//    LernSync.jetztSichern()   → sofort senden
//    LernSync.trennen()        → Karte von diesem Gerät lösen (Stand bleibt)
//    Ereignis 'lernsync:status' bei jeder Änderung des Status
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernSync) return;

  const WORKER_URL = 'https://lern-apps-config.bennigeitner.workers.dev';   // wie in config-api.js
  const STATE_KEY  = 'lernwelt-sync';
  const HINWEIS_KEY = 'lernwelt-sync-hinweis';
  const KEYS = ['lernwelt-pass', 'lernwelt-dorf', 'lernwelt-expedition', 'lern-apps-results'];
  const PASS_KEY = 'lernwelt-pass';
  const SENDEN_VERZOEGERUNG = 20000;
  const PRUEF_INTERVALL = 60000;
  const HOLEN_ABSTAND = 60000;
  const MIN_ABSTAND = 11000;                  // Server erlaubt 1× pro 10 s
  const MAX_BLOB = 90000;
  const KEEPALIVE_MAX = 60000;
  // Testumgebung (Lern-Apps-test): Cloud-Sicherung ist abgeschaltet (siehe umgebung.js)
  const TEST = !!(window.LW && window.LW.TEST);

  const ROOT = new URL('../', (document.currentScript && document.currentScript.src) || location.href).href;   // Hauptordner
  const IST_STARTSEITE = () => !!document.getElementById('pass-section');
  const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const IST_APP = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  // ── Zustand auf dem Gerät ────────────────────────────
  //  { code, id, auth, rev, hash, serverScore, letzteSicherung, letztesHolen, ungueltig, gruppe }
  //  gruppe: Kennung der Kartengruppe vom Worker (Etappe 7, für Freigaben und Fokus; kein Name)
  function lesen() {
    try { const s = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); return s && s.code ? s : null; }
    catch (e) { return null; }
  }
  function schreiben(s) {
    try { if (s) localStorage.setItem(STATE_KEY, JSON.stringify(s)); else localStorage.removeItem(STATE_KEY); } catch (e) {}
  }
  let ST = lesen();
  const laufzeit = { offline: false, fehler: '', sendet: false, letzterVersuch: 0, timer: 0 };

  // ── Hilfen ───────────────────────────────────────────
  const enc = new TextEncoder(), dec = new TextDecoder();
  function b64url(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function vonB64url(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
  }
  function fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36) + ':' + str.length;
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ── Speicherstände lesen / Fortschritt bewerten ──────
  function standLesen() {
    const k = {};
    KEYS.forEach(key => { try { k[key] = localStorage.getItem(key); } catch (e) { k[key] = null; } });
    return k;
  }
  function standHash(k) { return fnv(JSON.stringify(KEYS.map(key => k[key]))); }
  function passAus(k) { try { return JSON.parse(k[PASS_KEY] || 'null') || {}; } catch (e) { return {}; } }
  function hatProfil(k) { const p = passAus(k); return !!(p.profile && p.profile.name); }
  function fortschritt(k) {
    const p = passAus(k);
    const xp = Math.max(0, Math.min(999999, Math.floor(Number(p.xp) || 0)));
    const r  = Math.max(0, Math.min(999999, Math.floor(Number(p.rounds) || 0)));
    return xp * 1e6 + r;
  }
  function vorschau(k) {
    const p = passAus(k);
    const xp = Math.floor(Number(p.xp) || 0);
    let level = null;
    try { if (window.LernPass && LernPass.levelInfo) level = LernPass.levelInfo(xp).level; } catch (e) {}
    return { name: (p.profile && p.profile.name) || 'Ohne Namen', xp, level };
  }

  // ── Komprimieren & Verschlüsseln ─────────────────────
  async function packen(text) {
    const roh = enc.encode(text);
    try {
      if (typeof CompressionStream === 'function') {
        const s = new Blob([roh]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        return { art: 1, daten: new Uint8Array(await new Response(s).arrayBuffer()) };
      }
      if (window.fflate && window.fflate.deflateSync) return { art: 1, daten: window.fflate.deflateSync(roh, { level: 9 }) };
    } catch (e) {}
    return { art: 0, daten: roh };
  }
  async function entpacken(art, daten) {
    if (art === 0) return dec.decode(daten);
    if (typeof DecompressionStream === 'function') {
      const s = new Blob([daten]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return dec.decode(await new Response(s).arrayBuffer());
    }
    if (window.fflate && window.fflate.inflateSync) return dec.decode(window.fflate.inflateSync(daten));
    throw new Error('Entpacken nicht möglich');
  }

  let schluessel = null;                       // { code, id, auth, key }
  async function ableiten(code) {
    if (schluessel && schluessel.code === code) return schluessel;
    schluessel = await LernSyncCode.ableiten(code);
    return schluessel;
  }

  async function verschluesseln(k, key) {
    const { art, daten } = await packen(JSON.stringify({ v: 1, k }));
    const klar = new Uint8Array(daten.length + 1);
    klar[0] = art; klar.set(daten, 1);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, klar));
    const out = new Uint8Array(12 + ct.length);
    out.set(iv); out.set(ct, 12);
    return b64url(out);
  }
  async function entschluesseln(blob, key) {
    const b = vonB64url(blob);
    const klar = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, key, b.slice(12)));
    const d = JSON.parse(await entpacken(klar[0], klar.slice(1)));
    if (!d || d.v !== 1 || !d.k || typeof d.k !== 'object') throw new Error('Unbekanntes Format');
    const k = {};
    KEYS.forEach(key2 => { k[key2] = typeof d.k[key2] === 'string' ? d.k[key2] : null; });
    return k;
  }

  // ── Worker ───────────────────────────────────────────
  async function post(pfad, body, keepalive) {
    let r;
    if (TEST) {
      laufzeit.fehler = 'Testumgebung: Sicherung ist hier abgeschaltet';
      throw Object.assign(new Error('testumgebung'), { offline: true });
    }
    try {
      r = await fetch(WORKER_URL + pfad, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), keepalive: !!keepalive, cache: 'no-store',
      });
    } catch (e) { laufzeit.offline = true; throw Object.assign(new Error('offline'), { offline: true }); }
    laufzeit.offline = false;
    const d = await r.json().catch(() => ({}));
    return { status: r.status, d };
  }

  // ── Status nach außen ────────────────────────────────
  function status() {
    const k = standLesen();
    return {
      verbunden: !!ST,
      code: ST ? ST.code : '',
      letzteSicherung: ST ? (ST.letzteSicherung || null) : null,
      ausstehend: !!ST && standHash(k) !== ST.hash,
      ungueltig: !!(ST && ST.ungueltig),
      offline: laufzeit.offline,
      fehler: laufzeit.fehler,
      test: TEST,
    };
  }
  function melden() {
    try { window.dispatchEvent(new CustomEvent('lernsync:status', { detail: status() })); } catch (e) {}
  }

  // ── Fremden Stand übernehmen (nur Startseite) ────────
  function uebernehmen(k, rev, score) {
    KEYS.forEach(key => {
      try { if (k[key] === null) localStorage.removeItem(key); else localStorage.setItem(key, k[key]); } catch (e) {}
    });
    ST.rev = rev; ST.hash = standHash(standLesen()); ST.serverScore = score;
    ST.letzteSicherung = Date.now();
    schreiben(ST);
    try { sessionStorage.setItem(HINWEIS_KEY, '1'); } catch (e) {}
    location.reload();
  }

  // Gruppe der Karte merken (Freigaben/Fokus, Etappe 7). Ältere Worker schicken keine → nichts tun.
  function gruppeMerken(g) {
    if (!ST || !/^[0-9a-f]{32}$/.test(String(g || '')) || ST.gruppe === g) return;
    ST.gruppe = g; schreiben(ST);
    try { window.dispatchEvent(new CustomEvent('lernfreigabe:neu')); } catch (e) {}
  }

  // ── Holen ────────────────────────────────────────────
  async function holen(erzwingen) {
    if (!ST || ST.ungueltig) return;
    if (!erzwingen && ST.letztesHolen && Date.now() - ST.letztesHolen < HOLEN_ABSTAND) return;
    const s = await ableiten(ST.code);
    let res;
    try { res = await post('/sync/holen', { id: s.id, auth: s.auth, seitRev: ST.rev || 0 }); }
    catch (e) { melden(); return; }
    ST.letztesHolen = Date.now(); schreiben(ST);
    if (res.status === 403) { ST.ungueltig = true; schreiben(ST); melden(); return; }
    if (res.status !== 200) { laufzeit.fehler = res.d.error || ('Fehler ' + res.status); melden(); return; }
    laufzeit.fehler = '';
    const d = res.d;
    gruppeMerken(d.gruppe);
    if (d.unveraendert || d.rev === (ST.rev || 0)) { melden(); return; }
    if (d.rev > (ST.rev || 0) && d.blob) {
      await fremdenStandPruefen(d.rev, d.score, d.blob, s.key);
    } else {
      // Server leer oder älter (z. B. neu angelegt) → eigenen Stand senden
      ST.rev = d.rev; ST.hash = ''; schreiben(ST);
      planeSenden(0);
    }
    melden();
  }

  // Server hat einen neueren Stand: laden oder eigenen behalten?
  async function fremdenStandPruefen(rev, score, blob, key) {
    const k = standLesen();
    const lokalGeaendert = standHash(k) !== ST.hash;
    let fremd;
    try { fremd = await entschluesseln(blob, key); }
    catch (e) { laufzeit.fehler = 'Gesicherter Stand nicht lesbar'; return; }
    const serverScore = fortschritt(fremd);
    const serverGewinnt = !lokalGeaendert || !hatProfil(k) || serverScore >= fortschritt(k);
    if (serverGewinnt) {
      if (IST_STARTSEITE()) { uebernehmen(fremd, rev, serverScore); return; }
      ST.nachholen = true; schreiben(ST);              // Startseite übernimmt beim nächsten Öffnen
      return;
    }
    // Eigener Stand hat mehr Fortschritt → über den Server-Stand schreiben
    ST.rev = rev; ST.serverScore = serverScore; ST.nachholen = false; schreiben(ST);
    planeSenden(0);
  }

  // ── Senden ───────────────────────────────────────────
  function planeSenden(ms) {
    clearTimeout(laufzeit.timer);
    laufzeit.timer = setTimeout(() => senden(false), Math.max(ms, 0));
    melden();                                          // Anzeige „Wird gleich gesichert …“
  }

  async function senden(beimVerlassen) {
    if (!ST || ST.ungueltig || ST.nachholen || laufzeit.sendet) return;
    const k = standLesen();
    const hash = standHash(k);
    if (hash === ST.hash) { melden(); return; }
    if (!hatProfil(k)) return;                          // leeren oder zurückgesetzten Pass nie hochladen
    const warten = MIN_ABSTAND - (Date.now() - laufzeit.letzterVersuch);
    if (warten > 0 && !beimVerlassen) { planeSenden(warten); return; }

    laufzeit.sendet = true; laufzeit.letzterVersuch = Date.now();
    try {
      const s = await ableiten(ST.code);
      const blob = await verschluesseln(k, s.key);
      if (blob.length > MAX_BLOB) { laufzeit.fehler = 'Der Pass ist zu groß für die Sicherung'; return; }
      const score = fortschritt(k);
      let res;
      try {
        res = await post('/sync/speichern', { id: s.id, auth: s.auth, baseRev: ST.rev || 0, score, blob },
                         beimVerlassen && blob.length < KEEPALIVE_MAX);
      } catch (e) { return; }                            // offline: beim nächsten Mal
      if (res.status === 200) {
        ST.rev = res.d.rev; ST.hash = hash; ST.serverScore = score; ST.letzteSicherung = Date.now();
        schreiben(ST); laufzeit.fehler = '';
      } else if (res.status === 409 && res.d.konflikt) {
        if (res.d.blob) await fremdenStandPruefen(res.d.rev, res.d.score, res.d.blob, s.key);
        else { ST.rev = res.d.rev; schreiben(ST); planeSenden(MIN_ABSTAND); }
      } else if (res.status === 429) {
        planeSenden((res.d.warteMs || 10000) + 500);
      } else if (res.status === 403) {
        ST.ungueltig = true; schreiben(ST);
      } else {
        laufzeit.fehler = res.d.error || ('Fehler ' + res.status);
      }
    } finally {
      laufzeit.sendet = false;
      melden();
    }
  }

  // ── Verbinden (Karte scannen) ────────────────────────
  async function verbinden(eingabe) {
    const code = LernSyncCode.ausText(eingabe) || LernSyncCode.normalisieren(eingabe);
    if (!code) { dialog({ titel: 'Ungültige Karte', text: 'Diesen Code gibt es nicht. Prüfe, ob du ihn richtig abgetippt hast.', knoepfe: [{ text: 'OK' }] }); return; }
    if (ST && ST.code === code && !ST.ungueltig) {
      dialog({ titel: '✅ Schon verbunden', text: 'Dein Pass ist bereits mit dieser Karte verbunden und wird automatisch gesichert.', knoepfe: [{ text: 'Super' }] });
      holen(true);
      return;
    }
    const lade = dialog({ titel: 'Karte wird geprüft …', text: 'Einen Moment bitte.', knoepfe: [] });
    let s, res;
    try {
      s = await LernSyncCode.ableiten(code);
      res = await post('/sync/holen', { id: s.id, auth: s.auth });
    } catch (e) {
      lade.zu();
      dialog({ titel: '📡 Kein Internet', text: 'Zum Verbinden braucht dein iPad Internet. Versuche es gleich nochmal.', knoepfe: [{ text: 'OK' }] });
      return;
    }
    lade.zu();
    if (res.status === 403) {
      dialog({ titel: 'Karte ungültig', text: 'Diese Karte funktioniert nicht (mehr). Frag deine Lehrkraft nach einer neuen Karte.', knoepfe: [{ text: 'OK' }] });
      return;
    }
    if (res.status !== 200) {
      dialog({ titel: 'Das hat nicht geklappt', text: esc(res.d.error || 'Bitte später nochmal versuchen.'), knoepfe: [{ text: 'OK' }] });
      return;
    }

    const k = standLesen();
    const eigenerPass = hatProfil(k);
    const andereKarte = ST && ST.code !== code && !ST.ungueltig;
    const neu = { code, id: s.id, auth: s.auth, rev: 0, hash: '', serverScore: 0, letzteSicherung: null, letztesHolen: Date.now() };
    if (/^[0-9a-f]{32}$/.test(String(res.d.gruppe || ''))) neu.gruppe = res.d.gruppe;
    schluessel = s;

    // Karte ist noch leer
    if (!res.d.rev) {
      if (!eigenerPass) {
        ST = neu; schreiben(ST); melden();
        dialog({ titel: '✅ Karte verbunden', text: 'Richte jetzt deinen Pass ein. Ab dann wird alles automatisch gesichert.', knoepfe: [{ text: 'Los geht\'s' }] });
        return;
      }
      const pv = vorschau(k);
      dialog({
        titel: '💾 Pass mit Karte verbinden?',
        text: `Dein Pass <b>${esc(pv.name)}</b> (${pv.xp} XP) wird mit dieser Karte verbunden und ab jetzt automatisch gesichert.` +
              (andereKarte ? '<br><br>Dein Pass war bisher mit einer anderen Karte verbunden. Die alte Karte gilt dann nicht mehr für dieses iPad.' : ''),
        knoepfe: [
          { text: 'Abbrechen' },
          { text: 'Verbinden', primaer: true, aktion: async () => {
              ST = neu; schreiben(ST);
              await senden(false);
              const ok = ST && ST.letzteSicherung;
              dialog(ok
                ? { titel: '✅ Gesichert', text: 'Dein Pass ist jetzt mit der Karte verbunden. Heb die Karte gut auf!', knoepfe: [{ text: 'Super' }] }
                : { titel: '✅ Verbunden', text: 'Die erste Sicherung folgt, sobald das iPad Internet hat.', knoepfe: [{ text: 'OK' }] });
          } },
        ],
      });
      return;
    }

    // Karte hat schon einen Stand
    let fremd;
    try { fremd = await entschluesseln(res.d.blob, s.key); }
    catch (e) {
      dialog({ titel: 'Stand nicht lesbar', text: 'Der gesicherte Stand dieser Karte kann nicht gelesen werden. Frag deine Lehrkraft.', knoepfe: [{ text: 'OK' }] });
      return;
    }
    const pv = vorschau(fremd);
    const wer = `<b>${esc(pv.name)}</b>${pv.level ? ', Level ' + pv.level : ''} (${pv.xp} XP)`;
    const laden = () => {
      ST = neu;
      if (IST_STARTSEITE()) { schreiben(ST); uebernehmen(fremd, res.d.rev, fortschritt(fremd)); return; }
      ST.hash = standHash(k); schreiben(ST);            // „unverändert“ → die Startseite übernimmt den Karten-Stand
      location.href = ROOT + 'index.html';
    };
    if (!eigenerPass) {
      dialog({ titel: '💾 Pass laden?', text: `Auf dieser Karte ist der Pass von ${wer} gesichert. Soll er auf dieses iPad geladen werden?`,
        knoepfe: [{ text: 'Abbrechen' }, { text: 'Pass laden', primaer: true, aktion: laden }] });
      return;
    }
    const eigen = vorschau(k);
    dialog({
      titel: '🤔 Ist das dein Pass?',
      text: `Diese Karte gehört zu ${wer}.<br><br>Wenn du „Ja“ tippst, wird dieser Pass geladen und ersetzt den Pass <b>${esc(eigen.name)}</b> (${eigen.xp} XP) auf diesem iPad.`,
      knoepfe: [{ text: 'Nein' }, { text: 'Ja, das bin ich', primaer: true, aktion: laden }],
    });
  }

  function trennen() { ST = null; schreiben(null); schluessel = null; melden(); }

  // ── Dialog (eigene kleine Oberfläche) ────────────────
  function stil() {
    if (document.getElementById('lws-stil')) return;
    const st = document.createElement('style');
    st.id = 'lws-stil';
    st.textContent = `
      #lws{position:fixed;inset:0;z-index:10006;display:grid;place-items:center;padding:1rem;background:rgba(8,7,18,.72);
        font:600 1rem/1.5 'Nunito','Segoe UI',system-ui,sans-serif;}
      #lws .box{width:min(92vw,440px);background:#1a1830;color:#ecebf5;border:1px solid #3a3660;border-radius:18px;
        padding:1.3rem 1.3rem 1.1rem;box-shadow:0 18px 48px rgba(0,0,0,.45);}
      #lws h2{margin:0 0 .5rem;font:400 1.3rem 'Fredoka One','Nunito',sans-serif;color:#fff;}
      #lws p{margin:0 0 1.1rem;color:#c9c7e0;}
      #lws p b{color:#fff;}
      #lws .kn{display:flex;gap:.6rem;justify-content:flex-end;flex-wrap:wrap;}
      #lws button{border:1px solid #3a3660;background:#221f3d;color:#ecebf5;border-radius:12px;padding:.6rem 1.1rem;
        font:800 .95rem 'Nunito','Segoe UI',sans-serif;cursor:pointer;}
      #lws button.p{background:#e6a817;border-color:#e6a817;color:#2a1d00;}
      #lws button:focus-visible{outline:3px solid #818cf8;outline-offset:2px;}
      #lws-toast{position:fixed;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:10006;
        background:#1a1830;color:#ecebf5;border:1px solid #4ade80;border-radius:14px;padding:.7rem 1rem;
        font:700 .92rem 'Nunito','Segoe UI',sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);max-width:92vw;}`;
    document.head.appendChild(st);
  }
  function dialog({ titel, text, knoepfe }) {
    stil();
    const alt = document.getElementById('lws');
    if (alt) alt.remove();
    const el = document.createElement('div');
    el.id = 'lws';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'lws-t');
    el.innerHTML = `<div class="box"><h2 id="lws-t">${titel}</h2><p>${text}</p><div class="kn"></div></div>`;
    const kn = el.querySelector('.kn');
    const zu = () => el.remove();
    knoepfe.forEach(k => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = k.text;
      if (k.primaer) b.className = 'p';
      b.onclick = async () => { zu(); if (k.aktion) await k.aktion(); };
      kn.appendChild(b);
    });
    document.body.appendChild(el);
    const f = kn.querySelector('.p') || kn.querySelector('button');
    if (f) f.focus();
    el.addEventListener('keydown', e => { if (e.key === 'Escape' && knoepfe.length) zu(); });
    return { zu };
  }
  function toast(text) {
    stil();
    const el = document.createElement('div');
    el.id = 'lws-toast'; el.setAttribute('role', 'status'); el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // ── #sync=CODE in der Adresse (gescannte Karte) ──────
  function hashPruefen() {
    const m = location.hash.match(/^#sync=([A-Za-z0-9-]+)/);
    if (!m) return;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    try { if (typeof window.closeScanner === 'function') window.closeScanner(); } catch (e) {}
    const code = m[1];
    if (IOS && !IST_APP) {
      dialog({
        titel: '📱 Öffne das Lernwelt-Symbol',
        text: 'Du bist gerade in Safari. Dein Pass wohnt im <b>Lernwelt-Symbol</b> auf dem Home-Bildschirm.<br><br>Öffne das Symbol, tippe auf <b>📷 QR scannen</b> und scanne die Karte dort.',
        knoepfe: [{ text: 'Trotzdem hier verbinden', aktion: () => verbinden(code) }, { text: 'OK', primaer: true }],
      });
      return;
    }
    verbinden(code);
  }

  // ── Gruppenauswertung (Etappe 8) ─────────────────────
  //  Nur iPads mit Sicherungskarte und bekannter Gruppe. Gesammelt wird je Thema (bzw. App)
  //  und Woche: Runden, Aufgaben, richtig – in STAT_KEY, gebündelt gesendet (höchstens 1× pro Minute).
  //  Der Worker addiert alles auf die Gruppe; welche Karte gemeldet hat, speichert er nicht.
  const STAT_KEY = 'lernwelt-statistik', STAT_ABSTAND = 65000, STAT_MAX = 30;
  const STAT_WAS = /^[a-z0-9][a-z0-9._:?=&-]{0,79}$/i;
  let statTimer = null, statLetzte = 0;
  function statLesen() { try { const l = JSON.parse(localStorage.getItem(STAT_KEY) || '{}'); return l && typeof l === 'object' && !Array.isArray(l) ? l : {}; } catch (e) { return {}; } }
  function statSchreiben(l) { try { if (Object.keys(l).length) localStorage.setItem(STAT_KEY, JSON.stringify(l)); else localStorage.removeItem(STAT_KEY); } catch (e) {} }
  function montag() {
    const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function statMerken(d) {
    if (TEST || !ST || ST.ungueltig || !ST.gruppe || !d || d.blocked) return;
    const n = Number(d.anzahl);
    if (!(n >= 1 && n <= 200)) return;
    const was = String((Array.isArray(d.thema) && d.thema[0]) || d.app || '');
    if (!STAT_WAS.test(was)) return;
    const l = statLesen(), k = was + '|' + montag();
    if (!l[k] && Object.keys(l).length >= 60) return;            // Gerät war lange offline: nicht endlos sammeln
    const e = l[k] || (l[k] = { r: 0, n: 0, k: 0 });
    e.r++; e.n += n; e.k += Math.max(0, Math.min(n, Math.round((Number(d.prozent) || 0) * n / 100)));
    statSchreiben(l);
    planeStat(15000);
  }
  function planeStat(ms) {
    clearTimeout(statTimer);
    statTimer = setTimeout(() => statSenden(false), Math.max(ms, statLetzte + STAT_ABSTAND - Date.now()));
  }
  async function statSenden(beimVerlassen) {
    if (TEST || !ST || ST.ungueltig || !ST.gruppe) return;
    const l = statLesen(), keys = Object.keys(l).slice(0, STAT_MAX);
    if (!keys.length || Date.now() - statLetzte < STAT_ABSTAND) return;
    statLetzte = Date.now();
    const eintraege = keys.map(k => {
      const [was, woche] = k.split('|'), e = l[k] || {};
      const aufgaben = Math.min(2000, Math.max(1, e.n | 0));
      return { was, woche, runden: Math.min(50, Math.max(1, e.r | 0)), aufgaben, richtig: Math.min(aufgaben, Math.max(0, e.k | 0)) };
    });
    let res;
    try { const s = await ableiten(ST.code); res = await post('/sync/statistik', { id: s.id, auth: s.auth, eintraege }, beimVerlassen); }
    catch (e) { return; }                                         // offline: später nochmal
    if (res.status === 200 || res.status === 400 || res.status === 403) {   // 400: zu alt/ungültig → verwerfen
      const neu = statLesen();
      keys.forEach(k => {                                         // Gesendetes abziehen (inzwischen Neues bleibt stehen)
        const x = neu[k], g = l[k];
        if (!x || !g) return;
        x.r -= g.r; x.n -= g.n; x.k -= g.k;
        if (x.r <= 0 || x.n <= 0) delete neu[k];
      });
      statSchreiben(neu);
    }
    if (Object.keys(statLesen()).length && !beimVerlassen) planeStat(res.status === 429 && res.d.warteMs ? res.d.warteMs : STAT_ABSTAND);
  }

  // ── Start ────────────────────────────────────────────
  function start() {
    try { if (sessionStorage.getItem(HINWEIS_KEY)) { sessionStorage.removeItem(HINWEIS_KEY); toast('✅ Dein Pass wurde auf den neuesten Stand gebracht.'); } } catch (e) {}
    if (IST_STARTSEITE()) {
      hashPruefen();
      window.addEventListener('hashchange', hashPruefen);
    }
    if (ST && !ST.ungueltig) {
      ableiten(ST.code).catch(() => {});                // Schlüssel vorbereiten (fürs schnelle Senden beim Verlassen)
      if (ST.nachholen && IST_STARTSEITE()) { ST.nachholen = false; schreiben(ST); }   // App hat Neueres gesehen → hier entscheiden
      holen(true).then(() => planeSenden(3000));
    }
    // Änderungen am Pass → gebündelt senden
    const anPass = () => { if (window.LernPass && LernPass.onChange) { LernPass.onChange(() => { if (ST) planeSenden(SENDEN_VERZOEGERUNG); }); return true; } return false; };
    if (!anPass()) window.addEventListener('lernpass:ready', anPass, { once: true });
    // regelmäßig prüfen (Dorf und Expedition melden sich nicht beim Pass)
    setInterval(() => { if (ST && document.visibilityState === 'visible' && status().ausstehend) senden(false); }, PRUEF_INTERVALL);
    document.addEventListener('visibilitychange', () => {
      if (!ST) return;
      if (document.visibilityState === 'hidden') senden(true);
      else holen(false);
    });
    window.addEventListener('pagehide', () => { if (ST) { senden(true); statSenden(true); } });
    // Gruppenauswertung: jede gewertete Runde zählen, Liegengebliebenes bald senden
    window.addEventListener('lernpass:gewertet', e => statMerken(e.detail));
    if (ST && ST.gruppe) planeStat(20000);
    window.addEventListener('online', () => { if (ST) { laufzeit.offline = false; senden(false); } });
    melden();
  }

  window.LernSync = {
    status, verbinden, trennen,
    jetztSichern: () => senden(false),
    holen: () => holen(true),
    _intern: { standLesen, standHash, fortschritt, verschluesseln, entschluesseln },   // für Tests
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
