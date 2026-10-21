// Admin-Modul Inhalte → Freigaben: Freigaben je Stufe/Unit, „Heute für dich“ (freigaben.js)
// Teil des bisherigen Admins, eingehängt über die Brücke (Admin-Umbau Etappe 2)
'use strict';

LWAdmin.altModul({
  id: 'freigaben', bereich: 'inhalte', titel: 'Freigaben', symbol: '🔐', reihenfolge: 4,
  suchbegriffe: ['Freigabe', 'Sperre', 'Stufe', 'Unit', 'Heute für dich'],
  teil: 'panel-freigaben',
  oeffnen: () => buildFreigaben(),
});
