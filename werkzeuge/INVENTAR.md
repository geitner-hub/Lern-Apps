# Inventar der Lern-Apps und Spiele

Automatisch erzeugt am 06.10.2026 mit `python3 werkzeuge/inventar.py` (Angaben aus dem Code). Nur die Spalten **Entscheidung** und **Notiz** von Hand pflegen – sie bleiben beim Neu-Erzeugen erhalten.

Entscheidung (Etappe 3): **Kern** · **Überarbeiten** · **Engine** · **Archiv**

## Anbindung

| Datei | Name | Themen-ID | Art | Fach · Klassen | Sichtbar | Ergebnis | Pass-XP | liefert „Meine Themen“ | nutzt „Meine Themen“ | Dorf-Aufträge | Entscheidung | Notiz |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `apps/englisch/practice_simple_present.html` | – | – | Lern-App | – | nicht in config | – | – | – | – | – (nicht in config) | Kern | Gut: nur Antippen, Tipp-Knopf. Mängel: meldet kein `thema`; Satzstellung später Typ Sortieren (Etappe 9) |
| `apps/englisch/satzglieder-erkennen.html` | Satzglieder ordnen | `en.5.satzglieder` | Lern-App | Englisch · 5 | sichtbar | ja | ja | – | – | ja | Kern → Engine (Etappe 9) | Wird erste Überführung Typ Zuordnen. Mängel: Rückmeldung nur richtig/falsch ohne Erklärung, kein `thema` |
| `apps/englisch/simple-past.html` | – | – | Lern-App | – | nicht in config | – | – | – | – | – (nicht in config) | Kern | Gute Rückmeldung (Regel + Beispiel), Verbenliste, Kl. 5/6. Mängel: kein `thema`, keine Stufen im Katalog |
| `apps/englisch/vokabeltrainer.html` | Vokabeltrainer 5. Klasse | `en.5.vok` (7 Stufen), `en.5.wortlisten` (8 Stufen), `en.6.vok` (5 Stufen) | Lern-App | Englisch · 5 | sichtbar | ja | ja | ja | – | ja | Engine (Etappe 5, Testphase) | Ein Trainer für alle Wortlisten (?klasse=5/6, ?liste=NAME); ersetzt nach dem Test vokabeltrainer5/6 |
| `apps/englisch/vokabeltrainer5.html` | – | – | Lern-App | – | nicht in config | – | – | – | – | – (nicht in config) | Engine (Etappe 5) | Mit vokabeltrainer6 zu einer Vokabel-Engine. Mängel: Startseite scrollt (iPad quer), ~100 Zeilen doppelt zu Kl. 6 |
| `apps/englisch/vokabeltrainer6.html` | – | – | Lern-App | – | nicht in config | – | – | – | – | – (nicht in config) | Engine (Etappe 5) | Siehe vokabeltrainer5 |
| `apps/gpg/bayern.html` | – | `gpg.5.bayern` (5 Stufen) | Lern-App | – | nicht in config | ja | ja | – | – | – (nicht in config) |  |  |
| `apps/gpg/laender-finder.html` | Länder finden | `gpg.6.laender` (6 Stufen), `gpg.5.erde` (1 Stufen) | Lern-App | GPG · 6 | sichtbar | ja | ja | – | – | ja | Kern | Stark: Karte, Profi-Modus, Fehler kommen wieder. Bundesländer = GPG 5, Europa = GPG 6. Mängel: kein `thema`/`inhalt` |
| `apps/mathe/einmaleins_tafel.html` | Einmaleins 1x1 | `ma.5.1x1` (2 Stufen) | Lern-App | Mathematik · 5, 6 | sichtbar | ja | ja | ja | – | ja (1 Runden) | Kern | Gut: Klassik/Profi, 3 Stufen, großes 1×1. Mängel: falsche Felder nur rot, ohne Hilfe (z. B. Nachbaraufgabe) |
| `apps/mathe/kopfrechnen-neu.html` | – | – | Lern-App | – | nicht in config | – | – | – | – | – (nicht in config) | Weiterleitung | Test-Name des Mathe-Trainers → mathe-trainer.html (Ergebnisse werden übernommen) |
| `apps/mathe/kopfrechnen.html` | Kopfrechnen Klasse 4 | `ma.1.kopf` (3 Stufen), `ma.2.kopf` (3 Stufen), `ma.3.kopf` (3 Stufen), `ma.4.kopf` (3 Stufen), `ma.5.kopf` (13 Stufen), `ma.6.kopf` (12 Stufen) | Lern-App | Mathematik · 5 | sichtbar | – | – | – | – | ja | Kern (Übungs-Rahmen) | Etappe 4b: nur Einmaleins und Grundrechenarten, Klassen 1–6 über ?klasse=; Ergebnisse über ueben.js (thema je Stufe) |
| `apps/mathe/kopfrechnen_kl1.html` | – | – | Lern-App | – | nicht in config | – | – | – | – | – (nicht in config) | Weiterleitung | → kopfrechnen.html?klasse=1; Ergebnisse, Sterne und Dorf-Aufträge werden übernommen |
| `apps/mathe/kopfrechnen_kl2.html` | – | – | Lern-App | – | nicht in config | – | – | – | – | – (nicht in config) | Weiterleitung | → kopfrechnen.html?klasse=2; Ergebnisse, Sterne und Dorf-Aufträge werden übernommen |
| `apps/mathe/kopfrechnen_kl3.html` | – | – | Lern-App | – | nicht in config | – | – | – | – | – (nicht in config) | Weiterleitung | → kopfrechnen.html?klasse=3; Ergebnisse, Sterne und Dorf-Aufträge werden übernommen |
| `apps/mathe/kopfrechnen_kl4.html` | – | – | Lern-App | – | nicht in config | – | – | – | – | – (nicht in config) | Weiterleitung | → kopfrechnen.html?klasse=4; Ergebnisse, Sterne und Dorf-Aufträge werden übernommen |
| `apps/mathe/kopfrechnen_kl6.html` | – | – | Lern-App | – | nicht in config | – | – | – | – | – (nicht in config) | Weiterleitung | → kopfrechnen.html?klasse=6; Ergebnisse, Sterne und Dorf-Aufträge werden übernommen |
| `apps/mathe/laengeneinheiten.html` | Längeneinheiten umrechnen | `ma.5.laengen` (6 Stufen) | Lern-App | Mathematik · 5, 6 | sichtbar | – | – | – | – | ja | Kern → Typ Eingabe (Etappe 9) | Passt zu M5 LB 5. Mängel: kein `thema`/`inhalt` (fehlt in den Spielen), Hilfe nur auf Knopfdruck, keine anderen Größen (Masse, Zeit, Geld) |
| `apps/mathe/mathe-trainer.html` | Mathe-Trainer Klasse 5 | – | Lern-App | Mathematik · 5 | sichtbar | – | – | – | – | ja | Kern (Übungs-Rahmen) | Etappe 4b: Stoff der Jahrgangsstufe 5/6 in Stufen (?klasse=5/6); neue Themen = neue Stufen in daten/kopfrechnen.json |
| `apps/mathe/rechen-arena.html` | Rechen-Arena | `ma.5.rechen-arena` | Lern-App | Allgemein · 5, 6 | sichtbar | ja | ja | – | – | ja | Kern | Beliebt, vier Modi. Mängel: Startseite scrollt (iPad quer), kein `thema`/`inhalt`, Ballon-Pop hat keine Rückmeldung zum Fehler (bewusst schnell) |
| `apps/typen/uebung.html` | Simple present | `en.5.to-be` (6 Stufen), `en.5.simple-present` (8 Stufen), `en.5.simple-past` (7 Stufen) | Lern-App | Englisch · 5 | sichtbar | – | – | – | – | ja |  |  |
| `spiele/burg-verteidigung.html` | Tower Defense | – | Spiel | Allgemein · alle | sichtbar | ja | ja | – | ja | – (Spiel) |  |  |
| `spiele/dorf.html` | Mein Dorf | – | Spiel | Allgemein · alle | sichtbar | – | – | – | – | Dorf selbst |  |  |
| `spiele/expedition.html` | Entdecker-Expedition | – | Spiel | GPG · 6 | versteckt | über spiel-hilfen.js | ja | – | – | – (Spiel) |  |  |
| `spiele/kitchen-chaos.html` | Kitchen-Chaos | – | Spiel | Allgemein · alle | sichtbar | über spiel-hilfen.js | ja | – | – | – (Spiel) |  |  |
| `spiele/runner.html` | RUN! | – | Spiel | Allgemein · alle | sichtbar | ja | ja | – | ja | – (Spiel) |  |  |
| `spiele/tauziehen.html` | Tauziehen | – | Spiel | Allgemein · alle | sichtbar | über spiel-hilfen.js | ja | – | ja | – (Spiel) |  |  |
| `spiele/wort-des-tages.html` | Wort des Tages | – | Spiel | Allgemein · alle | versteckt | über spiel-hilfen.js | ja | – | ja | – (Spiel) |  |  |
| `spiele/zauberwort.html` | Zauberwort | – | Spiel | Allgemein · alle | versteckt | über spiel-hilfen.js | ja | – | ja | – (Spiel) |  |  |

