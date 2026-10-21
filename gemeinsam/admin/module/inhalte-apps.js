// Admin-Modul Inhalte → Apps: Apps anlegen, bearbeiten, ein-/ausblenden, löschen (apps.js)
// Teil des bisherigen Admins, eingehängt über die Brücke (Admin-Umbau Etappe 2)
'use strict';

LWAdmin.altModul({
  id: 'apps', bereich: 'inhalte', titel: 'Apps', symbol: '📱', reihenfolge: 1,
  suchbegriffe: ['App hinzufügen', 'bearbeiten', 'verstecken', 'App des Tages', 'QR'],
  teil: 'panel-apps',
});
