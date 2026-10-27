# Admin der Lernwelt – Anleitung

Kurzanleitung für den Admin (`admin.html`, Stand Admin-Umbau Etappe 10). Technische Einzelheiten stehen in
`README.md` (Abschnitt Admin) und `werkzeuge/admin-inventar.md`, die Einrichtung des Servers in `cloudflare/ANLEITUNG.md`.

## Anmelden

- **Hauptzugang:** Admin-Passwort. Das Gerät bleibt 7 Tage angemeldet (System → 🔒 Anmeldung und Geräte).
- **Kollegen-Zugang:** eigener Code (`XXXX-XXXX-XXXX-XXXX`) statt des Passworts, nur Unterrichtsmodus (siehe unten).
- Oben rechts 🔒 meldet dieses Gerät ab.

## Die sechs Bereiche

| Bereich | Was dort steht |
|---|---|
| 🏠 Start | Dashboard: Status, Schnellaktionen (Beamer, Spiele heute frei), Hinweise für die nächsten 7 Tage, Banner |
| 📚 Inhalte | Apps (Kacheln), Ordnen und Regale, Tags und Klassen, Freigaben, App-Einstellungen, 🌳 Katalog, 📖 Vokabeln, 🎯 Aufgaben-Pools |
| 👥 Gruppen | Sicherungskarten, Fokus, Spielsperre, Lernwege, Gruppen-Auswertung |
| 🏆 Motivation | Pass (Saison, Events, „Meine Themen“), 🎁 Avatar-Teile (Loot-Pool, Titel, Übersicht), Mein Dorf, Kalender |
| 📁 Medien | Dateien hochladen, QR-Codes und Kurzlinks, Sammlungen |
| ⚙️ System | Anmeldung, 👥 Kollegen, Entwurf und Versionen, 🧪 Feature-Schalter, Diagnose, weitere Seiten |

🔍 **Suchen** (Strg+K) findet jedes Modul, jede App und jedes Medium. 🎓 **Unterricht** öffnet den Unterrichtsmodus.

## Zwei Arten zu speichern

1. **Entwurf → 🚀 Veröffentlichen** (alles, was in `config.json` steht: Apps, Freigaben, Spielsperre, Pass, Dorf …).
   Änderungen sammeln sich oben als „ungespeicherte Änderungen“. Vor dem Veröffentlichen prüft der Admin alles; Fehler
   halten an, Warnungen fragen nach. Nach ca. 1 Minute ist es auf den iPads. Unter System → 🕓 Entwurf und Versionen stehen
   die letzten 30 Veröffentlichungen – jede lässt sich ansehen und wiederherstellen.
2. **💾 Speichern direkt ins Repo** (die Editoren: Katalog, Vokabeln, Aufgaben-Pools, Avatar-Teile/Titel). Jede Datei hat
   ihren eigenen Knopf „💾 Speichern“; nach 1–2 Minuten ist es live. Ungespeichertes bleibt auf dem Gerät erhalten.

**Was nie geht** (damit Kinder nichts verlieren): Units, Abschnitte, Pools, Avatar-Teile oder Katalog-IDs löschen oder
umbenennen. Neues hinzufügen und Texte ändern geht immer.

## Unterrichtsmodus (🎓)

Vollbild fürs iPad, große Knöpfe, keine Einstellungen: 📲 App als QR-Code auf den Beamer, 📁 Medien auf den Beamer,
🎮 „Spiele heute frei“ (endet um Mitternacht), 🎯 Fokus „heute nur diese Apps“, 📊 Live-Abfrage (siehe unten),
🔓 Freischalten (nur Hauptzugang): gesperrte Stufen – z. B. die Ägypten-Quellen im Quellen-Detektiv – am Stundenende für Alle,
eine Klasse oder Gruppe freigeben. Wirkt sofort, ein offener Entwurf bleibt unberührt; die iPads merken es in 2–3 Minuten
ohne Neuladen. Wieder sperren oder „frei ab Datum“: Inhalte → 🔐 Freigaben.

