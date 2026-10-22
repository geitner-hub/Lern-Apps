# Rauchtest – nach jedem Upload (ca. 5 Minuten)

Erst in der **Testumgebung** (geitner-hub.github.io/Lern-Apps-test/), dann **live**.
Live am iPad über das Symbol auf dem Home-Bildschirm, Test in Safari.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | GitHub → Repo → oben beim letzten Commit | ✅ grüner Haken (rotes ✗ → „Details“ ansehen) |
| 2 | Startseite öffnen | Apps erscheinen, Pass-Leiste mit Level, keine Fehlermeldung |
| 3 | Mathe: Kopfrechnen Klasse 5, eine Runde | Ergebnis-Abzeichen, XP-Meldung, ggf. „Dorf-Auftrag 1 von 2“ |
| 4 | Englisch: Vokabeltrainer 5, eine kurze Runde | läuft, Ergebnis wird gemeldet |
| 5 | GPG: Länder-Finder öffnen | Karte erscheint und reagiert auf Antippen |
| 6 | Spiel: RUN! starten | Aufgaben aus „Meine Themen“ erscheinen |
| 7 | Pass öffnen: Garderobe · Truhen · Erfolge · Sicherung | alles öffnet; unter „Sicherung“ steht die neue Version |
| 8 | Mein Dorf öffnen | Dorf lädt, Aufträge sichtbar |
| 9 | Admin öffnen (ggf. anmelden) | Version oben neben „Admin“ stimmt, App-Liste geladen |
| 10 | Flugmodus an, Lernwelt neu öffnen, eine App und ein Spiel | beides startet offline (Spiele erst, wenn das iPad sie im Hintergrund geladen hat – nach einem Update etwa einen Schultag) |
| 11 | Pass → Sicherung → 5× auf die Versionszeile tippen | Diagnose erscheint, „Fehlerprotokoll (0)“ bzw. Einträge ansehen |
| 12 | Spiel: Meine Insel öffnen, „Los geht's“, mit dem Joystick zu einem Bewohner laufen, 💬 antippen | Insel lädt (ohne 3D: Hinweis statt leerer Seite), Figur läuft flüssig, Bewohner gibt einen Auftrag auf Englisch; ⏸ → „Weiter“ geht, Home-Knopf führt zurück |

**Nur in der Testumgebung zusätzlich:** Oben steht „🧪 TEST · vXX“. Im Admin eine Kleinigkeit ändern und
speichern → Meldung „Testumgebung: Speichern und Sicherung sind hier abgeschaltet“. Danach live den Pass
öffnen: XP und Level sind unverändert.

## Admin (nach Änderungen am Admin, ca. 5 Minuten)

Erst in der Testumgebung, dort wird nichts gespeichert. Den Admin nicht in zwei Tabs gleichzeitig ändern
(beide teilen sich den Entwurf).

| # | Schritt | Erwartung |
|---|---|---|
| A1 | Admin öffnen, abmelden, mit Passwort wieder anmelden | „Angemeldet bis …“ oben, Version stimmt, „← Zur Lernwelt“ führt zur Startseite |
| A2 | Seite neu laden | bleibt angemeldet, App-Liste geladen |
| A3 | Inhalte → Apps: Kacheln mit Symbol, Titel und Knöpfen unten; eine App ausblenden und wieder einblenden, ✏️ öffnet die Kachel breit | Entwurf verschwindet wieder (Änderung zurückgenommen) |
| A4 | Zwei Apps ausblenden, oben „2 ungespeicherte Änderungen“ antippen, dann „Verwerfen“ | Liste zeigt beide Änderungen und die geänderten Werte; danach alter Stand |
| A5 | Inhalte → Ordnen: ein Regal zwischen zwei Fächern ziehen, Vorschau öffnen, Verwerfen | Vorschau zeigt neue Ordnung, nach Verwerfen alter Stand |
| A6 | Inhalte → Tags, Start → Banner, Motivation → Pass und Mein Dorf je einmal öffnen | alles lädt ohne Fehlermeldung |
| A7 | Inhalte → Freigaben; Gruppen → Fokus, Spielsperre (mit Ausnahmen), Auswertung öffnen | Gruppen der Sicherungskarten erscheinen, Auswertung lädt |
| A8 | Gruppen → Lernwege öffnen | Lernwege mit Gruppen/Klassen zum Antippen |
| A9 | Medien → Dateien öffnen, ein kleines Bild hochladen, QR-Code zeigen, wieder löschen (nur live) | Upload läuft, QR öffnet die Datei, Speicheranzeige stimmt |
| A10 | System → Weitere Seiten: Sicherungskarten und Infokarten öffnen | beide Seiten öffnen |
| A11 | Live: eine kleine Änderung veröffentlichen | „Veröffentlicht“, nach ca. 1 Min. auf der Startseite sichtbar, unter System → Entwurf und Versionen |
| A12 | Jeden der sechs Bereiche und jedes Modul oben antippen | jedes Modul zeigt Inhalt, keine Fehlermeldung; Adresse oben passt (z. B. `#/gruppen/spielsperre`) |
| A13 | Im Admin eine App ausblenden, Seite neu laden | Entwurf bleibt („1 ungespeicherte Änderung“), Verwerfen stellt zurück |
| A14 | System → Diagnose | Version und Fehlerprotokoll dieses Geräts |
| A15 | Inhalte → Apps: bei einer App die Datei auf `apps/gibt-es-nicht.html` ändern, Veröffentlichen | „Veröffentlichen gestoppt“ mit „Datei fehlt“; danach Verwerfen |
| A16 | System → Entwurf und Versionen: Protokoll ansehen, bei der vorletzten Fassung „Ansehen“ | Liste mit Datum und Bereich; Unterschiede zum aktuellen Stand |
| A18 | Start → Übersicht: Kacheln Status, Schnellaktionen, Hinweise; „Auf den Beamer“ | Zahlen stimmen, Zeilen führen zum Modul; QR bildschirmfüllend, Antippen schließt |
| A19 | Strg+K bzw. 🔍: „spielsperre“, eine App, ein Medium suchen, Enter | jeweils das richtige Modul, bei App/Medium steht der Name im Suchfeld |
| A20 | Live: „Spiele heute frei“ für eine Gruppe (ohne anderen Entwurf) | wird gleich veröffentlicht, unter Gruppen → Spielsperre steht die Ausnahme „nur heute“ |
| A17 | Live: „Wiederherstellen“ bei der vorletzten Fassung, Veröffentlichen, danach die neueste vorherige Fassung wiederherstellen und veröffentlichen | beide Male „Veröffentlicht“, am Ende ist alles wie vorher (braucht den neuen Worker) |

**Wenn etwas nicht geht:** GitHub → Repo → „Commits“ → vorigen Stand öffnen → Dateien von dort
zurückholen (oder Claude die Fehlermeldung schicken). Die Kinder verlieren dabei nichts: Speicherstände
liegen auf den iPads bzw. in der Cloud-Sicherung, nicht im Repo.
