// ═══════════════════════════════════════════════════════
//  Lernwelt – Klicktest  (Aktionsplan „Lernwelt – Tempo“, Etappe 8)
//  Öffnet die Lernwelt in einem echten Browser und klickt den wichtigsten Weg durch:
//    1. Startseite baut sich auf (Fächer-Kacheln)      2. Pass anlegen, Startseite zeigt „Weiter lernen“ oder die Pass-Karte
//    3. Kopfrechnen: Stufe wählen, eine Aufgabe richtig lösen   4. ein Spiel öffnet ohne Fehler
//    5. Baukasten-Übung und 2D-Lernweg (Test-Weg, braucht eine Admin-Anmeldung → hier nur „noch nicht frei“) laden
//  Jeder Skriptfehler auf einer Seite lässt den Test scheitern.
//
//  Aufruf (im Hauptordner):   python3 -m http.server 8123 &   node werkzeuge/klicktest.js [http://localhost:8123/]
//  Braucht das npm-Paket „playwright“ – nur für diesen Test, nichts davon wird ausgeliefert.
//  CI: .github/workflows/klicktest.yml
// ═══════════════════════════════════════════════════════
'use strict';
const { chromium } = require('playwright');
const B = (process.argv[2] || 'http://localhost:8123/').replace(/\/?$/, '/');

(async () => {
  const browser = await chromium.launch();
  const seite = await (await browser.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: 'block' })).newPage();
  const fehler = [];
  seite.on('pageerror', e => fehler.push(`${seite.url().split('/').slice(-2).join('/')}: ${e.message}`));
  const schritt = async (name, fn) => { try { await fn(); console.log('✅', name); } catch (e) { fehler.push(`${name}: ${String(e.message).split('\n')[0]}`); console.log('❌', name); } };

  await schritt('Startseite: Fächer erscheinen', async () => {
    await seite.goto(B + 'index.html');
    await seite.waitForSelector('#fach-kacheln > *', { timeout: 15000 });
  });
  await schritt('Pass anlegen, Startseite neu', async () => {
    await seite.evaluate(() => LernPass.setProfile({ name: 'Klicktest', klasse: 5 }));
    await seite.reload();
    await seite.waitForSelector('#pass-section .pass-card', { timeout: 15000 });
  });
  await schritt('Kopfrechnen: eine Aufgabe lösen', async () => {
    await seite.goto(B + 'apps/mathe/kopfrechnen.html?klasse=1');
    await seite.waitForSelector('[data-stufe="ma.1.kopf.leicht"]', { timeout: 15000 });
    await seite.click('[data-stufe="ma.1.kopf.leicht"]');
    const frage = (await seite.innerText('.frage .q')).trim(), m = /^(\d+) ([+−]) (\d+)$/.exec(frage);
    if (!m) throw new Error('Unerwartete Aufgabe: ' + frage);
    for (const z of String(m[2] === '+' ? Number(m[1]) + Number(m[3]) : m[1] - m[3])) await seite.click(`.pad [data-k="${z}"]`);
    await seite.click('.pad [data-k="ok"]');
    await seite.waitForSelector('.fb.ok', { timeout: 5000 });
  });
  await schritt('Spiel öffnet (Tauziehen)', async () => {
    await seite.goto(B + 'spiele/tauziehen.html');
    await seite.waitForFunction(() => !!window.LW && document.body.innerText.length > 20, null, { timeout: 15000 });
  });
  await schritt('Baukasten-Übung zeigt Stufen', async () => {
    await seite.goto(B + 'apps/typen/uebung.html?inhalt=en.5.to-be');
    await seite.waitForSelector('[data-stufe]', { timeout: 15000 });
  });
  await schritt('2D-Lernweg lädt', async () => {
    await seite.goto(B + 'apps/typen/weg.html?weg=test');
    await seite.waitForSelector('.knoten, .hinweis', { timeout: 15000 });
  });
  await browser.close();
  if (fehler.length) { console.log('\nFehler:\n- ' + fehler.join('\n- ')); process.exit(1); }
  console.log('\nKlicktest bestanden.');
})().catch(e => { console.error(e); process.exit(1); });
