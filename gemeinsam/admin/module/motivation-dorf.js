// Admin-Modul Motivation → Mein Dorf: Wochenauftrag, Lehrer-Zettel, Challenges, Einstellungen (dorf.js)
// HTML in admin.html (#lw-park), Logik in der genannten Funktionsdatei, eingehängt über bruecke.js
'use strict';

LWAdmin.altModul({
  id: 'dorf', bereich: 'motivation', titel: 'Mein Dorf', symbol: '🏘️', reihenfolge: 2,
  suchbegriffe: ['Dorf', 'Wochenauftrag', 'Lehrer-Zettel', 'Challenge', 'Aufträge'],
  teil: 'panel-dorf',
  oeffnen: () => buildDorfAdmin(),
});
