// Admin-Modul Gruppen → Auswertung: Anonyme Gruppen-Auswertung je Thema (freigaben.js)
// HTML in admin.html (#lw-park), Logik in der genannten Funktionsdatei, eingehängt über bruecke.js
'use strict';

LWAdmin.altModul({
  id: 'auswertung', bereich: 'gruppen', titel: 'Auswertung', symbol: '📊', reihenfolge: 4,
  suchbegriffe: ['Auswertung', 'Fortschritt', 'Gruppe'],
  teil: 'teil-auswertung',
  oeffnen: () => buildFreigaben(),
});
