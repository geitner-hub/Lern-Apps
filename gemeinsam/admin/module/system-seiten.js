// Admin-Modul System → Weitere Seiten (Admin-Umbau Etappe 2; bisher Links in der Kopfleiste von admin.html)
'use strict';

LWAdmin.modul({
  id: 'seiten', bereich: 'system', titel: 'Weitere Seiten', symbol: '🔗', reihenfolge: 40,
  suchbegriffe: ['Sicherungskarten', 'Infokarten', 'Aufgaben prüfen', 'Startseite'],
  zeigen(host) {
    const seiten = [
      ['admin-karten.html', '🗂 Sicherungskarten', 'Gruppen anlegen, Codes erzeugen und drucken'],
      ['infokarten.html', '🪪 Infokarten', 'Infokarten zu allen Apps – auch für Kolleg:innen ohne Passwort'],
      ['aufgaben-check.html', '✅ Aufgaben prüfen', 'Aufgaben der Apps durchsehen'],
      ['index.html', '← Zur Startseite', 'die Lernwelt, wie die Kinder sie sehen'],
    ];
    host.innerHTML = `<div class="lw-karte"><h2>🔗 Weitere Seiten</h2><ul class="lw-liste">${seiten.map(([href, titel, text]) =>
      `<li><a href="${href}">${escHtml(titel)}</a> <span class="lw-klein">– ${escHtml(text)}</span></li>`).join('')}</ul></div>`;
  },
});
