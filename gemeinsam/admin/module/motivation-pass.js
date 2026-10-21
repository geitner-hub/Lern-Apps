// Admin-Modul Motivation → Pass: Saison, Avatar, Events, „Meine Themen“, Übersicht der Inhalte (pass.js, spiele.js)
// Teil des bisherigen Admins, eingehängt über die Brücke (Admin-Umbau Etappe 2)
'use strict';

LWAdmin.altModul({
  id: 'pass', bereich: 'motivation', titel: 'Pass', symbol: '🧭', reihenfolge: 1,
  suchbegriffe: ['Saison', 'Event', 'Avatar', 'Meine Themen', 'Titel'],
  teil: 'panel-pass',
});
