// ═══════════════════════════════════════════════════════
//  Lernwelt – Aufgabentyp „fall“ (Quellen-Detektiv Etappe 2): ganzer Fall mit Niveaus und Selbstkontrolle
//
//  Eine Runde = ein Fall: eine Quelle groß, darunter die Karten 1 Beschreiben → 2 Erklären → 3 Deuten
//  nacheinander in ihren Farben (LernTypen.KARTEN) – und Karte 4 Quellenkritik, wenn der Fall sie hat (Etappe 3). Das Kind wählt ein Niveau, schreibt ins Heft und tippt
//  „Fertig“. Danach kommen je Karte Musterantwort und Checkliste, die es selbst abhakt.
//  Ergebnis = abgehakte Punkte (ueben.js: Selbstkontrolle „selbst“) – zählt für Pass und Wiederholung,
//  aber nicht für die Spielsperre; kein Fehler-Training.
//
//  Niveaus: ★ Satzanfänge + Wortspeicher + Auswahl-Hilfen · ★★ Satzanfänge · ★★★ nur Leitfragen
//
//  Stufe in der Inhaltsdatei:
//    { "id": "gpg.5.quellen.fall", "typ": "fall", "titel": "Ganzer Fall", "kurz": "…",
//      "aufgaben": [ {                       ← ein Fall; mehrere Fälle kommen nacheinander dran
//        "titel": "Der Faustkeil",
//        "bild": "q-faustkeil.svg" | "quelltext": "…" (+ "herkunft"), "alt", "nachweis", "quellenart": "sach"|"bild"|"schrift",
//        "info": "Gefunden in Frankreich. Etwa 15 cm lang."   (optional: was man über den Fund weiß),
//        "wortspeicher": ["Faustkeil", "Feuerstein", …]       (Niveau ★),
//        "karten": [                         ← nr 1, 2, 3 in dieser Reihenfolge; dazu nr 4 (Quellenkritik), je Fall einschaltbar
//          { "nr": 1,
//            "anfaenge": ["Ich sehe …"]       (optional; sonst die Satzanfänge der Karte unten in ANFAENGE),
//            "hilfen": [{ "frage": "Woraus ist er?", "optionen": ["Stein", "Holz", "Metall"] }]   (Niveau ★, nur zum Nachdenken),
//            "muster": ["Ich sehe einen spitzen Stein.", …]    (Musterantwort, 2–4 kurze Sätze),
//            "check": ["Ich habe die scharfen Kanten genannt."] (optional; kommt zur allgemeinen Checkliste dazu) } ] } ] }
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  const T = window.LernTypen;
  const K = T.KARTEN;

  // Satzanfänge (★/★★) und allgemeine Checkliste je Karte – wie auf den Karten „Quellen-Detektiv“
  const ANFAENGE = {
    1: () => ['Ich sehe …', 'Oben (unten, links, rechts) ist …', 'Es ist aus …'],
    2: art => art === 'bild' || art === 'schrift' ? ['Das ist wohl ein …', 'Man hat es gemacht, um …'] : ['Das ist wohl ein …', 'Man benutzte es, um …'],
    3: () => ['Daran erkennt man, dass die Menschen …', 'Die Menschen damals …'],
    4: () => ['Die Quelle ist (nicht) echt, weil …', 'Gemacht hat sie …', 'Ich glaube ihr (nicht), weil …'],
  };
  // Hilfsfragen von Karte 4 (stehen auf der Karte, darum auf jedem Niveau)
  const HILFSFRAGEN = { 4: ['Ist sie echt?', 'Von wem und wann?', 'Wollte jemand etwas zeigen?'] };
  const CHECK = {
    1: () => ['Ich habe nur beschrieben, was ich wirklich sehe.', 'Ich habe Form, Farbe oder Material genannt.'],
    2: art => [art === 'bild' || art === 'schrift' ? 'Ich habe gesagt, wofür es gemacht wurde.' : 'Ich habe gesagt, wofür man es benutzt hat.',
      'Ich habe mein Wissen aus dem Unterricht benutzt.'],
    3: () => ['Ich habe etwas über das Leben der Menschen gesagt.', 'Mein Schluss passt zur Quelle und ist nicht zu weit hergeholt.'],
    4: () => ['Ich habe gesagt, ob die Quelle echt ist, und warum.', 'Ich habe gesagt, ob ich der Quelle glaube, und warum.'],
  };
  const NIVEAUS = [
    { n: 1, sterne: '★', text: 'Satzanfänge, Wortspeicher und Hilfen' },
    { n: 2, sterne: '★★', text: 'Satzanfänge' },
    { n: 3, sterne: '★★★', text: 'nur die Leitfragen – wie ein Profi' },
  ];
  const MIN_SEK = 20;                     // schneller „Fertig“ → kurze Nachfrage, ob schon etwas im Heft steht

  const CSS = `
  .lf-quelle .lt-q-bild img{height:min(40vh,420px)}
  .lf-klein .lt-q-bild img{height:min(22vh,220px)}
  .lf-info{color:var(--mut);font-weight:800;font-size:.9rem;text-align:center;margin:-.4rem 0 .8rem}
  .lf-niv{display:grid;gap:.6rem;max-width:520px;margin:0 auto}
  .lf-niv button{display:flex;gap:.8rem;align-items:center;text-align:left;background:var(--card2);border:2px solid var(--line);border-radius:16px;
      color:var(--txt);font:800 1rem 'Nunito',sans-serif;padding:.8rem 1rem;min-height:3.6rem;cursor:pointer;touch-action:manipulation}
  .lf-niv b{flex:0 0 4.2rem;color:var(--gold);font-size:1.35rem;letter-spacing:.05em}
  .lf-karte{border-radius:18px;color:#fff;padding:.9rem 1rem;margin:0 auto .7rem;max-width:640px;text-align:left}
  .lf-kopf{display:flex;gap:.8rem;align-items:center}
  .lf-nr{flex:0 0 2.8rem;height:2.8rem;border-radius:50%;background:#fff;display:grid;place-items:center;font:400 1.5rem 'Fredoka One','Nunito',sans-serif}
  .lf-kopf h3{margin:0;font:400 1.35rem 'Fredoka One','Nunito',sans-serif}
  .lf-kopf p{margin:.1rem 0 0;font-weight:900;font-size:1.1rem}
  .lf-kopf small{display:block;font-weight:800;font-size:.9rem;opacity:.9;margin-top:.15rem}
  .lf-kopf .lf-vor{margin-left:auto;background:rgba(255,255,255,.22);border:0;border-radius:12px;color:#fff;font-size:1.1rem;min-width:2.6rem;min-height:2.6rem;cursor:pointer}
  .lf-box{background:rgba(0,0,0,.2);border-radius:12px;padding:.55rem .75rem;margin-top:.6rem}
  .lf-box h4{margin:0 0 .3rem;font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;opacity:.85}
  .lf-box ul{margin:0;padding-left:1.1rem} .lf-box li{margin:.15rem 0;font-weight:800}
  .lf-woerter{display:flex;flex-wrap:wrap;gap:.35rem}
  .lf-woerter span{background:rgba(255,255,255,.9);color:#222;border-radius:10px;padding:.2rem .55rem;font-weight:800}
  .lf-hilfe{margin:.3rem 0 .5rem;font-weight:800}
  .lf-hilfe .lt-chips{justify-content:flex-start;margin:.3rem 0 0}
  .lf-hilfe .lt-chip{min-height:2.4rem;padding:.3rem .7rem;font-size:.95rem}
  .lf-heft{color:var(--mut);font-weight:800;text-align:center;margin:.2rem 0 .6rem}
  .lf-check{display:flex;gap:.6rem;align-items:center;width:100%;text-align:left;background:rgba(255,255,255,.12);border:2px solid transparent;border-radius:12px;
      color:#fff;font:800 1rem 'Nunito',sans-serif;padding:.55rem .7rem;margin:.35rem 0 0;cursor:pointer;touch-action:manipulation}
  .lf-check i{flex:0 0 1.7rem;height:1.7rem;border-radius:8px;background:#fff;color:#222;display:grid;place-items:center;font-style:normal;font-weight:900}
  .lf-check.an{border-color:#fff;background:rgba(255,255,255,.25)}
  .lf-muster{background:#fff;color:#222;border-radius:12px;padding:.55rem .75rem;margin-top:.5rem;font-weight:700;line-height:1.45}
  .lf-muster h4{margin:0 0 .2rem;font-size:.8rem;color:#555;text-transform:uppercase;letter-spacing:.06em}`;
  function stil() {
    if (document.getElementById('lf-css')) return;
    const st = document.createElement('style'); st.id = 'lf-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  function sprich(text) {
    try {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/…/g, ' ')); u.lang = 'de-DE'; u.rate = .9;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  const liste = l => (Array.isArray(l) ? l : []).filter(x => typeof x === 'string' && x.trim());

  T.typ('fall', {
    einzeln: true,
    anzahl: st => Array.isArray(st.aufgaben) ? st.aufgaben.length : 0,
    aufgabe(st, nr, D) {
      const x = st.aufgaben[nr];
      if (!x || !(x.bild || x.quelltext)) return null;
      const art = x.quellenart || '';
      const kartenRoh = Array.isArray(x.karten) ? x.karten : [];
      const nummern = kartenRoh.some(c => c && Number(c.nr) === 4) ? [1, 2, 3, 4] : [1, 2, 3];
      const karten = nummern.map(n => {
        const k = kartenRoh.find(c => c && Number(c.nr) === n) || {};
        return { nr: n, titel: K[n].titel, frage: K[n].frage(art), farbe: K[n].farbe,
          anfaenge: liste(k.anfaenge).length ? liste(k.anfaenge) : ANFAENGE[n](art),
          hilfen: (Array.isArray(k.hilfen) ? k.hilfen : []).filter(h => h && h.frage && liste(h.optionen).length),
          muster: liste(k.muster), check: [...CHECK[n](art), ...liste(k.check)] };
      });
      const max = karten.reduce((s, k) => s + k.check.length, 0);
      return {
        art: 'eigen', selbst: true, frage: '🔍 ' + (x.titel || 'Ganzer Fall'), hinweis: 'Ganzer Fall · Schreibe ins Heft',
        text: '', eingabeText: e => e && e.max ? e.punkte + ' / ' + e.max : '',
        zeige(box, fertig) {
          stil();
          const quelle = T.quelleHTML(x, D);
          const W = { schritt: -1, niveau: 0, seit: 0, haken: {}, gewaehlt: {}, nachfrage: false };
          const kartenKopf = k => `<div class="lf-kopf"><span class="lf-nr" style="color:${k.farbe}">${k.nr}</span>
              <div><h3>${T.esc(k.titel)}</h3><p>${T.esc(k.frage)}</p>${HILFSFRAGEN[k.nr] ? `<small>${HILFSFRAGEN[k.nr].map(T.esc).join(' · ')}</small>` : ''}</div>
              <button type="button" class="lf-vor" data-lf-vor="${k.nr}" aria-label="Vorlesen">🔊</button></div>`;
          function wahl() {
            box.innerHTML = `<div class="lf-quelle">${quelle}</div>${x.info ? `<p class="lf-info">${T.esc(x.info)}</p>` : ''}
              <p class="lt-anw">Wähle dein Niveau. Dann gehst du die ${karten.length === 4 ? 'vier' : 'drei'} Karten nacheinander durch und schreibst ins Heft.</p>
              <div class="lf-niv">${NIVEAUS.map(v => `<button type="button" data-lf-niveau="${v.n}"><b>${v.sterne}</b><span>${T.esc(v.text)}</span></button>`).join('')}</div>`;
          }
          function karte() {
            const k = karten[W.schritt], niv = W.niveau, letzte = W.schritt === karten.length - 1;
            const woerter = liste(x.wortspeicher);
            box.innerHTML = `<div class="lf-klein">${quelle}</div>
              <section class="lf-karte" style="background:${k.farbe}">${kartenKopf(k)}
                ${niv <= 2 ? `<div class="lf-box"><h4>Satzanfänge</h4><ul>${k.anfaenge.map(a => `<li>${T.esc(a)}</li>`).join('')}</ul></div>` : ''}
                ${niv === 1 && k.hilfen.length ? `<div class="lf-box"><h4>Hilfen – tippe an, was passt</h4>${k.hilfen.map((h, i) => `<div class="lf-hilfe">${T.esc(h.frage)}
                  <div class="lt-chips">${liste(h.optionen).map((o, j) => `<button type="button" class="lt-chip${W.gewaehlt[k.nr + '.' + i] === j ? ' an' : ''}" data-lf-hilfe="${i}.${j}">${T.esc(o)}</button>`).join('')}</div></div>`).join('')}</div>` : ''}
                ${niv === 1 && woerter.length ? `<div class="lf-box"><h4>Wortspeicher</h4><div class="lf-woerter">${woerter.map(w => `<span>${T.esc(w)}</span>`).join('')}</div></div>` : ''}
              </section>
              <p class="lf-heft">✏️ Schreibe ${k.nr === 1 ? 'die Überschrift „' + T.esc(x.titel || 'Quelle') + '“ und dann ' : ''}2–4 Sätze zu Karte ${k.nr} ins Heft.</p>
              ${W.nachfrage ? `<div class="tipp">Schon fertig? Schreibe mindestens zwei Sätze ins Heft, bevor du weitergehst.</div>` : ''}
              <div class="lt-zeile">${W.schritt > 0 ? '<button type="button" class="btn" data-lf-zurueck>‹ Zurück</button>' : ''}
                <button type="button" class="btn p" data-lf-fertig>${W.nachfrage ? 'Ja, steht im Heft ›' : letzte ? '✓ Fertig – zur Kontrolle' : '✓ Fertig – weiter zu Karte ' + (k.nr + 1)}</button></div>`;
            W.seit = W.seit || Date.now();
          }
          function kontrolle() {
            const n = Object.values(W.haken).filter(Boolean).length;
            box.innerHTML = `<p class="lt-anw">Vergleiche dein Heft mit der Musterantwort. Hake nur ab, was wirklich in deinem Heft steht.</p>
              ${karten.map(k => `<section class="lf-karte" style="background:${k.farbe}">${kartenKopf(k)}
                ${k.muster.length ? `<div class="lf-muster"><h4>So könnte es heißen</h4>${k.muster.map(s => T.esc(s)).join(' ')}</div>` : ''}
                ${k.check.map((c, i) => { const id = k.nr + '.' + i; return `<button type="button" class="lf-check${W.haken[id] ? ' an' : ''}" data-lf-check="${id}" aria-pressed="${!!W.haken[id]}">
                  <i>${W.haken[id] ? '✓' : ''}</i><span>${T.esc(c)}</span></button>`; }).join('')}</section>`).join('')}
              <div class="lt-zeile"><button type="button" class="btn" data-lf-zurueck>‹ Zurück zu Karte ${karten.length}</button>
                <button type="button" class="btn p" data-lf-auswerten>✓ Auswerten (${n} / ${max})</button></div>`;
          }
          const zeichnen = () => { (W.schritt < 0 ? wahl : W.schritt < karten.length ? karte : kontrolle)(); };
          const oben = () => { try { box.closest('.lu').scrollIntoView({ block: 'start' }); } catch (e) {} };
          box.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b || !box.contains(b)) return;
            if (b.dataset.lfNiveau) { W.niveau = Number(b.dataset.lfNiveau); W.schritt = 0; W.seit = 0; zeichnen(); return oben(); }
            if (b.dataset.lfVor) {
              const k = karten[Number(b.dataset.lfVor) - 1];
              const teile = [k.titel + '. ' + k.frage, ...(HILFSFRAGEN[k.nr] || [])];
              if (W.schritt >= karten.length) teile.push(...k.muster, ...k.check);
              else if (W.niveau <= 2) teile.push(...k.anfaenge);
              return sprich(teile.join(' '));
            }
            if (b.dataset.lfHilfe) {
              const [i, j] = b.dataset.lfHilfe.split('.').map(Number), key = karten[W.schritt].nr + '.' + i;
              W.gewaehlt[key] = W.gewaehlt[key] === j ? undefined : j;
              return zeichnen();
            }
            if (b.hasAttribute('data-lf-fertig')) {
              if (!W.nachfrage && Date.now() - W.seit < MIN_SEK * 1000) { W.nachfrage = true; return zeichnen(); }
              W.nachfrage = false; W.schritt++; W.seit = 0; zeichnen(); return oben();
            }
            if (b.hasAttribute('data-lf-zurueck')) { W.nachfrage = false; W.schritt--; W.seit = Date.now(); zeichnen(); return oben(); }
            if (b.dataset.lfCheck) { W.haken[b.dataset.lfCheck] = !W.haken[b.dataset.lfCheck]; return zeichnen(); }
            if (b.hasAttribute('data-lf-auswerten')) {
              fertig({ punkte: Object.values(W.haken).filter(Boolean).length, max, zusatz: NIVEAUS[W.niveau - 1].sterne });
            }
          });
          zeichnen();
        },
      };
    },
    pruefe: () => true,
  });
})();