**Achtung bei einem alten Entwurf:** Fragt der Admin beim Öffnen, ob ein Entwurf „auf einem älteren Stand“ trotzdem
übernommen werden soll, ersetzt „Ja“ die ganze Einstellungsdatei durch den alten Stand – Änderungen, die inzwischen dazukamen
(z. B. aus einem Update), gehen verloren. Im Zweifel „Nein“ und die Änderung neu machen.

### 📊 Live-Abfrage

- **Vorbereiten:** Inhalte → 📊 Live-Quizze → „➕ Neues Quiz“ oder „🎲 Aus dem Pool“ (Vokabeln, Baukasten, Kopfrechnen; Anzahl
  wählen, mischen, dann anpassen und speichern). Fragetypen: Auswahl, Wahr/Falsch, Zahl, Ein Wort, Schätzfrage, Ampel.
  Häkchen „Rückblick“ = nach jeder Abfrage bleibt eine anonyme Zusammenfassung (unter „📈 Rückblicke“ beim Quiz).
- **Im Unterricht:** 🎓 Unterricht → 📊 Live-Abfrage → Quiz antippen (oder spontane Frage: 🚦 Ampel, A–D, Wahr/Falsch, Ein Wort).
  Am Beamer erscheinen QR-Code und Code. Kinder: „📷 Scannen“ (oben rechts auf der Startseite). Dann „▶ Los geht's“, „👁 Aufdecken“, „▶ Nächste Frage“.
  Mit „Zweite Runde“: nach dem Aufdecken „🗣 Nochmal nach Partnergespräch“, dann „✓ Lösung zeigen“.
  Bei Ein-Wort-Fragen vor dem Aufdecken „🔍 Wörter prüfen“ und unpassende Wörter antippen (Beamer kurz abdunkeln, wenn er gespiegelt ist).
- **Beenden** löscht alle Antworten. „↙ Verkleinern“ lässt die Abfrage weiterlaufen; sie steht dann unter „Läuft gerade“.
- Kollegen können vorbereitete Quizze starten, aber nicht bearbeiten.

## Kollegen-Zugänge (System → 👥 Kollegen)

- **Anlegen:** Kürzel (kein voller Name nötig), Gruppen (Sicherungskarten-Gruppen), gültig bis (Vorschlag: Ende des
  Schuljahres). Der Code erscheint **einmal** – notieren oder direkt weitergeben.
- **Damit können Kollegen:** sich mit dem Code an `admin.html` anmelden und landen im Unterrichtsmodus. Sie zeigen App-QR-Codes
  und Medien und schalten für **ihre Gruppen** „Spiele heute frei“ und Fokus. Alles andere bleibt gesperrt – das prüft der
  Server selbst, nicht nur die Seite. Im Versionsverlauf steht ihr Kürzel („👥 Mü: …“).
- **Sperren** (Schalter), **Ablauf ändern**, **neuer Code** (der alte gilt sofort nicht mehr) und **Löschen** wirken sofort.
- Dein Passwort gibst du nie weiter.

## Feature-Schalter (System → 🧪)

Neue Funktionen zuerst testen: **Aus**, **Zum Testen** (nur du – Geräte mit deiner Admin-Anmeldung – und/oder einzelne
Gruppen oder Klassen) oder **Für alle**. Welche Funktionen einen Schalter haben, steht in `daten/features.json`. Gilt nach
dem Veröffentlichen.

## Wenn etwas nicht geht

- **„Der Worker bei Cloudflare ist noch die alte Version“** bzw. „Nur lesen“: neuen Code aus `cloudflare/` einfügen
  (`cloudflare/ANLEITUNG.md`, Abschnitt „Änderungen am Worker“).
- **„Konflikt“:** Die Lernwelt wurde inzwischen woanders geändert – Seite neu laden, der Entwurf wird angeboten.
- **Etwas falsch veröffentlicht:** System → 🕓 Entwurf und Versionen → frühere Fassung → Wiederherstellen → Veröffentlichen.
- **Kinder verlieren nie etwas:** Spielstände liegen auf den iPads und in der Sicherungskarte, nicht im Repo.
- Nach größeren Änderungen: `werkzeuge/RAUCHTEST.md` (Abschnitt Admin) durchgehen.
