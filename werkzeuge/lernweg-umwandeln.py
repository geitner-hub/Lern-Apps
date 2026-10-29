#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════
#  Lernweg → English Journey  (Aktionsplan „Lernweg im English Journey“, Etappe 1)
#
#    python3 werkzeuge/lernweg-umwandeln.py           # schreibt beide Dateien neu
#    python3 werkzeuge/lernweg-umwandeln.py --nur-zeigen
#
#  Macht aus daten/lernwege/en.6.lernweg-u1.json und -u2.json
#    • daten/journey/bausteine-en6.json  – Hefteinträge, eigene Übungen, Kann-Sätze (je mit fester ID)
#    • daten/journey6.json               – je Unit „abschnitte“ (Buchseiten → Hefteintrag → Übung → App) und „kann“
#  Die Stationen (Apps) in journey6.json bleiben, wie sie sind. Einmal laufen lassen, das Ergebnis von Hand prüfen.
#  Läuft das Skript erneut, ersetzt es nur die Abschnitte von Unit 1 und 2 und die Bausteine mit ihren IDs –
#  von Hand ergänzte Bausteine (z. B. Lösungen) bleiben erhalten. Wird mit den alten Lernweg-Dateien gelöscht (Etappe 3).
#
#  Für die Übernahme der Häkchen (Etappe 3) trägt jeder Schritt in „alt“ seinen alten Schlüssel (Position oder id
#  im alten Laufzettel), jeder Abschnitt in „alt“ die alte Stationsnummer und den Kontroll-Schritt.
# ═══════════════════════════════════════════════════════
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JOURNEY = ROOT / 'daten/journey6.json'
BAUSTEINE = ROOT / 'daten/journey/bausteine-en6.json'

# Hefteinträge: alte Nummer → Baustein-ID (Nummer 1 steht nur im Heft, nicht in den alten Daten)
HE = {
    'u1': {'1': ('he-u1-simple-past', 'Simple past'), '2': ('he-u1-objektpronomen', None), '3': ('he-u1-linking-words', None)},
    'u2': {'4': ('he-u2-did-fragen', None), '5': ('he-u2-plural', None)},
}

# Abschnitte je Unit in Heft-Reihenfolge: (Abschnitt-ID, alte Station oder None, Stationen aus journey6.json)
# Grundwortschatz, Theme 1 und Theme 2 kamen vor dem alten Lernweg dran und haben noch keine Buchseiten.
ABSCHNITTE = {
    'u1': [
        ('u1-a-grundwortschatz', None, ['u1-grundwortschatz'], 'Grundwortschatz'),
        ('u1-a-theme1', None, ['u1-theme1'], 'Theme 1'),
        ('u1-a-theme2', None, ['u1-theme2'], 'Theme 2'),
        ('u1-a-story', 1, ['u1-story'], None),
        ('u1-a-simple-past', 2, ['u1-simple-past', 'u1-didnt'], None),
        ('u1-a-was-were', 3, ['u1-was-were'], None),
        ('u1-a-objektpronomen', 4, ['u1-objektpronomen'], None),
        ('u1-a-linking-words', 5, ['u1-linking-words', 'u1-anwenden'], None),
        ('u1-a-vocabulary', 6, ['u1-weitere'], None),
        ('u1-a-mediation', 7, [], None),
        ('u1-a-schluss', 8, ['u1-finale'], None),
    ],
    'u2': [
        ('u2-a-grundwortschatz', None, ['u2-grundwortschatz'], 'Grundwortschatz'),
        ('u2-a-theme1', None, ['u2-theme1'], 'Theme 1'),
        ('u2-a-theme2', None, ['u2-theme2'], 'Theme 2'),
        ('u2-a-story', 1, ['u2-story'], None),
        ('u2-a-did-fragewort', 2, ['u2-did-fragewort'], None),
        ('u2-a-did-kurz', 3, ['u2-did-kurz'], None),
        ('u2-a-plural', 4, ['u2-plural'], None),
        ('u2-a-can-mustnt', 5, ['u2-can-mustnt'], None),
        ('u2-a-vocabulary', 6, ['u2-there-is', 'u2-weitere'], None),
        ('u2-a-brief', 7, [], None),
        ('u2-a-weg', 8, ['u2-anwenden'], None),
        ('u2-a-fest', 9, [], None),
        ('u2-a-schluss', 10, ['u2-finale'], None),
    ],
}

