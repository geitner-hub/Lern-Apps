// ═══════════════════════════════════════════════════════
//  Admin-Modul Inhalte → Katalog  (Admin-Umbau Etappe 8: Editoren I)
//  Der Inhalts-Katalog als Baum: Fach → Bereich → Thema → Stufe (daten/katalog.json, mit dem Entwurf
//  aus dem Vokabel-Editor). Je Stufe – und je Thema mit Stufen – ein Schalter „für alle frei“
//  (config.freigaben[id].alle, wie im Modul Freigaben; feinere Regeln für Klassen/Gruppen und Daten dort).
//  Oben die Schwellen für „Meine Themen“ in den Spielen (config.spiele.schwelle/runden).
//  Änderungen gehen in den Entwurf der config.json (Veröffentlichen oben).
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'katalog', bereich: 'inhalte', titel: 'Katalog', symbol: '🌳', reihenfolge: 6,
  suchbegriffe: ['Katalog', 'Themen', 'Stufen', 'Freischalten', 'Meine Themen', 'Schwelle', 'Lehrplan', 'Themen-ID'],
  zeigen(host, { store }) {
    const D = LWAdmin.dateien, KATALOG = 'daten/katalog.json';
    let aktiv = true, fehler = '', suche = '', offen = new Set(['#start']);
    const e = s => escHtml(String(s == null ? '' : s));
    const heute = () => LWAdmin.termine.iso(new Date());
    const zu = v => v === 'zu' || (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) && v > heute());
    const datum = v => String(v).split('-').reverse().slice(0, 2).join('.') + '.';

    /** Was gilt für „alle“? Eigener Eintrag, sonst das Thema darüber (wie gemeinsam/freigabe.js) */
    function stand(c, id, eltern) {
      const F = c.freigaben || {};
      if (F[id] && F[id].alle !== undefined) return { v: F[id].alle, eigen: true };
      if (eltern && F[eltern] && F[eltern].alle !== undefined) return { v: F[eltern].alle, eigen: false };
      return { v: 'frei', eigen: false };
    }
    const sonst = (c, id) => Object.keys((c.freigaben || {})[id] || {}).filter(w => w !== 'alle');

    function setzen(id, eltern, frei, titel) {
      store.aendern(`${frei ? '✅' : '🔒'} Katalog: ${titel} ${frei ? 'frei' : 'gesperrt'}`, cfg => {
        const F = cfg.freigaben && typeof cfg.freigaben === 'object' && !Array.isArray(cfg.freigaben) ? cfg.freigaben : (cfg.freigaben = {});
        const x = F[id] || (F[id] = {});
        delete x.alle;
        if (!frei) x.alle = 'zu';
        else if (zu(stand(cfg, id, eltern).v)) x.alle = 'offen';      // Sperre des Themas darüber aufheben
        if (!Object.keys(x).length) delete F[id];
        if (!Object.keys(F).length) delete cfg.freigaben;
      });
    }

    function schalter(c, id, eltern, titel) {
      const s = stand(c, id, eltern), gesperrt = zu(s.v), weitere = sonst(c, id);
      const ab = /^\d{4}/.test(String(s.v)) && gesperrt ? ` <span class="lw-klein">📅 ab ${datum(s.v)}</span>` : '';
      return `<span class="lw-kat-frei">${ab}${weitere.length ? ` <a class="lw-klein" href="#/inhalte/freigaben" title="${e(weitere.join(', '))}">+ ${weitere.length} Regel${weitere.length > 1 ? 'n' : ''}</a>` : ''}
        <label class="switch" title="${gesperrt ? 'gesperrt' : 'frei'}${s.eigen ? '' : ' (vom Thema)'}"><input type="checkbox" data-kat-id="${e(id)}" data-kat-eltern="${e(eltern || '')}" data-kat-titel="${e(titel)}" ${gesperrt ? '' : 'checked'} aria-label="${e(titel)} für alle frei"><span></span></label></span>`;
    }

    function meineThemen(c) {
      if (!window.LernPass || !LernPass.setSpiele) return '';
      LernPass.setSpiele(c.spiele);
      const sp = LernPass.settings.spiele;
      const opt = (v, t, cur) => `<option value="${v}"${Number(v) === Number(cur) ? ' selected' : ''}>${t}</option>`;
      return `<div class="lw-karte"><h2>🎮 „Meine Themen“ in den Spielen</h2>
        <p>Ein Thema mit 🎮 kommt in „Meine Themen“, sobald ein Kind es so oft mit mindestens diesem Ergebnis geübt hat. Einmal freigeschaltet bleibt freigeschaltet.</p>
        <div class="lw-knoepfe">
          <label class="lw-klein">Mindestergebnis <select class="sw-sel" data-kat-spiele="schwelle">${[50, 60, 70, 80, 90, 100].map(v => opt(v, v + ' %', sp.schwelle)).join('')}</select></label>
          <label class="lw-klein">Runden <select class="sw-sel" data-kat-spiele="runden">${[1, 2, 3].map(v => opt(v, v === 1 ? '1 Runde' : v + ' Runden', sp.runden)).join('')}</select></label>
          <a class="lw-btn klein" href="#/motivation/pass">Starter-Paket, Wort des Tages …</a>
        </div></div>`;
    }
    function spieleSetzen(feld, wert) {
      store.aendern(`🔓 Meine Themen: ${feld === 'schwelle' ? 'freischalten ab ' + wert + ' %' : 'nach ' + wert + ' Runde' + (wert > 1 ? 'n' : '')}`, cfg => {
        LernPass.setSpiele(cfg.spiele);
        const sp = JSON.parse(JSON.stringify(LernPass.settings.spiele));
        sp[feld] = wert;
        cfg.spiele = { auswahl: sp.auswahl, schwelle: sp.schwelle, runden: sp.runden,
          starter: { '5': sp.starter[5] || [], '6': sp.starter[6] || [] }, wortBis: { '5': sp.wortBis[5] || '', '6': sp.wortBis[6] || '' } };
      });
      LernPass.setSpiele((store.daten() || {}).spiele);
    }

    function zeichnen() {
      if (!aktiv) return;
      const k = D.daten(KATALOG), c = store.daten() || {};
      if (!k) { host.innerHTML = `<div class="lw-karte">${fehler ? '⚠ ' + e(fehler) : 'lädt …'}</div>`; return; }
      const server = (D.info(KATALOG) || {}).server || {}, alteIds = new Set();
      (server.faecher || []).forEach(f => (f.bereiche || []).forEach(b => (b.themen || []).forEach(t => (t.stufen || []).forEach(s => alteIds.add(s.id)))));
      const q = suche.trim().toLowerCase(), passt = (...t) => !q || t.some(x => String(x || '').toLowerCase().includes(q));
      let zahl = 0;
      const faecher = (k.faecher || []).map(f => {
        const bereiche = (f.bereiche || []).map(b => {
          const themen = (b.themen || []).map(t => {
            const stufen = (t.stufen || []).filter(s => passt(s.titel, s.id, t.titel, t.id));
            if (!passt(t.titel, t.id, t.lehrplan) && !stufen.length) return '';
            zahl++;
            const link = t.quelle && t.quelle.app ? t.quelle.app + (t.quelle.parameter ? '?' + t.quelle.parameter : '') : '';
            const zeile = `<div class="lw-kat-thema"><div class="lw-kat-text"><b>${e(t.titel)}</b>
                <span class="lw-klein">Kl. ${e(t.klasse)}${t.foerder ? ' · Förderung' : ''}${t.archiv ? ' · Archiv' : ''}${t.inhalt ? ' · 🎮' : ''} · <code>${e(t.id)}</code></span>
                ${t.lehrplan ? `<div class="lw-klein lw-kat-lp">${e(t.lehrplan)}</div>` : ''}</div>
              ${link && isSafeLink(link) ? `<a class="lw-btn klein" href="${e(link)}" target="_blank" rel="noopener">▶ öffnen</a>` : ''}
              ${(t.stufen || []).length ? schalter(c, t.id, '', t.titel) : ''}</div>`;
            const st = (q ? stufen : t.stufen || []).map(s => `<div class="lw-kat-stufe"><span class="lw-kat-text">${e(s.titel)}
                <span class="lw-klein">${s.inhalt ? '🎮 · ' : ''}<code>${e(s.id)}</code>${alteIds.has(s.id) ? '' : ' · ✏️ neu, noch nicht gespeichert'}</span></span>
              ${schalter(c, s.id, t.id, t.titel + ' – ' + s.titel)}</div>`).join('');
            return zeile + (st ? `<div class="lw-kat-stufen">${st}</div>` : '');
          }).filter(Boolean);
          if (!themen.length) return '';
          return `<details class="lw-kat-bereich" data-kat-knoten="${e(b.id)}"${q || offen.has(b.id) ? ' open' : ''}><summary>${e(b.titel)} <span class="lw-klein">${themen.length === 1 ? '1 Thema' : themen.length + ' Themen'}</span></summary>${themen.join('')}</details>`;
        }).filter(Boolean);
        if (!bereiche.length) return '';
        const st = (typeof CAT_STYLES !== 'undefined' && CAT_STYLES[f.name]) || {};
        return `<details class="lw-karte lw-kat-fach" data-kat-knoten="${e(f.id)}"${q || offen.has(f.id) ? ' open' : ''}><summary><span class="lw-kat-fname">${e(st.icon || '📘')} ${e(f.name)}</span> <span class="lw-klein">${bereiche.length === 1 ? '1 Bereich' : bereiche.length + ' Bereiche'}</span></summary>${bereiche.join('')}</details>`;
      }).filter(Boolean);
      const fokus = document.activeElement && document.activeElement.matches && document.activeElement.matches('[data-kat-suche]');
      host.innerHTML = `${meineThemen(c)}
        <div class="lw-karte"><input type="search" data-kat-suche value="${e(suche)}" placeholder="🔍 Thema, Stufe oder ID suchen" aria-label="Katalog durchsuchen" style="width:100%">
          <p class="lw-klein" style="margin-top:.5rem">Schalter = für alle iPads frei. Eine Sperre nimmt nie Fortschritt weg. Gesperrt sehen die Kinder mit 🔒.
            Für einzelne Klassen oder Gruppen und „frei ab Datum“: <a href="#/inhalte/freigaben">Freigaben</a>. 🎮 = zählt für „Meine Themen“. Neue Units: <a href="#/inhalte/vokabeln">Vokabeln</a>.</p>
          ${q ? `<p class="lw-klein">${zahl} Treffer</p>` : ''}</div>
        ${faecher.join('') || '<div class="lw-leer">Nichts gefunden.</div>'}`;
      if (fokus) { const s = host.querySelector('[data-kat-suche]'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    }

    const aenderung = ev => {
      const t = ev.target;
      if (t.dataset.katId) setzen(t.dataset.katId, t.dataset.katEltern, t.checked, t.dataset.katTitel);
      else if (t.dataset.katSpiele) spieleSetzen(t.dataset.katSpiele, Number(t.value));
    };
    const eingabe = ev => { if (ev.target.matches('[data-kat-suche]')) { suche = ev.target.value; zeichnen(); } };
    const umschalten = ev => {
      const d = ev.target;
      if (d.matches && d.matches('details[data-kat-knoten]') && !suche) d.open ? offen.add(d.dataset.katKnoten) : offen.delete(d.dataset.katKnoten);
    };
    host.addEventListener('change', aenderung);
    host.addEventListener('input', eingabe);
    host.addEventListener('toggle', umschalten, true);
    const ab1 = store.abonnieren(zeichnen), ab2 = D.abonnieren(zeichnen);
    zeichnen();
    D.laden(KATALOG).catch(x => { fehler = x.message || String(x); }).then(zeichnen);
    return () => { aktiv = false; ab1(); ab2(); host.removeEventListener('change', aenderung); host.removeEventListener('input', eingabe); host.removeEventListener('toggle', umschalten, true); };
  },
});
