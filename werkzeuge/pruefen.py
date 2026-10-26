#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════
#  Lernwelt – werkzeuge/pruefen.py   (Prüfskript, Infrastruktur Etappe 0)
#
#  Läuft bei jedem Upload automatisch über GitHub Actions
#  (.github/workflows/pruefen.yml) → grüner Haken oder rotes Kreuz im Repo.
#  Lokal: im Hauptordner  python3 werkzeuge/pruefen.py
#
#  FEHLER (rot) – die Seite ist wahrscheinlich kaputt oder eine Regel verletzt:
#    1. Jede JSON-Datei ist gültig.
#    2. Jede Datei aus config.json und aus sw.js (START) existiert.
#    3. Jede Seite bindet gemeinsam/umgebung.js als ERSTES Skript ein (richtiger Pfad).
#    4. Jede Lern-App und jedes Spiel bindet navbar.js ein.
#    5. LW.VERSION (umgebung.js) und VERSION (sw.js) sind gleich.
#    6. Jeder Speicherschlüssel im Code steht im Speicher-Register (umgebung.js).
#    7. Die Größenbudgets werden eingehalten (BUDGETS unten, gemessen komprimiert).
#    8. Inhalts-Katalog (daten/katalog.json): IDs eindeutig und richtig gebaut, jedes Thema
#       hat Fach und Klasse, jede Quelle existiert, jede Lern-App aus config.json hat ein Thema.
#       Freigaben (Etappe 7) mit unbekannter Themen-ID → gelber Hinweis.
#  HINWEISE (gelb) – nichts kaputt, aber ansehen:
#    Apps im Ordner, die nicht in config.json stehen, u. Ä.
#
#    9. Ladekette (Etappe 2): jede Datei aus sw.js NACHLADEN und aus LW.laden('…') existiert.
#   11. Wortlisten (Etappe 5): jede Unit/Sonderliste in daten/vokabeln*.json hat eine Themen-ID aus dem Katalog.
#   10. Kopfrechnen (Etappe 4): Stufen in daten/kopfrechnen.json stehen im Katalog und nutzen
#       nur Generatoren, die es in gemeinsam/generatoren-mathe.js gibt.
#
#   12. Inhaltsdateien (Etappe 9): daten/inhalte/<fach>/<Themen-ID>.json passen zu ihrem Typ und zum Katalog;
#       Einträge in config.json für apps/typen/uebung.html?inhalt=… haben eine Inhaltsdatei.
#       Quellen je Aufgabe (Quellen-Detektiv): Bild existiert, Fotos (png/jpg/webp) haben einen „nachweis“,
#       quellenart ist sach/bild/schrift, Methodenkarten in „hilfe“ haben nr und Farbe #rrggbb.
#       Typ fall (ganzer Fall): titel, Quelle, karten 1–3 (optional 4) mit muster; Hilfen mit frage und optionen.
#       Freigaben (Etappe 4): gesperrt ist true/false, „nach“ einer Aufgabe nennt eine andere Stufe der Datei.
#       Lernpfad: checkpoint nur an Mix-Stufen, schwelle 1–100; mit nurMitFoto: jede Stufe braucht ≥ 1 Foto-Aufgabe (Hinweis).
#   13. Die Insel: alle Insel-Dateien (spiele/insel.html, gemeinsam/insel-*.js, daten/insel*.json)
#       stehen in sw.js NACHLADEN (sonst fehlen sie offline).
#   14. Die Insel: daten/insel.json ist gültig (Karten, Gebiete, Vorlagen, IDs), und Bewohner-Plätze
#       stehen mindestens INSEL_ABSTAND (20) Blöcke auseinander.
#   16. Die Insel – Hochland: Schätze im Hochland, je mindestens 20 Blöcke auseinander und jeder in einem
#       eigenen Planquadrat; Landmarken, Auftraggeberin, Sammelstücke eindeutig.
#   15. Die Insel: daten/insel-auftraege.json – Bewohner (Platz, Look, eindeutige Merkmale), Warenkisten
#       und Paket-Orte im Hafendorf und je mindestens 20 Blöcke auseinander, Satzrahmen für alle Stufen.
#   17. Admin (Admin-Umbau ab Etappe 1): jede Datei unter gemeinsam/admin/module/ ist in admin.html
#       eingebunden (und umgekehrt), meldet sich mit LWAdmin.modul/altModul an (Teile stehen in admin.html), IDs eindeutig,
#       Bereiche gültig; store.js und module.js vor den Modulen, rahmen.js als letztes Admin-Skript.
#   18. App-Manifeste (Admin-Umbau Etappe 7): daten/apps/liste.json und daten/apps/<id>.json passen zusammen,
#       Datei der App existiert, Einstellungen haben gültigen Typ, eindeutigen Schlüssel und einen Standard,
#       der zu Typ und Grenzen passt; config-Pfade nur unter dorf./spiele.; Apps mit „ziel“ rufen
#       LernEinstellungen.anwenden('<id>' auf. Das Beispiel apps/vorlage/manifest-beispiel.json wird mitgeprüft.
#   19. Admin-gepflegte Dateien (Admin-Umbau Etappe 8): daten/katalog.json und daten/vokabeln*.json schreibt
#       der Admin (Commits „Admin: …“). Ändert ein anderer Commit eines Pull Requests sie, gelber Hinweis –
#       sonst könnte er Änderungen aus dem Admin überschreiben. Der Worker (cloudflare/dateien.js) darf nur
#       Dateien aus ADMIN_DATEIEN schreiben (Abgleich mit DATEIEN_ERLAUBT).
#   20. Aufgaben-Pools und Loot-Pool (Admin-Umbau Etappe 9): daten/aufgaben-pools.json – Pool-IDs eindeutig und
#       nicht schon in gemeinsam/aufgaben.js vergeben, Fach bekannt, Themen-ID im Katalog, jede Aufgabe hat Frage,
#       Antwort und genug Ablenker; ITEMS-Farbvarianten (basis/tausch) zeigen auf ein Teil ohne eigene Basis.
#   21. Rollen und Feature-Schalter (Admin-Umbau Etappe 10): daten/features.json gültig (IDs eindeutig), jeder Schalter
#       in config.featureSchalter steht dort (sonst gelb); Admin-Module mit rechte: nur 'haupt'/'kollege'.
#   22. English Journey (daten/journey*.json): Units und Stationen mit eindeutiger id und gültiger art, jedes thema/start
#       steht im Katalog (start ist thema selbst oder eine Stufe darunter; Stufen eines Baukasten-Themas stehen in seiner
#       Inhaltsdatei), jeder Vorgänger in braucht existiert, keine Schleife; das Finale braucht alle Stationen seiner Unit.
# ═══════════════════════════════════════════════════════
import gzip, json, math, os, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

# ⚙ Größenbudgets in KB, gemessen KOMPRIMIERT (gzip) – so liefert GitHub Pages aus, das ist
#   die Menge, die wirklich übers Schul-WLAN geht. Kommentare kosten dadurch fast nichts.
#   Bis v30 wurde die Dateigröße gemessen (alte Werte: 200 / 80 / 800 / 160 / 400 KB).
#   Faustregel: komprimiert ≈ ein Drittel der Dateigröße.
BUDGETS = {
    'startseite_skript': 65,    # alle <script src> von index.html zusammen (was beim Öffnen sofort lädt)
    'app_zusatz':        35,    # umgebung.js + navbar.js + navbar.js SOFORT (was jede App sofort lädt)
    'vorladen_sw':       300,   # alle Dateien aus sw.js START (Kern, lädt beim Update sofort)
    'einzeldatei':       55,    # jede eigene .html/.js (ohne vendor/)
    'datendatei':        130,   # jede .json in daten/
}
# Seiten ohne umgebung.js (liegen an beliebiger Adresse, relative Pfade gehen nicht)
OHNE_UMGEBUNG = {'404.html'}
# Lern-Apps/Spiele ohne navbar.js (bewusst) – hier eintragen, mit Grund
OHNE_NAVBAR = {
    'apps/englisch/english-dialog-vorlagen.html',   # Arbeitsblatt-Vorlagen, versteckt; Entscheidung in Etappe 3
    'apps/typen/live.html',                         # Live-Abfrage: schlanke Seite ohne Pass, navbar.js erst am Ende für die XP
}

fehler, hinweise, infos = [], [], []
def F(msg): fehler.append(msg)
def H(msg): hinweise.append(msg)
def I(msg): infos.append(msg)

def lies(p):
    return Path(p).read_text(encoding='utf-8')

def kb(n):
    return n / 1024

_gz = {}
def gz(p):
    """Komprimierte Größe in Bytes (gzip, Stufe 9 – wie ein Webserver ungefähr ausliefert)."""
    p = Path(p)
    if not p.is_file(): return 0
    if p not in _gz: _gz[p] = len(gzip.compress(p.read_bytes(), 9))
    return _gz[p]

ALLE = [p for p in ROOT.rglob('*') if p.is_file() and '.git' not in p.parts and 'node_modules' not in p.parts]
def rel(p): return p.relative_to(ROOT).as_posix()

# ── 1. JSON gültig ──────────────────────────────────────
for p in ALLE:
    if p.suffix in ('.json', '.webmanifest'):
        try: json.loads(p.read_text(encoding='utf-8'))
        except Exception as e: F(f'JSON ungültig: {rel(p)} – {e}')

# ── 2. Dateien aus config.json und sw.js existieren ─────
def lokal(datei):
    d = str(datei or '').split('#')[0].split('?')[0].strip()
    return '' if not d or d.startswith('http') else d

try:
    config = json.loads(lies('config.json'))
except Exception:
    config = {'apps': []}
config_dateien = set()
for a in config.get('apps', []):
    d = lokal(a.get('datei'))
    if not d: continue
    config_dateien.add(d)
    if not Path(d).is_file(): F(f'config.json: Datei fehlt: {d} („{a.get("name", "?")}“)')