# Buchseiten der Abschnitte (aus den Texten der alten Stationen)
SEITEN = {
    'u1-a-story': (14, 15), 'u1-a-simple-past': (16, 17), 'u1-a-was-were': (18, 18), 'u1-a-objektpronomen': (18, 18),
    'u1-a-linking-words': (21, 21), 'u1-a-vocabulary': (20, 20), 'u1-a-mediation': (22, 22),
    'u2-a-story': (32, 33), 'u2-a-did-fragewort': (34, 34), 'u2-a-did-kurz': (35, 35), 'u2-a-plural': (36, 36),
    'u2-a-can-mustnt': (36, 38), 'u2-a-vocabulary': (36, 36), 'u2-a-brief': (38, 39), 'u2-a-weg': (40, 40), 'u2-a-fest': (37, 37),
}

# Texte, die sich nicht von selbst zerlegen lassen: alter Text → (art, buch, text)
VON_HAND = {
    'Lies die Geschichte im Buch S. 14–15.': ('lesen', {'seite': 14, 'bis': 15}, 'Lies die Geschichte.'),
    'Lies das Theaterstück im Buch S. 32–33.': ('lesen', {'seite': 32, 'bis': 33}, 'Lies das Theaterstück.'),
}
# Alte App-Schritte ohne Ziel-Thema
APP_THEMA = {'Vokabeltrainer Klasse 6, Unit 1: mindestens 2 Runden.': ('en.6.vok.u1', {'runden': 2, 'prozent': 70})}

BUCH = re.compile(r'^(?:Profi: )?Buch S\. (\d+)(?:–(\d+))? (Ü [^:]+?)(?::| –| mit) ?(.*)$')


def buch_aus(text):
    """„Buch S. 34 Ü 1b: Schreibe …“ → ({seite, bis?, uebung}, „Schreibe …“). Der Satz „Buch S. 34 Ü 1b: …“
    entsteht später aus den Daten wieder; gespeichert wird nur der Arbeitsauftrag."""
    m = BUCH.match(text)
    if not m: return None, text
    b = {'seite': int(m.group(1))}
    if m.group(2): b['bis'] = int(m.group(2))
    ue, _, titel = m.group(3).partition(' „')         # „Ü 6 „Mia’s first days at school““ → Übung 6 + Titel im Auftrag
    b['uebung'] = re.sub(r'Ü ', '', ue).strip()
    rest = m.group(4).strip()
    if titel: rest = '„' + titel + ': ' + rest
    if text[m.end(3):].startswith(' mit'): rest = 'Mit ' + rest
    return b, rest[:1].upper() + rest[1:]


def ohne(text, *vorn):
    for v in vorn:
        if text.startswith(v): return text[len(v):].strip()
    return text


def katalog_ids():
    k = json.loads((ROOT / 'daten/katalog.json').read_text(encoding='utf-8'))
    ids = set()
    for f in k.get('faecher', []):
        for b in f.get('bereiche', []):
            for th in b.get('themen', []):
                ids.add(th['id'])
                for s in th.get('stufen', []): ids.add(s['id'])
    return ids


def thema_aus_link(link):
    m = re.search(r'[?&]stufe=([a-z0-9.-]+)', link or '') or re.search(r'[?&]inhalt=([a-z0-9.-]+)', link or '')
    return m.group(1) if m else None


