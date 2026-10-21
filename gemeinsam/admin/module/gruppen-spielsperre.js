// Admin-Modul Gruppen → Spielsperre: Spiele erst nach Lern-Runden, Ausnahmen (freigaben.js)
// HTML in admin.html (#lw-park), Logik in der genannten Funktionsdatei, eingehängt über bruecke.js
'use strict';

LWAdmin.altModul({
  id: 'spielsperre', bereich: 'gruppen', titel: 'Spielsperre', symbol: '🎮', reihenfolge: 2,
  suchbegriffe: ['Spielsperre', 'Spiele frei', 'Ausnahme', 'Lern-Runden'],
  teil: 'teil-spielsperre',
  oeffnen: () => buildFreigaben(),
});
