// Admin-Modul Gruppen → Lernwege: Lernwege zuteilen, Klassen-Übersicht (freigaben.js)
// HTML in admin.html (#lw-park), Logik in der genannten Funktionsdatei, eingehängt über bruecke.js
'use strict';

LWAdmin.altModul({
  id: 'lernwege', bereich: 'gruppen', titel: 'Lernwege', symbol: '🗺️', reihenfolge: 3,
  suchbegriffe: ['Lernweg', 'Stationen', 'zuteilen'],
  teil: 'panel-lernwege',
  oeffnen: () => buildLernwegeTab(),
});
