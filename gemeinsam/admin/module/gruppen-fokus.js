// Admin-Modul Gruppen → Fokus: „Heute nur diese Apps“ je Gruppe/Klasse (freigaben.js)
// HTML in admin.html (#lw-park), Logik in der genannten Funktionsdatei, eingehängt über bruecke.js
'use strict';

LWAdmin.altModul({
  id: 'fokus', bereich: 'gruppen', titel: 'Fokus', symbol: '🎯', reihenfolge: 1,
  suchbegriffe: ['Fokus', 'heute nur diese Apps'],
  teil: 'teil-fokus',
  oeffnen: () => buildFreigaben(),
});
