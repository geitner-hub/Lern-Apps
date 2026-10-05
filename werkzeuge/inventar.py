#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════
#  Lernwelt – werkzeuge/inventar.py   (Infrastruktur Etappe 0)
#
#  Erzeugt werkzeuge/INVENTAR.md: eine Tabelle aller Lern-Apps und Spiele
#  mit Skripten, Speicherschlüsseln, Ergebnis-Meldung und Anbindung an
#  Pass, Dorf und „Meine Themen“. Arbeitsgrundlage für Etappe 1 und 3.
#
#  Aufruf im Hauptordner:  python3 werkzeuge/inventar.py
#  Die Spalten „Entscheidung“ und „Notiz“ werden von Hand gefüllt (Etappe 3)
#  und beim erneuten Erzeugen ÜBERNOMMEN – alles andere wird neu ermittelt.
#  Alle Angaben stammen aus dem Code (Textsuche) und sind ein Startpunkt,
#  kein Urteil.
# ═══════════════════════════════════════════════════════
import json, re, os
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
ZIEL = Path('werkzeuge/INVENTAR.md')

config = json.loads(Path('config.json').read_text(encoding='utf-8'))
eintrag = {}
for a in config.get('apps', []):
    d = str(a.get('datei', '')).split('#')[0].split('?')[0]
    eintrag.setdefault(d, a)

umg = Path('gemeinsam/umgebung.js').read_text(encoding='utf-8')
REG = re.findall(r"\[\s*'([^']+)'\s*,\s*'(?:local|session)'\s*,\s*'([^']*)'", umg)

# Von Hand gepflegte Spalten aus der alten Datei übernehmen
alt = {}
if ZIEL.exists():
    for z in ZIEL.read_text(encoding='utf-8').splitlines():
        if z.startswith('| `'):
            zellen = [c.strip() for c in z.strip().strip('|').split('|')]
            if len(zellen) >= 3:
                alt[zellen[0].strip('`')] = (zellen[-2], zellen[-1])

SRC = re.compile(r'<script\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\']', re.I)
NAV_NACH = ['pass.js', 'dorf-kern.js', 'sync-code.js', 'sync.js']

def pruefe(pfad):
    t = Path(pfad).read_text(encoding='utf-8')
    a = eintrag.get(pfad, {})
    ist_spiel = pfad.startswith('spiele/')
    skripte = [Path(s).name for s in SRC.findall(t) if 'umgebung.js' not in s]
    dyn = re.findall(r"['\"][^'\"]*gemeinsam/([a-z0-9-]+\.js)['\"]", t)
    for d in dyn:
        if d not in skripte and d != 'umgebung.js': skripte.append(d + ' (nachgeladen)')
    navbar = any(s.startswith('navbar.js') for s in skripte)

    # Ergebnis-Meldung an navbar.js
    aufrufe = re.findall(r'saveResult\(([^)]{0,400})', t)
    if not aufrufe or not navbar:
        ergebnis = '–' if not aufrufe else '⚠️ ohne navbar.js'
    elif any(not x.strip().startswith('{') for x in aufrufe):
        ergebnis = '⚠️ altes Format'
    elif any('score' in x for x in aufrufe):
        ergebnis = 'ja'
    else:
        ergebnis = '⚠️ ohne Punkte'
    # Spiele melden über gemeinsam/spiel-hilfen.js (LernSpiel.speichereRunde/endlos) oder direkt an den Pass
    if ergebnis == '–' and re.search(r'LernSpiel\.(speichereRunde|endlos)\b', t):
        ergebnis = 'über spiel-hilfen.js'
    xp_direkt = re.search(r'LernPass\.(awardEndless|award)\b', t)
    pass_xp = 'ja' if ergebnis in ('ja', 'über spiel-hilfen.js') or xp_direkt else '–'
    themen_liefert = 'ja' if re.search(r'\binhalt\s*[:},]', t) and ergebnis == 'ja' else '–'
    themen_nutzt = 'ja' if 'aufgaben.js' in ' '.join(skripte) else '–'

    if ist_spiel:
        dorf = 'Dorf selbst' if pfad.endswith('dorf.html') else '– (Spiel)'
    elif not a:
        dorf = '– (nicht in config)'
    elif a.get('dorf') is False:
        dorf = '– (ausgeschlossen)'
    elif a.get('hidden'):
        dorf = 'nur wenn sichtbar'
    else:
        dorf = 'ja' + (f' ({a["dorfRunden"]} Runden)' if a.get('dorfRunden') else '')

    speicher = [k for k, _ in REG if k in t]
    if navbar: speicher.append('+ über navbar.js')
    klassen = ', '.join(str(k) for k in a.get('klassen', [])) or 'alle'
    return {
        'datei': pfad, 'name': a.get('name', '–'), 'art': 'Spiel' if ist_spiel else 'Lern-App',
        'fach': f"{a.get('fach', '–')} · {klassen}" if a else '–',
        'sichtbar': ('versteckt' if a.get('hidden') else 'sichtbar') if a else 'nicht in config',
        'ergebnis': ergebnis, 'pass': pass_xp, 'liefert': themen_liefert, 'nutzt': themen_nutzt, 'dorf': dorf,
        'skripte': ', '.join(skripte) or '–', 'speicher': ', '.join(speicher) or '–',
        'kb': round(Path(pfad).stat().st_size / 1024),
    }

