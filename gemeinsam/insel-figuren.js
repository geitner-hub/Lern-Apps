// ═══════════════════════════════════════════════════════
//  Lernwelt – insel-figuren.js   („Die Insel“: Figuren, Dinge, Vorlesen)
//
//  Wird geladen von: spiele/insel.html
//  Braucht: avatar3d.js (LernAvatar.figur), insel-welt.js (LernInselWelt.backe)
//
//  - Pass-Figur und Bewohner im Klötzchen-Stil der Lernwelt. Bewohner haben eigene Looks aus
//    daten/insel-auftraege.json (Frisur, Kleidung – passend zu ihren Merkmalen in den Aufträgen)
//    und werden „gebacken“: wenige Draw-Calls statt ~35 je Figur.
//  - Dinge in der Welt: Warenkisten (Eier, Fisch …) und Pakete. Eigene kleine Modelle, keine Blöcke –
//    sie stehen nicht im Weg und ändern die Welt nicht.
//  - Vorlesen mit englischer Stimme (wie Room Detective und Kitchen-Chaos).
//
//  API (window.LernInselFiguren):
//    HOEHE                          Größe einer Figur in Blöcken
//    aufstellen(look?)              → Promise { figur, gruppe } (look null = eigene Pass-Figur)
//    bewohner(T, welt, liste)       → Promise [{ def, x, y, z, blick, grund, gruppe }]
//    kiste(T, farbe) / paket(T)     → Gruppe (gebacken)
//    schatten(T)                    → runder Schattenfleck
//    sprich(text) / kannSprechen()  Vorlesen (englisch)
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernInselFiguren) return;

  const HOEHE = 1.75;

  async function aufstellen(look) {
    const f = await LernAvatar.figur(look || null, { ohneSchatten: true });
    const box = new f.THREE.Box3().setFromObject(f.root);
    const s = HOEHE / Math.max(1, box.max.y - box.min.y);
    f.root.scale.setScalar(s);
    f.root.position.y = -box.min.y * s;
    const g = new f.THREE.Group();
    g.add(f.root);
    f.pose({ lauf: 0, t: 0 });
    return { figur: f, gruppe: g };
  }

  function schatten(T) {
    const m = new T.Mesh(new T.CircleGeometry(.42, 14), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .26, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 3;
    return m;
  }

  /** Bewohner an ihre Plätze stellen; liste: [{ def, x, z, blick }] */
  async function bewohner(T, welt, liste) {
    const out = [];
    for (const b of liste) {
      try {
        const gruppe = LernInselWelt.backe(T, (await aufstellen(b.def.look)).gruppe);
        const y = welt.boden(b.x, b.z);
        gruppe.position.set(b.x, y, b.z);
        gruppe.rotation.y = b.blick || 0;
        const sch = schatten(T);
        sch.position.set(b.x, y + .02, b.z);
        out.push({ def: b.def, x: b.x, y, z: b.z, blick: b.blick || 0, grund: b.blick || 0, gruppe, schatten: sch });
      } catch (e) {}
    }
    return out;
  }

  const MAT = {};
  function lam(T, c) { return MAT[c] || (MAT[c] = new T.MeshLambertMaterial({ color: c })); }
  function klotz(T, g, w, h, d, x, y, z, c) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), lam(T, c));
    m.position.set(x, y + h / 2, z);
    g.add(m);
  }
  /** Offene Holzkiste mit Waren obendrauf (Farbe der Ware) */
  function kiste(T, farbe) {
    const g = new T.Group();
    klotz(T, g, .9, .08, .9, 0, 0, 0, '#7a4a28');
    [[-.41, 0], [.41, 0]].forEach(([x]) => klotz(T, g, .08, .5, .9, x, .08, 0, '#a86f3e'));
    [[0, -.41], [0, .41]].forEach(([, z]) => klotz(T, g, .9, .5, .08, 0, .08, z, '#a86f3e'));
    [[-.2, -.2], [.2, -.18], [-.18, .2], [.2, .2], [0, 0]].forEach(([x, z], i) => klotz(T, g, .26, .26, .26, x, i === 4 ? .5 : .36, z, farbe));
    return LernInselWelt.backe(T, g);
  }
  /** Paket mit Schnur */
  function paket(T) {
    const g = new T.Group();
    klotz(T, g, .62, .5, .62, 0, 0, 0, '#c08a52');
    klotz(T, g, .66, .52, .1, 0, 0, 0, '#b91c1c');
    klotz(T, g, .1, .52, .66, 0, 0, 0, '#b91c1c');
    klotz(T, g, .22, .1, .22, 0, .5, 0, '#dc2626');
    return LernInselWelt.backe(T, g);
  }

  // ── Vorlesen (englische Stimme) ─────────────────────────
  let STIMME = null;
  const kannSprechen = () => 'speechSynthesis' in window;
  function stimmeWaehlen() {
    if (!kannSprechen()) return;
    const v = speechSynthesis.getVoices();
    STIMME = v.find(s => /en[-_]GB/i.test(s.lang)) || v.find(s => /^en/i.test(s.lang)) || null;
  }
  if (kannSprechen()) { stimmeWaehlen(); speechSynthesis.onvoiceschanged = stimmeWaehlen; }
  function sprich(text) {
    if (!kannSprechen() || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = (STIMME && STIMME.lang) || 'en-GB';
      if (STIMME) u.voice = STIMME;
      u.rate = .9;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function still() { try { if (kannSprechen()) speechSynthesis.cancel(); } catch (e) {} }

  window.LernInselFiguren = { HOEHE, aufstellen, bewohner, kiste, paket, schatten, sprich, still, kannSprechen };
})();
