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
# ═══════════════════════════════════════════════════════
import gzip, json, os, re, sys
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
    # Etappe 7: Freigaben verweisen auf Katalog-IDs (gelb – ein Tippfehler sperrt nur nichts)
    for t in (config.get('freigaben') or {}):
        if t not in ids: H(f'config.json: Freigabe für unbekannte Themen-ID {t} (wirkt nicht)')

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
inhalt_ids = set()
for p in sorted(ROOT.glob('daten/inhalte/*/*.json')):
    r = rel(p)
    try: d = json.loads(p.read_text(encoding='utf-8'))
    except Exception: continue                                   # Gültigkeit prüft Abschnitt 1
    tid, typ = d.get('thema'), d.get('typ')
    def FI(msg): F(f'{r}: {msg}')
    if typ not in TYPEN: FI(f'unbekannter Typ „{typ}“ (erlaubt: {", ".join(TYPEN)})')
    if tid != p.stem: FI(f'thema „{tid}“ muss gleich dem Dateinamen sein')
    if not str(tid or '').startswith(p.parent.name + '.'): FI(f'thema muss mit dem Ordner „{p.parent.name}.“ beginnen')
    inhalt_ids.add(p.stem)
    if katalog is not None and tid not in ids: FI(f'Themen-ID {tid} fehlt in daten/katalog.json')
    if not d.get('titel'): FI('titel fehlt')
    if not isinstance(d.get('klasse'), int): FI('klasse fehlt')
    stufen = d.get('stufen')
    if not isinstance(stufen, list) or not stufen: FI('keine stufen'); continue
    for st in stufen:
        sid = st.get('id') if isinstance(st, dict) else None
        wo = f'Stufe {sid}'
        if not sid or not str(sid).startswith(str(tid) + '.'): FI(f'{wo}: id muss mit „{tid}.“ beginnen'); continue
        if katalog is not None and sid not in ids: FI(f'{wo} fehlt in daten/katalog.json')
        if not st.get('titel'): FI(f'{wo}: titel fehlt')
        auf = st.get('aufgaben')
        if typ == 'zuordnen':
            paare = [q for x in (auf or []) for q in (x.get('paare') or [])] if auf is not None else st.get('paare') or []
            if auf is not None and not all(isinstance(x, dict) and len(x.get('paare') or []) >= 2 for x in auf): FI(f'{wo}: jede Aufgabe braucht mindestens 2 paare')
            if len(paare) < 2 or not all(_texte(q, 2) and len(q) == 2 for q in paare): FI(f'{wo}: paare müssen [links, rechts] sein (mindestens 2)')
            elif st.get('ziele') and any(q[1] not in st['ziele'] for q in paare): FI(f'{wo}: ein Paar zeigt auf ein Ziel, das nicht in ziele steht')
        elif typ == 'sortieren':
            if not auf or not all(isinstance(x, dict) and _texte(x.get('teile'), 2) for x in auf): FI(f'{wo}: aufgaben mit mindestens 2 teilen nötig')
        elif typ == 'lueckentext':
            for x in auf or [None]:
                if not isinstance(x, dict) or not re.search(r'_{2,}', str(x.get('text', ''))) or not x.get('antwort'):
                    FI(f'{wo}: jede Aufgabe braucht text mit ___ und antwort'); break
                ant = x['antwort'] if isinstance(x['antwort'], list) else [x['antwort']]
                if x.get('optionen') and not any(a in x['optionen'] for a in ant): FI(f'{wo}: Antwort „{ant[0]}“ fehlt in optionen')
        elif typ == 'eingabe':
            if not auf or not all(isinstance(x, dict) and x.get('frage') and x.get('antwort') not in (None, '', []) for x in auf): FI(f'{wo}: jede Aufgabe braucht frage und antwort')
        elif typ == 'beschriften':
            if not (p.parent / str(st.get('bild', ''))).is_file(): FI(f'{wo}: Bild {st.get("bild")} fehlt neben der Inhaltsdatei')
            m_ = st.get('marken') or []
            if len(m_) < 2 or not all(isinstance(x, dict) and x.get('wort') and 0 <= float(x.get('x', -1)) <= 100 and 0 <= float(x.get('y', -1)) <= 100 for x in m_):
                FI(f'{wo}: mindestens 2 marken mit x, y (0–100) und wort')
        elif typ == 'bildwort':
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
