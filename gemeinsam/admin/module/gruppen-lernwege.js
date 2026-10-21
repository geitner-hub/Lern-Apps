// Admin-Modul Gruppen → Lernwege: Lernwege zuteilen, Klassen-Übersicht (freigaben.js)
// Teil des bisherigen Admins, eingehängt über die Brücke (Admin-Umbau Etappe 2)
'use strict';

LWAdmin.altModul({
  id: 'lernwege', bereich: 'gruppen', titel: 'Lernwege', symbol: '🗺️', reihenfolge: 3,
  suchbegriffe: ['Lernweg', 'Stationen', 'zuteilen'],
  teil: 'panel-lernwege',
  oeffnen: () => buildLernwegeTab(),
});
