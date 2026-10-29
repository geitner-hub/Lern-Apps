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
#  Die Gliederung folgt dem Buch (Übergabe „Inhalte Englisch 6“ vom 29.10.2026: Abschnitte, Seiten, Buchaufgaben mit
#  Niveau ★ alle · ★★ Standard und Profi · ★★★ Profi). Hören macht die Lehrkraft im Unterricht – es steht nicht im Weg.
#  Die Stationen (Apps) in journey6.json bleiben, wie sie sind. Läuft das Skript erneut, ersetzt es nur die Abschnitte
#  von Unit 1 und 2 und deren Bausteine – von Hand ergänzte Lösungen bleiben erhalten.
#  Wird mit den alten Lernweg-Dateien gelöscht (Etappe 3).
#
#  Für die Übernahme der Häkchen (Etappe 3) trägt jeder übernommene Schritt in „alt“ seinen alten Schlüssel
#  „<Station>.<Schritt>“ (Position oder id im alten Laufzettel), jeder Abschnitt in „alt“ die alte Station und ihren
#  Kontroll-Schritt (kontrolliert = alle Schritte der Station erledigt).
# ═══════════════════════════════════════════════════════
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JOURNEY = ROOT / 'daten/journey6.json'
BAUSTEINE = ROOT / 'daten/journey/bausteine-en6.json'
HEFT = 'Schreibe die ganzen Sätze ins Heft.'
NIVEAU = {1: None, 2: [2, 3], 3: [3]}            # ★ alle · ★★ Standard + Profi · ★★★ nur Profi

# ── Bausprache der Abschnitte ──────────────────────────
def B(seite, uebung, sterne=1, text=HEFT, alt=None, bis=None):     # Buchaufgabe
    b = {'seite': seite, 'uebung': uebung}
    if bis: b['bis'] = bis
    return ('buch', b, sterne, text, alt)
def A(ref): return ('aufg', ref)             # alte eigene Aufgabe „<Station>#<Index>“
def S(ref): return ('alt', ref)              # alter Schritt „<Station>.<Schritt>“ (Hefteintrag, App, Extra, Vokabeln …)
def HE(bid, wiederholen=False): return ('he', bid, wiederholen)
def APP(station): return ('station', station)
def THEMA(thema, text, runden=1, prozent=70): return ('thema', thema, text, {'runden': runden, 'prozent': prozent})

# Hefteinträge: alte Nummer → Baustein-ID; HE 1 steht nur im Heft, HE 6 ist ein Entwurf aus UE 18
HE_ALT = {'1': 'he-u1-simple-past', '2': 'he-u1-objektpronomen', '3': 'he-u1-linking-words', '4': 'he-u2-did-fragen', '5': 'he-u2-plural'}
HE_NEU = [
    {'id': 'he-u1-simple-past', 'art': 'hefteintrag', 'titel': 'Simple past (Wiederholung)', 'zeilen': [], 'nurImHeft': True},
    {'id': 'he-u2-weg', 'art': 'hefteintrag', 'titel': 'Nach dem Weg fragen', 'entwurf': True, 'zeilen': [
        [['Fragen: ', ''], ['Excuse me, how do I get to …?', 'b'], ['  /  ', ''], ['Where is the …?', 'b']],
        [['Antworten:', 'g']],
        [['Go straight on.', 'g'], ['  (geradeaus)', '']],
        [['Turn left.', 'g'], ['  /  ', ''], ['Turn right.', 'g'], ['  (links / rechts abbiegen)', '']],
        [['Go along the street.', 'g'], ['  (die Straße entlang)', '']],
        [["It's on the left / right.", 'g']],
        [["It's next to / opposite …", 'g'], ['  (neben / gegenüber)', '']],
        [['Einklebebild: Pfeile – geradeaus, links, rechts', '']],
    ], 'merke': 'Höflich fragen: Excuse me, … – und danke sagen!'},
]

TC = 'Test and check: Löse die Aufgaben im Heft. Kontrolliere mit den Lösungen auf S. {} und verbessere mit Grün.'

