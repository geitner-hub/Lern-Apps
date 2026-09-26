// ═══════════════════════════════════════════════════════
//  Lernwelt – shared.js
//  Gemeinsame Konstanten & Hilfsfunktionen für index.html
//  und admin.html (EINE Quelle – nicht in Seiten kopieren!).
//
//  Einbindung (Reihenfolge wichtig):
//    <script src="qrcode.js"></script>     (nur wenn QR gebraucht)
//    <script src="shared.js"></script>
//    <script src="config-api.js"></script>
// ═══════════════════════════════════════════════════════

'use strict';

// ── Fächer ─────────────────────────────────────────────
const CAT_STYLES = {
  "Mathematik": { icon: "➕", color: "#6366f1", color2: "#818cf8" },
  "Englisch":   { icon: "🇬🇧", color: "#f43f5e", color2: "#fb7185" },
  "Deutsch":    { icon: "📖", color: "#10b981", color2: "#34d399" },
  "WiB":        { icon: "🌍", color: "#e6a817", color2: "#fbbf24" },
  "Sport":      { icon: "⚽", color: "#8b5cf6", color2: "#a78bfa" },
  "Informatik": { icon: "💻", color: "#06b6d4", color2: "#22d3ee" },
  "GPG":        { icon: "🏛",  color: "#f97316", color2: "#fb923c" },
  "Allgemein":  { icon: "✨", color: "#84cc16", color2: "#a3e635" },
};
// Neues Fach? Nur hier eintragen – Admin (Auswahl, Filter) und Startseite übernehmen es automatisch.
const FAECHER   = Object.keys(CAT_STYLES);
const CAT_ICONS = Object.fromEntries(Object.entries(CAT_STYLES).map(([k, v]) => [k, v.icon]));
const KLASSEN   = [5, 6, 7, 8, 9];

// ── Tag-Farben (Index = color-Feld in config.json) ─────
const TAG_COLORS = [
  { bg:'rgba(167,139,250,.16)',border:'rgba(167,139,250,.35)',text:'#c4b5fd',dot:'#a78bfa',label:'Violett'},
  { bg:'rgba(99,102,241,.15)', border:'rgba(99,102,241,.32)', text:'#818cf8',dot:'#6366f1',label:'Indigo' },
  { bg:'rgba(230,168,23,.14)', border:'rgba(230,168,23,.32)', text:'#e6a817',dot:'#e6a817',label:'Gold'   },
  { bg:'rgba(74,222,128,.13)', border:'rgba(74,222,128,.3)',  text:'#4ade80',dot:'#22c55e',label:'Grün'   },
  { bg:'rgba(248,113,113,.13)',border:'rgba(248,113,113,.3)', text:'#f87171',dot:'#ef4444',label:'Rot'    },
  { bg:'rgba(45,212,191,.13)', border:'rgba(45,212,191,.3)',  text:'#2dd4bf',dot:'#14b8a6',label:'Teal'   },
  { bg:'rgba(244,114,182,.13)',border:'rgba(244,114,182,.3)', text:'#f472b6',dot:'#ec4899',label:'Pink'   },
  { bg:'rgba(251,191,36,.13)', border:'rgba(251,191,36,.3)',  text:'#fbbf24',dot:'#f59e0b',label:'Gelb'   },
];

// ── Banner-Farben (Index = announcement.color) ─────────
const ANN_COLORS = [
  { bg: 'rgba(230,168,23,.18)',  text: '#e6a817', label: 'Gold'   },
  { bg: 'rgba(99,102,241,.18)',  text: '#818cf8', label: 'Indigo' },
  { bg: 'rgba(74,222,128,.15)',  text: '#4ade80', label: 'Grün'   },
  { bg: 'rgba(248,113,113,.14)', text: '#f87171', label: 'Rot'    },
  { bg: 'rgba(45,212,191,.15)',  text: '#2dd4bf', label: 'Teal'   },
  { bg: 'rgba(244,114,182,.15)', text: '#f472b6', label: 'Pink'   },
];

// ── Tag-Helfer ─────────────────────────────────────────
function tagObj(t)   { return typeof t === 'object' && t !== null ? t : { name: String(t), color: 0 }; }
function tagName(t)  { return String(tagObj(t).name ?? ''); }
function tagColor(t) { return TAG_COLORS[tagObj(t).color] ?? TAG_COLORS[0]; }

// ── Sicherheit ─────────────────────────────────────────
/** Text sicher in HTML (auch in Attributen "…" und '…') einsetzen. */
function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Erlaubte App-Links:
 *  - lokale Datei:  name.html  |  ordner/name.html  (+ optional ?parameter und #anker)
 *  - externer Link: https://…
 * Alles andere (javascript:, data:, http:, ../ …) wird abgelehnt.
 * WICHTIG: Die gleiche Regel steht im Cloudflare Worker (SAFE_LINK).
 */
const SAFE_LINK_RE = /^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.html(?:\?[A-Za-z0-9_.~%=&+-]*)?(?:#[A-Za-z0-9_-]*)?$|^https:\/\/[^\s"'<>`]+$/;
function isSafeLink(datei) {
  const d = String(datei ?? '').trim();
  return d.length > 0 && d.length <= 300 && SAFE_LINK_RE.test(d) && !d.includes('..');
}

/** Basis-URL der Lernwelt (Ordner der aktuellen Seite), z. B. https://geitner-hub.github.io/Lern-Apps/ */
function lwBaseUrl() {
  return new URL('./', location.href).href;
}

/** Absolute URL einer App (für QR-Codes & Teilen). Unsichere Links → ''. */
function appUrl(datei) {
  if (!isSafeLink(datei)) return '';
  return new URL(datei, lwBaseUrl()).href;
}

/** Schlüssel, unter dem navbar.js Ergebnisse speichert: Dateiname + ?Parameter */
function resultKey(datei) {
  const clean = String(datei ?? '').split('#')[0];
  return clean.split('/').pop();
}

// ── QR-Code (lokal erzeugt, ohne externen Dienst) ──────
/**
 * Zeichnet einen QR-Code in ein <canvas>.
 * Benötigt qrcode.js (vor shared.js einbinden).
 * @returns {boolean} true bei Erfolg
 */
function renderQR(canvas, text, sizePx = 320) {
  if (typeof qrcode !== 'function' || !canvas) return false;
  try {
    const qr = qrcode(0, 'M');          // 0 = Größe automatisch, M = 15 % Fehlerkorrektur
    qr.addData(text);
    qr.make();
    const n      = qr.getModuleCount();
    const quiet  = 4;                    // Ruhezone (Pflicht für zuverlässiges Scannen)
    const cell   = Math.max(2, Math.floor(sizePx / (n + quiet * 2)));
    const size   = cell * (n + quiet * 2);
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0f0e1a';
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
    return true;
  } catch (e) {
    console.error('[QR] Fehler:', e);
    return false;
  }
}

/** Canvas als PNG herunterladen. */
function downloadCanvas(canvas, filename) {
  const a = document.createElement('a');
  a.download = String(filename || 'qr').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '-') + '.png';
  a.href = canvas.toDataURL('image/png');
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Text in die Zwischenablage (mit Fallback für ältere Browser). */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e2) { return false; }
  }
}
