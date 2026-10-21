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

Gehört zum Admin-Umbau (Inventar: `werkzeuge/admin-inventar.md`). Bis Etappe 2 im **bisherigen Admin**
(`admin.html`) prüfen, ab dann im neuen. Erst in der Testumgebung, dort wird nichts gespeichert.

| # | Schritt | Erwartung |
|---|---|---|
| A1 | Admin öffnen, abmelden, mit Passwort wieder anmelden | „Angemeldet bis …“ oben, Version stimmt |
| A2 | Seite neu laden | bleibt angemeldet, App-Liste geladen |
| A3 | Apps: eine App ausblenden und wieder einblenden | Entwurfs-Leiste zeigt „2 Änderungen“ |
| A4 | Entwurf: „ansehen“ aufklappen, dann „Verwerfen“ | Liste zeigt beide Änderungen; danach Leiste weg, alter Stand |
| A5 | Ordnen: ein Regal zwischen zwei Fächern ziehen, Vorschau öffnen, Verwerfen | Vorschau zeigt neue Ordnung, nach Verwerfen alter Stand |
| A6 | Tags, Banner, Pass, Dorf je einmal öffnen | alles lädt ohne Fehlermeldung |
| A7 | Unterricht: Fokus, Spielsperre (mit Ausnahmen), Freigaben, Gruppen-Auswertung öffnen | Gruppen der Sicherungskarten erscheinen, Auswertung lädt |
| A8 | Lernwege öffnen | Lernwege mit Gruppen/Klassen zum Antippen |
| A9 | Medien öffnen, ein kleines Bild hochladen, QR-Code zeigen, wieder löschen (nur live) | Upload läuft, QR öffnet die Datei, Speicheranzeige stimmt |
| A10 | Sicherungskarten und Infokarten über die Kopfleiste öffnen | beide Seiten öffnen |
| A11 | Live: eine kleine Änderung veröffentlichen | „Veröffentlicht“, nach ca. 1 Min. auf der Startseite sichtbar, unter „Zuletzt veröffentlicht“ |
| A12 | `admin-neu.html` öffnen (bis Etappe 2) | gleiche Anmeldung, danach Seite „Hier entsteht der neue Admin“ |

**Wenn etwas nicht geht:** GitHub → Repo → „Commits“ → vorigen Stand öffnen → Dateien von dort
zurückholen (oder Claude die Fehlermeldung schicken). Die Kinder verlieren dabei nichts: Speicherstände
liegen auf den iPads bzw. in der Cloud-Sicherung, nicht im Repo.