# Regale (Etappe 6): jede App-Gruppe existiert und gehört zum selben Fach
_gr = {g.get('id'): g for g in (config.get('gruppen') or []) if isinstance(g, dict)}
for a in config.get('apps', []):
    g = a.get('gruppe')
    if g is not None:
        if g not in _gr: H(f'config.json: „{a.get("name", "?")}“ steht in unbekanntem Regal {g} (erscheint ohne Regal)')
        elif _gr[g].get('fach') != a.get('fach'): H(f'config.json: „{a.get("name", "?")}“ ist im Regal {g} eines anderen Fachs')

sw = lies('sw.js')
m = re.search(r'const START\s*=\s*\[(.*?)\];', sw, re.S)
start = re.findall(r"'([^']+)'", m.group(1)) if m else []
if not start: F('sw.js: Liste START nicht gefunden')
for d in start:
    if d in ('./',): continue
    if not Path(d).is_file(): F(f'sw.js START: Datei fehlt: {d}')

# ── 9. Ladekette: NACHLADEN und LW.laden ────────────────
m = re.search(r'const NACHLADEN\s*=\s*\[(.*?)\];', sw, re.S)
nachladen = re.findall(r"'([^']+)'", m.group(1)) if m else []
for d in nachladen:
    if not Path(d).is_file(): F(f'sw.js NACHLADEN: Datei fehlt: {d}')
    if d in start: H(f'sw.js: {d} steht in START und NACHLADEN')
# 13. Die Insel: jede Insel-Datei muss offline da sein
for p in [ROOT / 'spiele/insel.html'] + sorted(ROOT.glob('gemeinsam/insel-*.js')) + sorted(ROOT.glob('daten/insel*.json')):
    if p.is_file() and rel(p) not in nachladen: F(f'sw.js NACHLADEN: Insel-Datei fehlt in der Liste: {rel(p)}')
# 14. Die Insel: Weltdaten (daten/insel.json)
INSEL_ABSTAND = 20   # Mindestabstand der Bewohner-Plätze in Blöcken (Aktionsplan: Laufweg statt Durchprobieren)
if Path('daten/insel.json').is_file():
    try:
        insel = json.loads(lies('daten/insel.json'))
    except Exception as e:
        insel = None
        F(f'daten/insel.json ist kein gültiges JSON ({e})')
    if insel is not None:
        n, hoch = insel.get('groesse', 96), insel.get('hoehe', 24)
        bloecke = set(re.findall(r'\b([A-Z_]+):\s*\d+', (re.search(r'const BLOCK = \{(.*?)\};', lies('gemeinsam/insel-welt.js'), re.S) or [None, ''])[1]))
        hk, gk = insel.get('hoehen') or [], insel.get('gebietskarte') or []
        if len(hk) != n or any(len(z) != n or any(c not in '0123456789abcdefghijklmn'[:hoch] for c in z) for z in hk):
            F(f'daten/insel.json: "hoehen" braucht {n} Zeilen mit je {n} Zeichen 0–9/a–n')
        geb = insel.get('gebiete') or []
        gids = [g.get('id') for g in geb]
        zeichen = {g.get('zeichen') for g in geb}
        if len(set(gids)) != len(gids) or not all(isinstance(i, str) and re.fullmatch(r'[a-z0-9-]+', i) for i in gids):
            F('daten/insel.json: Gebiets-IDs fehlen, sind doppelt oder ungültig (klein, Ziffern, „-“)')
        if len(gk) != n or any(len(z) != n or any(c != '.' and c not in zeichen for c in z) for z in gk):
            F(f'daten/insel.json: "gebietskarte" braucht {n} Zeilen mit je {n} Zeichen (Gebietszeichen oder „.“)')
        if 'hafen' not in gids: F('daten/insel.json: Startgebiet „hafen“ fehlt')
        def im_feld(o, wo):
            if not all(isinstance(o.get(k), (int, float)) and 0 <= o.get(k) < n for k in ('x', 'z')):
                F(f'daten/insel.json: {wo} liegt nicht auf der Insel (x, z zwischen 0 und {n - 1})'); return False
            return True
        vorl = insel.get('vorlagen') or {}
        for name, v in vorl.items():
            for k in ('wand', 'ecke', 'dach', 'boden'):
                if k in v and v[k] not in bloecke: F(f'daten/insel.json: Vorlage „{name}“: unbekannter Block {v[k]}')
        alle_ids = {}
        def neue_id(art, i):
            if not isinstance(i, str) or not re.fullmatch(r'[a-z0-9-]+', i): F(f'daten/insel.json: {art}: ungültige ID „{i}“'); return
            if (art, i) in alle_ids: F(f'daten/insel.json: {art}: ID doppelt: {i}')
            alle_ids[(art, i)] = 1
        bau = {}
        for g in insel.get('gebaeude') or []:
            neue_id('Gebäude', g.get('id')); im_feld(g, f'Gebäude {g.get("id")}')
            if g.get('vorlage') not in vorl: F(f'daten/insel.json: Gebäude {g.get("id")}: Vorlage „{g.get("vorlage")}“ fehlt')
            for k in ('wand', 'ecke', 'dach', 'boden'):
                if k in g and g[k] not in bloecke: F(f'daten/insel.json: Gebäude {g.get("id")}: unbekannter Block {g[k]}')
            if g.get('tuer', 'sued') not in ('nord', 'sued', 'west', 'ost'): F(f'daten/insel.json: Gebäude {g.get("id")}: tuer nord/sued/west/ost')
            bau[g.get('id')] = g
        orte = []
        for p_ in insel.get('plaetze') or []:
            neue_id('Platz', p_.get('id'))
            if p_.get('gebaeude'):
                g = bau.get(p_['gebaeude'])
                if not g: F(f'daten/insel.json: Platz {p_.get("id")}: Gebäude „{p_["gebaeude"]}“ fehlt'); continue
                v = vorl.get(g.get('vorlage'), {})
                b, tf = v.get('breite', 5), v.get('tiefe', 5)
                ax, az = {'nord': (0, -1), 'sued': (0, 1), 'west': (-1, 0), 'ost': (1, 0)}.get(g.get('tuer', 'sued'), (0, 1))
                x, z = g['x'] + ax * ((b - 1) / 2 + 2.2), g['z'] + az * ((tf - 1) / 2 + 2.2)
            elif im_feld(p_, f'Platz {p_.get("id")}'):
                x, z = p_['x'], p_['z']
            else: continue
            orte.append((p_.get('id'), x, z))
        for i in range(len(orte)):
            for j in range(i + 1, len(orte)):
                d = math.hypot(orte[i][1] - orte[j][1], orte[i][2] - orte[j][2])
                if d < INSEL_ABSTAND:
                    F(f'daten/insel.json: Bewohner-Plätze „{orte[i][0]}“ und „{orte[j][0]}“ nur {d:.0f} Blöcke auseinander (mindestens {INSEL_ABSTAND})')
        for art, liste in (('Bauplatz', insel.get('bauplaetze')), ('Schild', insel.get('schilder')), ('Steg', insel.get('stege'))):
            for o in liste or []:
                neue_id(art, o.get('id'))
                if art != 'Steg': im_feld(o, f'{art} {o.get("id")}')
                if art == 'Bauplatz' and o.get('gebiet') not in gids: F(f'daten/insel.json: Bauplatz {o.get("id")}: unbekanntes Gebiet „{o.get("gebiet")}“')
                if art == 'Bauplatz' and o.get('plan'):
                    pl = o['plan']
                    if pl.get('art') not in ('rand', 'flaeche', 'muster'): F(f'daten/insel.json: Bauplatz {o.get("id")}: Bauplan-Art „{pl.get("art")}“ unbekannt (rand, flaeche, muster)')
                    for blk in [pl.get('block')] + [b[3] for b in pl.get('bloecke') or [] if isinstance(b, list) and len(b) == 4]:
                        if blk is not None and blk not in bloecke: F(f'daten/insel.json: Bauplatz {o.get("id")}: unbekannter Block {blk} im Bauplan')
                if art == 'Bauplatz' and o.get('vorrat', '') not in ('', 'frei'): F(f'daten/insel.json: Bauplatz {o.get("id")}: vorrat nur "frei" oder weglassen')
                if art == 'Schild' and not str(o.get('text', '')).strip(): F(f'daten/insel.json: Schild {o.get("id")}: Text fehlt')
        for a in insel.get('absperrungen') or []:
            if a.get('gebiet') not in gids: F(f'daten/insel.json: Absperrung mit unbekanntem Gebiet „{a.get("gebiet")}“')
        st = insel.get('start') or {}
        if im_feld(st, 'Start') and len(gk) == n:
            zg = gk[int(st['z'])][int(st['x'])]
            if not any(g.get('zeichen') == zg and g.get('offen') for g in geb): F('daten/insel.json: Start liegt nicht in einem offenen Gebiet')
        I(f'Die Insel: {len(geb)} Gebiete, {len(orte)} Bewohner-Plätze (Abstand ≥ {INSEL_ABSTAND}), {len(insel.get("bauplaetze") or [])} Bauplätze')
