# Inventar der Lern-Apps und Spiele

Automatisch erzeugt am 05.10.2026 mit `python3 werkzeuge/inventar.py` (Angaben aus dem Code). Nur die Spalten **Entscheidung** und **Notiz** von Hand pflegen – sie bleiben beim Neu-Erzeugen erhalten.

Entscheidung (Etappe 3): **Kern** · **Überarbeiten** · **Engine** · **Archiv**

## Anbindung

| Datei | Name | Art | Fach · Klassen | Sichtbar | Ergebnis | Pass-XP | liefert „Meine Themen“ | nutzt „Meine Themen“ | Dorf-Aufträge | Entscheidung | Notiz |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `apps/englisch/english-dialog-vorlagen.html` | English Dialogue | Lern-App | Englisch · alle | versteckt | ⚠️ ohne navbar.js | – | – | – | nur wenn sichtbar |  |  |
| `apps/englisch/practice_simple_present.html` | Simple present | Lern-App | Englisch · 5 | sichtbar | ja | ja | – | – | ja |  |  |
| `apps/englisch/satzglieder-erkennen.html` | Satzglieder ordnen | Lern-App | Englisch · 5 | sichtbar | ja | ja | – | – | ja |  |  |
| `apps/englisch/simple-past.html` | Simple Past | Lern-App | Englisch · 5, 6 | sichtbar | ja | ja | – | – | ja |  |  |
| `apps/englisch/vokabeltrainer5.html` | Vokabeltrainer 5. Klasse | Lern-App | Englisch · 5 | sichtbar | ja | ja | ja | – | ja |  |  |
| `apps/englisch/vokabeltrainer6.html` | Vokabeltrainer 6. Klasse | Lern-App | Englisch · 6 | sichtbar | ja | ja | ja | – | ja |  |  |
| `apps/gpg/laender-finder.html` | Länder finden | Lern-App | GPG · 6 | sichtbar | ja | ja | – | – | ja |  |  |
| `apps/gpg/regeln-sortierer-gpg.html` | Regeln in unserer Gesellschaft | Lern-App | GPG · alle | versteckt | ⚠️ altes Format | – | – | – | nur wenn sichtbar |  |  |
| `apps/mathe/einmaleins_tafel.html` | Einmaleins 1x1 | Lern-App | Mathematik · 5, 6 | sichtbar | ja | ja | ja | – | ja (1 Runden) |  |  |
| `apps/mathe/kopfrechnen.html` | Kopfrechnen Klasse 5 | Lern-App | Mathematik · 5 | sichtbar | ja | ja | ja | – | ja |  |  |
| `apps/mathe/kopfrechnen_kl1.html` | Kopfrechnen Klasse 1 | Lern-App | Mathematik · alle | versteckt | ja | ja | – | – | nur wenn sichtbar |  |  |
| `apps/mathe/kopfrechnen_kl2.html` | Kopfrechnen Klasse 2 | Lern-App | Mathematik · alle | versteckt | ja | ja | – | – | nur wenn sichtbar |  |  |
| `apps/mathe/kopfrechnen_kl3.html` | Kopfrechnen Klasse 3 | Lern-App | Mathematik · alle | versteckt | ja | ja | – | – | nur wenn sichtbar |  |  |
| `apps/mathe/kopfrechnen_kl4.html` | Kopfrechnen Klasse 4 | Lern-App | Mathematik · 5 | sichtbar | ja | ja | ja | – | ja |  |  |
| `apps/mathe/kopfrechnen_kl6.html` | Kopfrechnen Klasse 6 | Lern-App | Mathematik · 6 | sichtbar | ja | ja | ja | – | ja |  |  |
| `apps/mathe/laengeneinheiten.html` | Längeneinheiten umrechnen | Lern-App | Mathematik · 5, 6 | sichtbar | ja | ja | – | – | ja |  |  |
| `apps/mathe/rechen-arena.html` | Rechen-Arena | Lern-App | Mathematik · 5, 6 | sichtbar | ja | ja | – | – | ja |  |  |
| `apps/mathe/rechteck-app.html` | Rechteck-Werkstatt | Lern-App | Mathematik · 5 | versteckt | – | – | – | – | nur wenn sichtbar |  |  |
| `apps/mathe/sachaufgaben_laengen.html` | Sachaufgaben Längen | Lern-App | Mathematik · 5 | versteckt | – | – | – | – | nur wenn sichtbar |  |  |
| `apps/mathe/vierecke_unterscheiden.html` | Vierecke unterscheiden | Lern-App | Mathematik · 5 | versteckt | ⚠️ altes Format | – | – | – | nur wenn sichtbar |  |  |
| `spiele/burg-verteidigung.html` | Tower Defense | Spiel | Allgemein · alle | sichtbar | ja | ja | – | ja | – (Spiel) |  |  |
| `spiele/dorf.html` | Mein Dorf | Spiel | Allgemein · alle | sichtbar | – | – | – | – | Dorf selbst |  |  |
| `spiele/expedition.html` | Entdecker-Expedition | Spiel | GPG · 6 | versteckt | über spiel-hilfen.js | ja | – | – | – (Spiel) |  |  |
| `spiele/kitchen-chaos.html` | Kitchen-Chaos | Spiel | Allgemein · alle | sichtbar | über spiel-hilfen.js | ja | – | – | – (Spiel) |  |  |
| `spiele/runner.html` | RUN! | Spiel | Allgemein · alle | sichtbar | ja | ja | – | ja | – (Spiel) |  |  |
| `spiele/tauziehen.html` | Tauziehen | Spiel | Allgemein · alle | sichtbar | über spiel-hilfen.js | ja | – | ja | – (Spiel) |  |  |
| `spiele/wort-des-tages.html` | Wort des Tages | Spiel | Allgemein · alle | versteckt | über spiel-hilfen.js | ja | – | ja | – (Spiel) |  |  |
| `spiele/zauberwort.html` | Zauberwort | Spiel | Allgemein · alle | versteckt | über spiel-hilfen.js | ja | – | ja | – (Spiel) |  |  |

