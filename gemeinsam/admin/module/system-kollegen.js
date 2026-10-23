// ═══════════════════════════════════════════════════════
//  Admin-Modul System → Kollegen  (Admin-Umbau Etappe 10: Rollen)
//  Kollegen-Zugänge für die eigene Schule: anlegen (Kürzel, Gruppen, gültig bis), sperren, Ablauf ändern,
//  neuen Code ausgeben, löschen. Mit dem Code kommt man nur in den Unterrichtsmodus – für die zugeteilten Gruppen
//  (App-QR, Medien, „Spiele heute frei“, Fokus). Das Admin-Passwort wird nie weitergegeben.
//  Daten beim Worker (cloudflare/kollegen.js, Tabelle in SYNC_DB); der Code wird nur einmal angezeigt.
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'kollegen', bereich: 'system', titel: 'Kollegen', symbol: '👥', reihenfolge: 15,
  suchbegriffe: ['Kollegen', 'Zugang', 'Rollen', 'Code', 'Lehrkraft', 'Unterrichtsmodus', 'sperren'],
  zeigen(host, { store, toast }) {
    let aktiv = true, liste = null, fehler = '', gruppen = [], offen = '';
    const e = s => escHtml(String(s == null ? '' : s));
    const iso = d => LWAdmin.termine.iso(d);
    const datum = ms => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const gName = id => (gruppen.find(g => g.id === id) || { name: 'Gruppe ' + id.slice(0, 6) + '…' }).name;
    /** Vorschlag: Ende des Schuljahres (31. Juli), höchstens 400 Tage */
    function schuljahrEnde() {
      const h = new Date(), j = h.getMonth() >= 7 ? h.getFullYear() + 1 : h.getFullYear();
      return iso(new Date(Math.min(new Date(j, 6, 31).getTime(), Date.now() + 399 * 864e5)));
    }
    const bisMs = s => new Date(s + 'T23:59:00').getTime();
    const max = () => iso(new Date(Date.now() + 399 * 864e5));

    async function laden() {
      try { liste = (await store.worker('/kollegen/liste', {})).kollegen || []; fehler = ''; }
      catch (x) {
        liste = null;
        fehler = x.status === 404 ? 'Bei Cloudflare läuft noch der alte Worker – bitte cloudflare/worker.js ersetzen und cloudflare/kollegen.js anlegen (cloudflare/ANLEITUNG.md).'
          : x.status === 501 ? x.message : x.status === 401 ? 'Anmeldung abgelaufen – bitte neu anmelden.' : (x.message || String(x));
      }
      zeichnen();
    }
    async function senden(pfad, body, gut) {
      try { const d = await store.worker(pfad, body); if (gut) toast(gut); await laden(); return d; }
      catch (x) { toast('⚠ ' + (x.message || x), true); return null; }
    }
    function codeZeigen(kuerzel, code) {
      const adresse = new URL('admin.html', location.href).href.replace(/#.*$/, '');
      LWAdmin.dialog({ titel: `🔑 Code für ${kuerzel}`, text: `${code}  –  Anmelden unter ${adresse} (statt des Passworts). Der Code wird nur jetzt angezeigt; bitte notieren oder direkt weitergeben. Verloren? Einfach einen neuen erzeugen.` });
    }
    const gruppenWahl = (name, an) => gruppen.length ? `<div class="st-chips">${gruppen.map(g =>
      `<label class="st-chip"><input type="checkbox" name="${e(name)}" value="${e(g.id)}"${an.includes(g.id) ? ' checked' : ''}> ${e(g.name)}</label>`).join('')}</div>`
      : '<p class="lw-klein">Noch keine Sync-Gruppen (Gruppen → Sicherungskarten) – ohne Gruppe sieht der Zugang nur App-QR und Medien.</p>';

    function zeichnen() {
      if (!aktiv) return;
      const zeilen = (liste || []).map(k => {
        const abgelaufen = k.bis <= Date.now(), status = !k.aktiv ? '⛔ gesperrt' : abgelaufen ? '⌛ abgelaufen' : '🟢 aktiv';
        return `<div class="lw-karte lw-kol" data-kol-id="${e(k.id)}">
          <div class="lw-kol-kopf"><b>👥 ${e(k.kuerzel)}</b><span class="lw-klein">${status} · bis ${datum(k.bis)} · ${k.zuletzt ? 'zuletzt angemeldet ' + datum(k.zuletzt) : 'noch nie angemeldet'}</span>
            <label class="switch" title="${k.aktiv ? 'Zugang sperren' : 'Zugang freigeben'}"><input type="checkbox" data-kol-aktiv${k.aktiv ? ' checked' : ''} aria-label="Zugang ${e(k.kuerzel)} aktiv"><span></span></label></div>
          <p class="lw-klein">Gruppen: ${k.gruppen.length ? k.gruppen.map(id => e(gName(id))).join(', ') : 'keine'}</p>
          ${offen === k.id ? `<div class="lw-kol-bearbeiten">
              <label class="lw-tl-feld">Kürzel <input data-kol-kuerzel value="${e(k.kuerzel)}" maxlength="20"></label>
              <label class="lw-tl-feld">gültig bis <input type="date" data-kol-bis value="${iso(new Date(k.bis))}" min="${iso(new Date(Date.now() + 864e5))}" max="${max()}"></label>
              <div class="lw-tl-feld">Gruppen ${gruppenWahl('g-' + k.id, k.gruppen)}</div>
              <div class="lw-knoepfe"><button class="lw-btn gold" data-kol="speichern">Übernehmen</button><button class="lw-btn" data-kol="zu">Schließen</button></div></div>` : ''}
          <div class="lw-knoepfe"><button class="lw-btn klein" data-kol="bearbeiten">✏️ Ändern</button><button class="lw-btn klein" data-kol="code">🔑 Neuer Code</button><button class="lw-btn klein" data-kol="loeschen">🗑 Löschen</button></div></div>`;
      }).join('');
      host.innerHTML = `
        <div class="lw-karte"><h2>👥 Kollegen-Zugänge</h2>
          <p>Für Kolleginnen und Kollegen deiner Schule: ein eigener Code statt deines Passworts. Damit sehen sie nur den <b>Unterrichtsmodus</b>
            – App-QR-Codes, Medien und für <b>ihre Gruppen</b> „Spiele heute frei“ und Fokus. Einstellungen ändern können sie nicht (der Worker prüft das selbst).
            Ein Kürzel reicht, kein voller Name nötig. Sperren und Ablauf wirken sofort.</p>
          ${fehler ? `<p class="lw-rot">⚠ ${e(fehler)}</p>` : ''}</div>
        ${fehler ? '' : `<div class="lw-karte"><h2>➕ Neuer Zugang</h2>
          <label class="lw-tl-feld">Kürzel <input data-neu-kuerzel maxlength="20" placeholder="z. B. Mü oder 6b-Englisch"></label>
          <label class="lw-tl-feld">gültig bis <input type="date" data-neu-bis value="${schuljahrEnde()}" min="${iso(new Date(Date.now() + 864e5))}" max="${max()}"></label>
          <div class="lw-tl-feld">Gruppen ${gruppenWahl('neu', [])}</div>
          <div class="lw-knoepfe"><button class="lw-btn gold" data-kol="anlegen">Zugang anlegen</button></div></div>`}
        ${liste === null && !fehler ? '<div class="lw-karte">lädt …</div>' : ''}
        ${liste && !liste.length ? '<p class="lw-klein">Noch keine Kollegen-Zugänge.</p>' : zeilen}`;
    }

    const klick = async ev => {
      const b = ev.target.closest('button[data-kol]'); if (!b || !host.contains(b)) return;
      const a = b.dataset.kol, box = b.closest('.lw-kol');
      const k = box ? (liste || []).find(x => x.id === box.dataset.kolId) : null;
      if (a === 'anlegen') {
        const kuerzel = host.querySelector('[data-neu-kuerzel]').value.trim(), bis = host.querySelector('[data-neu-bis]').value;
        if (!kuerzel) { toast('⚠ Bitte ein Kürzel eingeben', true); return; }
        if (!bis) { toast('⚠ Bitte ein Datum wählen', true); return; }
        const gr = [...host.querySelectorAll('input[name="neu"]:checked')].map(i => i.value);
        const d = await senden('/kollegen/anlegen', { kuerzel, gruppen: gr, bis: bisMs(bis) }, `👥 Zugang „${kuerzel}“ angelegt`);
        if (d && d.code) codeZeigen(kuerzel, d.code);
        return;
      }
      if (!k) return;
      if (a === 'bearbeiten') { offen = offen === k.id ? '' : k.id; zeichnen(); return; }
      if (a === 'zu') { offen = ''; zeichnen(); return; }
      if (a === 'speichern') {
        const kuerzel = box.querySelector('[data-kol-kuerzel]').value.trim(), bis = box.querySelector('[data-kol-bis]').value;
        const gr = [...box.querySelectorAll(`input[name="g-${k.id}"]:checked`)].map(i => i.value);
        offen = '';
        await senden('/kollegen/aendern', { id: k.id, kuerzel, gruppen: gr, bis: bisMs(bis) }, `👥 „${kuerzel}“ geändert`);
        return;
      }
      if (a === 'code') {
        if (!confirm(`Neuen Code für „${k.kuerzel}“ erzeugen? Der bisherige gilt dann nicht mehr (auch auf angemeldeten Geräten nicht, sobald sie sich neu anmelden).`)) return;
        const d = await senden('/kollegen/neuer-code', { id: k.id });
        if (d && d.code) codeZeigen(k.kuerzel, d.code);
        return;
      }
      if (a === 'loeschen') {
        if (confirm(`Zugang „${k.kuerzel}“ löschen? Angemeldete Geräte sind sofort abgemeldet.`)) await senden('/kollegen/loeschen', { id: k.id }, `🗑 Zugang „${k.kuerzel}“ gelöscht`);
      }
    };
    const aenderung = async ev => {
      const t = ev.target;
      if (!t.matches('[data-kol-aktiv]')) return;
      const k = (liste || []).find(x => x.id === t.closest('.lw-kol').dataset.kolId);
      if (k) await senden('/kollegen/aendern', { id: k.id, aktiv: t.checked }, t.checked ? `🟢 „${k.kuerzel}“ freigegeben` : `⛔ „${k.kuerzel}“ gesperrt – wirkt sofort`);
    };
    host.addEventListener('click', klick);
    host.addEventListener('change', aenderung);
    zeichnen();
    LWAdmin.quellen.gruppen().then(g => { gruppen = g; }).catch(() => {}).then(laden);
    return () => { aktiv = false; host.removeEventListener('click', klick); host.removeEventListener('change', aenderung); };
  },
});