# 15. Die Insel: Auftrags-Bausteine (daten/insel-auftraege.json)
if Path('daten/insel-auftraege.json').is_file() and Path('daten/insel.json').is_file():
    wo = 'daten/insel-auftraege.json'
    try:
        ia = json.loads(lies(wo)); ins = json.loads(lies('daten/insel.json'))
    except Exception as e:
        ia = None
        F(f'{wo} ist kein gültiges JSON ({e})')
    if ia is not None:
        inh = json.loads(lies('daten/lernwelt-inhalte.json'))
        av = inh.get('AVATAR', {})
        item_ids = {i.get('id') for i in inh.get('ITEMS', []) if isinstance(i, dict)}
        frisuren = {f.get('id') for f in av.get('FRISUREN', [])}
        plaetze = {q.get('id') for q in ins.get('plaetze') or []}
        gk = ins.get('gebietskarte') or []
        hafen_z = next((g.get('zeichen') for g in ins.get('gebiete') or [] if g.get('id') == ia.get('gebiet', 'hafen')), 'h')
        merkmal_von = {}
        ids = set()
        for b in ia.get('bewohner') or []:
            bid = b.get('id')
            if bid in ids: F(f'{wo}: Bewohner-ID doppelt: {bid}')
            ids.add(bid)
            if b.get('platz') not in plaetze: F(f'{wo}: Bewohner {bid}: Platz „{b.get("platz")}“ fehlt in daten/insel.json')
            for k in ('name', 'typ', 'er', 'ihn'):
                if not b.get(k): F(f'{wo}: Bewohner {bid}: „{k}“ fehlt')
            look = b.get('look') or {}
            if look.get('frisur') not in frisuren: F(f'{wo}: Bewohner {bid}: unbekannte Frisur „{look.get("frisur")}“')
            if not (0 <= int(look.get('haut', 0)) < len(av.get('HAUT', [])) and 0 <= int(look.get('haarfarbe', 0)) < len(av.get('HAARFARBEN', []))):
                F(f'{wo}: Bewohner {bid}: Haut- oder Haarfarbe außerhalb der Liste')
            for slot, item in (look.get('eq') or {}).items():
                if item not in item_ids: F(f'{wo}: Bewohner {bid}: unbekanntes Teil „{item}“ ({slot})')
            if not b.get('merkmale'): F(f'{wo}: Bewohner {bid}: keine Merkmale')
            for m in b.get('merkmale') or []:
                if m in merkmal_von and merkmal_von[m] != bid:
                    F(f'{wo}: Merkmal „{m}“ bei {merkmal_von[m]} und {bid} – „find the … with {m}“ wäre nicht eindeutig')
                merkmal_von[m] = bid
        for art in ('quellen', 'suchorte'):
            liste = ia.get(art) or []
            for o in liste:
                x, z = o.get('x'), o.get('z')
                if not (isinstance(x, int) and isinstance(z, int) and 0 <= z < len(gk) and 0 <= x < len(gk[z])):
                    F(f'{wo}: {art} {o.get("id")}: x/z fehlen oder liegen nicht auf der Insel'); continue
                if gk[z][x] != hafen_z: F(f'{wo}: {art} {o.get("id")}: liegt nicht im Hafendorf')
                for s in ('1', '2', '3'):
                    if not (o.get('ort') or {}).get(s): F(f'{wo}: {art} {o.get("id")}: Ortsangabe für Stufe {s} fehlt')
                if art == 'quellen' and not (o.get('eins') and o.get('viele')): F(f'{wo}: Kiste {o.get("id")}: „eins“/„viele“ fehlt')
            for i in range(len(liste)):
                for j in range(i + 1, len(liste)):
                    d = math.hypot(liste[i]['x'] - liste[j]['x'], liste[i]['z'] - liste[j]['z'])
                    if d < INSEL_ABSTAND: F(f'{wo}: {art} „{liste[i]["id"]}“ und „{liste[j]["id"]}“ nur {d:.0f} Blöcke auseinander (mindestens {INSEL_ABSTAND})')
        erlaubt = {'typ', 'er', 'Er', 'ihn', 'm', 'm2', 'ort', 'ort3', 'kl', 'n', 'dinge', 'viele', 'qort', 'port', 'k', 'name'}
        for art, stufen in (ia.get('saetze') or {}).items():
            for s in ('1', '2', '3'):
                if not stufen.get(s): F(f'{wo}: Satzrahmen „{art}“ für Stufe {s} fehlen')
                for satz in stufen.get(s) or []:
                    for ph in re.findall(r'\{(\w+)\}', satz):
                        if ph not in erlaubt: F(f'{wo}: unbekannter Platzhalter {{{ph}}} in „{satz}“')
        # Baumeister-Tal (Etappe 5)
        tal = ia.get('tal') or {}
        if tal:
            ins_bloecke = set(re.findall(r'\b([A-Z_0-9]+):\s*\d+', (re.search(r'const BLOCK = \{(.*?)\};', lies('gemeinsam/insel-welt.js'), re.S) or [None, ''])[1]))
            tids = set()
            for b in tal.get('bewohner') or []:
                if b.get('platz') not in plaetze: F(f'{wo}: Tal-Bewohner {b.get("id")}: Platz „{b.get("platz")}“ fehlt in daten/insel.json')
                if b.get('id') in ids or b.get('id') in tids: F(f'{wo}: Bewohner-ID doppelt: {b.get("id")}')
                tids.add(b.get('id'))
                for slot, item in ((b.get('look') or {}).get('eq') or {}).items():
                    if item not in item_ids: F(f'{wo}: Tal-Bewohner {b.get("id")}: unbekanntes Teil „{item}“')
            for k in ('auftraggeber', 'haendler'):
                if tal.get(k) not in tids: F(f'{wo}: tal.{k} „{tal.get(k)}“ ist kein Tal-Bewohner')
            for k, v in (tal.get('preise') or {}).items():
                if k not in ins_bloecke: F(f'{wo}: tal.preise: unbekannter Block {k}')
                if not (isinstance(v, int) and 0 < v <= 20): F(f'{wo}: tal.preise.{k}: ganze Euro 1–20 (kopfrechentauglich)')
                if k not in (tal.get('namen') or {}): F(f'{wo}: tal.namen: Name für {k} fehlt')
            for art in ('zaun', 'felder', 'lager', 'haendler'):
                for s in ('1', '2', '3'):
                    if not ((tal.get('saetze') or {}).get(art) or {}).get(s): F(f'{wo}: tal.saetze.{art} für Stufe {s} fehlt')
            if tal.get('faehre', {}).get('geber') not in ids: F(f'{wo}: tal.faehre.geber ist kein Bewohner des Hafendorfs')
            for bp in ins.get('bauplaetze') or []:
                for feld in ('material', 'frei'):
                    for n in bp.get(feld) or []:
                        if n not in ins_bloecke: F(f'daten/insel.json: Bauplatz {bp.get("id")}: unbekannter Block {n} in {feld}')
                for n in (bp.get('verbrauch') or {}):
                    if n not in ins_bloecke: F(f'daten/insel.json: Bauplatz {bp.get("id")}: unbekannter Block {n} in verbrauch')
            for need in ('weide', 'felder', 'lager', 'bruecke-hochland'):
                if need not in {bp.get('id') for bp in ins.get('bauplaetze') or []}: F(f'daten/insel.json: Bauplatz „{need}“ fehlt (Tal-Aufträge)')
        # Kartenleser-Hochland (Etappe 6)
        hl = ia.get('hochland') or {}
        if hl:
            ra = ins.get('raster') or {}
            if not all(isinstance(ra.get(k), int) and ra.get(k) > 0 for k in ('groesse', 'spalten', 'zeilen')): F('daten/insel.json: "raster" (Planquadrate) fehlt oder ist unvollständig')
            hk = next((g.get('zeichen') for g in ins.get('gebiete') or [] if g.get('id') == hl.get('gebiet', 'hochland')), 'k')
            sch = hl.get('schaetze') or []
            felder = set()
            for s in sch:
                x, z = s.get('x'), s.get('z')
                if not (isinstance(x, int) and isinstance(z, int) and 0 <= z < len(gk) and 0 <= x < len(gk[z]) and gk[z][x] == hk):
                    F(f'{wo}: Schatz {s.get("id")} liegt nicht im Hochland'); continue
                if ra:
                    fld = (x - ra.get('x0', 0)) // ra['groesse'], (z - ra.get('z0', 0)) // ra['groesse']
                    if not (0 <= fld[0] < ra['spalten'] and 0 <= fld[1] < ra['zeilen']): F(f'{wo}: Schatz {s.get("id")} liegt außerhalb der Planquadrate')
                    if fld in felder: F(f'{wo}: zwei Schätze im selben Planquadrat ({s.get("id")}) – „im Planquadrat …“ wäre nicht eindeutig')
                    felder.add(fld)
            for i in range(len(sch)):
                for j in range(i + 1, len(sch)):
                    d = math.hypot(sch[i]['x'] - sch[j]['x'], sch[i]['z'] - sch[j]['z'])
                    if d < INSEL_ABSTAND: F(f'{wo}: Schätze „{sch[i]["id"]}“ und „{sch[j]["id"]}“ nur {d:.0f} Blöcke auseinander (mindestens {INSEL_ABSTAND})')
            for b in hl.get('bewohner') or []:
                if b.get('platz') not in plaetze: F(f'{wo}: Hochland-Bewohner {b.get("id")}: Platz „{b.get("platz")}“ fehlt')
            if hl.get('auftraggeber') not in {b.get('id') for b in hl.get('bewohner') or []}: F(f'{wo}: hochland.auftraggeber ist kein Hochland-Bewohner')
            for lm in hl.get('landmarken') or []:
                if not (lm.get('von') and lm.get('name') and isinstance(lm.get('x'), int)): F(f'{wo}: Landmarke {lm.get("id")}: von, name, x, z nötig')
            fid = [f.get('id') for f in hl.get('funde') or []]
            if len(set(fid)) != len(fid): F(f'{wo}: Sammelstück-IDs doppelt')
        I(f'Die Insel – Aufträge: {len(ia.get("bewohner") or [])} Bewohner, {len(ia.get("quellen") or [])} Warenkisten, {len(ia.get("suchorte") or [])} Paket-Orte'
          + (f', Tal: {len(tal.get("bewohner") or [])} Bewohner, {len(tal.get("preise") or {})} Waren' if tal else ''))
for p in ALLE:
    if p.suffix not in ('.js', '.html') or rel(p).startswith('vendor/'): continue
    for d in re.findall(r"LW\.laden\(\s*'([^']+)'", p.read_text(encoding='utf-8')):
        if not Path(d).is_file(): F(f'{rel(p)}: LW.laden(\'{d}\') – Datei fehlt')

