// ═══════════════════════════════════════════════════════
//  Lernwelt – generatoren-mathe.js   (Rechen-Aufgaben aus einer Quelle, Infrastruktur Etappe 4)
//
//  Alle Mathe-Aufgaben der Lernwelt entstehen hier: im Übungs-Rahmen (ueben.js,
//  Kopfrechnen mit Stufen) UND in den Spielen (aufgaben.js → RUN!, Tower Defense …).
//  So stellen Spiele genau die Aufgaben, die die App übt.
//
//  Welche Generatoren eine Stufe nutzt, steht in daten/kopfrechnen.json:
//    { "typ": "punkt-vor-strich", "gewicht": 2 }        (weitere Felder = Parameter)
//
//  API (window.LernGeneratoren):
//    TYPEN                      Liste der Generator-Namen (pruefen.py liest sie)
//    erzeuge(spec)              → Aufgabe { frage, wert, text, art, falsch[], tipp, erklaerung, hinweis?, optionen? }
//         art: 'zahl' (auch Dezimal/negativ) · 'bruch' (wert {n,d}) · 'rest' (wert {q,r}) · 'wahl' (optionen[])
//         gekuerzt: true → nur die vollständig gekürzte Form gilt
//    ausStufe(stufe)            → Aufgabe aus einer Stufe { generatoren: [spec, …] } (gewichtet)
//    pruefe(aufgabe, eingabe)   → true/false   (eingabe: Text; bei 'rest' { q, r })
//    spielAufgabe(stufe|spec)   → { frage, antwort, falsch[≥2], hinweis? } für aufgaben.js, sonst null
//    zahl(n), bruchText(f)      Darstellung (deutsch: Komma, echtes Minus, 34 000)
//
//  Neuer Aufgabentyp: unten in G eintragen (Funktion → Aufgabe oder null = nochmal würfeln).
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernGeneratoren) return;

  // ── Hilfen ─────────────────────────────────────────────
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = l => l[Math.floor(Math.random() * l.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const NBSP = '\u00A0';
  /** Zahl deutsch: Komma, echtes Minus, ab 10 000 mit Leerzeichen gruppiert */
  function zahl(n) {
    if (typeof n === 'string') return n.replace('-', '−').replace('.', ',');
    const neg = n < 0, s = String(Math.abs(n));
    let [ganz, nach] = s.split('.');
    if (ganz.length > 4) ganz = ganz.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    return (neg ? '−' : '') + ganz + (nach ? ',' + nach : '');
  }
  const runde = (x, st) => Math.round(x * 10 ** st) / 10 ** st;
  const genau = x => parseFloat(Number(x).toPrecision(12));        // 0.1 + 0.2 → 0.3
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
  const lcm = (a, b) => (a * b) / gcd(a, b);
  function kuerze(n, d) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; }
  function bruchText(f) { const s = kuerze(f.n, f.d); return s.d === 1 ? zahl(s.n) : `${zahl(s.n)}/${s.d}`; }
  const klammer = n => n < 0 ? '(' + zahl(n) + ')' : zahl(n);

  /** Ablenker für Zahlen: nahe Werte, typische Fehler; nie gleich der Lösung */
  function zahlAblenker(ans, extra = [], negativ = false) {
    const c = [...extra, ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10];
    if (Number.isInteger(ans) && ans >= 10 && ans < 100) c.push(Number(String(ans).split('').reverse().join('')));
    const out = [];
    shuffle(c.slice(0, extra.length)).concat(shuffle(c.slice(extra.length))).forEach(x => {
      x = genau(x);
      if (!Number.isFinite(x) || x === ans || out.includes(x)) return;
      if (!negativ && x < 0) return;
      out.push(x);
    });
    return out;
  }

  // ── Bausteine für Aufgaben ─────────────────────────────
  /** Rechenaufgabe mit Zahl als Lösung */
  function rechen(frage, ans, extra = [], negativ = false, o = {}) {
    return Object.assign({ frage, wert: ans, text: zahl(ans), art: 'zahl', falsch: zahlAblenker(ans, extra, negativ).map(zahl), negativ: negativ || ans < 0 }, o);
  }
  function bruch(frage, f, falschListe = [], o = {}) {
    const text = bruchText(f);
    const falsch = [...new Set(falschListe.filter(x => x && x.d > 0).map(bruchText))].filter(x => x !== text);
    return Object.assign({ frage, wert: kuerze(f.n, f.d), text, art: 'bruch', falsch }, o);
  }
  function wahl(frage, richtig, optionen, o = {}) {
    return Object.assign({ frage, wert: richtig, text: richtig, art: 'wahl', optionen, falsch: optionen.filter(x => x !== richtig) }, o);
  }

  /** Standard-Tipp zu einfachen Aufgaben „a op b“ */
  function tippFuer(frage) {
    const m = /^(−?[\d\s ]+)\s([+−×÷])\s(\(?−?[\d\s ,]+\)?)$/.exec(frage.trim());
    if (!m) return '';
    const a = Number(m[1].replace(/[\s ]/g, '').replace('−', '-')), op = m[2], b = Number(m[3].replace(/[()\s ]/g, '').replace('−', '-').replace(',', '.'));
    if (op === '+') { const h = Math.ceil(b / 10) * 10; return h !== b && b > 0 && b < 100 ? `Rechne ${zahl(a)} + ${h} und nimm dann ${h - b} weg.` : `Zerlege: erst die großen Stellen, dann die kleinen.`; }
    if (op === '−') return `Was musst du zu ${zahl(b)} dazuzählen, um ${zahl(a)} zu bekommen?`;
    if (op === '×') return `Denk an die Einmaleins-Reihe von ${zahl(Math.min(a, b))}.`;
    return `Frag dich: ${zahl(b)} × ? = ${zahl(a)}`;
  }

  // ═══════════════════════════════════════════════════════
  //  ALTE STUFEN (Klassen 1–6, aus den bisherigen Kopfrechen-Apps)
  //  Werden als Förder-Stufen und für die Spiele weiterverwendet.
  // ═══════════════════════════════════════════════════════
  function alt1(level) {
    for (let v = 0; v < 80; v++) {
      if (level === 'leicht') {
        if (Math.random() < .5) { const a = rand(1, 5), b = rand(1, 5); return rechen(`${a} + ${b}`, a + b); }
        const a = rand(2, 9), b = rand(1, a - 1); return rechen(`${a} − ${b}`, a - b);
      }
      if (level === 'mittel') {
        const t = pick(['add20', 'sub20', 'zehner', 'tausch']);
        if (t === 'add20') { const a = rand(1, 12), b = rand(1, 12); if (a + b > 20) continue; return rechen(`${a} + ${b}`, a + b); }
        if (t === 'sub20') { const a = rand(5, 20), b = rand(1, a); return rechen(`${a} − ${b}`, a - b); }
        if (t === 'zehner') { const a = rand(1, 5) * 10, b = rand(1, 4) * 10; return a + b > 90 ? rechen(`${a} − ${b}`, a - b) : rechen(`${a} + ${b}`, a + b); }
        const a = rand(2, 9), b = rand(1, 9); return rechen(`${b} + ${a}`, a + b);
      }
      const t = pick(['add', 'sub', 'zehner', 'ergaenz']);
      if (t === 'add') { const a = rand(7, 14), b = rand(Math.max(1, 14 - a), 9); return rechen(`${a} + ${b}`, a + b, [], false, { tipp: 'Rechne erst bis 10, dann weiter.' }); }
      if (t === 'sub') { const a = rand(11, 20), b = rand(Math.max(1, a - 9), 9); return rechen(`${a} − ${b}`, a - b, [], false, { tipp: 'Rechne erst bis 10 zurück, dann weiter.' }); }
      if (t === 'zehner') { const a = rand(1, 9) * 10, b = rand(1, 9) * 10; if (a + b <= 100) return rechen(`${a} + ${b}`, a + b); if (a > b) return rechen(`${a} − ${b}`, a - b); continue; }
      const z = rand(3, 9), b = rand(1, z - 1);
      return rechen(`${b} + ? = ${z}`, z - b, [], false, { tipp: `Zähle von ${b} hoch bis ${z}.`, erklaerung: `${z} − ${b} = ${z - b}, also ${b} + ${z - b} = ${z}.` });
    }
    return rechen('3 + 4', 7);
  }
  function alt2(level) {
    for (let v = 0; v < 80; v++) {
      if (level === 'leicht') {
        const t = pick(['add', 'sub', 'mal', 'div']), f = pick([2, 5, 10]), a = rand(1, 10);
        if (t === 'add') { const x = rand(1, 12), y = rand(1, 12); if (x + y > 20) continue; return rechen(`${x} + ${y}`, x + y); }
        if (t === 'sub') { const x = rand(5, 20), y = rand(1, x); return rechen(`${x} − ${y}`, x - y); }
        if (t === 'mal') return rechen(`${a} × ${f}`, a * f, [a * (f + 1)]);
        return rechen(`${f * a} ÷ ${f}`, a);
      }
      if (level === 'mittel') {
        const t = pick(['add', 'sub', 'mal', 'div']);
        if (t === 'add') { const a = rand(1, 9) * 10, b = rand(1, 9) * 10; if (a + b > 100) continue; return rechen(`${a} + ${b}`, a + b); }
        if (t === 'sub') { const a = rand(2, 10) * 10, b = rand(1, a / 10 - 1) * 10; return rechen(`${a} − ${b}`, a - b); }
        if (t === 'mal') { const f = pick([2, 3, 4, 5, 10]), a = rand(1, 10); return rechen(`${a} × ${f}`, a * f, [a * (f + 1)]); }
        const f = pick([2, 3, 4, 5]), a = rand(1, 10); return rechen(`${f * a} ÷ ${f}`, a);
      }
      const t = pick(['add', 'sub', 'mal', 'halb']);
      if (t === 'add') { const a = rand(15, 60), b = rand(5, 40); if (a + b > 100) continue; return rechen(`${a} + ${b}`, a + b); }
      if (t === 'sub') { const a = rand(20, 99), b = rand(3, a - 1); return rechen(`${a} − ${b}`, a - b); }
      if (t === 'mal') { const f = rand(2, 5), a = rand(1, 10); return rechen(`${f} × ${a}`, f * a, [f * (a + 1)]); }
      const a = rand(1, 12) * 2; return rechen(`${a} ÷ 2`, a / 2, [], false, { tipp: 'Halbiere die Zahl.' });
    }
    return rechen('3 + 4', 7);
  }
  function alt3(level) {
    if (level === 'leicht') {
      const t = pick(['add', 'sub', 'mal', 'div']);
      if (t === 'add') { const a = rand(1, 10), b = rand(1, 20 - a); return rechen(`${a} + ${b}`, a + b); }
      if (t === 'sub') { const a = rand(5, 20), b = rand(1, Math.min(a - 1, 9)); return rechen(`${a} − ${b}`, a - b); }
      if (t === 'mal') { const a = rand(2, 5), b = rand(1, 5); return rechen(`${a} × ${b}`, a * b); }
      const b = rand(2, 5), q = rand(1, 5); return rechen(`${b * q} ÷ ${b}`, q);
    }
    if (level === 'mittel') {
      const t = pick(['add', 'sub', 'mal', 'div']);
      if (t === 'add') { const a = rand(1, 8) * 10, b = rand(1, 9 - a / 10) * 10; return rechen(`${a} + ${b}`, a + b); }
      if (t === 'sub') { const a = rand(2, 9) * 10, b = rand(1, a / 10 - 1) * 10; return rechen(`${a} − ${b}`, a - b); }
      if (t === 'mal') { const a = rand(2, 10), b = rand(2, 10); return rechen(`${a} × ${b}`, a * b, [a * (b + 1)]); }
      const a = rand(2, 10), b = rand(2, 10); return rechen(`${a * b} ÷ ${a}`, b);
    }
    const t = pick(['add', 'sub', 'mal', 'analog', 'term']);
    if (t === 'add') { const a = rand(1, 8) * 100, b = rand(1, 9 - a / 100) * 100; return rechen(`${a} + ${b}`, a + b, [a + b + 100]); }
    if (t === 'sub') { const a = rand(2, 9) * 100, b = rand(1, a / 100 - 1) * 100; return rechen(`${a} − ${b}`, a - b, [a - b + 100]); }
    if (t === 'mal') { const a = rand(3, 10), b = rand(3, 10); return rechen(`${a} × ${b}`, a * b, [a * (b + 1)]); }
    if (t === 'analog') { const a = rand(2, 9), b = rand(2, 9); return rechen(`${a} × ${b * 10}`, a * b * 10, [a * b], false, { tipp: `Rechne ${a} × ${b} und hänge eine Null an.` }); }
    const a = rand(2, 9), b = rand(2, 9), c = rand(1, 9);
    return rechen(`${a} × ${b} + ${c}`, a * b + c, [a * (b + c)], false, { tipp: 'Punkt vor Strich: erst malnehmen, dann plus.' });
  }
  // Klasse 4 (Wiederholung) – bisher kopfrechnen_kl4.html bzw. aufgaben.js
  function alt4(level) {
    for (let v = 0; v < 80; v++) {
      if (level === 'leicht') {
        const t = pick(['add', 'sub', 'mal', 'zehn']);
        if (t === 'add') { const a = rand(10, 59), b = rand(10, 39); if (a + b > 100) continue; return rechen(`${a} + ${b}`, a + b); }
        if (t === 'sub') { const a = rand(30, 99), b = rand(10, 30); if (b >= a) continue; return rechen(`${a} − ${b}`, a - b); }
        if (t === 'mal') { const a = rand(2, 10), b = rand(2, 10); return rechen(`${a} × ${b}`, a * b, [a * (b + 1), a * (b - 1)]); }
        const a = rand(2, 9);
        return Math.random() < .5 ? rechen(`${a} × 10`, a * 10, [a * 100, a + 10]) : rechen(`${a * 10} ÷ 10`, a, [a * 100, a * 10 - 10]);
      }
      if (level === 'mittel') {
        const t = pick(['add', 'sub', 'mal', 'div']);
        if (t === 'add') { const a = rand(1, 7) * 100, b = rand(1, 9 - a / 100) * 100; return rechen(`${a} + ${b}`, a + b, [a + b + 100, a + b - 100]); }
        if (t === 'sub') { const a = rand(2, 9) * 100, b = rand(1, a / 100 - 1) * 100; return rechen(`${a} − ${b}`, a - b, [a - b + 100, a - b - 100]); }
        if (t === 'mal') { const a = rand(2, 9) * 10, b = rand(2, 9); return rechen(`${a} × ${b}`, a * b, [a * (b + 1), a * b / 10], false, { tipp: `Rechne ${a / 10} × ${b} und hänge eine Null an.` }); }
        const a = rand(2, 10), b = rand(2, 10); return rechen(`${a * b} ÷ ${a}`, b, [b + 1, b - 1]);
      }
      const t = pick(['add', 'sub', 'mal', 'rest', 'term']);
      if (t === 'add') { const a = rand(200, 700), b = rand(100, 400); if (a + b > 1000) continue; return rechen(`${a} + ${b}`, a + b, [a + b - 100, a + b + 10]); }
      if (t === 'sub') { const a = rand(300, 999), b = rand(100, 300); if (b >= a) continue; return rechen(`${a} − ${b}`, a - b, [a - b + 100, a - b - 10]); }
      if (t === 'mal') { const a = rand(11, 49), b = rand(2, 9); if (a % 10 === 0) continue; const z = a - a % 10; return rechen(`${a} × ${b}`, a * b, [a * (b + 1), z * b + a % 10], false, { tipp: `Zerlege: ${z} × ${b} und ${a % 10} × ${b}.`, erklaerung: `${z} × ${b} = ${z * b}, ${a % 10} × ${b} = ${(a % 10) * b}, zusammen ${a * b}.` }); }
      if (t === 'rest') {
        const d = rand(2, 9), q = rand(3, 9), r = rand(1, d - 1);
        const falsch = [`${q + 1} R ${r}`, `${q} R ${r === d - 1 ? r - 1 : r + 1}`, `${q - 1} R ${r}`].filter(x => x !== `${q} R ${r}` && !/R 0$|^0 /.test(x));
        return { frage: `${d * q + r} ÷ ${d}`, wert: { q, r }, text: `${q} R ${r}`, art: 'rest', falsch, hinweis: 'R = Rest',
                 tipp: `Wie oft passt ${d} ganz in ${d * q + r}? Was bleibt übrig?`, erklaerung: `${q} × ${d} = ${q * d}, es bleiben ${r} übrig.` };
      }
      const a = rand(2, 9), b = rand(2, 9), c = rand(1, 20), plus = Math.random() < .5;
      if (!plus && a * b <= c) continue;
      const ans = plus ? a * b + c : a * b - c;
      return rechen(`${a} × ${b} ${plus ? '+' : '−'} ${c}`, ans, [plus ? a * (b + c) : a * (b - c), plus ? ans - c * 2 : ans + c * 2], false,
        { tipp: 'Punkt vor Strich!', erklaerung: `Erst ${a} × ${b} = ${a * b}, dann ${plus ? '+' : '−'} ${c} = ${ans}.` });
    }
    return rechen('6 × 7', 42);
  }
  // Klasse 5 bisher (kopfrechnen.html) – jetzt Wiederholung/Förderung
  function alt5(level) {
    const op = pick(['+', '-', '×', '÷']);
    for (let v = 0; v < 50; v++) {
      let a, b, ans, extra = [];
      if (level === 'leicht') {
        if (op === '+') { a = rand(1, 9); b = rand(1, 9); ans = a + b; }
        else if (op === '-') { a = rand(10, 50); b = rand(1, 9); ans = a - b; }
        else if (op === '×') { a = rand(1, 9); b = rand(1, 9); ans = a * b; extra = [a * (b + 1), (a + 1) * b]; }
        else { b = rand(2, 9); ans = rand(1, 9); a = b * ans; }
      } else if (level === 'mittel') {
        if (op === '+') { a = rand(10, 49); b = rand(10, 49); ans = a + b; }
        else if (op === '-') { a = rand(20, 99); b = rand(10, 49); ans = a - b; }
        else if (op === '×') { a = rand(2, 10); b = rand(2, 12); ans = a * b; extra = [a * (b + 1), a * (b - 1)]; if (Math.random() < .5) [a, b] = [b, a]; }
        else { b = rand(2, 12); ans = rand(2, 9); a = b * ans; }
      } else {
        if (op === '+') { a = rand(20, 199); b = rand(20, 199); ans = a + b; }
        else if (op === '-') { a = rand(50, 299); b = rand(10, 150); ans = a - b; }
        else if (op === '×') { a = rand(2, 12); b = rand(2, 12); ans = a * b; extra = [a * (b + 1), a * (b - 1)]; if (Math.random() < .5) [a, b] = [b, a]; }
        else { b = rand(2, 12); ans = rand(2, 12); a = b * ans; }
      }
      if (ans < 1 || a < 1 || b < 1) continue;
      return rechen(`${a} ${op === '-' ? '−' : op} ${b}`, ans, extra);
    }
    return rechen('3 + 4', 7);
  }
  // Klasse 6 bisher (kopfrechnen_kl6.html) – einzelne Aufgabenarten
  function alt6(t) {
    const dez = (frage, wert, st, schritt) => rechen(frage, runde(wert, st), [wert + schritt, wert - schritt, wert + schritt * 10].map(x => runde(x, st)), wert < 0);
    if (t === 'int') { const a = rand(1, 50), b = rand(1, 20); if (Math.random() < .5) return rechen(`${a} + ${b}`, a + b); return a > b ? rechen(`${a} − ${b}`, a - b) : null; }
    if (t === 'int_neg') {
      const a = rand(-20, 50), b = rand(-20, 30), plus = Math.random() < .5, ans = plus ? a + b : a - b;
      return rechen(`${zahl(a)} ${plus ? '+' : '−'} ${klammer(b)}`, ans, [plus ? a - b : a + b, -ans], true,
        { tipp: 'Denk an das Thermometer: plus = nach oben, minus = nach unten.', erklaerung: b < 0 ? `${plus ? '+ (−' + Math.abs(b) + ') ist wie − ' + Math.abs(b) : '− (−' + Math.abs(b) + ') ist wie + ' + Math.abs(b)}. Ergebnis: ${zahl(ans)}.` : '' });
    }
    if (t === 'rat') {
      const op = pick(['+', '-', '×', '÷']), a = rand(-20, 40), b = rand(-15, 30), B = klammer(b);
      if (op === '÷') { if (b === 0 || a % b !== 0) return null; const ans = a / b; return rechen(`${zahl(a)} ÷ ${B}`, ans, [-ans, ans + 1], true, { tipp: 'Gleiche Vorzeichen → plus, verschiedene → minus.' }); }
      if (op === '×') { const ans = a * b; if (Math.abs(ans) > 200) return null; return rechen(`${zahl(a)} × ${B}`, ans, [-ans, a * (b + 1)], true, { tipp: 'Gleiche Vorzeichen → plus, verschiedene → minus.' }); }
      const ans = op === '+' ? a + b : a - b;
      return rechen(`${zahl(a)} ${op === '+' ? '+' : '−'} ${B}`, ans, [op === '+' ? a - b : a + b, -ans], true);
    }
    if (t === 'frac_same') {
      const d = rand(2, 9), plus = Math.random() < .5; let n1 = rand(1, d - 1), n2 = rand(1, d - 1);
      if (!plus && n1 < n2) [n1, n2] = [n2, n1];
      const rn = plus ? n1 + n2 : n1 - n2; if (rn === 0) return null;
      return bruch(`${n1}/${d} ${plus ? '+' : '−'} ${n2}/${d}`, { n: rn, d }, [{ n: rn, d: d * 2 }, { n: rn + 1, d }, { n: rn - 1 || rn + 2, d }, { n: plus ? n1 - n2 : n1 + n2, d }],
        { tipp: 'Gleiche Nenner: nur die Zähler rechnen, der Nenner bleibt.', erklaerung: `${n1} ${plus ? '+' : '−'} ${n2} = ${rn}, der Nenner ${d} bleibt: ${rn}/${d}${gcd(rn, d) > 1 ? ' = ' + bruchText({ n: rn, d }) : ''}.` });
    }
    if (t === 'frac_diff') {
      const d1 = pick([2, 3, 4, 5, 6, 8]), d2 = pick([2, 3, 4, 5, 6, 8]); if (d1 === d2) return null;
      const n1 = rand(1, d1 - 1), n2 = rand(1, d2 - 1), plus = Math.random() < .5, L = lcm(d1, d2); if (L > 24) return null;
      const rn = plus ? n1 * (L / d1) + n2 * (L / d2) : n1 * (L / d1) - n2 * (L / d2); if (rn === 0) return null;
      return bruch(`${n1}/${d1} ${plus ? '+' : '−'} ${n2}/${d2}`, { n: rn, d: L }, [{ n: plus ? n1 + n2 : n1 - n2, d: d1 + d2 }, { n: rn + 1, d: L }, { n: rn - 1 || rn + 2, d: L }],
        { tipp: `Mach die Nenner gleich: Hauptnenner ${L}.`, erklaerung: `${n1}/${d1} = ${n1 * L / d1}/${L} und ${n2}/${d2} = ${n2 * L / d2}/${L}. ${n1 * L / d1} ${plus ? '+' : '−'} ${n2 * L / d2} = ${rn}, also ${rn}/${L}${gcd(rn, L) > 1 ? ' = ' + bruchText({ n: rn, d: L }) : ''}.` });
    }
    if (t === 'frac_mul') {
      const d1 = rand(2, 6), n1 = rand(1, d1 - 1), d2 = rand(2, 6), n2 = rand(1, d2 - 1);
      return bruch(`${n1}/${d1} × ${n2}/${d2}`, { n: n1 * n2, d: d1 * d2 }, [{ n: n1 * d2, d: d1 * n2 }, { n: n1 * n2, d: d1 + d2 }, { n: n1 + n2, d: d1 * d2 }],
        { tipp: 'Zähler mal Zähler, Nenner mal Nenner.', erklaerung: `${n1} × ${n2} = ${n1 * n2}, ${d1} × ${d2} = ${d1 * d2} → ${bruchText({ n: n1 * n2, d: d1 * d2 })}.` });
    }
    if (t === 'frac_div') {
      const d1 = rand(2, 6), n1 = rand(1, d1 - 1), d2 = rand(2, 6), n2 = rand(1, d2 - 1), f = kuerze(n1 * d2, d1 * n2); if (f.d > 20) return null;
      return bruch(`${n1}/${d1} ÷ ${n2}/${d2}`, f, [{ n: n1 * n2, d: d1 * d2 }, { n: d1 * n2, d: n1 * d2 }, { n: f.n + 1, d: f.d }],
        { tipp: 'Mit dem Kehrwert malnehmen.', erklaerung: `${n1}/${d1} × ${d2}/${n2} = ${bruchText(f)}.` });
    }
    if (t === 'dec1') {
      const a = rand(0, 500) / 10, b = rand(0, 209) / 10, plus = Math.random() < .5, ans = runde(plus ? a + b : a - b, 1);
      if (ans < 0) return null;
      return dez(`${zahl(a.toFixed(1))} ${plus ? '+' : '−'} ${zahl(b.toFixed(1))}`, ans, 1, 0.1);
    }
    if (t === 'dec2') { const a = rand(0, 2099) / 100, b = rand(0, 1099) / 100; return dez(`${zahl(a.toFixed(2))} + ${zahl(b.toFixed(2))}`, runde(a + b, 2), 2, 0.1); }
    if (t === 'neg_dec') { const a = rand(-100, 209) / 10, b = rand(-100, 159) / 10; return dez(`${zahl(a.toFixed(1))} + ${b < 0 ? '(' + zahl(b.toFixed(1)) + ')' : zahl(b.toFixed(1))}`, runde(a + b, 1), 1, 0.1); }
    const a = rand(2, 10), b = rand(2, 10);
    return rechen(`${a} × ${b}`, a * b, [a * (b + 1), a * (b - 1)]);
  }
  function einmaleins(gross, bis) {
    const [lo, hi] = gross ? [11, Math.min(25, Math.max(12, Number(bis) || 25))] : [1, 10];
    const a = rand(lo, hi), b = rand(gross ? lo : 2, hi);
    if (Math.random() < .25 && !gross) return rechen(`${a * b} ÷ ${a}`, b, [b + 1, b - 1], false, { erklaerung: `${a} × ${b} = ${a * b}, also ${a * b} ÷ ${a} = ${b}.` });
    const z = b - b % 10, e = b % 10;
    return rechen(`${a} × ${b}`, a * b, [a * (b + 1), a * (b - 1), (a + 1) * b], false,
      { erklaerung: gross && z && e ? `${a} × ${z} = ${a * z}, ${a} × ${e} = ${a * e}, zusammen ${a * b}.` : `${a} × ${b} = ${a * b}. Reihe: ${Array.from({ length: Math.min(b, 4) }, (_, i) => a * (b - Math.min(b, 4) + 1 + i)).join(', ')}` });
  }

  // ═══════════════════════════════════════════════════════
  //  KOPFRECHNEN (nur Einmaleins und Grundrechenarten, ohne Rechenregeln)
  // ═══════════════════════════════════════════════════════
  /** + und − bis 1000 bzw. 10 000, mit Übergang; Erklärung über Zerlegen */
  function plusMinus(bis) {
    const gross = bis > 1000, plus = Math.random() < .5;
    const z = () => gross ? rand(12, 99) * 100 + pick([0, 0, 10, 50]) * (Math.random() < .5 ? 1 : 0) + (Math.random() < .3 ? rand(1, 9) * 10 : 0) : rand(101, 989);
    let a = z(), b = gross ? rand(5, 60) * 100 + pick([0, 50, 20, 80]) : rand(12, 489);
    if (plus && a + b > bis) a = bis - b - rand(1, 100);
    if (!plus && b >= a) [a, b] = [b + a, a];
    if (a < 1 || b < 1) return null;
    const ans = plus ? a + b : a - b;
    if (ans < 1 || ans > bis) return null;
    const teil = gross ? Math.floor(b / 1000) * 1000 || Math.floor(b / 100) * 100 : Math.floor(b / 100) * 100 || Math.floor(b / 10) * 10;
    const rest = b - teil, zw = plus ? a + teil : a - teil;
    const erkl = rest && teil ? `${zahl(a)} ${plus ? '+' : '−'} ${zahl(teil)} = ${zahl(zw)}, dann ${plus ? '+' : '−'} ${zahl(rest)} = ${zahl(ans)}.` : `${zahl(a)} ${plus ? '+' : '−'} ${zahl(b)} = ${zahl(ans)}.`;
    return rechen(`${zahl(a)} ${plus ? '+' : '−'} ${zahl(b)}`, ans, [ans + 100, ans - 100, ans + 10, ans - 10], false,
      { tipp: rest && teil ? `Zerlege ${zahl(b)} in ${zahl(teil)} und ${zahl(rest)}.` : '', erklaerung: erkl });
  }
  /** × und ÷ über das Einmaleins hinaus (Klasse 5: 30 × 4, 23 × 4, 84 ÷ 4; Klasse 6: 12 × 15, 360 ÷ 12, 378 ÷ 6) */
  function malGeteilt(kl) {
    const t = pick(kl === '6' ? ['zz', 'zz', 'gz', 'de'] : ['ze', 'ze', 'ge', 'ge']);
    if (t === 'ze') {                                   // Zehner × Einer bzw. zweistellig × einstellig
      const a = rand(11, 99), b = rand(2, 9), z = a - a % 10, e = a % 10, ans = a * b;
      if (Math.random() < .5) {
        if (!e) return rechen(`${a} × ${b}`, ans, [ans + b, z / 10 * b], false, { tipp: `Rechne ${a / 10} × ${b} und hänge eine Null an.`, erklaerung: `${a / 10} × ${b} = ${a / 10 * b}, mit Null: ${ans}.` });
        return rechen(`${a} × ${b}`, ans, [z * b + e, ans + b, ans - b], false, { tipp: `Zerlege: ${z} × ${b} und ${e} × ${b}.`, erklaerung: `${z} × ${b} = ${z * b}, ${e} × ${b} = ${e * b}, zusammen ${ans}.` });
      }
      return rechen(`${ans} ÷ ${b}`, a, [a + 1, a - 1, a + 10], false, { tipp: `Zerlege ${ans} in Zahlen, die durch ${b} gehen.`, erklaerung: `${z * b} ÷ ${b} = ${z}, ${e * b} ÷ ${b} = ${e}, zusammen ${a}.` });
    }
    if (t === 'ge') {                                   // Umkehraufgaben mit Zehnern: 240 ÷ 6, 7 × 80
      const a = rand(2, 9), b = rand(2, 9) * 10, ans = a * b;
      if (Math.random() < .5) return rechen(`${a} × ${b}`, ans, [ans * 10, ans / 10, ans + b], false, { tipp: `Rechne ${a} × ${b / 10} und hänge eine Null an.`, erklaerung: `${a} × ${b / 10} = ${a * b / 10}, mit Null: ${ans}.` });
      return rechen(`${ans} ÷ ${a}`, b, [b / 10, b + 10, b - 10], false, { tipp: `Denk an ${ans / 10} ÷ ${a}.`, erklaerung: `${ans / 10} ÷ ${a} = ${b / 10}, also ${ans} ÷ ${a} = ${b}.` });
    }
    if (t === 'zz') {                                   // zweistellig × zweistellig (kopfgeeignet)
      const a = rand(11, 19), b = pick([11, 12, 13, 14, 15, 20, 25]), ans = a * b, z = b - b % 10, e = b % 10;
      return rechen(`${a} × ${b}`, ans, [a * z + e, ans + a, ans - a], false,
        { tipp: e ? `Zerlege ${b} in ${z} und ${e}.` : `Rechne ${a} × ${b / 10} und hänge eine Null an.`, erklaerung: e ? `${a} × ${z} = ${a * z}, ${a} × ${e} = ${a * e}, zusammen ${ans}.` : `${a} × ${b / 10} = ${a * b / 10}, mit Null: ${ans}.` });
    }
    if (t === 'gz') {                                   // ÷ durch zweistellig, glatt: 360 ÷ 12
      const d = rand(11, 25), q = rand(2, 9) * (Math.random() < .4 ? 10 : 1), A = d * q;
      return rechen(`${A} ÷ ${d}`, q, [q + 1, q - 1, q * 10], false, { tipp: `${d} × ? = ${A}`, erklaerung: `${d} × ${q} = ${A}, also ${A} ÷ ${d} = ${q}.` });
    }
    const d = rand(3, 9), q = rand(21, 99), A = d * q, h = Math.floor(A / d / 10) * 10 * d;   // dreistellig ÷ einstellig
    return rechen(`${A} ÷ ${d}`, q, [q + 1, q - 1, q + 10], false, { tipp: `Zerlege ${A} in ${h} und ${A - h}.`, erklaerung: `${h} ÷ ${d} = ${h / d}, ${A - h} ÷ ${d} = ${(A - h) / d}, zusammen ${q}.` });
  }

  // ═══════════════════════════════════════════════════════
  //  MATHE-TRAINER KLASSE 5 (M5 LB 1.2 Rechengesetze, LB 2 Ganze Zahlen)
  // ═══════════════════════════════════════════════════════
  const STUFENZAHL = [10, 100, 1000];
  function grossPlusMinus() {
    const e = pick([100, 1000, 1000, 10000]);        // Einheit, in der man rechnet
    const a = rand(12, 98), b = rand(3, 49), plus = Math.random() < .55;
    if (!plus && b >= a) return null;
    const A = a * e, B = b * e, ans = plus ? A + B : A - B, w = { 100: 'Hundertern', 1000: 'Tausendern', 10000: 'Zehntausendern' }[e];
    return rechen(`${zahl(A)} ${plus ? '+' : '−'} ${zahl(B)}`, ans, [ans + e, ans - e, ans * 10, ans / 10], false,
      { tipp: `Rechne mit ${w}: ${a} ${plus ? '+' : '−'} ${b}.`, erklaerung: `${a} ${plus ? '+' : '−'} ${b} = ${plus ? a + b : a - b} ${w.replace(/n$/, '')}, also ${zahl(ans)}.` });
  }
  function stufenMal() {
    const t = pick(['mal10', 'nullen', 'geteilt']);
    if (t === 'mal10') {
      const a = rand(3, 999), f = pick(STUFENZAHL), div = Math.random() < .35 && a % 10 !== 0;
      if (div) { const A = a * f; return rechen(`${zahl(A)} ÷ ${zahl(f)}`, a, [a * 10, a / 10], false, { tipp: `Durch ${zahl(f)}: ${String(f).length - 1} Null${f > 10 ? 'en' : ''} wegnehmen.`, erklaerung: `${zahl(A)} ÷ ${zahl(f)} = ${zahl(a)}.` }); }
      return rechen(`${zahl(a)} × ${zahl(f)}`, a * f, [a * f * 10, a * f / 10], false, { tipp: `Mal ${zahl(f)}: ${String(f).length - 1} Null${f > 10 ? 'en' : ''} anhängen.`, erklaerung: `${zahl(a)} × ${zahl(f)} = ${zahl(a * f)}.` });
    }
    if (t === 'nullen') {
      const x = rand(2, 9), y = rand(2, 9), ex = rand(1, 2), ey = rand(1, 2);
      const A = x * 10 ** ex, B = y * 10 ** ey, ans = A * B, n = ex + ey;
      return rechen(`${zahl(A)} × ${zahl(B)}`, ans, [ans * 10, ans / 10, x * y * 10 ** (n - 1)], false,
        { tipp: `Rechne ${x} × ${y} und zähle die Nullen.`, erklaerung: `${x} × ${y} = ${x * y}, dazu ${n} Nullen → ${zahl(ans)}.` });
    }
    const x = rand(2, 9), q = rand(2, 9), ex = rand(1, 2);
    const B = x * 10, A = x * q * 10 ** (ex + 1);
    return rechen(`${zahl(A)} ÷ ${B}`, A / B, [A / B * 10, A / B / 10], false,
      { tipp: `Streiche bei beiden Zahlen eine Null: ${zahl(A / 10)} ÷ ${x}.`, erklaerung: `${zahl(A)} ÷ ${B} = ${zahl(A / 10)} ÷ ${x} = ${zahl(A / B)}.` });
  }
  function punktVorStrich() {
    const t = pick(['a+bc', 'ab-c', 'a-b/c', 'ab+cd']);
    if (t === 'a+bc') { const a = rand(2, 40), b = rand(2, 9), c = rand(2, 9), ans = a + b * c;
      return rechen(`${a} + ${b} × ${c}`, ans, [(a + b) * c, ans + b], false, { tipp: 'Punkt vor Strich: erst malnehmen!', erklaerung: `Erst ${b} × ${c} = ${b * c}, dann ${a} + ${b * c} = ${ans}. (Nicht von links nach rechts!)` }); }
    if (t === 'ab-c') { const a = rand(3, 9), b = rand(3, 9), c = rand(2, Math.min(20, a * b - 1)), ans = a * b - c;
      return rechen(`${a} × ${b} − ${c}`, ans, [a * (b - c), ans + 2 * c], true, { tipp: 'Punkt vor Strich!', erklaerung: `Erst ${a} × ${b} = ${a * b}, dann ${a * b} − ${c} = ${ans}.` }); }
    if (t === 'a-b/c') { const c = rand(2, 9), q = rand(2, 9), a = rand(q + 1, 60), ans = a - q;
      return rechen(`${a} − ${c * q} ÷ ${c}`, ans, [(a - c * q) / c, ans + 1].filter(Number.isInteger), true, { tipp: 'Erst teilen, dann minus.', erklaerung: `Erst ${c * q} ÷ ${c} = ${q}, dann ${a} − ${q} = ${ans}.` }); }
    const a = rand(2, 9), b = rand(2, 9), c = rand(2, 9), d = rand(2, 9), ans = a * b + c * d;
    return rechen(`${a} × ${b} + ${c} × ${d}`, ans, [(a * b + c) * d, ans + 10], false, { tipp: 'Beide Malaufgaben zuerst.', erklaerung: `${a} × ${b} = ${a * b} und ${c} × ${d} = ${c * d}, zusammen ${ans}.` });
  }
  function klammern() {
    const t = pick(['(a+b)c', 'a(b-c)', '(a-b)/c', 'a-(b+c)']);
    if (t === '(a+b)c') { const a = rand(2, 15), b = rand(2, 15), c = rand(2, 9), ans = (a + b) * c;
      return rechen(`(${a} + ${b}) × ${c}`, ans, [a + b * c, ans + c], false, { tipp: 'Die Klammer zuerst!', erklaerung: `Klammer: ${a} + ${b} = ${a + b}, dann ${a + b} × ${c} = ${ans}.` }); }
    if (t === 'a(b-c)') { const a = rand(2, 9), c = rand(1, 10), b = rand(c + 1, 20), ans = a * (b - c);
      return rechen(`${a} × (${b} − ${c})`, ans, [a * b - c, ans + a], false, { tipp: 'Die Klammer zuerst!', erklaerung: `Klammer: ${b} − ${c} = ${b - c}, dann ${a} × ${b - c} = ${ans}.` }); }
    if (t === '(a-b)/c') { const c = rand(2, 9), q = rand(2, 9), b = rand(1, 30), a = c * q + b;
      return rechen(`(${a} − ${b}) ÷ ${c}`, q, [q + 1, q - 1], false, { tipp: 'Die Klammer zuerst!', erklaerung: `Klammer: ${a} − ${b} = ${a - b}, dann ${a - b} ÷ ${c} = ${q}.` }); }
    const b = rand(5, 40), c = rand(5, 40), a = rand(b + c + 1, 150), ans = a - (b + c);
    return rechen(`${a} − (${b} + ${c})`, ans, [a - b + c, ans + 2 * c], false, { tipp: 'Die Klammer zuerst!', erklaerung: `Klammer: ${b} + ${c} = ${b + c}, dann ${a} − ${b + c} = ${ans}.` });
  }
  function rechenvorteile() {
    const t = pick(['25*4', '5*2', 'summe100', 'tausch']);
    if (t === '25*4') { const x = rand(3, 19), ans = 100 * x, order = shuffle([25, 4, x]);
      return rechen(order.join(' × '), ans, [ans + 25, ans - 4, x * 29], false, { tipp: 'Suche zwei Zahlen, die zusammen 100 ergeben.', erklaerung: `25 × 4 = 100, dann 100 × ${x} = ${zahl(ans)}.` }); }
    if (t === '5*2') { const x = rand(13, 99), ans = 10 * x, order = shuffle([5, 2, x]);
      return rechen(order.join(' × '), ans, [ans + 5, ans - 2, x * 7], false, { tipp: 'Welche zwei Zahlen ergeben zusammen 10?', erklaerung: `5 × 2 = 10, dann 10 × ${x} = ${zahl(ans)}.` }); }
    if (t === 'summe100') { const a = rand(11, 89), b = 100 - a, c = rand(12, 98);
      const [x, y, z] = [a, c, b], ans = a + b + c;
      return rechen(`${x} + ${y} + ${z}`, ans, [ans + 10, ans - 10], false, { tipp: `Welche zwei Zahlen ergeben zusammen 100?`, erklaerung: `${a} + ${b} = 100, dann 100 + ${c} = ${ans}.` }); }
    const a = rand(2, 9) * 100 + rand(1, 99), b = 1000 - a + rand(-0, 0), c = rand(120, 880), ans = a + c + b;
    return rechen(`${a} + ${c} + ${b}`, ans, [ans + 100, ans - 100], false, { tipp: `Tausche: ${a} + ${b} zuerst.`, erklaerung: `${a} + ${b} = 1000, dann 1000 + ${c} = ${zahl(ans)}.` });
  }
  function ueberschlag() {
    const t = pick(['plus', 'minus', 'mal']);
    const r100 = n => Math.round(n / 100) * 100;
    if (t === 'mal') { const a = rand(11, 98), b = rand(2, 9), ra = Math.round(a / 10) * 10, ans = ra * b;
      return rechen(`Überschlag: ${a} × ${b} ≈ ?`, ans, [a * b, ans + 10 * b], false, { hinweis: `${a} auf Zehner runden`, tipp: `Runde ${a} auf Zehner.`, erklaerung: `${a} ≈ ${ra}, ${ra} × ${b} = ${ans}. (Genau: ${a * b})` }); }
    const a = rand(120, 980), b = rand(110, 890), plus = t === 'plus';
    if (!plus && b >= a) return null;
    const ra = r100(a), rb = r100(b), ans = plus ? ra + rb : ra - rb;
    if (!plus && ans <= 0) return null;
    return rechen(`Überschlag: ${a} ${plus ? '+' : '−'} ${b} ≈ ?`, ans, [plus ? a + b : a - b, ans + 100, ans - 100], false,
      { hinweis: 'auf Hunderter runden', tipp: 'Runde beide Zahlen auf Hunderter.', erklaerung: `${a} ≈ ${ra}, ${b} ≈ ${rb} → ${ra} ${plus ? '+' : '−'} ${rb} = ${ans}. (Genau: ${plus ? a + b : a - b})` });
  }

  /** M5 LB 2: Zustandsänderungen a ± b mit a ganz, b natürlich (Thermometer, Zahlengerade) */
  function ganzeZahlen() {
    const a = rand(-15, 15), b = rand(2, 18), plus = Math.random() < .5, ans = plus ? a + b : a - b;
    if (a === 0 || (a > 0 && ans > 0 && Math.random() < .6)) return null;   // meist über die Null hinweg
    const nullweg = plus ? (a < 0 && ans > 0) : (a > 0 && ans < 0);
    const erkl = nullweg ? `Von ${zahl(a)} bis 0 sind es ${Math.abs(a)}, dann noch ${b - Math.abs(a)} weiter: ${zahl(ans)}.` : `Von ${zahl(a)} gehst du ${b} ${plus ? 'nach oben' : 'nach unten'}: ${zahl(ans)}.`;
    if (Math.random() < .4) {
      return rechen(`Es ist ${zahl(a)} °C. Es wird ${b} Grad ${plus ? 'wärmer' : 'kälter'}.`, ans, [plus ? a - b : a + b, -ans], true,
        { hinweis: 'Wie warm ist es dann? (in °C)', tipp: `Stell dir das Thermometer vor: ${plus ? 'nach oben' : 'nach unten'}.`, erklaerung: erkl });
    }
    return rechen(`${zahl(a)} ${plus ? '+' : '−'} ${b}`, ans, [plus ? a - b : a + b, -ans], true,
      { tipp: `Auf der Zahlengeraden ${b} Schritte nach ${plus ? 'rechts' : 'links'}.`, erklaerung: erkl });
  }

  // ═══════════════════════════════════════════════════════
  //  KLASSE 6 (M6 LB 1 Bruchzahlen, LB 2 Rationale Zahlen; Teilbarkeit)
  // ═══════════════════════════════════════════════════════
  const TEILBAR = {
    2: n => `Die letzte Ziffer ist ${n % 10}${n % 2 ? ' – ungerade' : ' – gerade'}.`,
    3: n => `Quersumme ${String(n).split('').join(' + ')} = ${String(n).split('').reduce((s, c) => s + +c, 0)}${String(n).split('').reduce((s, c) => s + +c, 0) % 3 ? ' – nicht' : ''} durch 3 teilbar.`,
    4: n => `Die letzten zwei Ziffern ${String(n % 100).padStart(2, '0')}${(n % 100) % 4 ? ' sind nicht' : ' sind'} durch 4 teilbar.`,
    5: n => `Die letzte Ziffer ist ${n % 10}${n % 5 ? ' – weder 0 noch 5' : ''}.`,
    9: n => `Quersumme ${String(n).split('').reduce((s, c) => s + +c, 0)}${String(n).split('').reduce((s, c) => s + +c, 0) % 9 ? ' – nicht' : ''} durch 9 teilbar.`,
    10: n => `Die letzte Ziffer ist ${n % 10}.`,
  };
  function teilbar() {
    const d = pick([2, 3, 4, 5, 9, 10]);
    const ja = Math.random() < .5;
    let n = 0;
    for (let v = 0; v < 40; v++) { n = rand(100, 999); if ((n % d === 0) === ja) break; }
    const r = n % d === 0 ? 'ja' : 'nein';
    return wahl(`Ist ${n} durch ${d} teilbar?`, r, ['ja', 'nein'], { tipp: `Denk an die Teilbarkeitsregel für ${d}.`, erklaerung: TEILBAR[d](n) + ` Also: ${r}.` });
  }
  function kgvGgt() {
    if (Math.random() < .5) {
      const a = pick([2, 3, 4, 5, 6, 8, 9, 10, 12]), b = pick([3, 4, 5, 6, 8, 9, 10, 12, 15]); if (a === b) return null;
      const L = lcm(a, b); if (L > 60) return null;
      return rechen(`kgV von ${a} und ${b}`, L, [a * b, L + a, L / 2].filter(Number.isInteger), false,
        { hinweis: 'kleinstes gemeinsames Vielfaches', tipp: `Zähle die Vielfachen von ${Math.max(a, b)} auf, bis eins durch ${Math.min(a, b)} teilbar ist.`, erklaerung: `Vielfache von ${Math.max(a, b)}: ${Array.from({ length: L / Math.max(a, b) }, (_, i) => (i + 1) * Math.max(a, b)).join(', ')} → ${L} ist auch durch ${Math.min(a, b)} teilbar.` });
    }
    const g = rand(2, 9), x = rand(2, 7), y = rand(2, 7); if (gcd(x, y) !== 1 || x === y) return null;
    const a = g * x, b = g * y;
    return rechen(`ggT von ${a} und ${b}`, g, [g * Math.min(x, y), 1, g + 1].filter(z => z !== g), false,
      { hinweis: 'größter gemeinsamer Teiler', tipp: 'Welche größte Zahl teilt beide?', erklaerung: `${a} = ${g} × ${x} und ${b} = ${g} × ${y} → ggT = ${g}.` });
  }
  function bruchErweitern() {
    const d = rand(2, 9), n = rand(1, d - 1), k = rand(2, 6);
    if (Math.random() < .5) return rechen(`${n}/${d} = ?/${d * k}`, n * k, [n + k, n * k + 1, d * k - n], false,
      { tipp: `Mit welcher Zahl wurde ${d} zu ${d * k}?`, erklaerung: `${d} × ${k} = ${d * k}, also auch ${n} × ${k} = ${n * k}.` });
    return rechen(`${n}/${d} = ${n * k}/?`, d * k, [d + k, d * k + 1, n * k + d], false,
      { tipp: `Mit welcher Zahl wurde ${n} zu ${n * k}?`, erklaerung: `${n} × ${k} = ${n * k}, also auch ${d} × ${k} = ${d * k}.` });
  }
  function bruchKuerzen() {
    const d = rand(2, 9), n = rand(1, d - 1); if (gcd(n, d) !== 1) return null;
    const k = rand(2, 6), N = n * k, D = d * k;
    return bruch(`Kürze ganz: ${N}/${D}`, { n, d }, [{ n: N / 2, d: D / 2 }, { n: n + 1, d }, { n, d: d + 1 }].filter(x => Number.isInteger(x.n) && Number.isInteger(x.d)),
      { gekuerzt: true, tipp: `Welche größte Zahl teilt ${N} und ${D}?`, erklaerung: `ggT ist ${k}: ${N} ÷ ${k} = ${n}, ${D} ÷ ${k} = ${d} → ${n}/${d}.` });
  }
  function bruchVergleich() {
    const d1 = rand(2, 9), n1 = rand(1, d1 - 1), d2 = rand(2, 9), n2 = rand(1, d2 - 1);
    const A = `${n1}/${d1}`, B = `${n2}/${d2}`; if (A === B) return null;
    const v = n1 * d2 - n2 * d1, L = lcm(d1, d2);
    const r = v > 0 ? A : v < 0 ? B : 'gleich groß';
    return wahl(`Was ist größer: ${A} oder ${B}?`, r, [A, B, 'gleich groß'],
      { tipp: 'Mach die Nenner gleich.', erklaerung: `${A} = ${n1 * L / d1}/${L} und ${B} = ${n2 * L / d2}/${L} → ${v === 0 ? 'beide gleich groß' : r + ' ist größer'}.` });
  }
  function bruchteil() {
    const d = pick([2, 3, 4, 5, 10]), n = rand(1, d - 1), k = rand(2, 12), G = d * k, [einheit, von] = pick([['€', '€'], ['m', 'm'], ['kg', 'kg'], ['Kinder', 'Kindern']]);
    return rechen(`${n}/${d} von ${G} ${von}`, n * k, [k, G - n * k, n * G].filter(x => x !== n * k), false,
      { tipp: n === 1 ? `Teile ${G} durch ${d}.` : `Erst durch ${d}, dann mal ${n}.`, erklaerung: n === 1 ? `${G} ÷ ${d} = ${k} ${einheit}.` : `${G} ÷ ${d} = ${k}, ${k} × ${n} = ${n * k} ${einheit}.` });
  }
  function dezUmwandeln() {
    const paare = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [1, 25], [3, 20], [1, 100], [7, 100]];
    const [n, d] = pick(paare), w = n / d;
    if (Math.random() < .5) return rechen(`${n}/${d} als Dezimalzahl`, w, [w * 10, n / (d * 10), runde(w + 0.1, 2)].map(x => runde(x, 3)), false,
      { tipp: `Erweitere auf 10, 100 oder 1000 im Nenner.`, erklaerung: `${n}/${d} = ${n * (100 / d)}/100 = ${zahl(w)}`.replace(/NaN|Infinity/g, '') });
    return bruch(`${zahl(w)} als Bruch (gekürzt)`, { n, d }, [{ n: Math.round(w * 10), d: 10 }, { n: n + 1, d }, { n, d: d * 10 }],
      { gekuerzt: true, tipp: 'Schreib erst als Zehntel oder Hundertstel, dann kürzen.', erklaerung: `${zahl(w)} = ${Math.round(w * 100)}/100 = ${n}/${d}.` });
  }
  function dezMal10() {
    const w = rand(11, 9999) / pick([10, 100, 1000]), f = pick([10, 100, 1000]), mal = Math.random() < .5;
    const ans = genau(mal ? w * f : w / f);
    if (String(ans).replace('.', '').length > 7) return null;
    const st = String(f).length - 1;
    return rechen(`${zahl(w)} ${mal ? '×' : '÷'} ${zahl(f)}`, ans, [genau(mal ? w * f / 10 : w / f * 10), genau(mal ? w * f * 10 : w / f / 10)], false,
      { tipp: `Das Komma wandert ${st} Stelle${st > 1 ? 'n' : ''} nach ${mal ? 'rechts' : 'links'}.`, erklaerung: `Komma ${st} Stelle${st > 1 ? 'n' : ''} nach ${mal ? 'rechts' : 'links'}: ${zahl(ans)}.` });
  }

  // ═══════════════════════════════════════════════════════
  //  ALLE TYPEN
  // ═══════════════════════════════════════════════════════
  const G = {
    'alt1': s => alt1(s.stufe), 'alt2': s => alt2(s.stufe), 'alt3': s => alt3(s.stufe),
    'alt4': s => alt4(s.stufe), 'alt5': s => alt5(s.stufe),
    'alt6': s => alt6(pick(s.arten || ['int'])),
    '1x1': s => einmaleins(!!s.gross, s.bis),
    'plusminus': s => plusMinus(Number(s.bis) || 1000), 'malgeteilt': s => malGeteilt(String(s.stufe || '5')), 'ganze-zahlen': ganzeZahlen,
    'gross-plusminus': grossPlusMinus, 'stufen-mal': stufenMal, 'punkt-vor-strich': punktVorStrich,
    'klammern': klammern, 'rechenvorteile': rechenvorteile, 'ueberschlag': ueberschlag,
    'teilbar': teilbar, 'kgv-ggt': kgvGgt, 'bruch-erweitern': bruchErweitern, 'bruch-kuerzen': bruchKuerzen,
    'bruch-vergleich': bruchVergleich, 'bruchteil': bruchteil, 'dez-umwandeln': dezUmwandeln, 'dez-mal10': dezMal10,
  };

  function erzeuge(spec) {
    const f = G[spec && spec.typ];
    if (!f) return null;
    for (let v = 0; v < 60; v++) {
      const a = f(spec || {});
      if (a) { a.typ = spec.typ; if (!a.tipp) a.tipp = tippFuer(a.frage); return a; }
    }
    return null;
  }
  function ausStufe(stufe) {
    const liste = (stufe && Array.isArray(stufe.generatoren) ? stufe.generatoren : []).filter(g => G[g.typ]);
    if (!liste.length) return null;
    const summe = liste.reduce((s, g) => s + (Number(g.gewicht) || 1), 0);
    let r = Math.random() * summe;
    for (const g of liste) { r -= Number(g.gewicht) || 1; if (r <= 0) return erzeuge(g); }
    return erzeuge(liste[liste.length - 1]);
  }

  // ── Eingabe prüfen ─────────────────────────────────────
  /** '34 000' / '3,5' / '−7' / '1.234' → Zahl oder NaN */
  function leseZahl(s) {
    s = String(s || '').trim().replace(/[\s\u00A0\u202F]/g, '').replace(/[−–]/g, '-');
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');      // 1.234 als Tausenderpunkt
    s = s.replace(',', '.');
    return /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN;
  }
  function leseBruch(s) {
    const t = String(s || '').trim().replace(/[\s\u00A0]/g, '').replace(/[−–]/g, '-');
    const m = /^(-?\d+)\/(\d+)$/.exec(t);
    if (m) return +m[2] ? { n: +m[1], d: +m[2] } : null;
    const z = leseZahl(t);
    return Number.isFinite(z) && Number.isInteger(z) ? { n: z, d: 1 } : null;
  }
  function pruefe(a, eingabe) {
    if (!a) return false;
    if (a.art === 'zahl') { const z = leseZahl(eingabe); return Number.isFinite(z) && Math.abs(z - a.wert) < 1e-9; }
    if (a.art === 'bruch') {
      const b = leseBruch(eingabe); if (!b) return false;
      if (b.n * a.wert.d !== a.wert.n * b.d) return false;
      return !a.gekuerzt || gcd(b.n, b.d) === 1;
    }
    if (a.art === 'rest') { const e = eingabe || {}; return leseZahl(e.q) === a.wert.q && leseZahl(e.r) === a.wert.r; }
    if (a.art === 'wahl') return String(eingabe) === String(a.wert);
    return false;
  }

  // ── Für die Spiele (aufgaben.js): Text-Antwort + 2 Ablenker ──
  function spielAufgabe(quelle) {
    for (let v = 0; v < 20; v++) {
      const a = quelle && quelle.generatoren ? ausStufe(quelle) : erzeuge(quelle);
      if (!a) return null;
      if (a.art === 'wahl' && (a.optionen || []).length < 3) continue;   // ja/nein passt nicht aufs Tor (3 Antworten)
      const falsch = (a.falsch || []).filter(x => x !== a.text);
      if (falsch.length < 2) continue;
      const r = { frage: a.frage.replace(/^Überschlag: /, '≈ '), antwort: a.text, falsch };
      if (a.hinweis) r.hinweis = a.hinweis;
      return r;
    }
    return null;
  }

  window.LernGeneratoren = { TYPEN: Object.keys(G), erzeuge, ausStufe, pruefe, spielAufgabe, zahl, bruchText, leseZahl, leseBruch };
})();
