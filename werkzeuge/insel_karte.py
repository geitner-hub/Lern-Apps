#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════
#  Lernwelt – insel_karte.py   („Die Insel“: Höhenkarte und Gebietskarte erzeugen)
#
#  Schreibt NUR die Felder "hoehen" und "gebietskarte" in daten/insel.json.
#  Alles andere dort (Gebiete, Vorlagen, Gebäude, Plätze, Wege, Bauplätze,
#  Schilder, Bäume) wird von Hand gepflegt und bleibt unverändert.
#
#  Aufbau der Insel (96 × 96 Blöcke, Norden = oben = kleines z):
#    Hafendorf (h)            Süden, flach, Startgebiet, Hafenbucht im Süden
#    Baumeister-Tal (t)       Nordwesten, Talboden mit Hügeln rundherum;
#                             vom Hafendorf durch einen Meeresarm getrennt (Fähre, Etappe 5)
#    Kartenleser-Hochland (k) Nordosten, Hochebene; vom Tal durch einen Fluss getrennt
#                             (Brücke, Etappe 5), vom Hafendorf durch eine Steilkante
#
#  Format in insel.json:
#    hoehen        96 Zeilen (z = 0 … 95) mit je 96 Zeichen (x), Ziffern 0–9 und a–n = 0–23
#                  (Anzahl fester Blöcke in der Spalte; Wasserlinie W aus "wasser")
#    gebietskarte  96 Zeilen mit je 96 Zeichen: Gebietszeichen oder '.' (Meer)
#
#  Aufruf:  python3 werkzeuge/insel_karte.py      (danach pruefen.py)
# ═══════════════════════════════════════════════════════
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATEI = ROOT / 'daten' / 'insel.json'
N, W = 96, 5
SEED = 4711
ZEICHEN = '0123456789abcdefghijklmn'


def h2(x, z, s):
    h = (x * 374761393 + z * 668265263 + s * 1442695041) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    h ^= h >> 16
    return h / 4294967296


def rausch(x, z, s):
    ix, iz = math.floor(x), math.floor(z)
    fx, fz = x - ix, z - iz
    u, v = fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)
    a, b, c, d = h2(ix, iz, s), h2(ix + 1, iz, s), h2(ix, iz + 1, s), h2(ix + 1, iz + 1, s)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v


def fbm(x, z, s):
    return rausch(x / 18, z / 18, s) * .6 + rausch(x / 8, z / 8, s + 1) * .3 + rausch(x / 4, z / 4, s + 2) * .1


def glatt(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def abstand_strecke(px, pz, ax, az, bx, bz):
    dx, dz = bx - ax, bz - az
    t = max(0, min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)))
    return math.hypot(px - ax - t * dx, pz - az - t * dz)


def abstand_linie(px, pz, punkte):
    return min(abstand_strecke(px, pz, *punkte[i], *punkte[i + 1]) for i in range(len(punkte) - 1))


# Meeresarm (Hafendorf | Tal) und Fluss (Tal | Hochland)
ARM = [(-6, 47), (14, 49), (30, 51), (44, 50)]
FLUSS = [(46, -6), (44, 12), (47, 28), (44, 42), (44, 50)]
KANTE_Z = 53                     # Steilkante Hafendorf | Hochland (östlich vom Fluss)


def gebiet(x, z):
    if z >= KANTE_Z or (x < 44 and z >= 50):
        return 'h'
    return 't' if x < 45 + 2 * math.sin(z / 9) else 'k'


def karte():
    hoehen, gebiete = [], []
    c, R = N / 2, N / 2 - 3
    for z in range(N):
        zh, zg = '', ''
        for x in range(N):
            dx, dz = (x + .5 - c) / R, (z + .5 - c) / R
            d = (abs(dx) ** 3 + abs(dz) ** 3) ** (1 / 3) + (fbm(x, z, SEED + 7) - .5) * .28   # eher eckig: mehr Platz
            land = 1 - glatt(.86, 1.02, d)                      # 1 = Inselinneres, 0 = Meer
            g = gebiet(x, z)
            n = fbm(x, z, SEED)
            if g == 'h':                                        # flach, leicht wellig
                h = 7 + (n - .5) * 3
            elif g == 't':                                      # Talboden, Ränder steigen an
                rand = min(abstand_linie(x, z, ARM), abstand_linie(x, z, FLUSS))
                mitte = math.hypot(x - 24, z - 28)
                h = 8 + (n - .5) * 2 + glatt(12, 22, mitte) * 5 * (1 - glatt(2, 8, -rand + 8))
            else:                                               # Hochebene
                h = 14 + (n - .5) * 4
            h = W - 3 + (h - (W - 3)) * land
            # Meeresarm, Fluss und Hafenbucht ausschneiden
            arm = abstand_linie(x, z, ARM)
            fluss = abstand_linie(x, z, FLUSS)
            bucht = math.hypot((x - 54) / 1.3, z - 97)
            if arm < 4.5: h = min(h, W - 2 + glatt(2.5, 4.5, arm) * 3)
            if fluss < 3: h = min(h, W - 2 + glatt(1.6, 3, fluss) * 3)
            if bucht < 12: h = min(h, W - 2 + glatt(8, 12, bucht) * 4)
            h = max(1, min(17, round(h)))
            zh += ZEICHEN[h]
            zg += g if h >= W else '.'
        hoehen.append(zh)
        gebiete.append(zg)
    return hoehen, gebiete


def main():
    daten = json.loads(DATEI.read_text(encoding='utf-8')) if DATEI.is_file() else {}
    hoehen, gebiete = karte()
    daten['groesse'] = N
    daten['wasser'] = W
    daten['hoehen'] = hoehen
    daten['gebietskarte'] = gebiete
    # Schlüssel mit den langen Karten ans Ende (die Datei bleibt oben lesbar)
    lang = {k: daten.pop(k) for k in ('hoehen', 'gebietskarte')}
    daten.update(lang)
    text = json.dumps(daten, ensure_ascii=False, indent=1)
    DATEI.write_text(text + '\n', encoding='utf-8')
    print(f'{DATEI.relative_to(ROOT)} geschrieben ({len(text) // 1024} KB)')
    for z in range(0, N, 3):
        print(''.join(hoehen[z][x] if gebiete[z][x] != '.' else ' ' for x in range(0, N, 1)))


if __name__ == '__main__':
    main()