# ── 3./4. umgebung.js und navbar.js ─────────────────────
SCRIPT_SRC = re.compile(r'<script\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\']', re.I)
SCRIPT_ANY = re.compile(r'<script\b', re.I)
for p in sorted(ROOT.rglob('*.html')):
    r = rel(p)
    if '.git' in p.parts or r in OHNE_UMGEBUNG or r.startswith('archiv/'): continue   # archiv/: abgelegt, nicht verlinkt
    t = p.read_text(encoding='utf-8')
    tiefe = r.count('/')
    soll = '../' * tiefe + 'gemeinsam/umgebung.js'
    erstes = SCRIPT_ANY.search(t)
    m1 = SCRIPT_SRC.search(t)
    if not erstes or not m1 or m1.start() != erstes.start() or m1.group(1) != soll:
        F(f'{r}: gemeinsam/umgebung.js fehlt oder ist nicht das erste Skript (erwartet: <script src="{soll}">)')
    if (r.startswith('apps/') or r.startswith('spiele/')) and r not in OHNE_NAVBAR and 'LW-WEITERLEITUNG' not in t:
        # direkt per <script src> oder nachgeladen ('…/gemeinsam/navbar.js' im Code)
        if not re.search(r'["\'][^"\']*gemeinsam/navbar\.js["\']', t):
            F(f'{r}: bindet navbar.js nicht ein (Pass, Dorf, Ergebnisse fehlen)')

# ── 5. Version ──────────────────────────────────────────
umg = lies('gemeinsam/umgebung.js')
v_umg = re.search(r"const VERSION\s*=\s*'([^']+)'", umg)
v_sw = re.search(r"const VERSION\s*=\s*'([^']+)'", sw)
if not v_umg or not v_sw:
    F('VERSION nicht gefunden (gemeinsam/umgebung.js oder sw.js)')
elif v_umg.group(1) != v_sw.group(1):
    F(f'Version passt nicht: umgebung.js {v_umg.group(1)} ≠ sw.js {v_sw.group(1)} – beide gleich erhöhen')
else:
    I(f'Version: {v_sw.group(1)}')

# ── 6. Speicher-Register ────────────────────────────────
REG = re.compile(r"\[\s*'([^']+)'\s*,\s*'(local|session)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*(true|false)\s*\]")
register = {}
for key, art, datei, zweck, syn in REG.findall(umg):
    if key in register: F(f'Speicher-Register: Schlüssel doppelt: {key}')
    register[key] = datei
    if datei and not Path(datei).is_file(): H(f'Speicher-Register: Besitzer-Datei fehlt: {datei} ({key})')
if not register: F('Speicher-Register in gemeinsam/umgebung.js nicht gefunden')

im_code = {}   # key -> Dateien
MUSTER = [
    re.compile(r"(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*['\"]([^'\"]+)['\"]"),
    re.compile(r"\b(?:const|let|var)\s+[A-Z0-9_]*(?:KEY|SPEICHER|STORE)[A-Z0-9_]*\s*=\s*['\"]([^'\"]+)['\"]"),
    re.compile(r",\s*[A-Z0-9_]*(?:KEY|SPEICHER|STORE)[A-Z0-9_]*\s*=\s*['\"]([^'\"]+)['\"]"),
    re.compile(r"\b(?:const|let|var)\s+CONTENT_CACHE\s*=\s*['\"]([^'\"]+)['\"]"),
]
NICHT_SPEICHER = {'expedition.html', 'kitchen-chaos.html', 'tauziehen.html', 'wort-des-tages.html', 'zauberwort.html', 'room-detective.html'}  # APP_KEY = Dateiname
for p in ALLE:
    r = rel(p)
    if p.suffix not in ('.js', '.html') or r.startswith('vendor/') or r.startswith('cloudflare/') or r == 'gemeinsam/umgebung.js' or r == 'sw.js':
        continue
    t = p.read_text(encoding='utf-8')
    for mu in MUSTER:
        for k in mu.findall(t):
            if k in NICHT_SPEICHER or k.endswith('.html'): continue
            im_code.setdefault(k, set()).add(r)
for k, wo in sorted(im_code.items()):
    if k not in register:
        F(f'Speicherschlüssel „{k}“ fehlt im Speicher-Register (gemeinsam/umgebung.js) – benutzt in: {", ".join(sorted(wo))}')
for k in register:
    if k not in im_code and register[k] != 'gemeinsam/umgebung.js':   # umgebung.js nutzt seine Schlüssel selbst
        H(f'Speicher-Register: „{k}“ wird im Code nicht (mehr) gefunden')
I(f'Speicher-Register: {len(register)} Schlüssel')

# ── 8. Inhalts-Katalog ──────────────────────────────────
KID = re.compile(r'^[a-z]+(?:\.[a-z0-9-]+)+$')
faecher_shared = set(re.findall(r'^\s*"([^"]+)"\s*:\s*\{\s*icon', lies('gemeinsam/shared.js'), re.M))
try:
    katalog = json.loads(lies('daten/katalog.json'))
except Exception as e:
    katalog = None
    F(f'daten/katalog.json fehlt oder ist ungültig ({e})')
if katalog is not None:
    ids, inhalte, ergebnisse, app_themen = {}, {}, {}, set()
    def neu_id(i, wo):
        if not isinstance(i, str) or not KID.fullmatch(i): F(f'Katalog: ungültige ID „{i}“ ({wo}) – erlaubt: kleine Buchstaben, Ziffern, „-“, Teile mit „.“'); return False
        if i in ids: F(f'Katalog: ID doppelt: {i}'); return False
        ids[i] = wo; return True
    for f in katalog.get('faecher', []):
        fid, fname = f.get('id'), f.get('name')
        if fname not in faecher_shared: F(f'Katalog: Fach „{fname}“ steht nicht in gemeinsam/shared.js (CAT_STYLES)')
        for b in f.get('bereiche', []):
            if not str(b.get('id', '')).startswith(f'{fid}.'): F(f'Katalog: Bereich {b.get("id")} beginnt nicht mit „{fid}.“')
            for th in b.get('themen', []):
                tid = th.get('id')
                if not neu_id(tid, b.get('id')): continue
                if not tid.startswith(f'{fid}.'): F(f'Katalog: {tid} beginnt nicht mit dem Fach „{fid}.“')
                if not th.get('titel'): F(f'Katalog: {tid} hat keinen Titel')
                if not isinstance(th.get('klasse'), int) or not 1 <= th['klasse'] <= 13: F(f'Katalog: {tid} hat keine gültige Klasse')
                app = (th.get('quelle') or {}).get('app')
                if app:
                    if not Path(app).is_file(): F(f'Katalog: Quelle von {tid} fehlt: {app}')
                    app_themen.add(app)
                for e in th.get('ergebnis', []):
                    if e in ergebnisse: F(f'Katalog: Ergebnis-Schlüssel {e} doppelt ({ergebnisse[e]} und {tid})')
                    ergebnisse[e] = tid
                    if not any(p.name == e for p in list(ROOT.glob('apps/*/*.html')) + list(ROOT.glob('archiv/*.html'))): F(f'Katalog: Ergebnis-Schlüssel {e} ({tid}) ist keine App-Datei')
                for s in th.get('stufen', []):                      # Etappe 4: Stufen können eine eigene Quelle haben
                    sapp = (s.get('quelle') or {}).get('app')
                    if sapp:
                        if not Path(sapp).is_file(): F(f'Katalog: Quelle von {s.get("id")} fehlt: {sapp}')
                        app_themen.add(sapp)
                knoten = [(tid, th)] + [(s.get('id'), s) for s in th.get('stufen', [])]
                for sid, s in knoten[1:]:
                    if neu_id(sid, tid) and not sid.startswith(tid + '.'): F(f'Katalog: Stufe {sid} beginnt nicht mit „{tid}.“')
                    if not s.get('titel'): F(f'Katalog: Stufe {sid} hat keinen Titel')
                for sid, s in knoten:
                    inh = s.get('inhalt')
                    if inh:
                        if inh in inhalte: F(f'Katalog: Inhalt-ID {inh} doppelt ({inhalte[inh]} und {sid})')
                        inhalte[inh] = sid
    for d in sorted(config_dateien):
        if d.startswith('apps/') and d not in app_themen:
            F(f'Katalog: {d} steht in config.json, hat aber kein Thema in daten/katalog.json')
    # Etappe 3: Lehrplanbezug, Dauer, Einsatzidee (gelb, wenn ein Thema mit App keinen Lehrplanbezug hat)
    for f in katalog.get('faecher', []):
        for b in f.get('bereiche', []):
            for th in b.get('themen', []):
                if not str(th.get('lehrplan') or '').strip():
                    H(f'Katalog: {th.get("id")} hat noch keinen Lehrplanbezug (Feld lehrplan)')
    I(f'Katalog: {len(ids)} Themen und Stufen, {len(app_themen)} Apps zugeordnet')
    katalog_ids = set(ids)                       # „ids“ wird weiter unten anders verwendet
    # Etappe 7: Freigaben verweisen auf Katalog-IDs (gelb – ein Tippfehler sperrt nur nichts)
    for t in (config.get('freigaben') or {}):
        if t not in ids: H(f'config.json: Freigabe für unbekannte Themen-ID {t} (wirkt nicht)')
    # Die Insel (Etappe 7): Stufen und Bauaufträge hängen an Freigaben von Katalog-Themen
    try:
        ia_fg = json.loads(lies('daten/insel-auftraege.json')).get('freigaben') or {}
    except Exception:
        ia_fg = {}
    for g, zuordnung in ia_fg.items():
        for k, t in (zuordnung or {}).items():
            if t not in ids: F(f'daten/insel-auftraege.json: freigaben.{g}.{k} nennt unbekannte Themen-ID {t}')
            if g == 'hafen' and k == '1': F('daten/insel-auftraege.json: Stufe 1 im Hafendorf darf nicht gesperrt werden')
    if 'allg.5.insel' not in ids: F('Katalog: Thema allg.5.insel (Die Insel) fehlt – spiele/insel.html fragt seine Freigabe ab')

