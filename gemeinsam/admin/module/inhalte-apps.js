// Admin-Modul Inhalte → Apps: Apps anlegen, bearbeiten, ein-/ausblenden, löschen (apps.js)
// HTML in admin.html (#lw-park), Logik in der genannten Funktionsdatei, eingehängt über bruecke.js
'use strict';

LWAdmin.altModul({
  id: 'apps', bereich: 'inhalte', titel: 'Apps', symbol: '📱', reihenfolge: 1,
  suchbegriffe: ['App hinzufügen', 'bearbeiten', 'verstecken', 'App des Tages', 'QR'],
  teil: 'panel-apps',
});
