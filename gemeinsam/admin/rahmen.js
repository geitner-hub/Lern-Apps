// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin (neu) – Rahmen: Anmeldung, Kopfleiste, Meldungen  (Admin-Umbau Etappe 1)
//  Lädt als LETZTES Skript von admin.html (nach store.js, module.js, bruecke.js und allen Modulen).
//  Anmeldung über ConfigAPI, Schlüssel 7 Tage gültig.
// ═══════════════════════════════════════════════════════
'use strict';

(() => {
  const $ = id => document.getElementById(id);
  const store = LWAdmin.store;

  // ── Meldungen ─────────────────────────────────────────
  let toastTimer = null;
  function toast(text, fehler = false) {
    const t = $('lw-toast');
    t.textContent = text;
    t.className = 'zeigen' + (fehler ? ' fehler' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = ''; }, fehler ? 4500 : 2400);
  }

  /** Wert kurz und lesbar für die Unterschiede-Liste */
  function kurz(v) {
    if (v === undefined) return '–';
    const s = typeof v === 'string' ? '„' + v + '“' : JSON.stringify(v);
    return s.length > 70 ? s.slice(0, 67) + '…' : s;
  }
  LWAdmin.kurz = kurz;

  // ── Kopfleiste: Entwurf und Veröffentlichen ───────────
  function kopfleiste() {
    const n = store.anzahl();
    $('lw-entwurf').hidden = n === 0;
    $('lw-entwurf-zahl').textContent = n === 1 ? '1 ungespeicherte Änderung' : n + ' ungespeicherte Änderungen';
    if (pruefeGerade) return;
    $('lw-veroeffentlichen').disabled = n === 0 || store.gesperrt() || store.beschaeftigt();
    $('lw-veroeffentlichen').textContent = store.beschaeftigt() ? 'Veröffentlicht …' : '🚀 Veröffentlichen';
    $('lw-gesperrt').hidden = !store.gesperrt();
    const liste = $('lw-entwurf-liste');
    if (n === 0) liste.hidden = true;
    if (!liste.hidden) entwurfListe();
  }
  function entwurfListe() {
    const u = store.unterschiede();
    $('lw-entwurf-liste').innerHTML =
      `<ul class="lw-liste">${store.aenderungen().reverse().map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>` +
      (u.length ? `<details><summary>${u.length} geänderte Werte</summary><ul class="lw-liste lw-klein">${u.slice(0, 60).map(x =>
        `<li><code>${escHtml(x.pfad || '(alles)')}</code> ${escHtml(kurz(x.alt))} → ${escHtml(kurz(x.neu))}</li>`).join('')}${u.length > 60 ? '<li>…</li>' : ''}</ul></details>` : '');
  }

  // ── Dialog (Prüfung, Bestätigungen) ───────────────────
  /** → Promise<boolean>; ohne ja-Text nur ein „OK“ (nichts zu entscheiden) */
  function dialog({ titel, fehler = [], warnungen = [], text = '', ja = '', nein = 'Abbrechen' }) {
    return new Promise(fertig => {
      const d = $('lw-dialog');
      const liste = (l, kl) => l.length ? `<ul class="lw-liste ${kl}">${l.map(x => `<li>${escHtml(x)}</li>`).join('')}</ul>` : '';
      d.innerHTML = `<div class="lw-dialog-box" role="dialog" aria-modal="true" aria-labelledby="lw-dialog-titel">
        <h2 id="lw-dialog-titel">${escHtml(titel)}</h2>${text ? `<p>${escHtml(text)}</p>` : ''}
        ${fehler.length ? '<h3>⛔ Fehler – so nicht veröffentlichen</h3>' + liste(fehler, 'lw-rot') : ''}
        ${warnungen.length ? '<h3>⚠️ Warnungen</h3>' + liste(warnungen, '') : ''}
        <div class="lw-knoepfe">${ja ? `<button class="lw-btn gold" data-a="ja">${escHtml(ja)}</button>` : ''}
          <button class="lw-btn" data-a="nein">${escHtml(ja ? nein : 'OK')}</button></div></div>`;
      d.hidden = false;
      const zu = wert => { d.hidden = true; d.innerHTML = ''; fertig(wert); };
      d.querySelectorAll('[data-a]').forEach(b => { b.onclick = () => zu(b.dataset.a === 'ja'); });
      d.onclick = e => { if (e.target === d) zu(false); };
      (d.querySelector('[data-a="ja"]') || d.querySelector('[data-a]')).focus();
    });
  }
  LWAdmin.dialog = dialog;
  LWAdmin.veroeffentlichen = () => veroeffentlichen();      // für Schnellaktionen (mit Prüfung)

  // ── Veröffentlichen: erst prüfen (Etappe 3), Fehler blockieren, Warnungen bestätigen ──
  let pruefeGerade = false;
  async function veroeffentlichen() {
    if (pruefeGerade) return;
    pruefeGerade = true;
    const knopf = $('lw-veroeffentlichen');
    knopf.disabled = true; knopf.textContent = 'Prüfe …';
    let p;
    try { p = await LWAdmin.pruefen(store.daten()); }
    catch (e) { p = { fehler: [], warnungen: ['Prüfung nicht möglich: ' + (e.message || e)] }; }
    finally { pruefeGerade = false; kopfleiste(); }
    if (p.fehler.length) {
      await dialog({ titel: 'Veröffentlichen gestoppt', text: 'Bitte zuerst beheben (oder den Entwurf verwerfen).', fehler: p.fehler, warnungen: p.warnungen });
      return;
    }
    if (p.warnungen.length && !await dialog({ titel: 'Trotzdem veröffentlichen?', warnungen: p.warnungen, ja: '🚀 Trotzdem veröffentlichen' })) return;
    const r = await store.veroeffentlichen();
    if (r.ok) { toast('🚀 Veröffentlicht – auf der Startseite in ca. 1 Min. sichtbar'); return; }
    if (r.status === 401) { zeigeAnmeldung('Sitzung abgelaufen – bitte neu anmelden. Dein Entwurf bleibt erhalten.'); return; }
    toast(r.fehler === 'CONFLICT'
      ? '⚠ Konflikt: Die Lernwelt wurde woanders geändert. Seite neu laden – der Entwurf wird dir dann angeboten.'
      : '⚠ Fehler beim Veröffentlichen: ' + (r.fehler || ''), true);
  }

  // ── Anmeldung ─────────────────────────────────────────
  async function zeigeAdmin() {
    $('anmeldung').style.display = 'none';
    $('admin').style.display = 'block';
    const bis = ConfigAPI.sessionExpiry();
    $('lw-sitzung').textContent = bis
      ? 'angemeldet bis ' + bis.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '';
    const r = await store.laden({
      beiKonflikt: n => confirm(`Auf diesem Gerät liegt ein Entwurf mit ${n} Änderung${n === 1 ? '' : 'en'}.\n\n` +
        'Inzwischen wurde die Lernwelt aber woanders geändert.\n\nOK = Entwurf trotzdem übernehmen (ersetzt die neueren Änderungen beim Veröffentlichen)\n' +
        'Abbrechen = Entwurf verwerfen'),
    });
    if (!r.ok) toast('⚠ config.json konnte nicht geladen werden – Speichern ist gesperrt', true);
    else if (r.entwurfWieder) toast(`✏️ Entwurf mit ${r.entwurfWieder} Änderung${r.entwurfWieder === 1 ? '' : 'en'} wiederhergestellt`);
    const ctx = { store, gehe: LWAdmin.gehe, toast };
    if (LWAdmin.bruecke) LWAdmin.bruecke.start(ctx);      // Funktionsdateien über die Brücke
    LWAdmin.starten(ctx);
  }
  function zeigeAnmeldung(text) {
    $('admin').style.display = 'none';
    $('anmeldung').style.display = 'flex';
    $('pw-fehler').textContent = text || '';
    $('pw').focus();
  }
  async function anmelden() {
    const pw = $('pw').value, knopf = $('btn-anmelden');
    if (!pw) { $('pw-fehler').textContent = 'Bitte Passwort eingeben'; return; }
    knopf.disabled = true; knopf.textContent = 'Prüfe …'; $('pw-fehler').textContent = '';
    const res = await ConfigAPI.login(pw);
    knopf.disabled = false; knopf.textContent = 'Anmelden';
    $('pw').value = '';
    if (res.ok) zeigeAdmin();
    else zeigeAnmeldung(res.status === 401 ? '❌ Falsches Passwort'
                      : res.status === 429 ? '⏳ ' + res.error
                      : '⚠ ' + (res.error || 'Fehler'));
  }

  LWAdmin.anmeldungZeigen = zeigeAnmeldung;            // für Module (Abmelden, abgelaufene Sitzung)

  // ── Verdrahten ────────────────────────────────────────
  $('lw-version').textContent = (window.LW && LW.versionText) ? LW.versionText() : '';
  $('btn-anmelden').addEventListener('click', anmelden);
  $('pw').addEventListener('keydown', e => { if (e.key === 'Enter') anmelden(); });
  $('lw-suchen').addEventListener('click', () => LWAdmin.suche.auf());
  $('lw-abmelden').addEventListener('click', () => { ConfigAPI.logout(); zeigeAnmeldung('Abgemeldet.'); });
  $('lw-veroeffentlichen').addEventListener('click', veroeffentlichen);
  $('lw-verwerfen').addEventListener('click', () => {
    const n = store.anzahl();
    if (n && confirm(`Alle ${n} unveröffentlichten Änderungen verwerfen?`)) { store.verwerfen(); toast('Entwurf verworfen'); }
  });
  $('lw-entwurf-zahl').addEventListener('click', () => {
    const l = $('lw-entwurf-liste');
    l.hidden = !l.hidden;
    $('lw-entwurf-zahl').setAttribute('aria-expanded', String(!l.hidden));
    if (!l.hidden) entwurfListe();
  });
  document.addEventListener('click', e => {             // Entwurfs-Fenster schließt beim Tippen daneben
    const l = $('lw-entwurf-liste');
    if (!l.hidden && !l.contains(e.target) && e.target !== $('lw-entwurf-zahl')) { l.hidden = true; $('lw-entwurf-zahl').setAttribute('aria-expanded', 'false'); }
  });
  store.abonnieren(kopfleiste);
  window.addEventListener('beforeunload', e => { if (store.beschaeftigt()) { e.preventDefault(); e.returnValue = ''; } });

  // Auf diesem Gerät schon angemeldet? → Schlüssel serverseitig prüfen (wie admin.html)
  (async () => {
    if (!ConfigAPI.hasSession()) { zeigeAnmeldung(''); return; }
    const res = await ConfigAPI.checkSession();
    if (res.ok) zeigeAdmin();
    else zeigeAnmeldung(res.status === 401 ? 'Anmeldung abgelaufen – bitte Passwort eingeben.' : (res.error ? '⚠ ' + res.error : ''));
  })();
})();