dateien = sorted(str(p.as_posix()) for p in list(Path('apps').glob('*/*.html')) + list(Path('spiele').glob('*.html'))
                 if not str(p).startswith('apps/vorlage'))
zeilen = [pruefe(d) for d in dateien]

out = [
    '# Inventar der Lern-Apps und Spiele',
    '',
    f'Automatisch erzeugt am {date.today().strftime("%d.%m.%Y")} mit `python3 werkzeuge/inventar.py` '
    '(Angaben aus dem Code). Nur die Spalten **Entscheidung** und **Notiz** von Hand pflegen – '
    'sie bleiben beim Neu-Erzeugen erhalten.',
    '',
    'Entscheidung (Etappe 3): **Kern** · **Überarbeiten** · **Engine** · **Archiv**',
    '',
    '## Anbindung',
    '',
    '| Datei | Name | Art | Fach · Klassen | Sichtbar | Ergebnis | Pass-XP | liefert „Meine Themen“ | nutzt „Meine Themen“ | Dorf-Aufträge | Entscheidung | Notiz |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
]
for z in zeilen:
    ent, notiz = alt.get(z['datei'], ('', ''))
    out.append(f"| `{z['datei']}` | {z['name']} | {z['art']} | {z['fach']} | {z['sichtbar']} | {z['ergebnis']} | "
               f"{z['pass']} | {z['liefert']} | {z['nutzt']} | {z['dorf']} | {ent} | {notiz} |")
out += ['', '## Technik', '',
        '| Datei | KB | Skripte | Speicherschlüssel |', '|---|---|---|---|']
for z in zeilen:
    out.append(f"| {z['datei']} | {z['kb']} | {z['skripte']} | {z['speicher']} |")
out += ['', '## Legende', '',
        '- **Ergebnis**: meldet Runden über `LernApps.saveResult({ score, max, … })` an navbar.js. '
        '„⚠️ altes Format“ = Aufruf ohne Objekt, „⚠️ ohne Punkte“ = Aufruf ohne `score`.',
        '- **Pass-XP**: über eine gültige Ergebnis-Meldung, `gemeinsam/spiel-hilfen.js` oder direkt über `LernPass`.',
        '- **liefert „Meine Themen“**: die Meldung enthält `inhalt` → der Stoff erscheint in den Spielen.',
        '- **nutzt „Meine Themen“**: das Spiel stellt Aufgaben über `gemeinsam/aufgaben.js`.',
        '- **Dorf-Aufträge**: Lern-Apps in config.json, nicht versteckt, nicht mit `"dorf": false`.',
        f'- **+ über navbar.js**: navbar.js lädt {", ".join(NAV_NACH)} nach (Pass, Dorf, Sicherung).',
        '']
ZIEL.write_text('\n'.join(out), encoding='utf-8')
print(f'{ZIEL} geschrieben: {len(zeilen)} Apps und Spiele')
