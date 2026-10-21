// Admin-Modul Gruppen → Auswertung: Anonyme Gruppen-Auswertung je Thema (freigaben.js)
// Teil des bisherigen Admins, eingehängt über die Brücke (Admin-Umbau Etappe 2)
'use strict';

LWAdmin.altModul({
  id: 'auswertung', bereich: 'gruppen', titel: 'Auswertung', symbol: '📊', reihenfolge: 4,
  suchbegriffe: ['Auswertung', 'Fortschritt', 'Gruppe'],
  teil: 'teil-auswertung',
  oeffnen: () => buildFreigaben(),
});
