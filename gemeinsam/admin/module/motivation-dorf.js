// Admin-Modul Motivation → Mein Dorf: Wochenauftrag, Lehrer-Zettel, Challenges, Einstellungen (dorf.js)
// Teil des bisherigen Admins, eingehängt über die Brücke (Admin-Umbau Etappe 2)
'use strict';

LWAdmin.altModul({
  id: 'dorf', bereich: 'motivation', titel: 'Mein Dorf', symbol: '🏘️', reihenfolge: 2,
  suchbegriffe: ['Dorf', 'Wochenauftrag', 'Lehrer-Zettel', 'Challenge', 'Aufträge'],
  teil: 'panel-dorf',
  oeffnen: () => buildDorfAdmin(),
});
