// ═══════════════════════════════════════════════════════
//  Admin-Modul Inhalte → Live-Quizze  (Aktionsplan „Live-Abfrage im Unterricht“, Etappen 3–5)
//  Quizze für die Live-Abfrage vorbereiten: anlegen, bearbeiten, kopieren, archivieren, löschen (mit Rückfrage);
//  aus dem Pool erzeugen (Vokabel-Unit, Baukasten-Stufe, Kopfrechen-Stufe: Anzahl wählen, mischen); Rückblicke
//  (anonyme Zusammenfassung je Frage, nur wenn beim Quiz angehakt) ansehen und einzeln löschen.
//  Gestartet wird im Unterrichtsmodus (Unterricht → 📊 Live-Abfrage). Daten beim Worker (cloudflare/live.js,
//  Tabellen in SYNC_DB) – nicht im öffentlichen Repo, nicht in config.json. Fragetypen: gemeinsam/live-fragen.js.
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'live', bereich: 'inhalte', titel: 'Live-Quizze', symbol: '📊', reihenfolge: 9,
  suchbegriffe: ['Live-Abfrage', 'Live-Quiz', 'Quiz', 'Abfrage', 'Exit-Ticket', 'Ampel', 'Wortwolke', 'Schätzfrage', 'Rückblick', 'Pool'],
  zeigen(host, { store, toast }) {
    const L = window.LernLive, MAX = 15;
    let aktiv = true, liste = null, fehler = '', archiv = false, quiz = null, pool = null, offenRb = '', rueckblicke = {}, quellen = null;
    const e = s => escHtml(String(s == null ? '' : s));
    const faecher = () => Object.keys(typeof CAT_STYLES !== 'undefined' ? CAT_STYLES : {});
    const datum = ms => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const sel = (wert, opts) => opts.map(([v, t]) => `<option value="${e(v)}"${String(v) === String(wert) ? ' selected' : ''}>${e(t)}</option>`).join('');
    const neueFrage = typ => ({ typ: typ || 'auswahl', text: '', optionen: ['', '', '', ''], richtig: 0, wahr: true, zeit: 0 });

    async function laden() {
      try { liste = (await store.worker('/live/quizze', { archiv: true })).quizze || []; fehler = ''; }
      catch (x) { liste = []; fehler = LWAdmin.live.fehlerText(x); }
      zeichnen();
    }
    async function senden(pfad, body, gut) {
      try { const d = await store.worker(pfad, body); if (gut) toast(gut); return d; }
      catch (x) { toast('⚠ ' + LWAdmin.live.fehlerText(x), true); return null; }
    }

    // ── Übersicht ──
    function uebersicht() {
      const l = (liste || []).filter(q => archiv || !q.archiviert);
      return `<div class="lw-karte"><h2>📊 Live-Quizze</h2>
          <p>Kurze Klassen-Quizze für die <b>Live-Abfrage</b>: Du startest sie im <a href="#/unterricht">Unterrichtsmodus</a> (📊 Live-Abfrage), die Kinder kommen
            per QR-Code hinein und antworten anonym. Gespeichert werden nur die Quizze und – wenn du „Rückblick“ anhakst – eine anonyme Zusammenfassung je Frage.
            Raum und Einzelantworten sind nach der Stunde gelöscht.</p>
          ${fehler ? `<p class="lw-rot">⚠ ${e(fehler)}</p>` : `<div class="lw-knoepfe"><button class="lw-btn gold" data-lq="neu">➕ Neues Quiz</button><button class="lw-btn" data-lq="pool">🎲 Aus dem Pool</button>
            <label class="lw-klein" style="display:flex;align-items:center;gap:.35rem;margin-left:auto"><input type="checkbox" data-lq-archiv${archiv ? ' checked' : ''}> Archiv zeigen</label></div>`}</div>
        ${pool ? poolHtml() : ''}
        ${liste === null ? '<div class="lw-karte">lädt …</div>' : !l.length && !fehler ? '<p class="lw-klein">Noch keine Quizze – leg eins an oder erzeuge es aus dem Pool.</p>' : ''}
        ${l.map(q => `<div class="lw-karte lw-lq${q.archiviert ? ' lw-lq-archiv' : ''}" data-lq-id="${e(q.id)}">
          <div class="lw-lq-kopf"><b>${q.modus === 'selbst' ? '🧑‍🎓' : '📊'} ${e(q.titel)}</b><span class="lw-klein">${e([q.fach, q.klasse ? 'Klasse ' + q.klasse : '', q.anzahl + ' Fragen',
            q.modus === 'selbst' ? 'Modus „Selbst“' : 'Modus „Ich führe“', 'geändert ' + datum(q.geaendert), q.archiviert ? '🗄 archiviert' : ''].filter(Boolean).join(' · '))}</span></div>
          <div class="lw-knoepfe"><button class="lw-btn klein" data-lq="bearbeiten">✏️ Bearbeiten</button><button class="lw-btn klein" data-lq="kopieren">📋 Kopieren</button>
            <button class="lw-btn klein" data-lq="archiv">${q.archiviert ? '↩ Zurückholen' : '🗄 Archivieren'}</button><button class="lw-btn klein" data-lq="rb">📈 Rückblicke</button>
            <button class="lw-btn klein" data-lq="loeschen">🗑 Löschen</button></div>
          ${offenRb === q.id ? rueckblickHtml(q) : ''}</div>`).join('')}`;
    }

    function rueckblickHtml(q) {
      const l = rueckblicke[q.id];
      if (!l) return '<p class="lw-klein">lädt …</p>';
      if (!l.length) return '<p class="lw-klein">Noch keine Rückblicke. Hake beim Quiz „Rückblick“ an – dann bleibt nach jeder Abfrage eine anonyme Zusammenfassung.</p>';
      const vert = (f, r) => {
        if (!r) return '–';
        if (f.typ === 'auswahl' && r.verteilung) return r.verteilung.map((n, i) => ['A', 'B', 'C', 'D'][i] + ' ' + n).join(' · ');
        if (f.typ === 'wahrfalsch' && r.verteilung) return `wahr ${r.verteilung[0]} · falsch ${r.verteilung[1]}`;
        if (f.typ === 'ampel' && r.verteilung) return `🟢 ${r.verteilung[0]} · 🟡 ${r.verteilung[1]} · 🔴 ${r.verteilung[2]}`;
        if (f.typ === 'zahl' && r.falsch && r.falsch.length) return 'häufig falsch: ' + r.falsch.map(([a, n]) => `${L.zahlText(Number(a))} (${n})`).join(', ');
        if (f.typ === 'schaetzen' && r.median !== undefined) return 'Mitte der Schätzungen: ' + L.zahlText(r.median);
        return '';
      };
      const pr = r => r && r.richtig !== undefined ? r.richtig + ' %' : '–';
      return `<div class="lw-lq-rb">${l.map(r => `<details><summary>${e(r.datum.split('-').reverse().join('.'))} · 👥 ${r.teilnehmer || 0} · ${r.modus === 'selbst' ? 'Selbst' : 'Ich führe'}${r.kollege ? ' · 👥 Kollegen-Zugang' : ''}
          <button class="lw-btn klein" data-lq="rb-weg" data-rb="${e(r.id)}" style="margin-left:.6rem">🗑</button></summary>
        <table class="lw-lq-tab"><tr><th>#</th><th>Frage</th><th>Antworten</th><th>richtig</th><th>Verteilung</th></tr>
        ${(r.fragen || []).map((f, i) => `<tr><td>${i + 1}</td><td>${e(f.text || (L.TYPEN.find(t => t.id === f.typ) || {}).name)}</td><td>${f.r1 ? f.r1.n : 0}${f.r2 ? ' → ' + f.r2.n : ''}</td>
          <td>${pr(f.r1)}${f.r2 ? ' → ' + pr(f.r2) : ''}</td><td>${e(vert(f, f.r2 || f.r1))}</td></tr>`).join('')}</table></details>`).join('')}</div>`;
    }

    // ── Pool ──
    async function quellenLaden() {
      if (quellen) return quellen;
      const holen = p => fetch(lwBaseUrl() + p, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
      const [v5, v6, kat, kr] = await Promise.all([holen('daten/vokabeln5.json'), holen('daten/vokabeln6.json'), holen('daten/katalog.json'), holen('daten/kopfrechnen.json')]);
      const baukasten = [];
      ((kat && kat.faecher) || []).forEach(f => (f.bereiche || []).forEach(b => (b.themen || []).forEach(t => {
        if (t.quelle && t.quelle.app === 'apps/typen/uebung.html') baukasten.push({ id: t.id, titel: t.titel, klasse: t.klasse, fach: f.name });
      })));
      const unitsVon = (v, kl) => Object.entries((v && v.units) || {}).map(([id, u]) => ({ id: kl + ':' + id, titel: `Kl. ${kl} · ${u.label || id}`, klasse: kl,
        woerter: Object.values(u.themes || {}).flatMap(th => th.words || []) }));
      quellen = { vokabeln: [...unitsVon(v5, 5), ...unitsVon(v6, 6)], baukasten,
        kopf: Object.entries((kr && kr.stufen) || {}).map(([id, s]) => ({ id, titel: s.titel + (s.kurz ? ' – ' + s.kurz : ''), stufe: s })) };
      return quellen;
    }
    function poolHtml() {
      if (!quellen) return '<div class="lw-karte">🎲 Quellen werden geladen …</div>';
      const p = pool, q = quellen;
      const quelleWahl = p.quelle === 'vokabeln' ? `<label class="lw-tl-feld">Unit <select data-lp="unit">${sel(p.unit, q.vokabeln.map(u => [u.id, u.titel]))}</select></label>
          <label class="lw-tl-feld">Richtung <select data-lp="richtung">${sel(p.richtung, [['en-de', 'Englisch → Deutsch'], ['de-en', 'Deutsch → Englisch']])}</select></label>`
        : p.quelle === 'baukasten' ? `<label class="lw-tl-feld">Thema <select data-lp="thema">${sel(p.thema, q.baukasten.map(t => [t.id, `${t.fach} ${t.klasse} · ${t.titel}`]))}</select></label>
          <label class="lw-tl-feld">Stufe <select data-lp="stufe">${sel(p.stufe, [['', 'alle Stufen'], ...((p.inhalt && p.inhalt.stufen) || []).filter(s => !s.mix).map(s => [s.id, s.titel])])}</select></label>`
        : `<label class="lw-tl-feld">Stufe <select data-lp="kopf">${sel(p.kopf, q.kopf.map(s => [s.id, s.titel]))}</select></label>`;
      return `<div class="lw-karte"><h2>🎲 Fragen aus dem Pool</h2>
        <p class="lw-klein">Freigaben gelten hier nicht – du darfst auch gesperrte Inhalte abfragen, etwa zum Einstieg in eine neue Unit. Aus den Fragen wird ein Quiz, das du danach wie ein eigenes bearbeitest und speicherst.</p>
        <div class="lw-lq-reihe"><label class="lw-tl-feld">Quelle <select data-lp="quelle">${sel(p.quelle, [['vokabeln', '🇬🇧 Vokabeln'], ['baukasten', '🧩 Baukasten-Inhalte'], ['kopf', '🧮 Kopfrechnen']])}</select></label>
          ${quelleWahl}<label class="lw-tl-feld">Anzahl <select data-lp="anzahl">${sel(p.anzahl, [3, 4, 5, 6, 7, 8, 9, 10].map(n => [n, n]))}</select></label></div>
        <div class="lw-knoepfe"><button class="lw-btn gold" data-lq="mischen">🎲 Mischen${quiz ? ' und anhängen' : ''}</button><button class="lw-btn" data-lq="pool-zu">Schließen</button></div></div>`;
    }
    async function poolWahl() {
      const p = pool;
      if (p.quelle === 'baukasten' && p.thema && (!p.inhalt || p.inhalt.thema !== p.thema)) {
        p.inhalt = null;
        try { const r = await fetch(lwBaseUrl() + `daten/inhalte/${p.thema.split('.')[0]}/${p.thema}.json`, { cache: 'no-cache' }); p.inhalt = r.ok ? await r.json() : null; } catch (x) { p.inhalt = null; }
        p.stufe = '';
      }
      zeichnen();
    }
    async function mischen() {
      const p = pool, q = quellen, n = Number(p.anzahl) || 5;
      let fragen = [], titel = '', fach = '', klasse = 0;
      if (p.quelle === 'vokabeln') {
        const u = q.vokabeln.find(x => x.id === p.unit);
        if (!u) return;
        fragen = L.ausVokabeln(u.woerter, { anzahl: n, richtung: p.richtung });
        titel = 'Vokabeln ' + u.titel.replace(/^Kl\. \d+ · /, ''); fach = 'Englisch'; klasse = u.klasse;
      } else if (p.quelle === 'baukasten') {
        const t = q.baukasten.find(x => x.id === p.thema);
        if (!t || !p.inhalt) { toast('⚠ Inhalt nicht geladen', true); return; }
        const stufen = (p.inhalt.stufen || []).filter(s => !s.mix && (!p.stufe || s.id === p.stufe)).map(s => ({ typ: p.inhalt.typ === 'gemischt' ? s.typ : (s.typ || p.inhalt.typ), ...s }));
        const basis = `daten/inhalte/${p.thema.split('.')[0]}/`;
        const alle = stufen.flatMap(s => L.ausBaukasten(s, { anzahl: MAX, basis }));
        fragen = alle.sort(() => Math.random() - .5).slice(0, n);
        titel = t.titel; fach = t.fach; klasse = t.klasse;
      } else {
        const s = q.kopf.find(x => x.id === p.kopf);
        if (!s) return;
        await LW.laden('gemeinsam/generatoren-mathe.js');
        fragen = L.ausKopfrechnen(s.stufe, { anzahl: n }, window.LernGeneratoren);
        titel = 'Kopfrechnen ' + s.stufe.titel; fach = 'Mathematik'; klasse = Number((s.id.match(/^ma\.(\d+)\./) || [])[1]) || 0;
      }
      if (!fragen.length) { toast('⚠ Daraus lassen sich keine Fragen machen (nur Auswahl, Lückentext mit Optionen, Zahlen, Zuordnen, Bild-Wort)', true); return; }
      fragen = fragen.map(f => ({ zeit: 0, ...f }));
      if (quiz) {
        const platz = MAX - quiz.fragen.length;
        if (platz <= 0) { toast(`⚠ Höchstens ${MAX} Fragen je Quiz`, true); return; }
        quiz.fragen.push(...fragen.slice(0, platz));
        toast(`🎲 ${Math.min(platz, fragen.length)} Fragen angehängt`);
      } else {
        quiz = { titel, fach, klasse, fragen, optionen: { modus: 'fuehren', rueckblick: true, xp: false, ampelEnde: false } };
        toast(`🎲 ${fragen.length} Fragen – jetzt ansehen, anpassen und speichern`);
      }
      pool = null;
      zeichnen();
    }

    // ── Editor ──
    function frageHtml(f, i) {
      const feld = (k, t, attr, wert) => `<label class="lw-tl-feld">${t}<input data-lf="${i}.${k}" value="${e(wert !== undefined ? wert : f[k] ?? '')}" ${attr || ''}></label>`;
      let extra = '';
      if (f.typ === 'auswahl') {
        const o = (f.optionen || []).concat(['', '', '', '']).slice(0, 4);
        extra = `<div class="lw-lq-opts">${o.map((x, k) => `<label class="lw-lq-opt"><input type="radio" name="r${i}" data-lf="${i}.richtig" value="${k}"${f.richtig === k ? ' checked' : ''} aria-label="${['A', 'B', 'C', 'D'][k]} ist richtig">
          <b>${['A', 'B', 'C', 'D'][k]}</b><input data-lf="${i}.opt${k}" value="${e(x)}" maxlength="80" placeholder="${k < 2 ? 'Antwort' : 'Antwort (optional)'}"></label>`).join('')}</div>
          <p class="lw-klein">Punkt = richtige Antwort.</p>`;
      } else if (f.typ === 'wahrfalsch') {
        extra = `<div class="lw-lq-reihe"><label><input type="radio" name="w${i}" data-lf="${i}.wahr" value="1"${f.wahr !== false ? ' checked' : ''}> stimmt (wahr)</label>
          <label><input type="radio" name="w${i}" data-lf="${i}.wahr" value="0"${f.wahr === false ? ' checked' : ''}> stimmt nicht (falsch)</label></div>`;
      } else if (f.typ === 'zahl') {
        extra = `<div class="lw-lq-reihe">${feld('wert', 'Lösung (Zahl)', 'inputmode="decimal" maxlength="16"', f.wert !== undefined ? L.zahlText(f.wert).replace(/ /g, '') : '')}</div>`;
      } else if (f.typ === 'schaetzen') {
        const z = k => f[k] !== undefined && f[k] !== null && f[k] !== '' ? String(f[k]).replace('.', ',') : '';
        extra = `<div class="lw-lq-reihe">${feld('min', 'von', 'inputmode="decimal" maxlength="12"', z('min'))}${feld('max', 'bis', 'inputmode="decimal" maxlength="12"', z('max'))}
          ${feld('wert', 'echter Wert', 'inputmode="decimal" maxlength="12"', z('wert'))}${feld('einheit', 'Einheit', 'maxlength="12" placeholder="z. B. m"')}
          ${feld('toleranz', 'zählt als richtig ±', 'inputmode="decimal" maxlength="12" placeholder="10 % vom Bereich"', z('toleranz'))}</div>`;
      } else if (f.typ === 'ampel') {
        extra = '<p class="lw-klein">🟢 verstanden · 🟡 teilweise · 🔴 noch nicht – ohne richtig/falsch. Ohne Text fragt sie „Wie sicher fühlst du dich?“.</p>';
      } else {
        extra = '<p class="lw-klein">Jedes Kind tippt ein Wort (max. 20 Zeichen). Der Beamer zeigt eine Wortwolke; ein Wortfilter läuft mit, und du kannst vor dem Aufdecken Wörter ausblenden.</p>';
      }
      const zweiteGeht = ['auswahl', 'wahrfalsch', 'zahl', 'schaetzen'].includes(f.typ);
      return `<div class="lw-karte lw-lq-frage"><div class="lw-lq-kopf"><b>${i + 1}.</b>
          <select data-lf="${i}.typ" aria-label="Fragetyp">${sel(f.typ, L.TYPEN.map(t => [t.id, t.symbol + ' ' + t.name]))}</select>
          <span style="margin-left:auto"></span><button class="lw-btn klein" data-lq="hoch" data-i="${i}"${i ? '' : ' disabled'} aria-label="nach oben">↑</button>
          <button class="lw-btn klein" data-lq="runter" data-i="${i}"${i < quiz.fragen.length - 1 ? '' : ' disabled'} aria-label="nach unten">↓</button>
          <button class="lw-btn klein" data-lq="weg" data-i="${i}" aria-label="Frage löschen">🗑</button></div>
        <label class="lw-tl-feld">Frage<input data-lf="${i}.text" value="${e(f.text)}" maxlength="200" placeholder="${f.typ === 'ampel' ? 'Wie sicher fühlst du dich?' : 'Fragetext'}"></label>
        ${extra}
        <div class="lw-lq-reihe"><label class="lw-tl-feld">Zeitlimit<select data-lf="${i}.zeit">${sel(f.zeit || 0, [[0, 'aus'], [20, '20 s'], [30, '30 s'], [60, '60 s']])}</select></label>
          ${zweiteGeht ? `<label class="lw-klein lw-lq-haken"><input type="checkbox" data-lf="${i}.zweite"${f.zweite ? ' checked' : ''}> 🗣 Zweite Runde nach Partnergespräch</label>` : ''}
          ${feld('emoji', 'Emoji', 'maxlength="8" style="width:5rem"')}${feld('bild', 'Bild (daten/inhalte/…)', 'maxlength="120" placeholder="optional"')}</div>
        ${f.typ === 'wort' || f.typ === 'ampel' ? '' : feld('erklaerung', 'Erklärung nach dem Aufdecken (ein Satz, optional)', 'maxlength="200"')}</div>`;
    }
    function editorHtml() {
      const q = quiz, o = q.optionen;
      return `<div class="lw-karte"><h2>${q.id ? '✏️ Quiz bearbeiten' : '➕ Neues Quiz'}</h2>
          <div class="lw-lq-reihe"><label class="lw-tl-feld" style="flex:2">Titel<input data-lq-feld="titel" value="${e(q.titel)}" maxlength="80" placeholder="z. B. Unit 2 – Einstieg"></label>
            <label class="lw-tl-feld">Fach<select data-lq-feld="fach">${sel(q.fach, [['', '–'], ...[...new Set([...faecher(), q.fach].filter(Boolean))].map(f => [f, f])])}</select></label>
            <label class="lw-tl-feld">Klasse<select data-lq-feld="klasse">${sel(q.klasse || 0, [[0, '–'], ...Array.from({ length: 13 }, (_, k) => [k + 1, k + 1])])}</select></label></div>
          <div class="lw-lq-reihe lw-lq-optionen">
            <label><input type="radio" name="modus" data-lq-opt="modus" value="fuehren"${o.modus !== 'selbst' ? ' checked' : ''}> 📊 <b>Ich führe</b> – Frage für Frage am Beamer</label>
            <label><input type="radio" name="modus" data-lq-opt="modus" value="selbst"${o.modus === 'selbst' ? ' checked' : ''}> 🧑‍🎓 <b>Selbst</b> – jedes Kind im eigenen Tempo (z. B. Exit-Ticket)</label></div>
          <div class="lw-lq-reihe lw-lq-optionen">
            <label><input type="checkbox" data-lq-opt="rueckblick"${o.rueckblick ? ' checked' : ''}> 📈 Rückblick speichern (anonyme Zusammenfassung je Frage)</label>
            <label><input type="checkbox" data-lq-opt="xp"${o.xp ? ' checked' : ''}> ⭐ XP fürs Mitmachen (zählt nicht für die Spielsperre)</label>
            <label><input type="checkbox" data-lq-opt="ampelEnde"${o.ampelEnde ? ' checked' : ''}> 🚦 Ampel am Ende („Wie sicher fühlst du dich?“)</label></div></div>
        ${q.fragen.map(frageHtml).join('')}
        <div class="lw-karte"><div class="lw-knoepfe" style="margin-top:0">
          <select data-lq-neutyp aria-label="Typ der neuen Frage">${sel('auswahl', L.TYPEN.map(t => [t.id, t.symbol + ' ' + t.name]))}</select>
          <button class="lw-btn" data-lq="frage"${q.fragen.length >= MAX ? ' disabled' : ''}>➕ Frage (${q.fragen.length}/${MAX})</button>
          <button class="lw-btn" data-lq="pool">🎲 Fragen aus dem Pool</button>
          <span style="margin-left:auto"></span><button class="lw-btn" data-lq="abbrechen">Abbrechen</button><button class="lw-btn gold" data-lq="speichern">💾 Speichern</button></div></div>`;
    }

    /** Eingabe → Modell (ohne neu zu zeichnen; Typwechsel zeichnet neu) */
    function eingabe(t) {
      if (!quiz) return;
      if (t.dataset.lqFeld) { const k = t.dataset.lqFeld; quiz[k] = k === 'klasse' ? Number(t.value) || 0 : t.value; return; }
      if (t.dataset.lqOpt) { const k = t.dataset.lqOpt; quiz.optionen[k] = t.type === 'checkbox' ? t.checked : t.value; return; }
      if (!t.dataset.lf) return;
      const [i, k] = t.dataset.lf.split('.'), f = quiz.fragen[Number(i)];
      if (!f) return;
      if (k === 'typ') {
        const n = neueFrage(t.value); n.text = f.text; n.zeit = f.zeit; if (f.emoji) n.emoji = f.emoji;
        if (t.value === 'schaetzen') Object.assign(n, { min: 0, max: 100, wert: 50 });
        if (t.value === 'zahl') n.wert = '';
        quiz.fragen[Number(i)] = n; zeichnen(); return;
      }
      if (/^opt\d$/.test(k)) { f.optionen = (f.optionen || []).concat(['', '', '', '']).slice(0, 4); f.optionen[Number(k.slice(3))] = t.value; return; }
      if (k === 'richtig') { f.richtig = Number(t.value); return; }
      if (k === 'wahr') { f.wahr = t.value === '1'; return; }
      if (k === 'zeit') { f.zeit = Number(t.value) || 0; return; }
      if (k === 'zweite') { f.zweite = t.checked; return; }
      f[k] = t.value;
    }
    /** Modell → Format des Workers; → { fragen } oder { fehler } */
    function fertigeFragen() {
      const aus = [];
      for (let i = 0; i < quiz.fragen.length; i++) {
        const f = quiz.fragen[i], w = `Frage ${i + 1}: `;
        const g = { typ: f.typ, text: String(f.text || '').trim(), zeit: f.zeit || 0 };
        if (!g.text && f.typ !== 'ampel') return { fehler: w + 'Fragetext fehlt' };
        if (f.typ === 'auswahl') {
          const o = (f.optionen || []).map((x, k) => ({ x: String(x || '').trim(), k })).filter(z => z.x);
          if (o.length < 2) return { fehler: w + 'mindestens 2 Antworten' };
          const r = o.findIndex(z => z.k === f.richtig);
          if (r < 0) return { fehler: w + 'Die richtige Antwort (Punkt) ist leer' };
          Object.assign(g, { optionen: o.map(z => z.x), richtig: r });
        }
        if (f.typ === 'wahrfalsch') g.wahr = f.wahr !== false;
        if (f.typ === 'zahl') { g.wert = L.zahl(f.wert); if (g.wert === null) return { fehler: w + 'Lösung ist keine Zahl' }; }
        if (f.typ === 'schaetzen') {
          ['min', 'max', 'wert'].forEach(k => { g[k] = L.zahl(f[k]); });
          if (g.min === null || g.max === null || g.wert === null || !(g.min < g.max) || g.wert < g.min || g.wert > g.max) return { fehler: w + 'Bereich prüfen (von < bis, echter Wert dazwischen)' };
          if (String(f.einheit || '').trim()) g.einheit = String(f.einheit).trim();
          if (String(f.toleranz ?? '').trim() !== '') { g.toleranz = L.zahl(f.toleranz); if (g.toleranz === null || g.toleranz < 0) return { fehler: w + 'Toleranz ist keine Zahl' }; }
        }
        if (f.zweite && ['auswahl', 'wahrfalsch', 'zahl', 'schaetzen'].includes(f.typ)) g.zweite = true;
        if (String(f.emoji || '').trim()) g.emoji = String(f.emoji).trim();
        if (String(f.bild || '').trim()) {
          if (!/^daten\/inhalte\/[a-z]+\/[a-z0-9.-]{1,80}\.(svg|png|jpg|jpeg|webp)$/.test(String(f.bild).trim())) return { fehler: w + 'Bild nur aus daten/inhalte/<fach>/ (svg, png, jpg, webp)' };
          g.bild = String(f.bild).trim();
        }
        if (String(f.erklaerung || '').trim() && f.typ !== 'wort' && f.typ !== 'ampel') g.erklaerung = String(f.erklaerung).trim();
        aus.push(g);
      }
      return { fragen: aus };
    }
    async function speichern() {
      if (!String(quiz.titel || '').trim()) { toast('⚠ Bitte einen Titel eingeben', true); return; }
      if (!quiz.fragen.length) { toast('⚠ Mindestens eine Frage', true); return; }
      const r = fertigeFragen();
      if (r.fehler) { toast('⚠ ' + r.fehler, true); return; }
      const d = await senden('/live/quiz/speichern', { id: quiz.id, titel: quiz.titel.trim(), fach: quiz.fach || '', klasse: quiz.klasse || 0, fragen: r.fragen, optionen: quiz.optionen },
        `💾 „${quiz.titel.trim()}“ gespeichert`);
      if (!d) return;
      quiz = null; pool = null;
      await laden();
    }
    /** Quiz vom Worker in das Bearbeitungs-Modell (Auswahl immer mit 4 Feldern) */
    function zumBearbeiten(q, kopie) {
      const m = JSON.parse(JSON.stringify(q));
      m.fragen = (m.fragen || []).map(f => f.typ === 'auswahl' ? { ...f, optionen: f.optionen.concat(['', '', '', '']).slice(0, 4) } : { ...f });
      m.optionen = { modus: 'fuehren', rueckblick: false, xp: false, ampelEnde: false, ...(m.optionen || {}) };
      if (kopie) { delete m.id; m.titel = (m.titel + ' (Kopie)').slice(0, 80); }
      return m;
    }

    function zeichnen() {
      if (!aktiv) return;
      host.innerHTML = quiz ? (pool ? poolHtml() : '') + editorHtml() : uebersicht();
    }

    const klick = async ev => {
      const b = ev.target.closest('button[data-lq]');
      if (!b || !host.contains(b)) return;
      const a = b.dataset.lq, box = b.closest('[data-lq-id]'), q = box ? (liste || []).find(x => x.id === box.dataset.lqId) : null;
      if (a === 'neu') { quiz = { titel: '', fach: '', klasse: 0, fragen: [neueFrage()], optionen: { modus: 'fuehren', rueckblick: true, xp: false, ampelEnde: false } }; pool = null; zeichnen(); return; }
      if (a === 'pool') {
        pool = { quelle: 'vokabeln', richtung: 'en-de', anzahl: 5, unit: '', thema: '', stufe: '', kopf: '', inhalt: null };
        zeichnen();
        await quellenLaden();
        pool.unit = (quellen.vokabeln[0] || {}).id || ''; pool.thema = (quellen.baukasten[0] || {}).id || ''; pool.kopf = (quellen.kopf[0] || {}).id || '';
        zeichnen(); return;
      }
      if (a === 'pool-zu') { pool = null; zeichnen(); return; }
      if (a === 'mischen') { await mischen(); return; }
      if (a === 'abbrechen') { if (confirm('Änderungen verwerfen?')) { quiz = null; pool = null; zeichnen(); } return; }
      if (a === 'speichern') { await speichern(); return; }
      if (a === 'frage') { const t = host.querySelector('[data-lq-neutyp]'); const n = neueFrage(t ? t.value : 'auswahl'); if (n.typ === 'schaetzen') Object.assign(n, { min: 0, max: 100, wert: 50 }); quiz.fragen.push(n); zeichnen(); return; }
      if (a === 'hoch' || a === 'runter') { const i = Number(b.dataset.i), j = a === 'hoch' ? i - 1 : i + 1; [quiz.fragen[i], quiz.fragen[j]] = [quiz.fragen[j], quiz.fragen[i]]; zeichnen(); return; }
      if (a === 'weg') { if (quiz.fragen.length > 1 || confirm('Letzte Frage löschen?')) { quiz.fragen.splice(Number(b.dataset.i), 1); zeichnen(); } return; }
      if (a === 'rb-weg') {
        ev.preventDefault();
        if (!confirm('Diesen Rückblick löschen?')) return;
        if (await senden('/live/rueckblick/loeschen', { id: b.dataset.rb }, '🗑 Rückblick gelöscht')) { rueckblicke[offenRb] = (rueckblicke[offenRb] || []).filter(r => r.id !== b.dataset.rb); zeichnen(); }
        return;
      }
      if (!q) return;
      if (a === 'bearbeiten' || a === 'kopieren') {
        const d = await senden('/live/quiz/lesen', { id: q.id });
        if (d && d.quiz) { quiz = zumBearbeiten(d.quiz, a === 'kopieren'); pool = null; zeichnen(); window.scrollTo(0, 0); }
        return;
      }
      if (a === 'archiv') { if (await senden('/live/quiz/archivieren', { id: q.id, archiviert: !q.archiviert }, q.archiviert ? '↩ Zurückgeholt' : '🗄 Archiviert – im Unterrichtsmodus nicht mehr sichtbar')) laden(); return; }
      if (a === 'loeschen') {
        if (!confirm(`Quiz „${q.titel}“ endgültig löschen? Seine Rückblicke werden mitgelöscht. (Tipp: Archivieren blendet es nur aus.)`)) return;
        if (await senden('/live/quiz/loeschen', { id: q.id }, '🗑 Gelöscht')) laden();
        return;
      }
      if (a === 'rb') {
        offenRb = offenRb === q.id ? '' : q.id;
        zeichnen();
        if (offenRb) { const d = await senden('/live/rueckblicke', { quizId: q.id }); rueckblicke[q.id] = d ? d.rueckblicke || [] : []; zeichnen(); }
      }
    };
    const aenderung = ev => {
      const t = ev.target;
      if (t.matches('[data-lq-archiv]')) { archiv = t.checked; zeichnen(); return; }
      if (t.dataset.lp && pool) { pool[t.dataset.lp] = t.value; poolWahl(); return; }
      eingabe(t);
    };
    const tippen = ev => { const t = ev.target; if (t.matches('input:not([type=radio]):not([type=checkbox])') && !t.dataset.lp) eingabe(t); };
    host.addEventListener('click', klick);
    host.addEventListener('change', aenderung);
    host.addEventListener('input', tippen);
    zeichnen();
    laden();
    return () => { aktiv = false; host.removeEventListener('click', klick); host.removeEventListener('change', aenderung); host.removeEventListener('input', tippen); };
  },
});