## Technik

| Datei | KB | Skripte | Speicherschlüssel |
|---|---|---|---|
| apps/englisch/english-dialog-vorlagen.html | 32 | – | – |
| apps/englisch/practice_simple_present.html | 35 | navbar.js | + über navbar.js |
| apps/englisch/satzglieder-erkennen.html | 35 | navbar.js | + über navbar.js |
| apps/englisch/simple-past.html | 51 | navbar.js | + über navbar.js |
| apps/englisch/vokabeltrainer5.html | 51 | navbar.js | vokab-history-kl5, vokab-word-stats-kl5, vokab-a11y-kl5, + über navbar.js |
| apps/englisch/vokabeltrainer6.html | 54 | navbar.js | vokab-history-kl6, vokab-word-stats-kl6, vokab-a11y-kl6, + über navbar.js |
| apps/gpg/laender-finder.html | 26 | navbar.js, karten-ansicht.js | laender-finder-best, + über navbar.js |
| apps/gpg/regeln-sortierer-gpg.html | 22 | navbar.js (nachgeladen) | + über navbar.js |
| apps/mathe/einmaleins_tafel.html | 23 | navbar.js | + über navbar.js |
| apps/mathe/kopfrechnen.html | 26 | navbar.js | + über navbar.js |
| apps/mathe/kopfrechnen_kl1.html | 25 | navbar.js | + über navbar.js |
| apps/mathe/kopfrechnen_kl2.html | 25 | navbar.js | + über navbar.js |
| apps/mathe/kopfrechnen_kl3.html | 27 | navbar.js | + über navbar.js |
| apps/mathe/kopfrechnen_kl4.html | 29 | navbar.js | + über navbar.js |
| apps/mathe/kopfrechnen_kl6.html | 34 | navbar.js | + über navbar.js |
| apps/mathe/laengeneinheiten.html | 25 | navbar.js | + über navbar.js |
| apps/mathe/rechen-arena.html | 52 | navbar.js | rechenArena_ballonHighscore, + über navbar.js |
| apps/mathe/rechteck-app.html | 58 | navbar.js | + über navbar.js |
| apps/mathe/sachaufgaben_laengen.html | 34 | navbar.js | + über navbar.js |
| apps/mathe/vierecke_unterscheiden.html | 43 | navbar.js | + über navbar.js |
| spiele/burg-verteidigung.html | 85 | navbar.js, aufgaben.js, avatar3d.js | lern-burg-wahl, lern-burg-rekorde, + über navbar.js |
| spiele/dorf.html | 88 | shared.js, config-api.js, avatar3d.js, dorf-szene.js, navbar.js | lernwelt-dorf, lernwelt-dorf-besuch, + über navbar.js |
| spiele/expedition.html | 33 | navbar.js, spiel-hilfen.js, karten-ansicht.js | lernwelt-expedition, + über navbar.js |
| spiele/kitchen-chaos.html | 38 | navbar.js, spiel-hilfen.js, avatar3d.js | lern-kitchen-chaos, + über navbar.js |
| spiele/runner.html | 51 | navbar.js, aufgaben.js, avatar3d.js | lern-runner-wahl, lern-runner-rekorde, + über navbar.js |
| spiele/tauziehen.html | 44 | navbar.js, aufgaben.js, spiel-hilfen.js, avatar3d.js | lern-tauziehen-wahl, + über navbar.js |
| spiele/wort-des-tages.html | 27 | navbar.js, aufgaben.js, spiel-hilfen.js | lern-wort-des-tages, + über navbar.js |
| spiele/zauberwort.html | 48 | navbar.js, aufgaben.js, spiel-hilfen.js, avatar3d.js | lern-zauberwort-wahl, lern-zauberwort-rekord, + über navbar.js |

## Legende

- **Ergebnis**: meldet Runden über `LernApps.saveResult({ score, max, … })` an navbar.js. „⚠️ altes Format“ = Aufruf ohne Objekt, „⚠️ ohne Punkte“ = Aufruf ohne `score`.
- **Pass-XP**: über eine gültige Ergebnis-Meldung, `gemeinsam/spiel-hilfen.js` oder direkt über `LernPass`.
- **liefert „Meine Themen“**: die Meldung enthält `inhalt` → der Stoff erscheint in den Spielen.
- **nutzt „Meine Themen“**: das Spiel stellt Aufgaben über `gemeinsam/aufgaben.js`.
- **Dorf-Aufträge**: Lern-Apps in config.json, nicht versteckt, nicht mit `"dorf": false`.
- **+ über navbar.js**: navbar.js lädt pass.js, dorf-kern.js, sync-code.js, sync.js nach (Pass, Dorf, Sicherung).
