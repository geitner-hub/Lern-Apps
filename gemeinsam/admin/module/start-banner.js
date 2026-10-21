// Admin-Modul Start → Banner: Ankündigungs-Banner auf der Startseite (werkzeuge.js)
// Teil des bisherigen Admins, eingehängt über die Brücke (Admin-Umbau Etappe 2)
'use strict';

LWAdmin.altModul({
  id: 'banner', bereich: 'start', titel: 'Banner', symbol: '📢', reihenfolge: 2,
  suchbegriffe: ['Banner', 'Ankündigung', 'Startseite'],
  teil: 'panel-announcement',
});
