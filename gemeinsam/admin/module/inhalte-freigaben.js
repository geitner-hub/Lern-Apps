// Admin-Modul Inhalte → Freigaben: Freigaben je Stufe/Unit, „Heute für dich“ (freigaben.js)
// HTML in admin.html (#lw-park), Logik in der genannten Funktionsdatei, eingehängt über bruecke.js
'use strict';

LWAdmin.altModul({
  id: 'freigaben', bereich: 'inhalte', titel: 'Freigaben', symbol: '🔐', reihenfolge: 4,
  suchbegriffe: ['Freigabe', 'Sperre', 'Stufe', 'Unit', 'Heute für dich'],
  teil: 'panel-freigaben',
  oeffnen: () => buildFreigaben(),
});
