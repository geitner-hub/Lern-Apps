// Admin-Modul Gruppen → Spielsperre: Spiele erst nach Lern-Runden, Ausnahmen (freigaben.js)
// Teil des bisherigen Admins, eingehängt über die Brücke (Admin-Umbau Etappe 2)
'use strict';

LWAdmin.altModul({
  id: 'spielsperre', bereich: 'gruppen', titel: 'Spielsperre', symbol: '🎮', reihenfolge: 2,
  suchbegriffe: ['Spielsperre', 'Spiele frei', 'Ausnahme', 'Lern-Runden'],
  teil: 'teil-spielsperre',
  oeffnen: () => buildFreigaben(),
});