# ── 10. Kopfrechnen-Stufen (Etappe 4) ───────────────────
try:
    kr = json.loads(lies('daten/kopfrechnen.json'))
except Exception as e:
    kr = None; F(f'daten/kopfrechnen.json fehlt oder ist ungültig ({e})')
if kr is not None:
    typen = set(re.findall(r"'([a-z0-9-]+)':", lies('gemeinsam/generatoren-mathe.js').split('const G = {')[1].split('};')[0]))
    for sid, st in (kr.get('stufen') or {}).items():
        if katalog is not None and sid not in ids: F(f'kopfrechnen.json: Stufe {sid} fehlt in daten/katalog.json')
        gens = st.get('generatoren') or []
        if not gens: F(f'kopfrechnen.json: Stufe {sid} hat keine Generatoren')
        for g in gens:
            if g.get('typ') not in typen: F(f'kopfrechnen.json: Stufe {sid} nutzt unbekannten Generator „{g.get("typ")}“ (gemeinsam/generatoren-mathe.js)')
    apps_kr = kr.get('apps') or {'kopfrechnen': {'klassen': kr.get('klassen') or {}}}
    for an, ad in apps_kr.items():
        for k, kl in (ad.get('klassen') or {}).items():
            for sid in (kl.get('stufen') or []) + (kl.get('foerder') or []):
                if sid not in (kr.get('stufen') or {}): F(f'kopfrechnen.json: {an} Klasse {k} nennt unbekannte Stufe {sid}')
    I(f'Kopfrechnen: {len(kr.get("stufen") or {})} Stufen, {len(typen)} Generatoren')

# ── 11. Wortlisten (Etappe 5) ───────────────────────────
for p in sorted(ROOT.glob('daten/vokabeln*.json')):
    try: v = json.loads(p.read_text(encoding='utf-8'))
    except Exception: continue                      # Gültigkeit prüft Abschnitt 1
    for gruppe in ('units', 'specialLists'):
        for k, u in (v.get(gruppe) or {}).items():
            t = u.get('thema')
            if not t: H(f'{rel(p)}: {gruppe}.{k} hat keine Themen-ID (Feld thema)')
            elif katalog is not None and t not in ids: F(f'{rel(p)}: {gruppe}.{k} nennt unbekannte Themen-ID {t}')

# ── 12. Inhaltsdateien des Aufgabentyp-Baukastens (Etappe 9) ──
#  daten/inhalte/<fach>/<Themen-ID>.json, gezeigt von apps/typen/uebung.html?inhalt=<Themen-ID>.
#  Format je Typ: Kopf der Datei gemeinsam/typen/<typ>.js.
_tj = lies('gemeinsam/typen.js') if Path('gemeinsam/typen.js').is_file() else ''
_m = re.search(r"const NAMEN = \[(.*?)\];", _tj)
TYPEN = re.findall(r"'([a-z]+)'", _m.group(1)) if _m else []
if _tj and not TYPEN: F('gemeinsam/typen.js: Liste NAMEN nicht gefunden')
for t in TYPEN:
    if not Path(f'gemeinsam/typen/{t}.js').is_file(): F(f'Aufgabentyp {t}: gemeinsam/typen/{t}.js fehlt')
def _texte(l, n=1): return isinstance(l, list) and len(l) >= n and all(isinstance(x, str) and x.strip() for x in l)
def pruefe_aufgaben(FI, wo, typ, auf):
    """Typen mit einer Liste "aufgaben" (auch für Aufgaben mit eigenem Typ)"""
    if typ == 'sortieren':
        if not auf or not all(isinstance(x, dict) and _texte(x.get('teile'), 2) for x in auf): FI(f'{wo}: aufgaben mit mindestens 2 teilen nötig')
    elif typ == 'lueckentext':
        for x in auf or [None]:
            if not isinstance(x, dict) or not re.search(r'_{2,}', str(x.get('text', ''))) or not x.get('antwort'):
                FI(f'{wo}: jede Aufgabe braucht text mit ___ und antwort'); break
            ant = x['antwort'] if isinstance(x['antwort'], list) else [x['antwort']]
            if x.get('optionen') and not any(a in x['optionen'] for a in ant): FI(f'{wo}: Antwort „{ant[0]}“ fehlt in optionen')
    elif typ == 'eingabe':
        if not auf or not all(isinstance(x, dict) and x.get('frage') and x.get('antwort') not in (None, '', []) for x in auf): FI(f'{wo}: jede Aufgabe braucht frage und antwort')
    elif typ == 'markieren':
        for x in auf or [None]:
            if not isinstance(x, dict) or len(re.findall(r'\[[^\]]+\]', str(x.get('satz', '')))) != 1:
                FI(f'{wo}: jede Aufgabe braucht einen satz mit genau einer [Markierung]'); break
