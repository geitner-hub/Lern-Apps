// Admin-Modul Gruppen → Fokus: „Heute nur diese Apps“ je Gruppe/Klasse (freigaben.js)
// Teil des bisherigen Admins, eingehängt über die Brücke (Admin-Umbau Etappe 2)
'use strict';

LWAdmin.altModul({
  id: 'fokus', bereich: 'gruppen', titel: 'Fokus', symbol: '🎯', reihenfolge: 1,
  suchbegriffe: ['Fokus', 'heute nur diese Apps'],
  teil: 'teil-fokus',
  oeffnen: () => buildFreigaben(),
});
