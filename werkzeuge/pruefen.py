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
#    7. Die Größenbudgets werden eingehalten (BUDGETS unten).
#    8. Inhalts-Katalog (daten/katalog.json): IDs eindeutig und richtig gebaut, jedes Thema
#       hat Fach und Klasse, jede Quelle existiert, jede Lern-App aus config.json hat ein Thema.
#  HINWEISE (gelb) – nichts kaputt, aber ansehen:
#    Apps im Ordner, die nicht in config.json stehen, u. Ä.
#
#  Spätere Etappen ergänzen hier: Budgets (Etappe 2),
#  Inhaltsdateien (Etappe 9).
# ═══════════════════════════════════════════════════════
import json, os, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

# ⚙ Größenbudgets in KB. Etappe 0: heutiger Stand + Luft, damit nichts unbemerkt wächst.
#   Etappe 2 senkt sie auf die Zielwerte (Startseite < 200, Zusatz je App < 80).
BUDGETS = {
    'startseite_skript': 340,   # alle <script src> von index.html zusammen
    'app_zusatz':        200,   # umgebung.js + navbar.js + was navbar.js nachlädt
    'vorladen_sw':       2600,  # alle Dateien aus sw.js START zusammen
    'einzeldatei':       160,   # jede eigene .html/.js (ohne vendor/)
    'datendatei':        400,   # jede .json in daten/
}
# Seiten ohne umgebung.js (liegen an beliebiger Adresse, relative Pfade gehen nicht)
OHNE_UMGEBUNG = {'404.html'}
# Lern-Apps/Spiele ohne navbar.js (bewusst) – hier eintragen, mit Grund
OHNE_NAVBAR = {
    'apps/englisch/english-dialog-vorlagen.html',   # Arbeitsblatt-Vorlagen, versteckt; Entscheidung in Etappe 3
}

fehler, hinweise, infos = [], [], []
def F(msg): fehler.append(msg)
def H(msg): hinweise.append(msg)
def I(msg): infos.append(msg)

def lies(p):
    return Path(p).read_text(encoding='utf-8')

def kb(n):
    return n / 1024

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

sw = lies('sw.js')
m = re.search(r'const START\s*=\s*\[(.*?)\];', sw, re.S)
start = re.findall(r"'([^']+)'", m.group(1)) if m else []
if not start: F('sw.js: Liste START nicht gefunden')
for d in start:
    if d in ('./',): continue
    if not Path(d).is_file(): F(f'sw.js START: Datei fehlt: {d}')

# ── 3./4. umgebung.js und navbar.js ─────────────────────
SCRIPT_SRC = re.compile(r'<script\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\']', re.I)
SCRIPT_ANY = re.compile(r'<script\b', re.I)
for p in sorted(ROOT.rglob('*.html')):
    r = rel(p)
    if '.git' in p.parts or r in OHNE_UMGEBUNG: continue
    t = p.read_text(encoding='utf-8')
    tiefe = r.count('/')
    soll = '../' * tiefe + 'gemeinsam/umgebung.js'
    erstes = SCRIPT_ANY.search(t)
    m1 = SCRIPT_SRC.search(t)
    if not erstes or not m1 or m1.start() != erstes.start() or m1.group(1) != soll:
        F(f'{r}: gemeinsam/umgebung.js fehlt oder ist nicht das erste Skript (erwartet: <script src="{soll}">)')
    if (r.startswith('apps/') or r.startswith('spiele/')) and r not in OHNE_NAVBAR:
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
NICHT_SPEICHER = {'expedition.html', 'kitchen-chaos.html', 'tauziehen.html', 'wort-des-tages.html', 'zauberwort.html'}  # APP_KEY = Dateiname
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
    if k not in im_code:
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
                    if not any(p.name == e for p in ROOT.glob('apps/*/*.html')): F(f'Katalog: Ergebnis-Schlüssel {e} ({tid}) ist keine App-Datei')
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
    I(f'Katalog: {len(ids)} Themen und Stufen, {len(app_themen)} Apps zugeordnet')

# ── 7. Budgets ──────────────────────────────────────────
def groesse(d):
    p = Path(d)
    return p.stat().st_size if p.is_file() else 0

idx = lies('index.html')
start_js = [s for s in SCRIPT_SRC.findall(idx) if not s.startswith('http')]
summe = sum(groesse(s) for s in start_js)
(F if kb(summe) > BUDGETS['startseite_skript'] else I)(
    f'Startseite: {kb(summe):.0f} KB Skript beim Öffnen (Budget {BUDGETS["startseite_skript"]} KB)')

nav = lies('gemeinsam/navbar.js')
nach = sorted(set(re.findall(r"BASE\s*\+\s*'([a-z0-9-]+\.js)'", nav)))
zusatz = ['gemeinsam/umgebung.js', 'gemeinsam/navbar.js'] + ['gemeinsam/' + n for n in nach]
summe = sum(groesse(s) for s in zusatz)
(F if kb(summe) > BUDGETS['app_zusatz'] else I)(
    f'Zusatz je Lern-App: {kb(summe):.0f} KB ({", ".join(Path(z).name for z in zusatz)}; Budget {BUDGETS["app_zusatz"]} KB)')

summe = sum(groesse(s) for s in start if s != './')
(F if kb(summe) > BUDGETS['vorladen_sw'] else I)(
    f'Offline-Vorladen (sw.js): {len(start)} Dateien, {kb(summe):.0f} KB pro iPad (Budget {BUDGETS["vorladen_sw"]} KB)')

for p in ALLE:
    r = rel(p)
    if r.startswith('vendor/') or r.startswith('.github/'): continue
    if p.suffix in ('.html', '.js') and kb(p.stat().st_size) > BUDGETS['einzeldatei']:
        F(f'{r}: {kb(p.stat().st_size):.0f} KB – größer als das Budget für Einzeldateien ({BUDGETS["einzeldatei"]} KB)')
    if p.suffix == '.json' and r.startswith('daten/') and kb(p.stat().st_size) > BUDGETS['datendatei']:
        F(f'{r}: {kb(p.stat().st_size):.0f} KB – größer als das Budget für Datendateien ({BUDGETS["datendatei"]} KB)')

# ── Hinweise ────────────────────────────────────────────
for p in sorted(list(ROOT.glob('apps/*/*.html')) + list(ROOT.glob('spiele/*.html'))):
    r = rel(p)
    if r.startswith('apps/vorlage/'): continue
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