## Technik

| Datei | KB | Skripte | Speicherschlüssel |
|---|---|---|---|
| apps/englisch/practice_simple_present.html | 1 | – | – |
| apps/englisch/satzglieder-erkennen.html | 35 | navbar.js | + über navbar.js |
| apps/englisch/simple-past.html | 1 | – | – |
| apps/englisch/vokabeltrainer.html | 61 | freigabe.js, ueben.js, navbar.js | vokab-history-kl5, vokab-word-stats-kl5, vokab-a11y-kl5, vokab-history-kl6, vokab-word-stats-kl6, vokab-a11y-kl6, + über navbar.js |
| apps/englisch/vokabeltrainer5.html | 1 | – | – |
| apps/englisch/vokabeltrainer6.html | 1 | – | – |
| apps/gpg/bayern.html | 32 | navbar.js, karten-ansicht.js, freigabe.js, ueben.js | lernwelt-bayern-best, + über navbar.js |
| apps/gpg/laender-finder.html | 38 | navbar.js, karten-ansicht.js, welt-karte.js, globus.js, freigabe.js, ueben.js | laender-finder-best, + über navbar.js |
| apps/mathe/einmaleins_tafel.html | 23 | navbar.js | + über navbar.js |
| apps/mathe/kopfrechnen-neu.html | 1 | – | – |
| apps/mathe/kopfrechnen.html | 2 | generatoren-mathe.js, freigabe.js, ueben.js, navbar.js | + über navbar.js |
| apps/mathe/kopfrechnen_kl1.html | 1 | – | – |
| apps/mathe/kopfrechnen_kl2.html | 1 | – | – |
| apps/mathe/kopfrechnen_kl3.html | 1 | – | – |
| apps/mathe/kopfrechnen_kl4.html | 1 | – | – |
| apps/mathe/kopfrechnen_kl6.html | 1 | – | – |
| apps/mathe/laengeneinheiten.html | 2 | generatoren-mathe.js, freigabe.js, ueben.js, navbar.js | + über navbar.js |
| apps/mathe/mathe-trainer.html | 2 | generatoren-mathe.js, freigabe.js, ueben.js, navbar.js | + über navbar.js |
| apps/mathe/rechen-arena.html | 52 | navbar.js | rechenArena_ballonHighscore, + über navbar.js |
| apps/typen/uebung.html | 2 | freigabe.js, ueben.js, typen.js, navbar.js | + über navbar.js |
| spiele/burg-verteidigung.html | 85 | navbar.js, aufgaben.js, avatar3d.js | lern-burg-wahl, lern-burg-rekorde, + über navbar.js |
| spiele/dorf.html | 88 | shared.js, config-api.js, dorf-kern.js, avatar3d.js, dorf-szene.js, navbar.js | lernwelt-dorf, lernwelt-dorf-besuch, + über navbar.js |
| spiele/expedition.html | 33 | navbar.js, spiel-hilfen.js, karten-ansicht.js | lernwelt-expedition, + über navbar.js |
| spiele/kitchen-chaos.html | 38 | navbar.js, spiel-hilfen.js, avatar3d.js | lern-kitchen-chaos, + über navbar.js |
| spiele/runner.html | 51 | navbar.js, aufgaben.js, avatar3d.js | lern-runner-wahl, lern-runner-rekorde, + über navbar.js |
| spiele/tauziehen.html | 44 | navbar.js, aufgaben.js, spiel-hilfen.js, avatar3d.js | lern-tauziehen-wahl, + über navbar.js |
| spiele/wort-des-tages.html | 27 | navbar.js, aufgaben.js, spiel-hilfen.js | lern-wort-des-tages, + über navbar.js |
| spiele/zauberwort.html | 48 | navbar.js, aufgaben.js, spiel-hilfen.js, avatar3d.js | lern-zauberwort-wahl, lern-zauberwort-rekord, + über navbar.js |

## Legende

- **Themen-ID**: Thema der App in `daten/katalog.json` (Etappe 1); Stufen = feinere IDs darunter.
- **Ergebnis**: meldet Runden über `LernApps.saveResult({ score, max, … })` an navbar.js. „⚠️ altes Format“ = Aufruf ohne Objekt, „⚠️ ohne Punkte“ = Aufruf ohne `score`.
- **Pass-XP**: über eine gültige Ergebnis-Meldung, `gemeinsam/spiel-hilfen.js` oder direkt über `LernPass`.
- **liefert „Meine Themen“**: die Meldung enthält `inhalt` → der Stoff erscheint in den Spielen.
- **nutzt „Meine Themen“**: das Spiel stellt Aufgaben über `gemeinsam/aufgaben.js`.
- **Dorf-Aufträge**: Lern-Apps in config.json, nicht versteckt, nicht mit `"dorf": false`.
- **+ über navbar.js**: navbar.js lädt pass.js, dorf-kern.js, sync-code.js, sync.js nach (Pass, Dorf, Sicherung).