inhalt_ids = set()
for p in sorted(ROOT.glob('daten/inhalte/*/*.json')):
    r = rel(p)
    try: d = json.loads(p.read_text(encoding='utf-8'))
    except Exception: continue                                   # Gültigkeit prüft Abschnitt 1
    tid, typ = d.get('thema'), d.get('typ')
    def FI(msg): F(f'{r}: {msg}')
    if typ not in TYPEN and typ != 'gemischt': FI(f'unbekannter Typ „{typ}“ (erlaubt: {", ".join(TYPEN)}, gemischt)')
    if tid != p.stem: FI(f'thema „{tid}“ muss gleich dem Dateinamen sein')
    if not str(tid or '').startswith(p.parent.name + '.'): FI(f'thema muss mit dem Ordner „{p.parent.name}.“ beginnen')
    inhalt_ids.add(p.stem)
    if katalog is not None and tid not in ids: FI(f'Themen-ID {tid} fehlt in daten/katalog.json')
    if not d.get('titel'): FI('titel fehlt')
    if not isinstance(d.get('klasse'), int): FI('klasse fehlt')
    for h_ in d.get('hilfe') or []:                              # Methodenkarten in „So geht's“
        k_ = h_.get('karte') if isinstance(h_, dict) else None
        if k_ is not None and not (isinstance(k_, dict) and k_.get('nr') not in (None, '') and re.fullmatch(r'#[0-9a-fA-F]{6}', str(k_.get('farbe', '')))):
            FI('hilfe: karte braucht nr und farbe im Format #rrggbb')
    stufen = d.get('stufen')
    if not isinstance(stufen, list) or not stufen: FI('keine stufen'); continue
    fall_stufen = {s.get('id') for s in stufen if isinstance(s, dict) and not s.get('mix') and (s.get('typ') or typ) == 'fall'}
    stufen_ids = {s.get('id') for s in stufen if isinstance(s, dict)}
    if d.get('nurMitFoto'):                                      # Hinweis: Stufen, die dadurch ganz wegfallen
        for s in stufen:
            if isinstance(s, dict) and not s.get('mix') and not any(isinstance(x, dict) and re.search(r'\.(png|jpe?g|webp)$', str(x.get('bild', '')), re.I) for x in s.get('aufgaben') or []):
                H(f'{r}: Stufe {s.get("id")} hat kein Foto – mit nurMitFoto erscheint sie nicht')
    for st in stufen:
        sid = st.get('id') if isinstance(st, dict) else None
        wo = f'Stufe {sid}'
        if not sid or not str(sid).startswith(str(tid) + '.'): FI(f'{wo}: id muss mit „{tid}.“ beginnen'); continue
        if katalog is not None and sid not in ids: FI(f'{wo} fehlt in daten/katalog.json')
        if not st.get('titel'): FI(f'{wo}: titel fehlt')
        if st.get('gesperrt') not in (None, True, False): FI(f'{wo}: gesperrt muss true oder false sein')   # Quellen-Detektiv Etappe 4
        if st.get('checkpoint') and not st.get('mix'): FI(f'{wo}: checkpoint gibt es nur bei Mix-Stufen (mix: true)')      # Lernpfad
        if st.get('schwelle') is not None and not (isinstance(st['schwelle'], int) and 1 <= st['schwelle'] <= 100): FI(f'{wo}: schwelle muss 1–100 sein')
        if st.get('abschnitt') is not None and not str(st['abschnitt']).strip(): FI(f'{wo}: abschnitt ist leer')
        for x in st.get('aufgaben') or []:
            if isinstance(x, dict) and x.get('nach') is not None and (x['nach'] not in stufen_ids or x['nach'] == sid):
                FI(f'{wo}: „nach“ muss eine andere Stufe dieser Datei nennen (nicht „{x["nach"]}“)')
        if st.get('mix'):                                        # Neue Lern-Apps Etappe 6: Mix-Stufe
            for a_ in st.get('aus') or []:
                if a_ in fall_stufen: H(f'{r}: {wo}: aus nennt den ganzen Fall {a_} – Fälle kommen nie in einen Mix')
                if not isinstance(a_, str) or not KID.fullmatch(a_): FI(f'{wo}: aus enthält ungültige ID „{a_}“')
                elif katalog is not None and a_ not in ids: FI(f'{wo}: aus nennt {a_}, das nicht im Katalog steht')
            continue
        styp = st.get('typ') or typ
        if styp not in TYPEN: FI(f'{wo}: unbekannter Typ „{styp}“'); continue
        auf = st.get('aufgaben')
        for x in (auf if isinstance(auf, list) else []):                # Quelle je Aufgabe (Quellen-Detektiv)
            if not isinstance(x, dict) or not (x.get('bild') or x.get('quelltext')): continue
            xt = x.get('typ') or styp
            if xt not in ('zuordnen', 'sortieren', 'lueckentext', 'markieren', 'eingabe', 'fall'): FI(f'{wo}: bild/quelltext gibt es nur bei zuordnen, sortieren, lueckentext, markieren, eingabe, fall')
            if xt == 'eingabe' and isinstance(x.get('antwort'), (int, float)): H(f'{r}: {wo}: Zahl-Aufgabe mit Quelle – die Quelle wird bei der Zifferntastatur nicht gezeigt')
            b_ = x.get('bild')
            if b_:
                if not re.fullmatch(r'[a-z0-9_-]+\.(svg|png|jpg|webp)', str(b_), re.I): FI(f'{wo}: Bildname „{b_}“ ungültig (nur Buchstaben, Ziffern, - und _, Endung svg/png/jpg/webp)')
                elif not (p.parent / str(b_)).is_file(): FI(f'{wo}: Bild {b_} fehlt neben der Inhaltsdatei')
                elif not str(b_).lower().endswith('.svg') and not str(x.get('nachweis', '')).strip(): FI(f'{wo}: Foto {b_} braucht einen „nachweis“ (Urheber, Lizenz, Quelle – oder „eigenes Foto“)')
            if x.get('quellenart') not in (None, 'sach', 'bild', 'schrift'): FI(f'{wo}: quellenart muss sach, bild oder schrift sein')
        if isinstance(auf, list):                                # Typ je Aufgabe: einzeln prüfen
            eigen = [x for x in auf if isinstance(x, dict) and x.get('typ') and x.get('typ') != styp]
            for x in eigen:
                if x['typ'] not in ('lueckentext', 'sortieren', 'eingabe', 'markieren'): FI(f'{wo}: Typ je Aufgabe nur lueckentext, sortieren, eingabe, markieren (nicht „{x["typ"]}“)')
                else: pruefe_aufgaben(FI, wo, x['typ'], [x])
            auf = [x for x in auf if x not in eigen]
            if not auf and eigen: continue
        typ_ = styp
        if typ_ in ('lueckentext', 'sortieren', 'eingabe', 'markieren'): pruefe_aufgaben(FI, wo, typ_, auf); continue
        if typ_ == 'fall':                                       # Quellen-Detektiv Etappe 2: ganzer Fall
            if not auf: FI(f'{wo}: aufgaben (Fälle) fehlen')
            for i_, x in enumerate(auf or []):
                wf = f'{wo}, Fall {i_ + 1}'
                if not isinstance(x, dict) or not x.get('titel') or not (x.get('bild') or x.get('quelltext')): FI(f'{wf}: braucht titel und bild oder quelltext'); continue
                if x.get('wortspeicher') is not None and not _texte(x['wortspeicher']): FI(f'{wf}: wortspeicher muss eine Liste von Wörtern sein')
                ka = x.get('karten')
                nrs = [k.get('nr') for k in ka if isinstance(k, dict)] if isinstance(ka, list) else []
                if nrs not in ([1, 2, 3], [1, 2, 3, 4]): FI(f'{wf}: karten mit nr 1, 2, 3 (und optional 4) in dieser Reihenfolge nötig'); continue
                for k in ka:
                    if not _texte(k.get('muster')): FI(f'{wf}, Karte {k["nr"]}: muster (Musterantwort) fehlt')
                    for f_ in ('anfaenge', 'check'):
                        if k.get(f_) is not None and not _texte(k[f_]): FI(f'{wf}, Karte {k["nr"]}: {f_} muss eine Liste von Texten sein')
                    for h_ in k.get('hilfen') or []:
                        if not (isinstance(h_, dict) and h_.get('frage') and _texte(h_.get('optionen'), 2)): FI(f'{wf}, Karte {k["nr"]}: jede Hilfe braucht frage und mindestens 2 optionen')
            continue
        if typ_ == 'zuordnen':
            paare = [q for x in (auf or []) for q in (x.get('paare') or [])] if auf is not None else st.get('paare') or []
            if auf is not None and not all(isinstance(x, dict) and len(x.get('paare') or []) >= 2 for x in auf): FI(f'{wo}: jede Aufgabe braucht mindestens 2 paare')
            if len(paare) < 2 or not all(_texte(q, 2) and len(q) == 2 for q in paare): FI(f'{wo}: paare müssen [links, rechts] sein (mindestens 2)')
            elif st.get('ziele') and any(q[1] not in st['ziele'] for q in paare): FI(f'{wo}: ein Paar zeigt auf ein Ziel, das nicht in ziele steht')
            if st.get('zielfarben') is not None and not (isinstance(st['zielfarben'], dict) and all(re.fullmatch(r'#[0-9a-fA-F]{6}', str(v)) for v in st['zielfarben'].values())):
                FI(f'{wo}: zielfarben braucht Farben im Format #rrggbb')
        elif typ_ == 'beschriften':
            if not (p.parent / str(st.get('bild', ''))).is_file(): FI(f'{wo}: Bild {st.get("bild")} fehlt neben der Inhaltsdatei')
            m_ = st.get('marken') or []
            if len(m_) < 2 or not all(isinstance(x, dict) and x.get('wort') and 0 <= float(x.get('x', -1)) <= 100 and 0 <= float(x.get('y', -1)) <= 100 for x in m_):
                FI(f'{wo}: mindestens 2 marken mit x, y (0–100) und wort')
        elif typ_ == 'bildwort':
            w_ = st.get('woerter') or []
            if len(w_) < 4 or not all(isinstance(x, dict) and x.get('bild') and x.get('wort') for x in w_): FI(f'{wo}: mindestens 4 woerter mit bild und wort')
# Katalog und config.json zeigen auf vorhandene Inhalte
if katalog is not None:
    for f in katalog.get('faecher', []):
        for b in f.get('bereiche', []):
            for th in b.get('themen', []):
                q = th.get('quelle') or {}
                if q.get('app') == 'apps/typen/uebung.html' and q.get('parameter') != 'inhalt=' + th['id']:
                    F(f'Katalog: {th["id"]} – Quelle uebung.html braucht parameter „inhalt={th["id"]}“')
                if q.get('app') == 'apps/typen/uebung.html' and th['id'] not in inhalt_ids:
                    F(f'Katalog: {th["id"]} – Inhaltsdatei daten/inhalte/{th["id"].split(".")[0]}/{th["id"]}.json fehlt')
for a in config.get('apps', []):
    d = str(a.get('datei') or '')
    if d.split('?')[0] == 'apps/typen/uebung.html':
        m_ = re.search(r'[?&]inhalt=([a-z0-9.-]+)', d)
        if not m_ or m_.group(1) not in inhalt_ids: F(f'config.json: „{a.get("name", "?")}“ – zu {d} gibt es keine Inhaltsdatei')
I(f'Aufgabentypen: {len(TYPEN)} Typen, {len(inhalt_ids)} Inhaltsdateien')

# ── 22. English Journey (daten/journey*.json) ──────────
#  Lernweg durch ein Englischbuch (apps/englisch/english-journey.html). Kein Spielstand: Stationen lesen nur die
#  Meisterschaft ihres thema aus dem Pass – darum muss jedes thema im Katalog stehen.
JOURNEY_ARTEN = ('woerter', 'grammatik', 'anwenden', 'finale')
if katalog is not None:
    k_quelle, k_eltern = {}, {}                  # Themen-ID → Quelle (Stufen erben vom Thema), Stufe → Thema
    for j_f in katalog.get('faecher', []):
        for j_b in j_f.get('bereiche', []):
            for j_th in j_b.get('themen', []):
                k_quelle[j_th.get('id')] = j_th.get('quelle') or None
                for j_s in j_th.get('stufen', []):
                    k_quelle[j_s.get('id')] = j_s.get('quelle') or j_th.get('quelle') or None
                    k_eltern[j_s.get('id')] = j_th.get('id')
    for j_p in sorted(ROOT.glob('daten/journey*.json')):
        j_r = rel(j_p)
        try: jd = json.loads(j_p.read_text(encoding='utf-8'))
        except Exception: continue                               # Gültigkeit prüft Abschnitt 1
        def FJ(msg): F(f'{j_r}: {msg}')
        units = jd.get('units')
        if not isinstance(units, list) or not units: FJ('units fehlt'); continue
        stationen, unit_ids = {}, set()
        for j_u in units:
            uid = j_u.get('id') if isinstance(j_u, dict) else None
            if not uid or uid in unit_ids: FJ(f'Unit ohne id oder doppelt ({uid})'); continue
            unit_ids.add(uid)
            if j_u.get('thema') and j_u['thema'] not in katalog_ids: FJ(f'Unit {uid}: thema {j_u["thema"]} fehlt im Katalog')
            if not isinstance(j_u.get('stationen'), list) or not j_u['stationen']: FJ(f'Unit {uid}: keine stationen'); continue
            for j_st in j_u['stationen']:
                sid = j_st.get('id') if isinstance(j_st, dict) else None
                if not sid or not re.fullmatch(r'[a-z0-9-]+', str(sid)): FJ(f'Unit {uid}: Station ohne gültige id ({sid})'); continue
                if sid in stationen: FJ(f'Station {sid} doppelt'); continue
                stationen[sid] = (uid, j_st)
                if j_st.get('art') not in JOURNEY_ARTEN: FJ(f'Station {sid}: art muss {", ".join(JOURNEY_ARTEN)} sein')
                if not str(j_st.get('titel') or '').strip(): FJ(f'Station {sid}: titel fehlt')
                j_t = j_st.get('thema')
                if j_t not in katalog_ids: FJ(f'Station {sid}: thema {j_t} fehlt im Katalog'); continue
                j_start = j_st.get('start')
                if j_start is not None and (j_start not in katalog_ids or not (j_start == j_t or j_start.startswith(j_t + '.'))):
                    FJ(f'Station {sid}: start {j_start} muss im Katalog stehen und {j_t} selbst oder eine Stufe darunter sein')
                ziel = j_start or j_t
                j_q = k_quelle.get(ziel) or {}
                if j_q.get('app') == 'apps/typen/uebung.html' and ziel in k_eltern:   # Baukasten-Stufe: muss in der Inhaltsdatei stehen
                    eltern = k_eltern[ziel]
                    try: ist = {j_x.get('id') for j_x in json.loads(lies(f'daten/inhalte/{eltern.split(".")[0]}/{eltern}.json')).get('stufen', []) if isinstance(j_x, dict)}
                    except Exception: ist = set()
                    if ziel not in ist: FJ(f'Station {sid}: Stufe {ziel} fehlt in der Inhaltsdatei von {eltern}')
        # Vorgänger: vorhanden, keine Schleife; Finale braucht alle Stationen seiner Unit
        for sid, (uid, j_st) in stationen.items():
            br = j_st.get('braucht', [])
            if not isinstance(br, list): FJ(f'Station {sid}: braucht muss eine Liste sein'); continue
            for b_ in br:
                if b_ not in stationen: FJ(f'Station {sid}: Vorgänger {b_} gibt es nicht')
                elif b_ == sid: FJ(f'Station {sid}: braucht sich selbst')
            if j_st.get('art') == 'finale':
                fehlt = [j_x for j_x, (u_, s_) in stationen.items() if u_ == uid and j_x != sid and s_.get('art') != 'finale' and j_x not in br]
                if fehlt: FJ(f'Station {sid}: das Finale braucht alle Stationen der Unit (fehlt: {", ".join(fehlt)})')
        farbe = {}
        def schleife(j_x, pfad):
            if farbe.get(j_x) == 2: return False
            if farbe.get(j_x) == 1: FJ(f'Schleife in braucht: {" → ".join(pfad + [j_x])}'); return True
            farbe[j_x] = 1
            for b_ in (stationen[j_x][1].get('braucht') or []) if isinstance(stationen[j_x][1].get('braucht'), list) else []:
                if b_ in stationen and schleife(b_, pfad + [j_x]): return True
            farbe[j_x] = 2
            return False
        for sid in stationen:
            if schleife(sid, []): break
        I(f'{j_r}: {len(unit_ids)} Units, {len(stationen)} Stationen')

