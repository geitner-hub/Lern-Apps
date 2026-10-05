# Inventar der Lern-Apps und Spiele

Automatisch erzeugt am 05.10.2026 mit `python3 werkzeuge/inventar.py` (Angaben aus dem Code). Nur die Spalten **Entscheidung** und **Notiz** von Hand pflegen – sie bleiben beim Neu-Erzeugen erhalten.

Entscheidung (Etappe 3): **Kern** · **Überarbeiten** · **Engine** · **Archiv**

## Anbindung

| Datei | Name | Themen-ID | Art | Fach · Klassen | Sichtbar | Ergebnis | Pass-XP | liefert „Meine Themen“ | nutzt „Meine Themen“ | Dorf-Aufträge | Entscheidung | Notiz |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `apps/englisch/english-dialog-vorlagen.html` | English Dialogue | `en.5.dialoge` | Lern-App | Englisch · alle | versteckt | ⚠️ ohne navbar.js | – | – | – | nur wenn sichtbar | Archiv (Vorschlag) | Druckvorlagen, keine Übungs-App, ohne navbar.js. Vorschlag: nach `archiv/`, Admin-Eintrag löschen |
| `apps/englisch/practice_simple_present.html` | Simple present | `en.5.simple-present` | Lern-App | Englisch · 5 | sichtbar | ja | ja | – | – | ja | Kern | Gut: nur Antippen, Tipp-Knopf. Mängel: meldet kein `thema`; Satzstellung später Typ Sortieren (Etappe 9) |
| `apps/englisch/satzglieder-erkennen.html` | Satzglieder ordnen | `en.5.satzglieder` | Lern-App | Englisch · 5 | sichtbar | ja | ja | – | – | ja | Kern → Engine (Etappe 9) | Wird erste Überführung Typ Zuordnen. Mängel: Rückmeldung nur richtig/falsch ohne Erklärung, kein `thema` |
| `apps/englisch/simple-past.html` | Simple Past | `en.5.simple-past` | Lern-App | Englisch · 5, 6 | sichtbar | ja | ja | – | – | ja | Kern | Gute Rückmeldung (Regel + Beispiel), Verbenliste, Kl. 5/6. Mängel: kein `thema`, keine Stufen im Katalog |
| `apps/englisch/vokabeltrainer5.html` | Vokabeltrainer 5. Klasse | `en.5.vok` (7 Stufen), `en.5.wortlisten` (8 Stufen) | Lern-App | Englisch · 5 | sichtbar | ja | ja | ja | – | ja | Engine (Etappe 5) | Mit vokabeltrainer6 zu einer Vokabel-Engine. Mängel: Startseite scrollt (iPad quer), ~100 Zeilen doppelt zu Kl. 6 |
| `apps/englisch/vokabeltrainer6.html` | Vokabeltrainer 6. Klasse | `en.6.vok` (5 Stufen) | Lern-App | Englisch · 6 | sichtbar | ja | ja | ja | – | ja | Engine (Etappe 5) | Siehe vokabeltrainer5 |
| `apps/gpg/laender-finder.html` | Länder finden | `gpg.6.laender` (2 Stufen) | Lern-App | GPG · 6 | sichtbar | ja | ja | – | – | ja | Kern | Stark: Karte, Profi-Modus, Fehler kommen wieder. Bundesländer = GPG 5, Europa = GPG 6. Mängel: kein `thema`/`inhalt` |
| `apps/gpg/regeln-sortierer-gpg.html` | Regeln in unserer Gesellschaft | `gpg.5.regeln` | Lern-App | GPG · alle | versteckt | ⚠️ altes Format | – | – | – | nur wenn sichtbar | Engine (Etappe 9) | Typ Sortieren. Mängel: altes Ergebnis-Format (keine XP), Ziehen per Drag & Drop auf iPads unsicher, keine Erklärung |
| `apps/mathe/einmaleins_tafel.html` | Einmaleins 1x1 | `ma.5.1x1` (2 Stufen) | Lern-App | Mathematik · 5, 6 | sichtbar | ja | ja | ja | – | ja (1 Runden) | Kern | Gut: Klassik/Profi, 3 Stufen, großes 1×1. Mängel: falsche Felder nur rot, ohne Hilfe (z. B. Nachbaraufgabe) |
| `apps/mathe/kopfrechnen-neu.html` | – | – | Lern-App | – | nicht in config | – | – | – | – | – (nicht in config) | Engine (Etappe 4, Testphase) | Neue Kopfrechen-App auf dem Übungs-Rahmen, Themen-IDs je Stufe; im Admin versteckt eintragen, nach dem Klassentest ersetzt sie kopfrechnen.html und _kl1–6 |
| `apps/mathe/kopfrechnen.html` | Kopfrechnen Klasse 5 | `ma.5.kopf` (8 Stufen) | Lern-App | Mathematik · 5 | sichtbar | ja | ja | ja | – | ja | Engine (Etappe 4) | Mängel: Niveau deutlich unter M5 – „schwer“ endet bei Zahlen bis 300 und 12×12; es fehlen große Zahlen, Überschlag, Punkt vor Strich, Klammern, Rechenvorteile |
| `apps/mathe/kopfrechnen_kl1.html` | Kopfrechnen Klasse 1 | `ma.1.kopf` (3 Stufen) | Lern-App | Mathematik · alle | versteckt | ja | ja | – | – | nur wenn sichtbar | Engine (Etappe 4) | Wird Förderstufe der Engine, dann Weiterleitung |
| `apps/mathe/kopfrechnen_kl2.html` | Kopfrechnen Klasse 2 | `ma.2.kopf` (3 Stufen) | Lern-App | Mathematik · alle | versteckt | ja | ja | – | – | nur wenn sichtbar | Engine (Etappe 4) | Wird Förderstufe der Engine, dann Weiterleitung |
| `apps/mathe/kopfrechnen_kl3.html` | Kopfrechnen Klasse 3 | `ma.3.kopf` (3 Stufen) | Lern-App | Mathematik · alle | versteckt | ja | ja | – | – | nur wenn sichtbar | Engine (Etappe 4) | Wird Förderstufe der Engine, dann Weiterleitung |
| `apps/mathe/kopfrechnen_kl4.html` | Kopfrechnen Klasse 4 | `ma.4.kopf` (3 Stufen) | Lern-App | Mathematik · 5 | sichtbar | ja | ja | ja | – | ja | Engine (Etappe 4) | Wiederholung Grundschulstoff für Kl. 5; wird Stufe der Engine |
| `apps/mathe/kopfrechnen_kl6.html` | Kopfrechnen Klasse 6 | `ma.6.kopf` (8 Stufen) | Lern-App | Mathematik · 6 | sichtbar | ja | ja | ja | – | ja | Engine (Etappe 4) | Brüche/Dezimal/negative Zahlen passen zu M6; wird Stufen 2–5 der Engine (Plan Etappe 4) |
| `apps/mathe/laengeneinheiten.html` | Längeneinheiten umrechnen | `ma.5.laengen` | Lern-App | Mathematik · 5, 6 | sichtbar | ja | ja | – | – | ja | Kern → Typ Eingabe (Etappe 9) | Passt zu M5 LB 5. Mängel: kein `thema`/`inhalt` (fehlt in den Spielen), Hilfe nur auf Knopfdruck, keine anderen Größen (Masse, Zeit, Geld) |
| `apps/mathe/rechen-arena.html` | Rechen-Arena | `ma.5.rechen-arena` | Lern-App | Mathematik · 5, 6 | sichtbar | ja | ja | – | – | ja | Kern | Beliebt, vier Modi. Mängel: Startseite scrollt (iPad quer), kein `thema`/`inhalt`, Ballon-Pop hat keine Rückmeldung zum Fehler (bewusst schnell) |
| `apps/mathe/rechteck-app.html` | Rechteck-Werkstatt | `ma.5.rechteck` | Lern-App | Mathematik · 5 | versteckt | – | – | – | – | nur wenn sichtbar | Überarbeiten (Vorschlag) | Inhaltlich wertvoll (M5 LB 4). Mängel: meldet keine Ergebnisse (keine XP, kein Dorf), 7 Module mit viel Text, Seite scrollt |
| `apps/mathe/sachaufgaben_laengen.html` | Sachaufgaben Längen | `ma.5.sachaufgaben-laengen` | Lern-App | Mathematik · 5 | versteckt | – | – | – | – | nur wenn sichtbar | Überarbeiten (Vorschlag) | Passt zu M5 LB 5. Mängel: meldet keine Ergebnisse, Aufgaben fest vorgegeben (wenig Wiederholungswert) |
| `apps/mathe/vierecke_unterscheiden.html` | Vierecke unterscheiden | `ma.5.vierecke` | Lern-App | Mathematik · 5 | versteckt | ⚠️ altes Format | – | – | – | nur wenn sichtbar | Engine (Etappe 9) (Vorschlag) | Inhalt ist M6 LB 3, App als Kl. 5 angelegt. Mängel: altes Ergebnis-Format, Drag & Drop, Seite scrollt stark (1600 px). Danach Archiv |
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
| apps/englisch/english-dialog-vorlagen.html | 32 | – | – |
| apps/englisch/practice_simple_present.html | 35 | navbar.js | + über navbar.js |
| apps/englisch/satzglieder-erkennen.html | 35 | navbar.js | + über navbar.js |
| apps/englisch/simple-past.html | 51 | navbar.js | + über navbar.js |
| apps/englisch/vokabeltrainer5.html | 51 | navbar.js | vokab-history-kl5, vokab-word-stats-kl5, vokab-a11y-kl5, + über navbar.js |
| apps/englisch/vokabeltrainer6.html | 54 | navbar.js | vokab-history-kl6, vokab-word-stats-kl6, vokab-a11y-kl6, + über navbar.js |
| apps/gpg/laender-finder.html | 26 | navbar.js, karten-ansicht.js | laender-finder-best, + über navbar.js |
| apps/gpg/regeln-sortierer-gpg.html | 22 | navbar.js (nachgeladen) | + über navbar.js |
| apps/mathe/einmaleins_tafel.html | 23 | navbar.js | + über navbar.js |
| apps/mathe/kopfrechnen-neu.html | 3 | generatoren-mathe.js, ueben.js, navbar.js | + über navbar.js |
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
