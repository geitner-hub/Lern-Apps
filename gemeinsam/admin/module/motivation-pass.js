// Admin-Modul Motivation → Pass: Saison, Avatar, Events, „Meine Themen“ (pass.js, spiele.js); Übersicht seit Etappe 9 unter Avatar-Teile
// HTML in admin.html (#lw-park), Logik in der genannten Funktionsdatei, eingehängt über bruecke.js
'use strict';

LWAdmin.altModul({
  id: 'pass', bereich: 'motivation', titel: 'Pass', symbol: '🧭', reihenfolge: 1,
  suchbegriffe: ['Saison', 'Event', 'Avatar', 'Meine Themen', 'Starter-Paket', 'Wort des Tages'],
  teil: 'panel-pass',
});
