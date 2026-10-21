// Admin-Modul Gruppen → Sicherungskarten (Admin-Umbau Etappe 2): Verweis auf admin-karten.html,
// dort werden die Gruppen angelegt, die Fokus, Spielsperre, Lernwege und Auswertung nutzen.
'use strict';

LWAdmin.modul({
  id: 'karten', bereich: 'gruppen', titel: 'Gruppen und Karten', symbol: '🗂', reihenfolge: 0,
  suchbegriffe: ['Gruppe', 'Sicherungskarte', 'Code', 'Klasse anlegen'],
  zeigen(host) {
    host.innerHTML = `<div class="lw-karte"><h2>🗂 Gruppen und Sicherungskarten</h2>
      <p>Gruppen entstehen mit den Sicherungskarten: Gruppe anlegen, Codes erzeugen, Karten drucken. Fokus, Spielsperre,
        Lernwege und Auswertung können dann je Gruppe eingestellt werden – oder je Klasse über den Pass der Kinder.</p>
      <div class="lw-knoepfe"><a class="lw-btn gold" href="admin-karten.html">🗂 Sicherungskarten öffnen</a></div></div>`;
  },
});
