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

## Im Unterricht: QR-Codes in der App scannen

Ein QR-Code, der mit der **Kamera-App** gescannt wird, öffnet immer Safari – nie das
Lernwelt-Symbol. Deshalb gibt es in der Lernwelt einen eigenen Scanner:

1. Lernwelt-Symbol öffnen
2. Neben der Suche auf **📷 QR scannen** tippen (beim ersten Mal die Kamera erlauben)
3. QR-Code der Lehrkraft scannen → die App öffnet sich **in der Lernwelt**, der Fortschritt
   landet im richtigen Pass

Der Scanner öffnet nur Lernwelt-Apps (und in der Lernwelt eingetragene externe Apps nach
Rückfrage); fremde QR-Codes werden abgelehnt. Sicherungskarten lassen sich damit ebenfalls
direkt in der App einlesen. Die Geräteverwaltung muss dafür die **Kamera erlauben**.

Wird die Lernwelt auf einem iPad trotzdem in Safari geöffnet, erscheint oben ein Hinweis,
lieber das Symbol zu benutzen (einmal pro Tag, mit „Verstanden“ ausblendbar).

## Wichtig beim Umstieg

- Die App hat einen **eigenen Speicher**. Ein Pass, der vorher in Safari angelegt wurde,
  erscheint in der App nicht von selbst. Übernahme: in Safari *Mein Pass* → *🔗 Code kopieren* →
  Lernwelt-Symbol öffnen → Pass öffnen → *„Ich habe schon einen Pass“* → einfügen.
- **Sicherungskarten** in der App mit „📷 QR scannen“ einlesen. Wurde die Karte doch mit der
  Kamera gescannt (→ Safari), bietet die Seite „📋 Code kopieren“ zum Einfügen in der App an.
- Kinder sollten danach **nur noch das Symbol** benutzen, nicht Safari.
- Entfernt ein Kind das Symbol, wird auch der Speicher der App gelöscht → deshalb in der
  Geräteverwaltung „Entfernbar: aus“.
