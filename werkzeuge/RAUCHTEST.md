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
| 13 | GPG: Quellen-Detektiv → „Ganzer Fall“, Niveau ★, bis zur Kontrolle, ein paar Punkte abhaken, Auswerten | Quelle groß, Karten grün/blau/orange, Hilfen antippbar; Musterantwort und Checkliste gut lesbar; Ergebnis „x / y ✓“ |
| 14 | Quellen-Detektiv: die vier Kritik-Stufen | 🔒 bis zur Freigabe im Admin; danach „Ganzer Fall mit Quellenkritik“ mit lila Karte 4, im Detektiv-Ritual tauchen Kritik-Aufgaben auf |

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
| A21 | Am iPad quer: 🎓 Unterricht | Vollbild ohne Seitenleiste, Uhr, fünf große Reiter (mit 📊 Live-Abfrage); „✕ Unterricht beenden“ führt zum Dashboard |
| A22 | Unterricht → App zeigen (Fach wählen, App antippen) und Medien → Sammlung antippen | QR bildschirmfüllend, Handy-Scan öffnet App bzw. Sammlung |
| A23 | Live: Unterricht → Spiele „Heute frei“ für eine Klasse, nach 2 Min. Kinder-iPad prüfen, dann „Sperre wieder an“ | Spiele offen bzw. wieder gesperrt; ein offener Admin-Entwurf bleibt erhalten |
| A24 | Live: Unterricht → Fokus für eine Gruppe mit 2 Apps, 45 Min.; danach „Beenden“ | Startseite der Gruppe zeigt nur die 2 Apps, nach Beenden wieder alle |
| A25 | Motivation → Pass: ein Event auf „Zeitraum“ ab morgen stellen, veröffentlichen; Motivation → Kalender | Event steht unter „Kommt“, Dashboard meldet „beginnt morgen“; heute ist es auf der Startseite noch aus |
| A26 | Am nächsten Tag: Startseite eines Kinder-iPads | Event ist ohne Eingriff an; am Tag nach „bis“ wieder aus (braucht den neuen Worker) |
| A27 | Inhalte → App-Einstellungen: Tower Defense „Herzen der Burg“ auf 5, veröffentlichen; Tower Defense am iPad starten | Burg hat 5 Herzen; ↺ setzt auf 10 zurück |
| A29 | Inhalte → 🌳 Katalog: Englisch → Wortschatz aufklappen, Schalter einer Unit aus, veröffentlichen | Unit im Vokabeltrainer mit 🔒; Schalter wieder an → offen |
| A30 | Live: Inhalte → 📖 Vokabeln → Klasse 6: neue Unit „Unit 6: …“ anlegen, 3 Zeilen aus einer Tabelle importieren, 💾 Speichern | „Gespeichert“; nach 1–2 Min. im Vokabeltrainer Kl. 6 als neue Unit, im Katalog als Stufe, in RUN! über „selbst wählen“ (braucht `dateien.js` bei Cloudflare) |
| A31 | Vokabeln: ein Wort leeren, 💾 Speichern | Speichern gestoppt mit „leeres Feld“; ohne neuen Worker steht oben „Nur lesen“ |
| A32 | Live: Inhalte → 🎯 Aufgaben-Pools: neuen Pool anlegen, 5 Zeilen aus einer Tabelle einfügen, 💾 Speichern; nach 2 Min. RUN! → selbst wählen | Pool steht in der Auswahl, Fragen mit 3 Antworten; `spiele/runner.html?pool=<id>` startet direkt |
| A33 | Live: Motivation → 🎁 Avatar-Teile → Neues Teil: Vorlage wählen, Farben ändern (Vorschau dreht sich mit), anlegen, 💾 Speichern | Teil im Raster mit Vorschau; nach 2 Min. in der Garderobe als gesperrtes Teil, erhältlich aus einer Truhe |
| A34 | Avatar-Teile → Titel: einen Titel ändern, speichern; Übersicht öffnen | neuer Titel auf der Startseite beim passenden Level; Übersicht zeigt Level, XP-Regeln, Truhen, Abzeichen, Teile |
| A35 | Live: System → 👥 Kollegen: Test-Zugang „Test“ mit einer Gruppe anlegen, Code notieren | Code erscheint einmal, Zugang steht als 🟢 aktiv in der Liste |
| A36 | Anderes Gerät (oder privates Fenster): admin.html, mit dem Code anmelden | landet im Unterrichtsmodus, oben „👥 Test“ und 🔒 Abmelden; bei Spiele/Fokus nur die eigene Gruppe; `#/inhalte` führt zurück in den Unterricht |
| A37 | Als „Test“: App-QR zeigen, „Spiele heute frei“ für die Gruppe, Fokus 45 Min. starten und beenden | wirkt wie beim Hauptzugang; im Versionsverlauf (Hauptzugang) steht „👥 Test: …“ |
| A38 | Hauptzugang: Zugang „Test“ sperren; auf dem Kollegen-Gerät neu laden | Anmeldung verlangt wieder einen Code; danach den Test-Zugang löschen |
| A39 | System → 🧪 Feature-Schalter | ohne Einträge in `daten/features.json` der Hinweis „keine Funktion hinter einem Schalter“ |
| A40 | Live (einmalig nach dem Worker-Update): `cloudflare/live-test.html`, Admin-Passwort | alle Schritte grün, „einsatzbereit“ |
| A41 | Inhalte → 📊 Live-Quizze: „🎲 Aus dem Pool“ → Vokabeln Kl. 5 Unit 1, 5 Fragen, mischen, speichern; zweites Quiz mit 3 eigenen Fragen (eine mit „Zweite Runde“) | beide in der Liste, Bearbeiten zeigt die Fragen |
| A42 | Unterricht → 📊 Live-Abfrage → Quiz starten; 3 iPads scannen den QR-Code (eins tippt den Code ein) | Beamer zählt „3 dabei“, Kinder sehen „Du bist dabei!“ |
| A43 | Los, alle antworten, Aufdecken, zweite Runde, Lösung, Nächste Frage … bis zum Ende; dazu eine spontane Ampel | Zähler „3 von 3“, Kinder sehen die Lösung erst beim Aufdecken; Balken, Vergleich, Wortwolke, Zahlenstrahl stimmen |
| A44 | Beenden; Kinder-iPads; Startseite eines Kinder-iPads | Kinder: „Danke fürs Mitmachen“ mit Bilanz; keine Kachel „Live-Abfrage läuft“ mehr; Rückblick beim Quiz (falls angehakt) |
| A45 | Quiz im Modus „Selbst“ auf dem ältesten iPad | Rückmeldung richtig/falsch je Frage, Beamer zeigt Fortschritt, „📊 Ergebnis zeigen“ zeigt % richtig |
| A28 | Motivation → Mein Dorf → Einstellungen | gleiche Felder wie unter App-Einstellungen (Auftragsplätze, Tausche, Baukosten), Änderung wirkt wie bisher |
| A17 | Live: „Wiederherstellen“ bei der vorletzten Fassung, Veröffentlichen, danach die neueste vorherige Fassung wiederherstellen und veröffentlichen | beide Male „Veröffentlicht“, am Ende ist alles wie vorher (braucht den neuen Worker) |

**Wenn etwas nicht geht:** GitHub → Repo → „Commits“ → vorigen Stand öffnen → Dateien von dort
zurückholen (oder Claude die Fehlermeldung schicken). Die Kinder verlieren dabei nichts: Speicherstände
liegen auf den iPads bzw. in der Cloud-Sicherung, nicht im Repo.