UNITS = {
  'u1': ('en.6.lernweg-u1', [
    dict(id='u1-a-simple-past', titel='Simple past (Wiederholung)', ico='⏪', kurz='Grammatik · Hefteintrag 1', buch=(16, 17), alt=2, schritte=[
        S('2.0'), B(16, '2a'), B(17, '3'), A('2#0'), A('2#1'), A('2#2'),
        B(17, '6', 2, '„Mia’s first days at school“: ' + HEFT, alt='2.2'), S('2.4'),
        APP('u1-grundwortschatz'), APP('u1-simple-past'), APP('u1-didnt')]),
    dict(id='u1-a-lead-in', titel='Lead-in: After the holidays', ico='🏖️', kurz='Einstieg · Wörter', buch=(8, 9), schritte=[
        B(9, '2', 1, 'Satzbaukasten: Baue Sätze und schreibe sie ganz ins Heft.')]),
    dict(id='u1-a-theme1', titel='Theme 1: Back at school', ico='🏫', kurz='Wörter · Schreiben', buch=(10, 11), schritte=[
        B(10, '2', 1, 'Begrüßungen: ' + HEFT), B(11, '5', 1, 'Mias E-Mail (A/B): ' + HEFT),
        B(11, '6a', 2, 'Dein Schultag: Schreibe mit dem Schreibgerüst ins Heft.'), APP('u1-theme1')]),
    dict(id='u1-a-theme2', titel='Theme 2: School clubs', ico='⚽', kurz='Wörter', buch=(12, 13), schritte=[
        B(12, '1', 1, 'Welcher Club passt? ' + HEFT), APP('u1-theme2')]),
    dict(id='u1-a-story', titel='Story: Everybody needs friends', ico='📖', kurz='Lesen · Wörter', buch=(14, 15), alt=1, schritte=[
        S('1.0'), B(15, '2', 1, 'was / were: ' + HEFT, alt='1.1'), B(15, '3', 1, 'Gefühle: ' + HEFT, alt='1.1'),
        B(15, '4', 3, 'Mia’s story: Schreibe die Geschichte ins Heft.'), A('1#0'), A('1#1'), A('1#2'), S('1.4'), APP('u1-story')]),
    dict(id='u1-a-was-were', titel='Focus on language: was / were, Did …?', ico='❓', kurz='Grammatik · Fragen und Kurzantworten', buch=(18, 18), alt=3, schritte=[
        A('3#0'), A('3#1'), A('3#2'), B(18, '8a und 8b', 1, alt='3.1'), S('3.3'), APP('u1-was-were')]),
    dict(id='u1-a-objektpronomen', titel='Focus on language: me, him, her …', ico='👉', kurz='Grammatik · Hefteintrag 2', buch=(18, 19), alt=4, schritte=[
        S('4.0'), B(18, '7', 1, 'Lies den Dialog (7a). Schreibe dann die Sätze aus 7b mit Pronomen ins Heft.', alt='4.1'),
        B(19, '10', 2, 'Präpositionen: ' + HEFT), A('4#0'), A('4#1'), A('4#2'), S('4.4'), APP('u1-objektpronomen')]),
    dict(id='u1-a-vocabulary', titel='Skills: Learning words', ico='🔤', kurz='Wortschatz', buch=(20, 20), alt=6, schritte=[
        B(20, '1a', 1, 'Schreibe die Liste ins Heft.', alt='6.0'), B(20, '2', 1, 'Opposites: Schreibe die Wortpaare ins Heft.', alt='6.0'),
        B(20, '3', 2, HEFT, alt='6.0'), A('6#0'), A('6#1'), A('6#2'), S('6.3'), S('6.4'), APP('u1-weitere')]),
    dict(id='u1-a-linking-words', titel='Skills: Writing – linking words', ico='🔗', kurz='Grammatik · Schreiben · Hefteintrag 3', buch=(21, 21), alt=5, schritte=[
        S('5.0'), B(21, '1', 1, 'Schreibe die ganzen Texte ins Heft.', alt='5.1'), B(21, '2', 1, 'Schreibe die ganzen Texte ins Heft.', alt='5.1'),
        B(21, '3', 2), B(21, '4', 3, 'Schreibe einen eigenen Text ins Heft.'), A('5#0'), A('5#1'), A('5#2'), S('5.5'), APP('u1-linking-words')]),
    dict(id='u1-a-mediation', titel='Skills: Mediation – School rules', ico='🗣️', kurz='Englisch → Deutsch · mit Partner', buch=(22, 22), alt=7, schritte=[
        S('7.0'), A('7#0'), S('7.3')]),
    dict(id='u1-a-finale', titel='Finale: Test and check', ico='🎯', kurz='Wiederholung vor der Probe · Vokabelheft', buch=(24, 24), alt=8, schluss=True, schritte=[
        B(24, '1–4', 1, TC.format(216)), S('8.0'), S('8.1'), S('8.2'), S('8.3'), APP('u1-anwenden'), APP('u1-finale')]),
  ], {1: None}),
  'u2': ('en.6.lernweg-u2', [
    dict(id='u2-a-lead-in', titel='Lead-in: A new neighbour', ico='🏠', kurz='Wortschatz · some und any', buch=(26, 27), alt=6, schritte=[
        B(26, '1', 1, 'true or false? ' + HEFT), B(27, '3', 2, 'My neighbourhood: Schreibe über deine Nachbarschaft ins Heft.'),
        A('6#0'), A('6#1'), A('6#2'), A('6#3'), S('6.1'), S('6.2'), S('6.v'), APP('u2-grundwortschatz'), APP('u2-there-is')]),
    dict(id='u2-a-theme1', titel='Theme 1: Good neighbours', ico='🤝', kurz='Wörter · Suchplakat', buch=(28, 29), schritte=[
        B(28, '1b und 1c'), B(29, '2b', 1, 'Kurzantworten: ' + HEFT), B(29, '3a', 2, 'Suchplakat: Schreibe den Text ins Heft.'),
        B(29, '3b', 3, 'Gestalte ein eigenes Suchplakat im Heft.'), APP('u2-theme1')]),
    dict(id='u2-a-theme2', titel="Theme 2: At the dogs' home", ico='🐶', kurz='Wörter · Lesen', buch=(30, 31), schritte=[
        B(30, '1b', 1, 'true, false or not in the text? ' + HEFT), B(31, '3a', 2, 'Welches Haustier passt? ' + HEFT), APP('u2-theme2')]),
    dict(id='u2-a-story', titel='Story: A play for Guy Fawkes day', ico='🎭', kurz='Story · Lesen und Wortschatz', buch=(32, 33), alt=1, schritte=[
        S('1.0'), A('1#0'), A('1#1'), A('1#2'), A('1#3'), S('1.2'), S('1.v'), S('1.4'), APP('u2-story')]),
    dict(id='u2-a-did-fragewort', titel='Focus on language: Where did you go?', ico='🧭', kurz='Grammatik · Fragen mit Fragewort · Hefteintrag 4', buch=(34, 34), alt=2, schritte=[
        S('2.0'), S('2.1'), S('2.2'), A('2#0'), A('2#1'), A('2#2'), A('2#3'), S('2.4'), S('2.v'), S('2.6'), APP('u2-did-fragewort')]),
    dict(id='u2-a-did-kurz', titel='Focus on language: Did you …? – Yes, I did.', ico='✅', kurz='Grammatik · Ja/Nein-Fragen und Kurzantworten', buch=(35, 35), alt=3, schritte=[
        S('3.0'), B(35, '3'), S('3.1'), A('3#0'), A('3#1'), A('3#2'), A('3#3'), S('3.3'), S('3.v'), S('3.5'), APP('u2-did-kurz')]),
    dict(id='u2-a-plural', titel='Focus on language: Plurals', ico='🥔', kurz='Grammatik · Mehrzahl · Hefteintrag 5', buch=(36, 36), alt=4, schritte=[
        S('4.0'), S('4.1'), S('6.3'), A('4#0'), A('4#1'), A('4#2'), A('4#3'), S('4.3'), S('4.v'), APP('u2-plural')]),
    dict(id='u2-a-can-mustnt', titel='Focus on language: Rules – can and mustn’t', ico='🚸', kurz='Grammatik · Schilder und Regeln', buch=(36, 38), alt=5, schritte=[
        S('5.0'), S('5.1'), A('5#0'), A('5#1'), A('5#2'), S('5.v'), S('5.4'), APP('u2-can-mustnt')]),
    dict(id='u2-a-fest', titel='A festival in my neighbourhood', ico='🎆', kurz='Lesen · Schreiben · Feste', buch=(37, 37), alt=9, schritte=[
        S('9.0'), A('9#0'), APP('u2-weitere')]),
    dict(id='u2-a-brief', titel='Skills: Do better in tests – a letter', ico='✉️', kurz='Schreiben · Brief an eine englische Freundin', buch=(38, 39), alt=7, schritte=[
        S('7.0'), S('7.1'), A('7#0'), A('7#1'), A('7#2'), S('7.v'), S('7.4')]),
    dict(id='u2-a-weg', titel='Skills: Speaking – Telling the way', ico='🗺️', kurz='Sprechen · nach dem Weg fragen · mit Partner', buch=(40, 40), alt=8, schritte=[
        HE('he-u2-weg'), S('8.0'), S('8.1'), A('8#0'), S('8.3'), THEMA('en.5.praepositionen', 'Übe in der Lernwelt: „Präpositionen“ (next to, opposite …).'),
        S('8.5'), APP('u2-anwenden')]),
    dict(id='u2-a-finale', titel='Finale: Test and check · Revision 1', ico='🎯', kurz='Wiederholung vor der Probe', buch=(42, 45), alt=10, schluss=True, schritte=[
        B(42, '1–3', 1, TC.format(217)), S('10.0'), S('10.1'), S('10.2'), S('10.v'), APP('u2-finale')]),
  ], {10: None}),
}
# Kann-Sätze ohne Abschnitt: Hören macht die Lehrkraft im Unterricht (Index im alten „probe“, ab 1)
IM_UNTERRICHT = {'u1': {1}, 'u2': {10}}

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