def umwandeln():
    alle_ids = katalog_ids()
    journey = json.loads(JOURNEY.read_text(encoding='utf-8'))
    try: alt_b = json.loads(BAUSTEINE.read_text(encoding='utf-8'))
    except FileNotFoundError: alt_b = {'bausteine': []}
    bausteine, neu_ids = [], set()

    def baustein(b):
        neu_ids.add(b['id'])
        vorher = next((x for x in alt_b.get('bausteine', []) if x.get('id') == b['id']), None)
        if vorher and 'loesung' in vorher: b['loesung'] = vorher['loesung']       # von Hand ergänzt → behalten
        bausteine.append(b)

    for uid, weg in (('u1', 'en.6.lernweg-u1'), ('u2', 'en.6.lernweg-u2')):
        lw = json.loads((ROOT / f'daten/lernwege/{weg}.json').read_text(encoding='utf-8'))
        unit = next(u for u in journey['units'] if u['id'] == uid)
        st_ids = {s['id'] for s in unit['stationen']}
        he_ids = {}
        for nr, (bid, titel) in HE[uid].items():
            he_ids[nr] = bid
            h = lw['hefteintraege'].get(nr)
            b = {'id': bid, 'art': 'hefteintrag', 'titel': h['titel'] if h else titel, 'zeilen': h['zeilen'] if h else []}
            if h and h.get('merke'): b['merke'] = h['merke']
            if not h: b['nurImHeft'] = True          # steht schon im Heft der Kinder, Inhalt noch nachtragen
            baustein(b)

        abschnitte, alt_zu_abschnitt = [], {}
        for aid, nr, apps, titel in ABSCHNITTE[uid]:
            for s in apps: assert s in st_ids, f'{aid}: Station {s} fehlt in journey6.json'
            if nr is None:
                a = {'id': aid, 'titel': titel, 'schritte': [{'id': f'{aid}-{s}', 'art': 'app', 'station': s} for s in apps]}
                abschnitte.append(a); continue
            s_alt = next(s for s in lw['stationen'] if s['nr'] == nr)
            alt_zu_abschnitt[nr] = aid
            a = {'id': aid, 'titel': s_alt['titel'], 'kurz': s_alt.get('kurz', ''), 'ico': s_alt.get('ico', '')}
            if aid in SEITEN:
                von, bis = SEITEN[aid]
                a['buch'] = {'von': von, 'bis': bis}
            for k in ('kompetenz', 'niveaus', 'wahl', 'schluss', 'merk'):
                if s_alt.get(k): a[k] = s_alt[k]
            a['alt'] = {'nr': nr}
            schritte, n = [], {}

            def sid(teil):
                n[teil] = n.get(teil, 0) + 1
                return f'{aid}-{teil}' + (str(n[teil]) if n[teil] > 1 else '')

            def neu(teil, art, x, key, **felder):
                s = {'id': sid(teil), 'art': art}
                s.update({k: v for k, v in felder.items() if v not in (None, '', [])})
                if isinstance(x.get('niveau'), list): s['niveau'] = x['niveau']
                s['alt'] = key
                schritte.append(s)
                return s

            aufgaben = list(s_alt.get('aufgaben', []))
            for i, x in enumerate(s_alt['schritte']):
                key = str(x['id']) if 'id' in x else str(i)
                art, text = x['art'], x['text']
                if art == 'kontrolle':
                    a['alt']['kontrolle'] = key           # Kontrolle läuft jetzt digital über die Lösung
                elif art == 'hefteintrag':
                    m = re.search(r'Hefteintrag (\d+)', text)
                    hnr = m.group(1) if m else s_alt.get('hefteintrag')
                    neu('he', 'hefteintrag', x, key, baustein=he_ids[hnr], wiederholen=True if 'noch einmal' in text else None)
                elif art == 'aufgaben' or (art == 'schreiben' and aufgaben):
                    # „Aufgaben A, B und C (unten)“ → je Aufgabe eine eigene Übung; „schreiben“ → die Schreibaufgaben
                    #  Hat die Station einen Schreib-Schritt, gehören die Schreibaufgaben zu ihm, sonst alle zu „aufgaben“
                    mit_schreiben = any(y['art'] == 'schreiben' for y in s_alt['schritte'])
                    for au in list(aufgaben):
                        if mit_schreiben and (au['art'] == 'schreiben') != (art == 'schreiben'): continue
                        aufgaben.remove(au)
                        bid = f'ue-{uid}-{aid[len(uid) + 3:]}-{au["nr"].lower()}'
                        if bid in neu_ids: bid += str(sum(1 for x in neu_ids if x.startswith(bid)) + 1)   # gleiche Aufgabe je Niveau
                        b = {'id': bid, 'art': 'uebung', 'typ': au['art']}
                        b.update({k: v for k, v in au.items() if k not in ('nr', 'art', 'niveau')})
                        baustein(b)
                        hinweis = ohne(text, f'Aufgabe {au["nr"]}: ') if art == 'schreiben' else None
                        neu('ue', 'uebung', au, key, baustein=bid, text=hinweis)
                elif art in ('buch', 'heft', 'partner', 'schreiben') and (text in VON_HAND or BUCH.match(text)):
                    if text in VON_HAND:
                        art2, b, rest = VON_HAND[text]
                    else:
                        b, rest = buch_aus(text)
                        art2 = 'partner' if art == 'partner' else 'uebung'
                    if isinstance(x.get('niveau'), list) and len(x['niveau']) == 1: rest = ohne(rest, 'Profi: ', '– ')
                    neu('buch' if art2 == 'uebung' else art2, art2, x, key, buch=b, text=rest)
                elif art == 'buch' and text.startswith('Buch S. '):
                    b, rest = buch_aus(text)
                    neu('buch', 'uebung', x, key, buch=b, text=rest)
                elif art == 'app':
                    z = x.get('ziel') or {}
                    th = z.get('thema') or thema_aus_link(x.get('link'))
                    ziel = {'runden': z.get('runden', 1), 'prozent': z.get('prozent', 70)}
                    if text in APP_THEMA: th, ziel = APP_THEMA[text]
                    assert th in alle_ids, f'{aid}: App-Thema {th} fehlt im Katalog'
                    neu('app', 'app', x, key, thema=th, ziel=ziel, text=text)
                elif art == 'extra':
                    neu('extra', 'extra', x, key, text=ohne(text, 'Extra: '), thema=thema_aus_link(x.get('link')))
                elif art == 'vokabeln' or (art == 'heft' and 'Vokabel' in text):
                    neu('vok', 'vokabeln', x, key, text=ohne(text, 'Vokabelheft: '))
                elif art == 'heft' and 'Fit für die Probe' in text:
                    a['alt']['probe'] = key               # „Fit für die Probe?“ gehört jetzt zum Finale
                else:
                    raise SystemExit(f'{aid}: Schritt {key} ({art}) nicht zugeordnet: {text}')
            assert not aufgaben, f'{aid}: Aufgaben ohne Schritt: {[x["nr"] for x in aufgaben]}'
            for s in apps: schritte.append({'id': f'{aid}-{s}', 'art': 'app', 'station': s})
            a['schritte'] = schritte
            abschnitte.append(a)

        kann = []
        for i, p in enumerate(lw.get('probe', []), 1):
            bid = f'kann-{uid}-{i}'
            baustein({'id': bid, 'art': 'kann', 'teil': p['teil'], 'text': p['kann']})
            kann.append({'baustein': bid, 'abschnitt': alt_zu_abschnitt.get(p.get('station'))})

        unit['alt'] = weg
        for k in ('wahlAnzahl', 'zieleVorher'):
            if lw.get(k) is not None: unit[k] = lw[k]
        unit['abschnitte'] = abschnitte
        unit['kann'] = kann

    # Bausteine anderer Units (später von Hand oder im Editor angelegt) bleiben stehen
    bausteine += [b for b in alt_b.get('bausteine', []) if b.get('id') not in neu_ids]
    kopf = {
        'version': 1,
        'weg': 'daten/journey6.json',
        'hinweis': 'Bausteine des English Journey Year 6: Hefteinträge (zeilen [text, stil], stil g = grün, b = fett), '
                   'eigene Übungen (typ wie im alten Lernweg, loesung zum Aufklappen) und Kann-Sätze fürs Finale. '
                   'Die Reihenfolge und die Buchverweise stehen in daten/journey6.json (units → abschnitte → schritte). '
                   'IDs nie umbenennen: Erledigtes steht als Lernstand jw:<ID> im Pass. Format: README → English Journey.',
        'bausteine': bausteine,
    }
    # journey6.json: Abschnitte und Kann-Sätze hinter die Stationen, damit der Kopf der Unit oben bleibt
    for u in journey['units']:
        for k in ('alt', 'wahlAnzahl', 'zieleVorher', 'abschnitte', 'kann'):
            if k in u: u[k] = u.pop(k)
    return journey, kopf


def schreibe(p, d):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    journey, bausteine = umwandeln()
    n_ab = sum(len(u.get('abschnitte', [])) for u in journey['units'])
    n_sch = sum(len(a['schritte']) for u in journey['units'] for a in u.get('abschnitte', []))
    print(f'{n_ab} Abschnitte, {n_sch} Schritte, {len(bausteine["bausteine"])} Bausteine')
    if '--nur-zeigen' in sys.argv:
        print(json.dumps([u.get('abschnitte') for u in journey['units'][:2]], ensure_ascii=False, indent=1))
    else:
        schreibe(JOURNEY, journey)
        schreibe(BAUSTEINE, bausteine)
        print(f'geschrieben: {JOURNEY.relative_to(ROOT)}, {BAUSTEINE.relative_to(ROOT)}')
