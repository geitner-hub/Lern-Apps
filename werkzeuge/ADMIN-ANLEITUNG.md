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
| 📚 Inhalte | Apps (Kacheln), Ordnen und Regale, Tags und Klassen, Freigaben, App-Einstellungen, 🌳 Katalog, 📖 Vokabeln, 🎯 Aufgaben-Pools, 🧭 English Journey |
| 👥 Gruppen | Sicherungskarten, Fokus, Spielsperre, 📒 Laufzettel (Freigabe, Mindestniveau), Gruppen-Auswertung |
| 🏆 Motivation | Pass (Saison, Events, „Meine Themen“), 🎁 Avatar-Teile (Loot-Pool, Titel, Übersicht), Mein Dorf, Kalender |
| 📁 Medien | Dateien hochladen, QR-Codes und Kurzlinks, Sammlungen |
| ⚙️ System | Anmeldung, 👥 Kollegen, Entwurf und Versionen, 🧪 Feature-Schalter, Diagnose, weitere Seiten |

🔍 **Suchen** (Strg+K) findet jedes Modul, jede App und jedes Medium. 🎓 **Unterricht** öffnet den Unterrichtsmodus.

## Zwei Arten zu speichern

1. **Entwurf → 🚀 Veröffentlichen** (alles, was in `config.json` steht: Apps, Freigaben, Spielsperre, Pass, Dorf …).
   Änderungen sammeln sich oben als „ungespeicherte Änderungen“. Vor dem Veröffentlichen prüft der Admin alles; Fehler
   halten an, Warnungen fragen nach. Nach ca. 1 Minute ist es auf den iPads. Unter System → 🕓 Entwurf und Versionen stehen
   die letzten 30 Veröffentlichungen – jede lässt sich ansehen und wiederherstellen.
2. **💾 Speichern direkt ins Repo** (die Editoren: Katalog, Vokabeln, Aufgaben-Pools, Avatar-Teile/Titel, English Journey). Jede Datei hat
   ihren eigenen Knopf „💾 Speichern“; nach 1–2 Minuten ist es live. Ungespeichertes bleibt auf dem Gerät erhalten.

**Was nie geht** (damit Kinder nichts verlieren): Units, Abschnitte, Pools, Avatar-Teile oder Katalog-IDs löschen oder
umbenennen. Neues hinzufügen und Texte ändern geht immer.

## English Journey: Laufzettel (Inhalte → 🧭 English Journey, Gruppen → 📒 Laufzettel)

Der Laufzettel führt die Kinder durch Highlight 6: je Abschnitt Buchseiten → 📒 Hefteintrag → ✏️ Übungen → 🎮 App. Die Kinder
arbeiten im Heft und im Übungsheft und haken selbst ab; das **Finale einer Unit öffnet sich erst, wenn alle freigegebenen
Hefteinträge abgehakt sind**.

- **📋 Übersicht:** je Unit alle Abschnitte mit Buchseiten, Hefteintrag, Übungen, Apps, „frei für“ und Klassenstand; ⚠ zeigt Lücken
  (z. B. Übung ohne Lösung, Abschnitt ohne Buchseiten). **„frei bis hier …“** gibt einer Gruppe oder Klasse den Abschnitt und alle
  davor frei und vergibt die HE-Nummern (fortlaufend, bleiben fest) – danach oben 🚀 Veröffentlichen. 👀 zeigt den Abschnitt wie ein Kind.
- **✏️ Bearbeiten:** Abschnitt aufklappen → Titel, Buchseiten, Niveaus, Wahl/Extra; Schritte mit ✏️ öffnen, mit ▲▼ ordnen, mit ✕ löschen;
  „＋ Schritt“ für Hefteintrag, Buchaufgabe, eigene Übung, App-Station, Zusatz-App, Lesen, Vokabelheft … Im **Hefteintrag** steht jede
  Heftzeile in einer Zeile; Wörter markieren und „🟩 grün“ oder „F fett“ tippen, rechts siehst du das Heft. Bei **eigenen Übungen** die
  Lösung eintragen (eine Zeile je Aufgabe, bei Schreibaufgaben „Mustertext“). Unten die **Kann-Sätze** fürs Finale. Dann 💾 Inhalte
  speichern. Hefteinträge nur in Pflicht-Abschnitten (nicht in Wahl/Extra). Abschnitte lassen sich nicht löschen.
- **👥 Klasse:** Gruppe wählen → wie viele iPads je Abschnitt Hefteintrag, Übungen und Abschnitt geschafft haben (mit Niveau) und
  „💡 Hier hakt es“ (Hefteintrag, bei dem viele Kinder unter 70 % zurückgeschickt wurden). Nur Summen, nur iPads mit Sicherungskarte.
- **📅 Schuljahr:** setzt Freigaben, HE-Nummern, Mindestniveau und Reihenfolge zurück; Inhalte bleiben.
- **🖨️ Drucken:** Lösungsheft (liegt im Klassenzimmer aus: je Abschnitt Station und Buchseiten, eigene Übungen mit Lösung,
  Buchaufgaben mit Platz für die Kopie aus dem Lehrerband), Papier-Laufzettel, Hefteinträge.
- **Gruppen → 📒 Laufzettel:** dieselbe Freigabe als Liste je Gruppe/Klasse, dazu das **Mindestniveau** (die Kinder wählen ★/★★/★★★
  selbst, aber nicht darunter).
  Und die **Reihenfolge**: *Schritt für Schritt* (Standard) – der nächste Pflicht-Abschnitt öffnet sich erst, wenn im vorigen alles außer
  den Apps abgehakt ist; *streng* – auch die Apps müssen geschafft sein; *frei* – die Kinder springen im freigegebenen Bereich hin und her.
  Wahl-Abschnitte sind nie gesperrt.

## Unterrichtsmodus (🎓)

Vollbild fürs iPad, große Knöpfe, keine Einstellungen: 📲 App als QR-Code auf den Beamer, 📁 Medien auf den Beamer,
🎮 „Spiele heute frei“ (endet um Mitternacht), 🎯 Fokus „heute nur diese Apps“, 📊 Live-Abfrage (siehe unten),
🔓 Freischalten (nur Hauptzugang): gesperrte Stufen – z. B. die Ägypten-Quellen im Quellen-Detektiv – am Stundenende für Alle,
eine Klasse oder Gruppe freigeben. Wirkt sofort, ein offener Entwurf bleibt unberührt; die iPads merken es in 2–3 Minuten
ohne Neuladen. Wieder sperren oder „frei ab Datum“: Inhalte → 🔐 Freigaben.

**English Journey – nächste Unit öffnen:** Normalerweise beginnt eine Unit erst, wenn das Finale der Unit davor geschafft
ist. Ist die Klasse im Buch schon weiter, öffnest du sie für alle, die noch nicht so weit sind: Inhalte → 🔐 Freigaben →
Vokabeln Klasse 6 → Unit antippen → „🧭 Journey: Unit öffnen“ (für Alle, eine Klasse oder Gruppe). Auch ein erreichtes
„📅 frei ab Datum“ öffnet die Unit. Die Kinder beginnen dann an der ersten Station der Unit; was davor noch fehlt, bleibt
offen zum Nachholen. „↺ Journey: Öffnung zurücknehmen“ macht es rückgängig (Gemeistertes bleibt).

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
