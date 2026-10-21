// Admin-Modul Start → Übersicht: Kennzahlen, App des Tages, letzte Aktionen (uebersicht.js)
// Teil des bisherigen Admins, eingehängt über die Brücke (Admin-Umbau Etappe 2)
'use strict';

LWAdmin.altModul({
  id: 'uebersicht', bereich: 'start', titel: 'Übersicht', symbol: '🏠', reihenfolge: 1,
  suchbegriffe: ['Dashboard', 'Status', 'App des Tages', 'Letzte Aktionen'],
  teil: 'panel-dashboard',
});
