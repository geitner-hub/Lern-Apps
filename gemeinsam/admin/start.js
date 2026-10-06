// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Start: Sitzung prüfen (immer als LETZTES Modul laden)
//  Teil von admin.html (Infrastruktur Etappe 6: Admin in Module zerlegt).
//  Alle Module teilen sich die globalen Variablen aus kern.js (CONFIG, ghSha …)
//  und werden in admin.html in fester Reihenfolge geladen.
// ═══════════════════════════════════════════════════════
'use strict';

// Auf diesem Gerät schon angemeldet? → Schlüssel serverseitig prüfen
(async () => {
  if (!ConfigAPI.hasSession()) return;
  const res = await ConfigAPI.checkSession();
  if (res.ok) showAdmin();
  else if (res.status === 401) showLogin('Anmeldung abgelaufen – bitte Passwort eingeben.');
  else showLogin(res.error ? '⚠ ' + res.error : '');
})();