def schritt_aus_alt(x, ref, alle_ids):
    """Alter Schritt → neuer Schritt (ohne id). Gibt (teil, schritt) zurück."""
    art, text = x['art'], x['text']
    nv = x.get('niveau') if isinstance(x.get('niveau'), list) else None
    if art == 'hefteintrag':
        m = re.search(r'Hefteintrag (\d+)', text)
        s = {'art': 'hefteintrag', 'baustein': HE_ALT[m.group(1)]}
        if 'noch einmal' in text: s['wiederholen'] = True
        return 'he', s
    if art == 'app':
        z = x.get('ziel') or {}
        th = z.get('thema') or thema_aus_link(x.get('link'))
        ziel = {'runden': z.get('runden', 1), 'prozent': z.get('prozent', 70)}
        if text.startswith('Vokabeltrainer Klasse 6, Unit 1: mindestens 2 Runden'): th, ziel = 'en.6.vok.u1', {'runden': 2, 'prozent': 70}
        assert th in alle_ids, f'{ref}: App-Thema {th} fehlt im Katalog'
        return 'app', {'art': 'app', 'thema': th, 'ziel': ziel, 'text': text}
    if art == 'extra':
        s = {'art': 'extra', 'text': ohne(text, 'Extra: ')}
        if thema_aus_link(x.get('link')): s['thema'] = thema_aus_link(x.get('link'))
        return 'extra', s
    if art == 'vokabeln' or art == 'heft':
        return 'vok', {'art': 'vokabeln', 'text': ohne(text, 'Vokabelheft: ')}
    if art == 'buch' and text.startswith('Lies ') and ' im Buch S. ' in text:
        m = re.search(r'^(.*) im Buch S\. (\d+)–(\d+)\.$', text)
        return 'lesen', {'art': 'lesen', 'buch': {'seite': int(m.group(2)), 'bis': int(m.group(3))}, 'text': m.group(1) + '.'}
    if art in ('buch', 'partner'):
        b, rest = buch_aus(text)
        assert b, f'{ref}: Buchverweis nicht erkannt: {text}'
        if nv and len(nv) == 1: rest = ohne(rest, 'Profi: ', '– ')
        return ('partner' if art == 'partner' else 'buch'), {'art': 'partner' if art == 'partner' else 'uebung', 'buch': b, 'text': rest}
    raise SystemExit(f'{ref}: Schritt ({art}) nicht zugeordnet: {text}')


