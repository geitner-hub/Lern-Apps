// Admin-Modul Medien → Dateien: Dateien per QR-Code und Kurzlink (medien.js, wirkt sofort)
// HTML in admin.html (#lw-park), Logik in der genannten Funktionsdatei, eingehängt über bruecke.js
'use strict';

LWAdmin.altModul({
  id: 'dateien', bereich: 'medien', titel: 'Dateien', symbol: '📁', reihenfolge: 1,
  suchbegriffe: ['Datei', 'Hochladen', 'QR', 'Kurzlink', 'Beamer', 'Sammlung'],
  teil: 'panel-medien',
  oeffnen: () => buildMedien(),
});