# ── 17. Admin: Module (Admin-Umbau Etappe 1) ───────
if not Path('admin.html').is_file(): F('admin.html fehlt')
else:
    an = lies('admin.html')
    srcs = SCRIPT_SRC.findall(an)
    eingebunden = [s for s in srcs if s.startswith('gemeinsam/admin/module/')]
    dateien = sorted(rel(p) for p in ROOT.glob('gemeinsam/admin/module/*.js'))
    for d in dateien:
        if d not in eingebunden: F(f'admin.html: Modul {d} ist nicht eingebunden')
    for s in eingebunden:
        if not Path(s).is_file(): F(f'admin.html: Modul-Datei fehlt: {s}')
    def pos(s): return srcs.index(s) if s in srcs else -1
    if pos('gemeinsam/admin/store.js') < 0 or pos('gemeinsam/admin/module.js') < 0 or pos('gemeinsam/admin/rahmen.js') < 0:
        F('admin.html: store.js, module.js oder rahmen.js fehlt')
    elif eingebunden and (min(map(pos, eingebunden)) < pos('gemeinsam/admin/module.js') or max(map(pos, eingebunden)) > pos('gemeinsam/admin/rahmen.js')):
        F('admin.html: Module müssen nach module.js und vor rahmen.js stehen')
    bereiche = set(re.findall(r"\{ id: '([a-z]+)',\s+titel:", lies('gemeinsam/admin/module.js')))
    ids = {}
    for d in dateien:
        t = lies(d)
        kachel = re.search(r'^LWAdmin\.kachel\(\{', t, re.M)             # Anmeldung steht am Zeilenanfang
        if not re.search(r'^LWAdmin\.(?:modul|altModul)\(', t, re.M) and not kachel: F(f'{d}: meldet sich nicht mit LWAdmin.modul(…) oder LWAdmin.kachel(…) an'); continue
        if kachel:                                  # Dashboard-Kachel (Etappe 4): eigene IDs
            for kid in re.findall(r"LWAdmin\.kachel\(\{\s*id:\s*'([^']+)'", t):
                if 'k:' + kid in ids: F(f'{d}: Kachel-ID {kid} doppelt (auch in {ids["k:" + kid]})')
                ids['k:' + kid] = d
            continue
        for teil in re.findall(r"teil:\s*'([^']+)'", t):        # Teil des bisherigen Admins (Brücke, Etappe 2)
            if f'id="{teil}"' not in an: F(f'{d}: Teil {teil} fehlt in admin.html (#lw-park)')
        for mid, ber in re.findall(r"id:\s*'([^']+)',\s*bereich:\s*'([^']+)'", t):
            if mid in ids: F(f'{d}: Modul-ID {mid} doppelt (auch in {ids[mid]})')
            ids[mid] = d
            if ber not in bereiche: F(f'{d}: Bereich {ber} unbekannt (erlaubt: {", ".join(sorted(bereiche))})')
    I(f'Admin: {sum(1 for k in ids if not k.startswith("k:"))} Module in {len(bereiche)} Bereichen, {sum(1 for k in ids if k.startswith("k:"))} Dashboard-Kacheln')

# ── 18. App-Manifeste (Admin-Umbau Etappe 7) ───────────
TYPEN = {'schalter', 'zahl', 'auswahl', 'text', 'inhaltsliste'}
def pruefe_manifest(wo, m, id_soll=None):
    def FM(msg): F(f'{wo}: {msg}')
    if not isinstance(m, dict): return FM('kein Objekt')
    if id_soll and m.get('id') != id_soll: FM(f'id „{m.get("id")}“ passt nicht zum Dateinamen ({id_soll})')
    if not re.fullmatch(r'[a-z0-9-]{1,40}', str(m.get('id', ''))): FM('id ungültig (klein, Ziffern, -)')
    if not m.get('titel'): FM('titel fehlt')
    if not Path(str(m.get('datei', ''))).is_file(): FM(f'datei fehlt: {m.get("datei")}')
    gesehen = set()
    for e in m.get('einstellungen') or []:
        k = e.get('schluessel', '')
        w = f'Einstellung {k}'
        if not re.fullmatch(r'[a-zA-Z][a-zA-Z0-9]{0,39}', str(k)): FM(f'{w}: Schlüssel ungültig')
        if k in gesehen: FM(f'{w}: doppelt')
        gesehen.add(k)
        typ, s = e.get('typ'), e.get('standard')
        if typ not in TYPEN: FM(f'{w}: Typ „{typ}“ unbekannt (erlaubt: {", ".join(sorted(TYPEN))})'); continue
        if not e.get('titel'): FM(f'{w}: titel fehlt')
        if typ == 'schalter' and not isinstance(s, bool): FM(f'{w}: Standard muss true/false sein')
        if typ == 'zahl':
            if not isinstance(s, (int, float)) or isinstance(s, bool): FM(f'{w}: Standard muss eine Zahl sein')
            elif ('min' in e and s < e['min']) or ('max' in e and s > e['max']): FM(f'{w}: Standard liegt außerhalb von min/max')
        if typ == 'auswahl':
            o = e.get('optionen') or []
            if not o or not all(isinstance(x, dict) and 'wert' in x and x.get('titel') for x in o): FM(f'{w}: optionen fehlen oder ohne wert/titel')
            elif s not in [x['wert'] for x in o]: FM(f'{w}: Standard steht nicht in den optionen')
        if typ == 'text' and not isinstance(s, str): FM(f'{w}: Standard muss Text sein')
        if typ == 'inhaltsliste' and not isinstance(s, list): FM(f'{w}: Standard muss eine Liste sein')
        if 'config' in e and not re.fullmatch(r'(dorf|spiele)\.[A-Za-z0-9]+', str(e['config'])): FM(f'{w}: config-Pfad nur unter dorf. oder spiele. (der Worker prüft diese Felder)')
        if 'ziel' in e and not re.fullmatch(r'[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*', str(e['ziel'])): FM(f'{w}: ziel ungültig')
    if any('ziel' in e for e in m.get('einstellungen') or []) and Path(str(m.get('datei', ''))).is_file() and not id_soll is None:
        if f"anwenden('{m.get('id')}'" not in lies(m['datei']): H(f'{wo}: {m.get("datei")} ruft LernEinstellungen.anwenden(\'{m.get("id")}\', CFG) nicht auf – Einstellungen wirken nicht')
try:
    apps_liste = json.loads(lies('daten/apps/liste.json')).get('apps') or []
except Exception as e:
    apps_liste = []; F(f'daten/apps/liste.json fehlt oder ist ungültig ({e})')
dateien_m = sorted(p.stem for p in ROOT.glob('daten/apps/*.json') if p.name != 'liste.json')
for mid in apps_liste:
    if mid not in dateien_m: F(f'daten/apps/liste.json: Manifest {mid}.json fehlt')
for mid in dateien_m:
    if mid not in apps_liste: F(f'daten/apps/{mid}.json steht nicht in daten/apps/liste.json')
    try: pruefe_manifest(f'daten/apps/{mid}.json', json.loads(lies(f'daten/apps/{mid}.json')), mid)
    except json.JSONDecodeError: pass                                        # meldet schon Regel 1
if Path('apps/vorlage/manifest-beispiel.json').is_file():
    pruefe_manifest('apps/vorlage/manifest-beispiel.json', json.loads(lies('apps/vorlage/manifest-beispiel.json')))
I(f'App-Manifeste: {len(dateien_m)} ({", ".join(dateien_m)})')

