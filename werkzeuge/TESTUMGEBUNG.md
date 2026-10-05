# Testumgebung einrichten (einmalig, ca. 10 Minuten)

Die Testumgebung ist eine zweite, vollständige Kopie der Lernwelt unter
**geitner-hub.github.io/Lern-Apps-test/**. Neue Etappen kommen zuerst dorthin.

## Warum das sicher ist

Alle Repos unter geitner-hub.github.io teilen sich auf dem iPad denselben Speicher.
`gemeinsam/umgebung.js` erkennt am Namen `…-test`, dass es die Testumgebung ist, und

- setzt vor jeden Speicherschlüssel `lwtest-` → der echte Pass, das Dorf usw. werden nie berührt,
- sperrt alle Schreibzugriffe auf den Worker (Admin-Speichern, Sicherungskarten, Cloud-Sicherung),
- zeigt oben das Schild „🧪 TEST“ und ein 🧪 im Seitentitel.

`sw.js` legt seinen Offline-Speicher unter einem eigenen Namen an (`lwtest-v…`) und räumt nur diesen auf.
Der Admin in der Testumgebung **liest** die echte Konfiguration (zum Ansehen), kann sie aber nicht ändern.
Die Startseite der Testumgebung zeigt die `config.json` aus dem Test-Repo.

## Einrichten

1. Zuerst Etappe 0 **live** hochladen (die Testumgebung ist eine Kopie davon).
2. Auf github.com oben rechts **＋ → Import repository**.
   - „Your old repository's clone URL“: `https://github.com/geitner-hub/Lern-Apps.git`
   - Owner: `geitner-hub`, Name: **`Lern-Apps-test`** (genau so, Endung `-test` ist wichtig)
   - **Public** (für GitHub Pages ohne Bezahlkonto nötig) → „Begin import“.
   - Gibt es „Import repository“ nicht: im Repo `Lern-Apps` unter Settings „Template repository“ anhaken,
     dann oben „Use this template → Create a new repository“ mit demselben Namen.
3. Im neuen Repo: **Settings → Pages** → Source „Deploy from a branch“ → Branch `main`, Ordner `/ (root)` → Save.
4. Nach 1–2 Minuten geitner-hub.github.io/Lern-Apps-test/ in Safari öffnen → oben „🧪 TEST“.
5. Den Link **nicht** an die Kinder geben und **nicht** zum Home-Bildschirm hinzufügen.

## Ablauf bei jeder Etappe

1. ZIP-Inhalt im **Test-Repo** hochladen (github.dev: im Repo die Taste `.` drücken, Dateien hineinziehen, Commit).
2. Grüner Haken bei Actions abwarten, Rauchtest (`werkzeuge/RAUCHTEST.md`) im Test.
3. Erst dann dieselben Dateien **live** in `Lern-Apps` hochladen (nachmittags/abends) und Rauchtest live.

Weicht der Test mal stark vom Live-Stand ab (z. B. nach vielen Admin-Änderungen live), einfach
`config.json` aus dem Live-Repo ins Test-Repo kopieren.
