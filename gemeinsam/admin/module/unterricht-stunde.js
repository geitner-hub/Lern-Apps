// ═══════════════════════════════════════════════════════
//  Admin-Modul Unterricht → Stunde = Unterrichtsmodus  (Admin-Umbau Etappe 5)
//  Vollbild fürs iPad (Querformat), große Knöpfe, keine Einstellungen. Vier Aufgaben einer Stunde:
//    📲 App zeigen   – QR-Code einer App auf den Beamer
//    📁 Medien       – Datei oder Sammlung aus dem Medienbereich auf den Beamer
//    🎮 Spiele       – Spielsperre heute für Alle, eine Klasse oder Gruppe aus- bzw. wieder einschalten
//    🎯 Fokus        – „heute nur diese Apps“ starten oder beenden
//  Spiele und Fokus wirken sofort (store.sofort: ohne einen offenen Admin-Entwurf mitzunehmen).
//  Tagesausnahmen gelten nur heute (ab = bis = heute) und enden um Mitternacht von selbst.
//  rechte: Hauptzugang und Kollegen-Zugang (Etappe 10). Kollegen sehen bei Spielen und Fokus nur ihre Gruppen
//  (der Worker liefert nur diese und lässt auch nur diese speichern) und melden sich hier oben ab.
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'stunde', bereich: 'unterricht', titel: 'Unterricht', symbol: '🎓', reihenfolge: 1, rechte: ['haupt', 'kollege'],
  suchbegriffe: ['Unterrichtsmodus', 'Stunde', 'Beamer', 'QR', 'Spiele frei', 'Fokus', 'iPad'],
  zeigen(host, { store, toast }) {
    let aktiv = true, teil = 'app', fach = '', gruppen = [], medien = null, medienFehler = '', fokus = { wer: 'alle', dauer: '45', apps: [] };
    const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const uhr = ms => new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const klassen = c => { const k = new Set(); (c.apps || []).forEach(a => (a.klassen || []).forEach(x => k.add(x))); return (k.size ? [...k] : KLASSEN.slice(0, 2)).sort((a, b) => a - b); };
    const kollege = () => LWAdmin.rolle() === 'kollege';
    const werListe = c => kollege() ? gruppen.map(g => 'g:' + g.id) : ['alle', ...klassen(c).map(k => 'k' + k), ...gruppen.map(g => 'g:' + g.id)];
    const werName = w => w === 'alle' ? 'Alle' : /^k\d+$/.test(w) ? 'Klasse ' + w.slice(1)
      : (gruppen.find(g => 'g:' + g.id === w) || { name: 'Gruppe ' + w.slice(2, 8) + '…' }).name;
    const TAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    async function sofort(text, fn, gut) {
      try {
        const r = await store.sofort(text, fn, { bereich: 'Unterricht' });
        if (r.ok) { if (!r.unveraendert) toast(gut + ' – gilt in ca. 1 Minute auf den iPads'); return; }
        if (r.status === 401) { LWAdmin.anmeldungZeigen('Sitzung abgelaufen – bitte neu anmelden.'); return; }
        toast(r.fehler === 'CONFLICT' ? '⚠ Die Lernwelt wurde gerade woanders geändert – bitte Seite neu laden' : '⚠ ' + (r.fehler || 'Fehler'), true);
      } catch (e) { toast('⚠ ' + e.message, true); }
    }

    // ── Spiele: was gilt heute für wer? ──
    function spielStand(c, w) {
      const s = c.spielsperre, h = iso(new Date());
      if (!s) return { frei: true, text: 'keine Spielsperre' };
      const heuteFrei = (s.ausnahmen || []).find(a => a.wer === w && a.ab === h && a.bis === h && !a.runden);
      if (heuteFrei) return { frei: true, heuteFrei, text: 'heute frei (von dir)' };
      const andere = (s.ausnahmen || []).find(a => a.wer === w && (!a.ab || a.ab <= h) && (!a.bis || a.bis >= h));
      if (andere) return { frei: !andere.runden, text: andere.runden ? `Ausnahme: ${andere.runden} Runden` : 'frei (Ausnahme)' };
      const R = s.runden || {}, l = Array.isArray(R[w]) ? R[w] : Array.isArray(R.alle) ? R.alle : [0, 0, 0, 0, 0, 0, 0];
      const n = l[(new Date().getDay() + 6) % 7] || 0;                 // Liste Mo–So
      return { frei: !n, text: n ? `${TAGE[new Date().getDay()]}: ${n} Runde${n === 1 ? '' : 'n'} vor den Spielen` : 'heute keine Sperre' };
    }

    function zeichnen() {
      if (!aktiv) return;
      const c = store.daten() || { apps: [] };
      if (!werListe(c).includes(fokus.wer)) fokus.wer = werListe(c)[0] || 'alle';
      const keineGruppe = kollege() && !gruppen.length ? '<p>Dir sind noch keine Gruppen zugeteilt – frag die Lehrkraft, die die Lernwelt betreut.</p>' : '';
      const reiter = [['app', '📲', 'App zeigen'], ['medien', '📁', 'Medien'], ['spiele', '🎮', 'Spiele'], ['fokus', '🎯', 'Fokus']];
      let inhalt = '';
      if (teil === 'app') {
        const apps = c.apps.filter(a => !a.hidden && isSafeLink(a.datei) && (!fach || a.fach === fach));
        const faecher = [...new Set(c.apps.filter(a => !a.hidden).map(a => a.fach))];
        inhalt = `<div class="lw-u-chips">${['', ...faecher].map(f => `<button class="lw-u-chip${f === fach ? ' an' : ''}" data-fach="${escHtml(f)}">${f ? escHtml(f) : 'Alle Fächer'}</button>`).join('')}</div>
          <div class="lw-u-raster">${apps.map(a => `<button class="lw-u-kachel" data-app="${escHtml(a.datei)}"><span class="lw-u-sym">${escHtml(a.emoji || '📱')}</span><span>${escHtml(a.name)}</span></button>`).join('') || '<p>Keine Apps.</p>'}</div>`;
      } else if (teil === 'medien') {
        const l = medien ? medien.eintraege.filter(e => e.aktiv && (e.art === 'sammlung' || e.fertig !== false))
          .sort((a, b) => (a.art !== 'sammlung') - (b.art !== 'sammlung') || String(a.titel).localeCompare(String(b.titel), 'de')) : [];
        inhalt = medien === null ? (medienFehler ? `<p>⚠ ${escHtml(medienFehler)}</p>` : '<p>lädt …</p>')
          : !l.length ? '<p>Keine eingeschalteten Medien. Hochladen und einschalten im Admin unter Medien.</p>'
          : `<div class="lw-u-raster">${l.map(e => `<button class="lw-u-kachel" data-medium="${escHtml(e.code)}"><span class="lw-u-sym">${e.art === 'sammlung' ? '📚' : '📄'}</span>
              <span>${escHtml(e.titel || e.code)}</span><span class="lw-klein">${escHtml(e.ordner || '')}</span></button>`).join('')}</div>`;
      } else if (teil === 'spiele') {
        inhalt = !c.spielsperre ? '<p>Es gibt keine Spielsperre – die Spiele sind für alle offen.</p>' : keineGruppe ? keineGruppe
          : `<div class="lw-u-liste">${werListe(c).map(w => { const s = spielStand(c, w);
              return `<div class="lw-u-zeile"><div><b>${escHtml(werName(w))}</b><br><span class="lw-klein">${escHtml(s.text)}</span></div>
                ${s.heuteFrei ? `<button class="lw-u-knopf" data-sperre-an="${escHtml(w)}">🔒 Sperre wieder an</button>`
                  : `<button class="lw-u-knopf gold" data-frei="${escHtml(w)}"${s.frei ? ' disabled' : ''}>🎉 Heute frei</button>`}</div>`; }).join('')}</div>
            <p class="lw-klein">„Heute frei“ endet um Mitternacht von selbst. Dauerhafte Einstellungen: Admin → Gruppen → Spielsperre.</p>`;
      } else {
        const laufend = (c.fokus || []).filter(f => Number(f.bis) > Date.now());
        const appName = d => { const a = c.apps.find(x => x.datei === d); return a ? (a.emoji || '📱') + ' ' + a.name : d; };
        const apps = c.apps.filter(a => !a.hidden && !(c.hiddenCats || []).includes(a.fach));
        const um = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime(); };
        const dauern = [['45', '45 Min.'], ['90', '90 Min.'], ['13', 'bis 13 Uhr'], ['tag', 'bis heute Abend']].filter(([v]) => v !== '13' || um(13, 0) > Date.now() + 10 * 60e3);
        if (!dauern.some(([v]) => v === fokus.dauer)) fokus.dauer = '45';
        inhalt = `${laufend.length ? `<div class="lw-u-liste">${laufend.map(f => `<div class="lw-u-zeile"><div><b>🎯 ${escHtml(werName(f.fuer))} bis ${uhr(f.bis)}</b><br>
            <span class="lw-klein">${f.apps.map(d => escHtml(appName(d))).join(' · ')}</span></div><button class="lw-u-knopf" data-fokus-weg="${escHtml(f.id)}">Beenden</button></div>`).join('')}</div>` : ''}
          ${keineGruppe}<h3>Neuer Fokus – für wen?</h3><div class="lw-u-chips">${werListe(c).map(w => `<button class="lw-u-chip${w === fokus.wer ? ' an' : ''}" data-fk-wer="${escHtml(w)}">${escHtml(werName(w))}</button>`).join('')}</div>
          <h3>Wie lange?</h3><div class="lw-u-chips">${dauern.map(([v, t]) => `<button class="lw-u-chip${v === fokus.dauer ? ' an' : ''}" data-fk-dauer="${v}">${t}</button>`).join('')}</div>
          <h3>Welche Apps? (${fokus.apps.length}/12)</h3><div class="lw-u-raster klein">${apps.map(a => `<button class="lw-u-kachel${fokus.apps.includes(a.datei) ? ' an' : ''}" data-fk-app="${escHtml(a.datei)}">
            <span class="lw-u-sym">${escHtml(a.emoji || '📱')}</span><span>${escHtml(a.name)}</span></button>`).join('')}</div>
          <div class="lw-knoepfe"><button class="lw-u-knopf gold" data-fk-start${fokus.apps.length && (!kollege() || gruppen.length) ? '' : ' disabled'}>🎯 Fokus starten</button></div>`;
      }
      const anderer = store.anzahl() ? `<span class="lw-klein">✏️ Im Admin liegt ein Entwurf (${store.anzahl()}) – er bleibt unberührt.</span>` : '';
      host.innerHTML = `<div class="lw-u">
        <div class="lw-u-kopf"><span class="lw-u-titel">🎓 Unterricht</span><span class="lw-u-uhr">${uhr(Date.now())}</span>${anderer}
          ${LWAdmin.rolle() === 'haupt' ? '<a class="lw-btn" href="#/start">✕ Unterricht beenden</a>'
            : `<span class="lw-klein">👥 ${escHtml(LWAdmin.zugang().kuerzel || '')}</span><button class="lw-btn" data-abmelden>🔒 Abmelden</button>`}</div>
        <nav class="lw-u-reiter">${reiter.map(([id, s, t]) => `<button class="lw-u-reiter-knopf${id === teil ? ' an' : ''}" data-teil="${id}"><span class="lw-u-sym">${s}</span>${t}</button>`).join('')}</nav>
        <div class="lw-u-inhalt">${inhalt}</div></div>`;
    }

    function klick(e) {
      const b = e.target.closest('button');
      if (b && b.hasAttribute('data-abmelden')) { ConfigAPI.logout(); LWAdmin.anmeldungZeigen('Abgemeldet.'); return; }
      if (!b || !aktiv) return;
      const c = store.daten() || { apps: [] }, h = iso(new Date());
      const d = b.dataset;
      if (d.teil) { teil = d.teil; zeichnen(); }
      else if (d.fach !== undefined) { fach = d.fach; zeichnen(); }
      else if (d.app) {
        const a = c.apps.find(x => x.datei === d.app);
        if (a && !LWAdmin.beamer({ titel: (a.emoji ? a.emoji + ' ' : '') + a.name, unter: a.beschreibung || '', link: appUrl(a.datei) })) toast('⚠ QR-Code konnte nicht erzeugt werden', true);
      } else if (d.medium) {
        const m = medien && medien.eintraege.find(x => x.code === d.medium);
        if (!m || !medien.basis) { toast('⚠ Kurzlink unbekannt', true); return; }
        LWAdmin.beamer({ titel: m.titel || m.code, unter: m.untertitel || '', link: medien.basis + m.code });
      } else if (d.frei) {
        const w = d.frei, neuId = 'sa-' + Date.now().toString(36);        // ID vorher: fn läuft zweimal (Stand und Entwurf)
        sofort(`⭐ Spielsperre-Ausnahme ${werName(w)}: Spiele frei, nur heute`, cfg => {
          const s = cfg.spielsperre; if (!s) return;
          s.ausnahmen = (s.ausnahmen || []).filter(x => !(x.wer === w && x.ab === h && x.bis === h));
          if (s.ausnahmen.length >= 40) throw new Error('Höchstens 40 Ausnahmen – bitte im Admin unter Gruppen → Spielsperre alte beenden');
          s.ausnahmen.push({ id: neuId, wer: w, runden: 0, ab: h, bis: h });
        }, `🎉 ${werName(w)}: Spiele heute frei`);
      } else if (d.sperreAn) {
        const w = d.sperreAn;
        sofort(`⭐ Spielsperre-Ausnahme beendet (${werName(w)}: heute frei)`, cfg => {
          const s = cfg.spielsperre; if (!s || !s.ausnahmen) return;
          s.ausnahmen = s.ausnahmen.filter(x => !(x.wer === w && x.ab === h && x.bis === h && !x.runden));
          if (!s.ausnahmen.length) delete s.ausnahmen;
        }, `🔒 ${werName(w)}: Sperre wieder an`);
      } else if (d.fkWer) { fokus.wer = d.fkWer; zeichnen(); }
      else if (d.fkDauer) { fokus.dauer = d.fkDauer; zeichnen(); }
      else if (d.fkApp) {
        const i = fokus.apps.indexOf(d.fkApp);
        if (i >= 0) fokus.apps.splice(i, 1); else if (fokus.apps.length < 12) fokus.apps.push(d.fkApp); else toast('Höchstens 12 Apps', true);
        zeichnen();
      } else if (b.hasAttribute('data-fk-start')) {
        const um = (hh, mm) => { const x = new Date(); x.setHours(hh, mm, 0, 0); return x.getTime(); };
        const bis = fokus.dauer === 'tag' ? um(23, 59) : fokus.dauer === '13' ? um(13, 0) : Date.now() + Number(fokus.dauer) * 60e3;
        const { wer, apps } = { wer: fokus.wer, apps: fokus.apps.slice() }, neuId = 'fk-' + Date.now().toString(36), jetzt = Date.now();
        sofort(`🎯 Fokus für ${werName(wer)} bis ${uhr(bis)}: ${apps.length} App${apps.length === 1 ? '' : 's'}`, cfg => {
          cfg.fokus = (cfg.fokus || []).filter(f => f && Number(f.bis) > jetzt && f.fuer !== wer);
          cfg.fokus.push({ id: neuId, fuer: wer, apps, bis });
        }, `🎯 Fokus für ${werName(wer)} bis ${uhr(bis)}`).then(() => { fokus.apps = []; zeichnen(); });
      } else if (d.fokusWeg) {
        const id = d.fokusWeg, f = (c.fokus || []).find(x => x.id === id), jetzt = Date.now();
        sofort(`🎯 Fokus beendet${f ? ' (' + werName(f.fuer) + ')' : ''}`, cfg => {
          cfg.fokus = (cfg.fokus || []).filter(x => x.id !== id && Number(x.bis) > jetzt);
          if (!cfg.fokus.length) delete cfg.fokus;
        }, '🎯 Fokus beendet');
      }
    }

    host.addEventListener('click', klick);
    zeichnen();
    LWAdmin.quellen.gruppen().then(g => { gruppen = g; }).catch(() => {}).then(zeichnen);
    LWAdmin.quellen.medien().then(m => { medien = m; }).catch(e => { medien = null; medienFehler = e.status === 401 ? 'Sitzung abgelaufen' : 'Medien nicht erreichbar'; }).then(zeichnen);
    const takt = setInterval(zeichnen, 30e3);                         // Uhr und ablaufender Fokus
    const ab = store.abonnieren(zeichnen);
    return () => { aktiv = false; ab(); clearInterval(takt); host.removeEventListener('click', klick); };
  },
});