# ── 19. Admin-gepflegte Dateien (Admin-Umbau Etappe 8) ──
ADMIN_DATEIEN = ['daten/katalog.json', 'daten/aufgaben-pools.json', 'daten/lernwelt-inhalte.json'] + sorted(rel(p) for p in ROOT.glob('daten/vokabeln*.json'))
_dj = lies('cloudflare/dateien.js') if Path('cloudflare/dateien.js').is_file() else ''
_muster = [re.compile(m.replace('\\/', '/')) for m in re.findall(r"muster: /(.+?)/,", _dj)]
if _dj and not _muster: F('cloudflare/dateien.js: Liste DATEIEN_ERLAUBT nicht gefunden')
for d in ADMIN_DATEIEN:
    if _muster and not any(m.fullmatch(d) for m in _muster): H(f'{d}: der Worker (cloudflare/dateien.js) darf diese Datei nicht schreiben')
_basis = os.environ.get('GITHUB_BASE_REF')
if _basis:                                    # nur in Pull Requests (CI holt dafür die ganze Geschichte)
    try:
        _log = subprocess.run(['git', 'log', '--format=%s', f'origin/{_basis}..HEAD', '--', *ADMIN_DATEIEN], capture_output=True, text=True, timeout=30)
        if _log.returncode == 0:
            _fremd = [z for z in _log.stdout.splitlines() if z.strip() and not z.startswith(('Admin:', 'Merge'))]
            if _fremd: H(f'Admin-gepflegte Dateien werden in diesem Pull Request geändert ({len(_fremd)} Commits: {_fremd[0][:60]} …) – vorher den Stand von main holen, sonst gehen Änderungen aus dem Admin verloren')
    except Exception:
        pass

# ── 20. Aufgaben-Pools und Loot-Pool (Admin-Umbau Etappe 9) ──
wo = 'daten/aufgaben-pools.json'
try:
    ap = json.loads(lies(wo))
except Exception as e:
    ap = None; F(f'{wo} fehlt oder ist ungültig ({e})')
if ap is not None:
    _aj = lies('gemeinsam/aufgaben.js')
    fest = set(re.findall(r"\{ id: '([a-z0-9-]+)'", _aj)) | {'kopf4-leicht', 'kopf4-mittel', 'kopf4-schwer', 'kopf5-leicht', 'kopf5-mittel', 'kopf5-schwer', 'kopf6-leicht', 'kopf6-mittel', 'kopf6-schwer'}
    fest |= set((kr or {}).get('stufen', {}).keys()) if kr else set()
    pids = set()
    for x in ap.get('pools') or []:
        pid = x.get('id')
        if not isinstance(pid, str) or not re.fullmatch(r'[a-z0-9-]{3,40}', pid): F(f'{wo}: ungültige Pool-ID „{pid}“'); continue
        if pid in pids or pid in fest: F(f'{wo}: Pool-ID {pid} ist schon vergeben')
        pids.add(pid)
        if x.get('fach') not in faecher_shared: F(f'{wo}: {pid}: Fach „{x.get("fach")}“ steht nicht in gemeinsam/shared.js')
        if not isinstance(x.get('klasse'), int): F(f'{wo}: {pid}: klasse fehlt')
        if x.get('thema') and katalog is not None and x['thema'] not in katalog_ids: F(f'{wo}: {pid}: Themen-ID {x["thema"]} fehlt im Katalog')
        auf = x.get('aufgaben') or []
        if len(auf) < 2: F(f'{wo}: {pid}: mindestens 2 Aufgaben')
        antworten = {str(a.get('antwort', '')).strip().lower() for a in auf}
        for a in auf:
            fr, an = str(a.get('frage', '')).strip(), str(a.get('antwort', '')).strip()
            if not fr or not an: F(f'{wo}: {pid}: Aufgabe ohne Frage oder Antwort'); continue
            ab = {str(f).strip().lower() for f in a.get('falsch') or []} - {an.lower()}
            if len(ab | (antworten - {an.lower()})) < 2: F(f'{wo}: {pid}: „{fr[:40]}“ hat zu wenige Ablenker')
            if len(an) > 22: H(f'{wo}: {pid}: Antwort „{an}“ ist länger als 22 Zeichen – passt in den Spielen nicht aufs Tor')
    I(f'Aufgaben-Pools: {len(pids)} Pools aus {wo}')
try:
    _it = json.loads(lies('daten/lernwelt-inhalte.json')).get('ITEMS') or []
except Exception:
    _it = []
_by = {i.get('id'): i for i in _it if isinstance(i, dict)}
for i in _it:
    if not isinstance(i, dict) or not i.get('basis'): continue
    b = _by.get(i['basis'])
    if not b or b.get('basis') or b.get('slot') != i.get('slot'): F(f'lernwelt-inhalte.json: Teil {i.get("id")}: basis „{i["basis"]}“ fehlt, ist selbst eine Variante oder hat einen anderen Platz')
    if not all(re.fullmatch(r'#[0-9a-fA-F]{6}', str(k)) and re.fullmatch(r'#[0-9a-fA-F]{6}', str(v)) for k, v in (i.get('tausch') or {}).items()):
        F(f'lernwelt-inhalte.json: Teil {i.get("id")}: tausch nur mit Farben #rrggbb')

# ── 21. Rollen und Feature-Schalter (Admin-Umbau Etappe 10) ──
try:
    _ft = json.loads(lies('daten/features.json'))
except Exception as e:
    _ft = None; F(f'daten/features.json fehlt oder ist ungültig ({e})')
if _ft is not None:
    _fids = [f.get('id') for f in _ft.get('features') or []]
    for i in _fids:
        if not isinstance(i, str) or not re.fullmatch(r'[a-z][a-zA-Z0-9-]{0,39}', i): F(f'daten/features.json: ungültige ID „{i}“')
    if len(set(_fids)) != len(_fids): F('daten/features.json: ID doppelt')
    for k in (config.get('featureSchalter') or {}):
        if k not in _fids: H(f'config.json: Feature-Schalter „{k}“ steht nicht in daten/features.json (wirkt nur, wenn der Code ihn abfragt)')
    I(f'Feature-Schalter: {len(_fids)} Funktionen, {len(config.get("featureSchalter") or {})} geschaltet')
for p in sorted(ROOT.glob('gemeinsam/admin/module/*.js')):
    for m in re.findall(r"rechte:\s*\[([^\]]*)\]", p.read_text(encoding='utf-8')):
        for r_ in re.findall(r"'([^']+)'", m):
            if r_ not in ('haupt', 'kollege'): F(f'{rel(p)}: unbekannte Rolle „{r_}“ (erlaubt: haupt, kollege)')

# ── 7. Budgets ──────────────────────────────────────────
def groesse(d):
    p = Path(d)
    return p.stat().st_size if p.is_file() else 0

def budget(name, dateien, text):
    """Prüft eine Gruppe von Dateien gegen ihr Budget (komprimiert); Dateigröße steht dabei."""
    z, r = kb(sum(gz(d) for d in dateien)), kb(sum(groesse(d) for d in dateien))
    (F if z > BUDGETS[name] else I)(f'{text}: {z:.0f} KB komprimiert, {r:.0f} KB Dateigröße (Budget {BUDGETS[name]} KB)')

idx = lies('index.html')
start_js = [s for s in SCRIPT_SRC.findall(idx) if not s.startswith('http')]
budget('startseite_skript', start_js, 'Startseite, Skript beim Öffnen')

nav = lies('gemeinsam/navbar.js')
m = re.search(r'const SOFORT\s*=\s*\[(.*?)\];', nav, re.S)
nach = re.findall(r"'([a-z0-9-]+\.js)'", m.group(1)) if m else []
if not m: F('navbar.js: Liste SOFORT nicht gefunden (Ladekette, Etappe 2)')
zusatz = ['gemeinsam/umgebung.js', 'gemeinsam/navbar.js'] + ['gemeinsam/' + n for n in nach]
budget('app_zusatz', zusatz, f'Zusatz je Lern-App ({", ".join(Path(z).name for z in zusatz)})')

budget('vorladen_sw', [s for s in start if s != './'], f'Offline-Vorladen (sw.js), {len(start)} Dateien pro iPad')

for p in ALLE:
    r = rel(p)
    if r.startswith('vendor/') or r.startswith('.github/'): continue
    if p.suffix in ('.html', '.js') and kb(gz(p)) > BUDGETS['einzeldatei']:
        F(f'{r}: {kb(gz(p)):.0f} KB komprimiert – größer als das Budget für Einzeldateien ({BUDGETS["einzeldatei"]} KB)')
    if p.suffix == '.json' and r.startswith('daten/') and kb(gz(p)) > BUDGETS['datendatei']:
        F(f'{r}: {kb(gz(p)):.0f} KB komprimiert – größer als das Budget für Datendateien ({BUDGETS["datendatei"]} KB)')

# ── Hinweise ────────────────────────────────────────────
for p in sorted(list(ROOT.glob('apps/*/*.html')) + list(ROOT.glob('spiele/*.html'))):
    r = rel(p)
    if r.startswith('apps/vorlage/') or r.startswith('apps/typen/') or 'LW-WEITERLEITUNG' in p.read_text(encoding='utf-8'): continue
    if r not in config_dateien: H(f'{r} steht nicht in config.json (nicht auf der Startseite)')

# ── Ausgabe ─────────────────────────────────────────────
zeilen = ['## Lernwelt – Prüfung', '']
zeilen.append(('### ❌ ' + str(len(fehler)) + ' Fehler') if fehler else '### ✅ Keine Fehler')
zeilen += [f'- {f}' for f in fehler]
if hinweise:
    zeilen += ['', f'### ⚠️ {len(hinweise)} Hinweise']
    zeilen += [f'- {h}' for h in hinweise]
zeilen += ['', '### ℹ️ Werte'] + [f'- {i}' for i in infos]
text = '\n'.join(zeilen) + '\n'
print(text)
ziel = os.environ.get('GITHUB_STEP_SUMMARY')
if ziel:
    with open(ziel, 'a', encoding='utf-8') as f: f.write(text)
sys.exit(1 if fehler else 0)
