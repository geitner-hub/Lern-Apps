// Admin-Modul System → Anmeldung und Geräte (Admin-Umbau Etappe 2; bisher Knöpfe in der Kopfleiste von admin.html)
'use strict';

LWAdmin.modul({
  id: 'anmeldung', bereich: 'system', titel: 'Anmeldung und Geräte', symbol: '🔒', reihenfolge: 10,
  suchbegriffe: ['Anmeldung', 'Abmelden', 'Geräte', 'Passwort', 'Schlüssel'],
  zeigen(host, { toast }) {
    const bis = ConfigAPI.sessionExpiry();
    host.innerHTML = `
      <div class="lw-karte">
        <h2>🔒 Dieses Gerät</h2>
        <p>${bis ? 'Angemeldet bis ' + escHtml(bis.toLocaleString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })) + '.' : 'Nicht angemeldet.'}
          Das Passwort wird nicht gespeichert, nur ein Schlüssel, der 7 Tage gilt.</p>
        <div class="lw-knoepfe"><button class="lw-btn" data-akt="abmelden">🔒 Dieses Gerät abmelden</button></div>
      </div>
      <div class="lw-karte">
        <h2>🚫 Alle Geräte</h2>
        <p>Meldet den Admin auf jedem Gerät ab – auch auf diesem. Danach braucht jedes Gerät wieder das Passwort.
          Wirkt innerhalb von ca. 1 Minute überall. Gedacht, wenn ein iPad verloren ging oder jemand das Passwort kennt.</p>
        <div class="lw-knoepfe"><button class="lw-btn lw-gefahr" data-akt="alle">🚫 Alle Geräte abmelden</button></div>
      </div>`;
    host.querySelector('[data-akt="abmelden"]').onclick = () => { ConfigAPI.logout(); LWAdmin.anmeldungZeigen('Abgemeldet.'); };
    host.querySelector('[data-akt="alle"]').onclick = async () => {
      if (!confirm('Alle Geräte abmelden?\n\nDanach ist der Admin auf JEDEM Gerät gesperrt – auch auf diesem – bis dort wieder das Passwort eingegeben wird.\n\nWirkt innerhalb von ca. 1 Minute überall.')) return;
      const res = await ConfigAPI.logoutAll();
      if (res.ok) LWAdmin.anmeldungZeigen('✓ Alle Geräte wurden abgemeldet.');
      else if (res.status === 401) LWAdmin.anmeldungZeigen('Sitzung abgelaufen – bitte neu anmelden.');
      else toast('⚠ ' + (res.error || 'Abmelden nicht möglich'), true);
    };
  },
});
