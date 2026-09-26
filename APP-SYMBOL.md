# Lernwelt als App-Symbol auf den Schul-iPads

Die Lernwelt ist eine Web-App. Sie braucht **keinen App Store, keine Installation und keine
Anmeldung** – es wird nur ein Symbol („Web-Clip“) auf den Home-Bildschirm gelegt.

**Warum das wichtig ist:** Im normalen Safari kann iOS gespeicherte Webseiten-Daten löschen,
wenn eine Seite längere Zeit nicht geöffnet wurde. Der Lernwelt-Pass der Kinder liegt aber nur
auf dem iPad. Als Symbol auf dem Home-Bildschirm läuft die Lernwelt als eigene App mit eigenem
Speicher – dort gilt diese Löschregel so nicht. Außerdem startet sie im Vollbild und funktioniert
nach dem ersten Öffnen auch bei schlechtem oder fehlendem WLAN.

---

## A) Für die Geräteverwaltung (MDM) – empfohlen

In der Geräteverwaltung (z. B. Jamf School, Mosyle, Relution, Intune) ein Profil mit
**Web-Clip** anlegen und den iPads der Klassen zuweisen:

| Einstellung | Wert |
|---|---|
| Name / Label | `Lernwelt` |
| URL | `https://geitner-hub.github.io/Lern-Apps/` |
| Symbol / Icon | Bild herunterladen: `https://geitner-hub.github.io/Lern-Apps/icons/lernwelt-1024.png` |
| **Vollbild (Full Screen)** | **an** – wichtig, sonst öffnet sich nur Safari und der Schutz entfällt |
| Entfernbar (Removable) | aus (empfohlen) |
| Manifest-Bereich ignorieren (Ignore Manifest Scope) | aus |
| Symbol vorgefertigt (Precomposed) | an (falls vorhanden) |

Falls ein Inhaltsfilter aktiv ist: `geitner-hub.github.io` freigeben.

Die Lernwelt legt keine Konten an. Der Lernfortschritt wird nur auf dem jeweiligen iPad
gespeichert und nicht an einen Server übertragen.

## B) Ohne Geräteverwaltung (von Hand, falls erlaubt)

1. Safari öffnen → `geitner-hub.github.io/Lern-Apps` aufrufen
2. Teilen-Symbol (□ mit Pfeil) → **„Zum Home-Bildschirm“** → Name „Lernwelt“ → *Hinzufügen*
3. Bei neueren iOS-Versionen: Schalter **„Als Web-App öffnen“** eingeschaltet lassen

---

## Wichtig beim Umstieg

- Die App hat einen **eigenen Speicher**. Ein Pass, der vorher in Safari angelegt wurde,
  erscheint in der App nicht von selbst. Übernahme: in Safari *Mein Pass* → *🔗 Code kopieren* →
  Lernwelt-Symbol öffnen → Pass öffnen → *„Ich habe schon einen Pass“* → einfügen.
- Wird ein **Sicherungs-QR mit der Kamera** gescannt, öffnet iOS Safari (nicht die App). Die Seite
  bietet dann „📋 Code kopieren“ an; den Code wie oben in der App einfügen.
- Kinder sollten danach **nur noch das Symbol** benutzen, nicht Safari.
- Entfernt ein Kind das Symbol, wird auch der Speicher der App gelöscht → deshalb in der
  Geräteverwaltung „Entfernbar: aus“.
