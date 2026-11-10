// ═══════════════════════════════════════════════════════
//  Lernwelt – Check vor der Probe  (Aktionsplan „Lernwelt – Tempo“, Etappe 5a)
//
//  Kein Aufgabentyp, sondern die Auswertung einer Check-Stufe im Baukasten (typen.js lädt diese Datei nur dann):
//    { "id": "…", "titel": "Check Unit 1", "check": true, "mix": true, "aus": [alle Quellen], "je": 2,
//      "themen": [ { "titel": "Simple past", "aus": ["<Stufen-ID>", …], "ziel": "<Themen-/Stufen-ID zum Üben>" } ] }
//  Die Runde hat je Thema „je“ Aufgaben (typen.js rundeFuer). Keine Note, keine Hilfen, kein Lernstand, keine Sterne;
//  XP gibt es einmal fürs Bearbeiten (ueben.js endeCheck). Statt einer Punktzahl steht je Thema eine Zeile:
//  „Das kannst du“ (mindestens zwei Drittel richtig) oder „Hier nochmal üben“ mit einem Knopf zur passenden Übung.
//  Der Check lässt sich wiederholen – dann steht der erste Versuch daneben (LernPass.checkMerken, im Pass gespeichert).
//
//    LernCheck.auswerten(stufe, ergebnis) → { html, erster }      ergebnis = [{ ok, g }] aus ueben.js
// ═══════════════════════════════════════════════════════
'use strict';

(function () {
  if (window.LernCheck) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kann = (r, n) => n > 0 && r / n >= 0.66;
  // Links zu den Übungen brauchen Katalog und wiederholung.js – im Hintergrund holen, bis zur Auswertung sind sie da
  if (window.LW && LW.laden) LW.laden('gemeinsam/katalog.js').then(() => LW.laden('gemeinsam/wiederholung.js')).catch(() => {});

  if (!document.getElementById('lc-css')) {
    const st = document.createElement('style');
    st.id = 'lc-css';
    st.textContent = `.lc h2{font:400 1.5rem 'Fredoka One','Nunito',sans-serif;color:#e6a817;margin:0 0 .2rem}
      .lc>p{color:rgba(241,240,251,.7);font-weight:800;margin:0 0 .9rem}
      .lc-zeile{display:flex;align-items:center;gap:.7rem;text-align:left;background:#252238;border:2px solid rgba(255,255,255,.1);border-radius:16px;padding:.7rem .9rem;margin:0 auto .5rem;max-width:560px}
      .lc-zeile.ja{border-color:rgba(74,222,128,.5)} .lc-zeile.nein{border-color:rgba(230,168,23,.6)}
      .lc-zeile .ic{font-size:1.5rem;flex-shrink:0}
      .lc-zeile .tx{flex:1;min-width:0} .lc-zeile b{display:block;font-size:1.02rem;line-height:1.25}
      .lc-zeile small{display:block;color:rgba(241,240,251,.7);font-weight:700;font-size:.82rem;margin-top:.1rem}
      .lc-zeile a{flex-shrink:0;background:#e6a817;color:#1b1300;font-weight:900;border-radius:999px;padding:.5rem .9rem;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}`;
    document.head.appendChild(st);
  }

  function auswerten(st, ergebnis) {
    const themen = Array.isArray(st.themen) ? st.themen : [];
    const werte = themen.map((t, g) => { const l = ergebnis.filter(x => x.g === g); return [l.filter(x => x.ok).length, l.length]; });
    let erst = null;
    try { if (window.LernPass && LernPass.checkMerken) erst = LernPass.checkMerken(st.id, werte); } catch (e) {}
    const vergleich = Array.isArray(erst) && erst.length === werte.length ? erst : null;
    const ziel = id => {
      try {
        const frei = !window.LernUeben || LernUeben.Freigabe.erlaubt(id, false);
        const l = frei && window.LernWiederholung && LernWiederholung.link ? LernWiederholung.link(id) : null;
        return l && window.LW ? LW.ROOT + l : '';
      } catch (e) { return ''; }
    };
    const zeilen = themen.map((t, g) => {
      const [r, n] = werte[g];
      if (!n) return '';                                          // Thema noch nicht freigegeben
      const ok = kann(r, n), v = vergleich && vergleich[g] && vergleich[g][1] ? vergleich[g] : null, link = ok ? '' : ziel(t.ziel);
      const vorher = v ? ` · beim ersten Mal ${v[0]} von ${v[1]}${r * v[1] > v[0] * n ? ' ⬆' : ''}` : '';
      return `<div class="lc-zeile ${ok ? 'ja' : 'nein'}"><span class="ic">${ok ? '✅' : '🔁'}</span>
        <span class="tx"><b>${esc(t.titel)}</b><small>${ok ? 'Das kannst du' : 'Hier nochmal üben'} · ${r} von ${n} richtig${vorher}</small></span>
        ${link ? `<a href="${esc(link)}">Üben ›</a>` : ''}</div>`;
    }).join('');
    const offen = themen.filter((t, g) => werte[g][1] && !kann(werte[g][0], werte[g][1])).length;
    const kopf = !offen ? 'Du bist fit für die Probe! 🎉' : offen === 1 ? 'Fast fit – ein Thema noch üben.' : `Übe noch ${offen} Themen – dann bist du fit.`;
    return { erster: !erst, html: `<div class="lc"><h2>${esc(kopf)}</h2><p>Der Check gibt keine Note. Er zeigt dir, was du vor der Probe noch üben solltest.</p>${zeilen}</div>` };
  }

  window.LernCheck = { auswerten };
})();
