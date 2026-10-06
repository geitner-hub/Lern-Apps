# Sicherung der Lernwelt

`.github/workflows/sicherung.yml` sichert jede Nacht den kompletten Stand des Repos – aber nur, wenn sich
seit der letzten Sicherung etwas geändert hat (auch Admin-Änderungen an `config.json` zählen).

**Wo:** im Repo rechts unter **Releases** → `sicherung-JJJJ-MM-TT`, jeweils mit ZIP-Datei zum Herunterladen.
**Sofort sichern:** Actions → „Lernwelt sichern“ → **Run workflow** (z. B. vor einem großen Upload).

Was **nicht** gesichert wird: Spielstände der Kinder (liegen auf den iPads bzw. in der Cloudflare-Datenbank der
Sicherungskarten) und die Einstellungen/Secrets des Cloudflare Workers.

## Zurückholen

**Einzelne Datei** (häufigster Fall): Release öffnen → ZIP herunterladen → Datei herausnehmen → auf github.com
an derselben Stelle hochladen („Add file → Upload files“). Danach `VERSION` in `sw.js` und
`gemeinsam/umgebung.js` erhöhen, damit die iPads den Stand neu laden.

**Alles auf einen alten Stand:** Claude bitten: „Setze die Lernwelt auf `sicherung-JJJJ-MM-TT` zurück.“
Das passiert als neuer Commit (nichts wird gelöscht, auch der Rückschritt lässt sich wieder rückgängig machen).
Von Hand: `git checkout sicherung-JJJJ-MM-TT -- .` → Version erhöhen → committen.

**Ansehen ohne Änderung:** Release → „Source code“ bzw. im Repo oben links das Branch-Menü → Reiter „Tags“.

## Hinweise

- GitHub pausiert nächtliche Abläufe, wenn 60 Tage lang nichts im Repo passiert (Ferien). Dann kommt eine
  E-Mail; in Actions mit „Enable workflow“ wieder einschalten.
- Die Sicherungen liegen im selben GitHub-Konto. Gegen den Verlust des ganzen Kontos ab und zu ein ZIP
  zusätzlich lokal oder in der Schul-Cloud ablegen.
