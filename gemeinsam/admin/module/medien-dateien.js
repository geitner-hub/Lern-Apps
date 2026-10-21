// Admin-Modul Medien → Dateien: Dateien per QR-Code und Kurzlink (medien.js, wirkt sofort)
// Teil des bisherigen Admins, eingehängt über die Brücke (Admin-Umbau Etappe 2)
'use strict';

LWAdmin.altModul({
  id: 'dateien', bereich: 'medien', titel: 'Dateien', symbol: '📁', reihenfolge: 1,
  suchbegriffe: ['Datei', 'Hochladen', 'QR', 'Kurzlink', 'Beamer', 'Sammlung'],
  teil: 'panel-medien',
  oeffnen: () => buildMedien(),
});