def umwandeln():
    alle_ids = katalog_ids()
    journey = json.loads(JOURNEY.read_text(encoding='utf-8'))
    try: alt_b = json.loads(BAUSTEINE.read_text(encoding='utf-8'))
    except FileNotFoundError: alt_b = {'bausteine': []}
    vorher = {b.get('id'): b for b in alt_b.get('bausteine', [])}
    bausteine, neu_ids = [], set()

    def baustein(b):
        neu_ids.add(b['id'])
        if 'loesung' in (vorher.get(b['id']) or {}): b['loesung'] = vorher[b['id']]['loesung']   # von Hand ergänzt → behalten
        bausteine.append(b)

    for b in HE_NEU:
        if b['id'] in vorher and vorher[b['id']].get('zeilen'): b = vorher[b['id']]          # Inhalt inzwischen nachgetragen
        baustein(dict(b))

    for uid, (weg, abschnitte_spec, _) in UNITS.items():
        lw = json.loads((ROOT / f'daten/lernwege/{weg}.json').read_text(encoding='utf-8'))
        unit = next(u for u in journey['units'] if u['id'] == uid)
        st_ids = {s['id'] for s in unit['stationen']}
        alt_st = {s['nr']: s for s in lw['stationen']}
        for nr, h in lw['hefteintraege'].items():
            b = {'id': HE_ALT[nr], 'art': 'hefteintrag', 'titel': h['titel'], 'zeilen': h['zeilen']}
            if h.get('merke'): b['merke'] = h['merke']
            baustein(b)

        def alt_schritt(ref):
            nr, key = ref.split('.')
            s = alt_st[int(nr)]
            for i, x in enumerate(s['schritte']):
                if (str(x['id']) if 'id' in x else str(i)) == key: return s, x
            raise SystemExit(f'{uid}: alter Schritt {ref} fehlt')

        def aufgaben_key(nr, schreiben):
            """Schlüssel des alten Schritts, der die Aufgabe trug („aufgaben“ oder bei Schreibaufgaben „schreiben“)."""
            s = alt_st[nr]
            mit_schreiben = any(y['art'] == 'schreiben' for y in s['schritte'])
            art = 'schreiben' if (schreiben and mit_schreiben) else 'aufgaben'
            for i, x in enumerate(s['schritte']):
                if x['art'] == art: return f'{nr}.' + (str(x['id']) if 'id' in x else str(i)), x
            raise SystemExit(f'{uid}: Station {nr} ohne Schritt {art}')

        benutzt, abschnitte, alt_zu_abschnitt = set(), [], {}
        for sp in abschnitte_spec:
            aid = sp['id']
            a = {'id': aid, 'titel': sp['titel'], 'kurz': sp.get('kurz', ''), 'ico': sp.get('ico', '')}
            if sp.get('buch'): a['buch'] = {'von': sp['buch'][0], 'bis': sp['buch'][1]}
            alt = alt_st.get(sp.get('alt'))
            if alt:
                for k in ('kompetenz', 'wahl', 'merk'):
                    if alt.get(k): a[k] = alt[k]
                alt_zu_abschnitt[alt['nr']] = aid
            if sp.get('schluss'): a['schluss'] = True
            schritte, n = [], {}

            def neu(teil, s):
                n[teil] = n.get(teil, 0) + 1
                s = {'id': f'{aid}-{teil}' + (str(n[teil]) if n[teil] > 1 else ''), **s}
                if 'alt' in s: s['alt'] = s.pop('alt')                        # alt ans Ende
                schritte.append(s)

            for t in sp['schritte']:
                if t[0] == 'buch':
                    _, b, sterne, text, ref = t
                    s = {'art': 'uebung', 'buch': b, 'text': text}
                    if NIVEAU[sterne]: s['niveau'] = NIVEAU[sterne]
                    if ref: s['alt'] = ref; benutzt.add(ref)
                    neu('buch', s)
                elif t[0] == 'alt':
                    st, x = alt_schritt(t[1])
                    teil, s = schritt_aus_alt(x, f'{uid} {t[1]}', alle_ids)
                    if isinstance(x.get('niveau'), list): s['niveau'] = x['niveau']
                    s['alt'] = t[1]; benutzt.add(t[1])
                    neu(teil, s)
                elif t[0] == 'aufg':
                    nr, i = (int(v) for v in t[1].split('#'))
                    au = alt_st[nr]['aufgaben'][i]
                    key, trager = aufgaben_key(nr, au['art'] == 'schreiben')
                    bid = f'ue-{uid}-{aid[len(uid) + 3:]}-{au["nr"].lower()}'    # u1-a-story, Aufgabe A → ue-u1-story-a
                    if bid in neu_ids: bid += str(sum(1 for x in neu_ids if x == bid or re.fullmatch(re.escape(bid) + r'\d', x)) + 1)   # gleiche Aufgabe je Niveau
                    b = {'id': bid, 'art': 'uebung', 'typ': au['art']}
                    b.update({k: v for k, v in au.items() if k not in ('nr', 'art', 'niveau')})
                    baustein(b)
                    s = {'art': 'uebung', 'baustein': bid}
                    if trager['art'] == 'schreiben': s['text'] = re.sub(r'^Aufgabe [A-Z]: ', '', trager['text'])
                    if isinstance(au.get('niveau'), list): s['niveau'] = au['niveau']
                    s['alt'] = key; benutzt.add(key); benutzt.add(f'{nr}#{i}')
                    neu('ue', s)
                elif t[0] == 'he':
                    s = {'art': 'hefteintrag', 'baustein': t[1]}
                    if t[2]: s['wiederholen'] = True
                    neu('he', s)
                elif t[0] == 'station':
                    assert t[1] in st_ids, f'{aid}: Station {t[1]} fehlt in journey6.json'
                    schritte.append({'id': f'{aid}-{t[1]}', 'art': 'app', 'station': t[1]})
                elif t[0] == 'thema':
                    assert t[1] in alle_ids, f'{aid}: Thema {t[1]} fehlt im Katalog'
                    neu('app', {'art': 'app', 'thema': t[1], 'ziel': t[3], 'text': t[2]})
            if any(s.get('niveau') for s in schritte) and not a.get('wahl'): a['niveaus'] = True
            if alt:
                a['alt'] = {'nr': alt['nr']}
                for i, x in enumerate(alt['schritte']):
                    if x['art'] == 'kontrolle': a['alt']['kontrolle'] = f'{alt["nr"]}.' + (str(x['id']) if 'id' in x else str(i))
                    if x['art'] == 'heft' and 'Fit für die Probe' in x['text']: a['alt']['probe'] = f'{alt["nr"]}.{i}'
            a['schritte'] = schritte
            abschnitte.append(a)

        # Jeder alte Schritt (außer Kontrolle und „Fit für die Probe“) und jede alte Aufgabe ist genau einmal übernommen
        for s in lw['stationen']:
            for i, x in enumerate(s['schritte']):
                ref = f'{s["nr"]}.' + (str(x['id']) if 'id' in x else str(i))
                if x['art'] == 'kontrolle' or 'Fit für die Probe' in x['text']: continue
                assert ref in benutzt, f'{uid}: alter Schritt {ref} ({x["art"]}: {x["text"][:50]}) fehlt'
            for i in range(len(s.get('aufgaben', []))):
                assert f'{s["nr"]}#{i}' in benutzt, f'{uid}: alte Aufgabe {s["nr"]}#{i} fehlt'

        kann = []
        for i, p in enumerate(lw.get('probe', []), 1):
            bid = f'kann-{uid}-{i}'
            baustein({'id': bid, 'art': 'kann', 'teil': p['teil'], 'text': p['kann']})
            k = {'baustein': bid, 'abschnitt': alt_zu_abschnitt.get(p.get('station'))}
            if i in IM_UNTERRICHT[uid]: k['imUnterricht'] = True
            kann.append(k)

        unit['alt'] = weg
        for k in ('wahlAnzahl', 'zieleVorher'):
            if lw.get(k) is not None: unit[k] = lw[k]
        unit['abschnitte'] = abschnitte
        unit['kann'] = kann

    # Bausteine anderer Units (später von Hand oder im Editor angelegt) bleiben stehen
    bausteine += [b for b in alt_b.get('bausteine', []) if b.get('id') not in neu_ids and not re.match(r'(ue|kann|he)-u[12]-', b.get('id', ''))]
    kopf = {
        'version': 1,
        'weg': 'daten/journey6.json',
        'hinweis': 'Bausteine des English Journey Year 6: Hefteinträge (zeilen [text, stil], stil g = grün, b = fett), '
                   'eigene Übungen (typ wie im alten Lernweg, loesung zum Aufklappen) und Kann-Sätze fürs Finale. '
                   'Die Reihenfolge und die Buchverweise stehen in daten/journey6.json (units → abschnitte → schritte). '
                   'IDs nie umbenennen: Erledigtes steht als Lernstand jw:<ID> im Pass. Format: README → Lernweg im English Journey.',
        'bausteine': bausteine,
    }
    for u in journey['units']:            # Abschnitte und Kann-Sätze hinter die Stationen, damit der Kopf der Unit oben bleibt
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
