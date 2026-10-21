// Admin-Modul Motivation → Pass: Saison, Avatar, Events, „Meine Themen“, Übersicht der Inhalte (pass.js, spiele.js)
// HTML in admin.html (#lw-park), Logik in der genannten Funktionsdatei, eingehängt über bruecke.js
'use strict';

LWAdmin.altModul({
  id: 'pass', bereich: 'motivation', titel: 'Pass', symbol: '🧭', reihenfolge: 1,
  suchbegriffe: ['Saison', 'Event', 'Avatar', 'Meine Themen', 'Titel'],
  teil: 'panel-pass',
});
