// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin (neu) – Rahmen: Anmeldung, Kopfleiste, Meldungen  (Admin-Umbau Etappe 1)
//  Lädt als LETZTES Skript von admin-neu.html (nach store.js, module.js und allen Modulen).
//  Anmeldung wie im bisherigen Admin: ConfigAPI, Schlüssel 7 Tage gültig.
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

  async function veroeffentlichen() {
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
    $('admin').style.display = '';
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
    LWAdmin.starten({ store, gehe: LWAdmin.gehe, toast });
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

  // ── Verdrahten ────────────────────────────────────────
  $('lw-version').textContent = (window.LW && LW.versionText) ? LW.versionText() : '';
  $('btn-anmelden').addEventListener('click', anmelden);
  $('pw').addEventListener('keydown', e => { if (e.key === 'Enter') anmelden(); });
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
