# App-Prüfung (Infrastruktur Etappe 3, Stand 05.10.2026)

Grundlage: Code jeder App, Start auf iPad-Größe (1080 × 810) im Browser, LehrplanPLUS Mittelschule
(Mathematik 5/6 Wortlaut geprüft; Englisch und GPG nach Lernbereichen). Entscheidungen stehen auch in
`werkzeuge/INVENTAR.md` (Spalte „Entscheidung“), Lehrplanbezug, Dauer und Einsatzidee in `daten/katalog.json`.
„(Vorschlag)“ = wartet auf Bestätigung.

## Prüfraster

Lehrplanbezug · Niveau (Abstufungen?) · Feedback (erklärt die App, warum?) · Wiederholungswert ·
Vernetzung (meldet sie Thema/Inhalt für Spiele, Dorf, Pass?) · Bedienung (ohne Scrollen, ohne Lesehürde, Finger).

## Ergebnis auf einen Blick

| Gruppe | Apps | Was passiert |
|---|---|---|
| **Kern** (bleibt, wird angebunden) | Rechen-Arena, Einmaleins-Tafel, Länder-Finder, Simple Present, Simple Past | kleine Mängel unten; `thema` melden kommt mit dem Übungs-Rahmen |
| **Engine Etappe 4** | Kopfrechnen Kl. 1–6 | eine App mit Stufen; Kl. 1–3 als Förderstufen |
| **Engine Etappe 5** | Vokabeltrainer 5 und 6 | eine Vokabel-Engine, Vokabelabfrage als Modus |
| **Engine Etappe 9** | Satzglieder (Zuordnen), Regeln-Sortierer (Sortieren), Vierecke (Zuordnen/Sortieren), Längeneinheiten (Teil: Eingabe) | bis dahin unverändert |
| **Überarbeiten** (Vorschlag) | Rechteck-Werkstatt, Sachaufgaben Längen | Ergebnis-Meldung fehlt ganz |
| **Archiv** (Vorschlag) | English Dialogue (Vorlagen) | keine Übungs-App |

## Wichtigste Befunde

1. **Kopfrechnen Klasse 5 liegt unter dem Lehrplan.** „schwer“ endet bei Zahlen bis etwa 300 und beim
   Einmaleins bis 12 × 12. M5 LB 1.2 verlangt Kopfrechnen mit großen natürlichen Zahlen, Überschlag,
   Punkt vor Strich, Klammern und Rechenvorteile. → Die Stufen der Engine (Etappe 4) müssen das abdecken;
   der heutige Stoff wird zur unteren Stufe.
2. **Fünf Apps melden keine Themen** (Rechen-Arena, Längeneinheiten, Länder-Finder, Simple Present/Past):
   Sie zählen für XP und Dorf, liefern aber nichts für „Meine Themen“ in den Spielen. Behebung mit dem
   Übungs-Rahmen (Etappe 4) bzw. eine Zeile `thema: '…'` je App.
3. **Drei versteckte Apps vergeben keine XP** (Rechteck-Werkstatt, Sachaufgaben Längen: gar keine Meldung;
   Regeln-Sortierer, Vierecke: altes Format). Wer sie einblendet, bekommt Frust bei den Kindern.
4. **Drag & Drop** (Regeln-Sortierer, Vierecke) ist auf iPads unzuverlässig. Die Aufgabentypen in Etappe 9
   werden durchgehend mit Antippen gebaut.
5. **Scrollen beim Start (iPad quer):** Vokabeltrainer 5, Rechen-Arena (knapp), Rechteck-Werkstatt,
   Vierecke (stark).
6. **Feedback ohne Erklärung:** Satzglieder, Einmaleins-Tafel, Regeln-Sortierer. Der Übungs-Rahmen bringt
   „Rückmeldung mit Erklärung“ als Pflichtfeld.
7. **Klassenzuordnung:** Vierecke gehört laut Lehrplan in Klasse 6 (M6 LB 3), Länder-Finder ist geteilt
   (Bundesländer GPG 5, Europa GPG 6).

## Anforderungen an die Engines (aus der Prüfung)

- Jede Aufgabe kann eine **Erklärung** liefern, die nach einem Fehler erscheint.
- **Stufen** sind Daten (Generator + Zahlenraum), nicht Code; Förderstufen wählbar.
- **Nur Antippen und Tippen**, kein Ziehen; Startbildschirm passt ohne Scrollen auf ein iPad quer.
- Ergebnis immer mit **Themen-ID** (Stufe) melden.

## Lücken im Lehrplan = Startliste der Katalog-Erweiterung

| Fach | Lernbereich ohne Übung | Idee |
|---|---|---|
| M5 | LB 1.1 große Zahlen, Stellenwerttafel, Runden | Stellenwerttafel, Zahlenstrahl |
| M5 | LB 1.2 Punkt vor Strich, Klammern, Rechenvorteile | Kopfrechnen-Stufe (Etappe 4) |
| M5 | LB 2 Ganze Zahlen (Thermometer, Zahlengerade) | Zahlengerade antippen |
| M5 | LB 3 Koordinatensystem, Winkel, Senkrechte/Parallele | Punkte setzen, Winkel schätzen |
| M5 | LB 5 Masse, Zeit, Geld, Volumen | Typ Eingabe „Größen“ (wie Längen) |
| M5 | LB 6 Daten (Diagramme lesen) | Diagramm-Quiz |
| M6 | LB 1 Brüche darstellen, erweitern, kürzen, vergleichen | Bruchstreifen |
| M6 | LB 3 Vierecke | Typ Zuordnen (ersetzt Vierecke-App) |
| M6 | LB 4/5 Oberfläche und Volumen Quader | später |
| E5/E6 | Hörverstehen, Aussprache | Typ Bild-Wort mit Ton |
| GPG 5 | LB 1 Sonnensystem, Karte/Globus, Bayern | Typ Beschriften |
| GPG 5/6 | Zeit und Wandel (Zeitstrahl) | Typ Sortieren |

Englisch und GPG: Lernbereich-Bezeichnungen vor Verwendung in Unterrichtsentwürfen im LehrplanPLUS gegenprüfen.
