// ═══════════════════════════════════════════════════════
//  Lernwelt – einschaetzung.js   (Selbsteinschätzung, Aktionsplan „Lernwelt – Tempo“, Etappe 4a)
//
//  Vor einer Runde im Übungsrahmen (ueben.js: Kopfrechnen, Mathe-Trainer, Baukasten) schätzt sich das Kind ein:
//  3 „Kann ich sicher“ · 2 „Geht so“ · 1 „Brauche ich noch Übung“. Nach der Runde kommt der Abgleich mit dem Ergebnis.
//  Passt die Einschätzung (sicher ↔ ab 80 %, geht so ↔ 50–79 %, noch Übung ↔ unter 50 %), wird das eigens gewürdigt –
//  mit einem Zähler fürs Abzeichen, aber OHNE XP, damit niemand taktisch tippt.
//  Höchstens einmal je Thema und Tag. Gespeichert im Pass (LernPass.einschaetzungMerken: je Themen-ID die letzten fünf
//  Paare, reist mit der Sicherung) – sonst nirgends, nichts wird übertragen.
//  Eingeschaltet über den Feature-Schalter „einschaetzung“ (Admin → System → Feature-Schalter, für alle oder je Gruppe/Klasse);
//  ueben.js lädt diese Datei nur dann.
//
//    LernEinschaetzung.faellig(themaId)            → heute für dieses Thema noch nicht gefragt?
//    LernEinschaetzung.fragen(host, titel, fertig)  → Frage in host zeichnen; fertig(1|2|3) nach dem Antippen
//    LernEinschaetzung.auswerten(themaId, wahl, richtig, anzahl) → HTML für die Ergebnis-Seite (speichert das Paar)
//    LernEinschaetzung.verlauf(themaId)            → [[wahl, prozent, tag], …] (für die Kann-Liste, Etappe 5)
// ═══════════════════════════════════════════════════════
'use strict';

(function () {
  if (window.LernEinschaetzung) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const WAHL = { 3: ['😀', 'Kann ich sicher'], 2: ['🙂', 'Geht so'], 1: ['🤔', 'Brauche ich noch Übung'] };
  const P = () => window.LernPass;
  const heute = () => (P() && P()._dayKey ? P()._dayKey() : new Date().toISOString().slice(0, 10));
  const verlauf = id => { const E = P() && P().einschaetzung; return (E && Array.isArray(E[id]) ? E[id] : []); };
  const stufeVon = pct => pct >= 80 ? 3 : pct >= 50 ? 2 : 1;

  function faellig(id) {
    if (!P() || !P().einschaetzungMerken || !P().hasProfile || !P().hasProfile()) return false;
    const l = verlauf(id), letzte = l[l.length - 1];
    return !letzte || letzte[2] !== heute();
  }

  if (!document.getElementById('les-css')) {
    const st = document.createElement('style');
    st.id = 'les-css';
    st.textContent = `.les{max-width:560px;margin:1.5rem auto 0;text-align:center}
      .les h2{font:400 1.6rem 'Fredoka One','Nunito',sans-serif;color:#e6a817;margin:0 0 .3rem}
      .les p{color:rgba(241,240,251,.7);font-weight:800;margin:0 0 1.1rem}
      .les-wahl{display:grid;gap:.7rem}
      .les-wahl button{display:flex;align-items:center;gap:.9rem;text-align:left;background:#1b1929;border:2px solid rgba(255,255,255,.12);border-radius:18px;
        padding:.9rem 1.1rem;color:#f1f0fb;font:800 1.15rem 'Nunito',system-ui,sans-serif;min-height:72px;cursor:pointer}
      .les-wahl button:active{transform:scale(.98)} .les-wahl button:hover{border-color:#818cf8}
      .les-wahl .ic{font-size:2rem}
      .les-ab{margin:.8rem auto 0;max-width:460px;background:rgba(129,140,248,.12);border:1px solid rgba(129,140,248,.4);border-radius:14px;padding:.65rem .9rem;font-weight:800;line-height:1.4}
      .les-ab.passt{background:rgba(74,222,128,.14);border-color:rgba(74,222,128,.5)}
      @media (prefers-reduced-motion:reduce){.les-wahl button:active{transform:none}}`;
    document.head.appendChild(st);
  }

  function fragen(host, titel, fertig) {
    host.innerHTML = `<div class="top"><button type="button" class="x" data-ende aria-label="Zur Stufenwahl">✕</button><span class="nm">${esc(titel)}</span></div>
      <div class="les"><h2>Wie gut kannst du das schon?</h2><p>Schätze dich ehrlich ein – danach siehst du, wie gut es gepasst hat.</p>
      <div class="les-wahl">${[3, 2, 1].map(w => `<button type="button" data-les="${w}"><span class="ic">${WAHL[w][0]}</span><span>${WAHL[w][1]}</span></button>`).join('')}</div></div>`;
    host.querySelectorAll('[data-les]').forEach(b => b.addEventListener('click', () => fertig(Number(b.dataset.les)), { once: true }));
    const erster = host.querySelector('[data-les]');
    if (erster) try { erster.focus(); } catch (e) {}
  }

  function auswerten(id, wahl, richtig, anzahl) {
    if (!WAHL[wahl] || !(anzahl > 0)) return '';
    const pct = Math.round(richtig / anzahl * 100), ist = stufeVon(pct), passt = ist === wahl;
    try { if (P() && P().einschaetzungMerken) P().einschaetzungMerken(id, wahl, pct, passt); } catch (e) {}
    const kopf = `Du hast „${WAHL[wahl][1]}“ gewählt und ${richtig} von ${anzahl} geschafft.`;
    const text = passt ? '🎯 Genau richtig eingeschätzt – du kennst dich gut!'
      : ist > wahl ? 'Du kannst mehr, als du denkst. 💪'
      : 'Das war schwerer als gedacht. Schau dir die Fehler an und versuch es gleich noch einmal.';
    return `<div class="les-ab${passt ? ' passt' : ''}">${esc(kopf)}<br>${esc(text)}</div>`;
  }

  window.LernEinschaetzung = { faellig, fragen, auswerten, verlauf, WAHL };
})();
