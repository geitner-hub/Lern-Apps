# Neue Inhalte für den Aufgabentyp-Baukasten – Vorlage für Claude

So entsteht eine neue Übung ohne neuen Code (Infrastruktur Etappe 9):

1. Unten den Text zwischen den Linien kopieren, die **[eckigen Klammern]** ausfüllen und Claude geben
   (am besten mit einem Foto der Schulbuchseite).
2. Die Antwort als Datei `daten/inhalte/<fach>/<Themen-ID>.json` speichern, z. B. über github.dev.
3. Das Thema in `daten/katalog.json` eintragen (Claude liefert den Eintrag mit) und die Datei in `sw.js` →
   `NACHLADEN` ergänzen.
4. `python3 werkzeuge/pruefen.py` laufen lassen (oder auf den grünen Haken bei GitHub warten).
5. Im Admin eine neue App anlegen: Datei `apps/typen/uebung.html?inhalt=<Themen-ID>`, zuerst versteckt;
   mit „👁 Vorschau“ ansehen, dann einblenden.

Wer in einer Claude-Code-Sitzung mit dem Repo arbeitet, kann auch einfach schreiben:
„Lege mit dem Aufgabentyp-Baukasten eine Übung zu [Thema] an“ – Claude kennt das Format aus `README.md` und `CLAUDE.md`.

---

Erstelle eine Inhaltsdatei für den Aufgabentyp-Baukasten der „Lernwelt“ (Mittelschule Bayern, LehrplanPlus).

- Fach: **[Deutsch / Englisch / Mathematik / GPG / Natur und Technik]** (Ordner/ID-Anfang: de / en / ma / gpg / nut)
- Klasse: **[5]**
- Thema und Lehrplanbezug: **[z. B. „Groß- und Kleinschreibung: Nomen erkennen“, LB …]**
- Typ: **[zuordnen / sortieren / lueckentext / eingabe / beschriften / bildwort / markieren / gemischt]** – oder schlage den passenden vor
- Stufen: **[z. B. leicht → mittel → schwer, 2–3 Stufen]**, je Stufe **[8–12]** Aufgaben
- Grundlage: **[Schulbuchseite / Wortliste / eigene Stichpunkte]**

Regeln:
- Format: JSON, UTF-8, keine Kommentare. Kopf:
  `{ "typ", "thema", "titel", "emoji", "klasse", "untertitel", "anweisung", "runde", "stufen": [...] }`
  `thema` = Themen-ID `fach.klasse.thema` (klein, Ziffern, „-“), Stufen-IDs = Themen-ID + `.stufe`.
  Bei Englisch: `"sprache": "en-GB"` (Vorlesen).
- Je Typ in einer Stufe:
  - zuordnen: `"aufgaben": [{ "frage": "…", "paare": [["links","rechts"], …] }]` oder Pool `"paare": [...]` mit
    `"proAufgabe": 4` und `"ziele": [Kategorien]`
  - sortieren: `"aufgaben": [{ "teile": [in der RICHTIGEN Reihenfolge], "loesung": "ganzer Satz" }]`
  - lueckentext: `"aufgaben": [{ "text": "Satz mit ___ (genau eine Lücke)", "antwort": "…", "optionen": [...] }]`
    (ohne optionen tippt das Kind)
  - eingabe: `"aufgaben": [{ "frage": "…", "antwort": Zahl oder Text, "einheit": "cm" }]`
  - beschriften: `"bild": "datei.svg"`, `"marken": [{ "x": 0–100, "y": 0–100, "wort": "…" }]` (Prozent) –
    dazu eine einfache, selbst gezeichnete SVG-Datei
  - bildwort: `"woerter": [{ "bild": "Emoji", "wort": "…", "de": "…" }]`, `"richtung": "bild-wort" | "wort-bild" | "hoeren"`
  - markieren: `"aufgaben": [{ "satz": "She [go] to school.", "richtig": "goes" }]` – genau ein Wort in [ ]
  - gemischt: `"typ": "gemischt"` im Kopf, dann `"typ"` je Stufe; einzelne Aufgaben dürfen einen eigenen `"typ"` haben
    (lueckentext, sortieren, eingabe, markieren). Mix-Stufe: `{ "id", "titel", "mix": true }`
- Jede Aufgabe gern mit `"tipp"` (kurzer Hinweis) und `"erklaerung"` (warum es so richtig ist, ein Satz).
- Sprache kindgerecht für die Mittelschule, kurze Sätze, keine Fachwörter ohne Erklärung.
  Mathe-Aufgaben müssen im Kopf lösbar sein.
- Bilder nur als Emoji oder als selbst gezeichnete SVG – keine Bilder aus dem Internet.
- Liefere zusätzlich den Eintrag für `daten/katalog.json`:
  `{ "id", "titel", "klasse", "quelle": { "app": "apps/typen/uebung.html", "parameter": "inhalt=<Themen-ID>" },
     "lehrplan", "dauer" (Minuten je Runde), "einsatz", "stufen": [{ "id", "titel" }] }`

---
