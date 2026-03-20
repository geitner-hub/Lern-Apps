// ═══════════════════════════════════════════════════════
//  Lernwelt – shared.js
//  Gemeinsame Konstanten, Tag-Farben und Hilfsfunktionen
//  für index.html, admin.html und alle App-Seiten.
// ═══════════════════════════════════════════════════════

'use strict';

// ── Kategorien ───────────────────────────────────────────
const CAT_STYLES = {
  "Mathematik": { icon: "➕", color: "#6366f1", color2: "#818cf8" },
  "Englisch":   { icon: "🇬🇧", color: "#f43f5e", color2: "#fb7185" },
  "Deutsch":    { icon: "📖", color: "#10b981", color2: "#34d399" },
  "WiB":        { icon: "🌍", color: "#e6a817", color2: "#fbbf24" },
  "Sport":      { icon: "⚽", color: "#8b5cf6", color2: "#a78bfa" },
  "Informatik": { icon: "💻", color: "#06b6d4", color2: "#22d3ee" },
  "GPG":        { icon: "🏛",  color: "#f97316", color2: "#fb923c" },
};

const CAT_ICONS = Object.fromEntries(
  Object.entries(CAT_STYLES).map(([k, v]) => [k, v.icon])
);

// ── Tag-Farbpalette ──────────────────────────────────────
const TAG_COLORS = [
  { bg: 'rgba(167,139,250,.16)', border: 'rgba(167,139,250,.35)', text: '#c4b5fd', dot: '#a78bfa', label: 'Violett' },
  { bg: 'rgba(99,102,241,.15)',  border: 'rgba(99,102,241,.32)',  text: '#818cf8', dot: '#6366f1', label: 'Indigo'  },
  { bg: 'rgba(230,168,23,.14)',  border: 'rgba(230,168,23,.32)',  text: '#e6a817', dot: '#e6a817', label: 'Gold'    },
  { bg: 'rgba(74,222,128,.13)',  border: 'rgba(74,222,128,.3)',   text: '#4ade80', dot: '#22c55e', label: 'Grün'    },
  { bg: 'rgba(248,113,113,.13)', border: 'rgba(248,113,113,.3)', text: '#f87171', dot: '#ef4444', label: 'Rot'     },
  { bg: 'rgba(45,212,191,.13)',  border: 'rgba(45,212,191,.3)',  text: '#2dd4bf', dot: '#14b8a6', label: 'Teal'    },
  { bg: 'rgba(244,114,182,.13)', border: 'rgba(244,114,182,.3)', text: '#f472b6', dot: '#ec4899', label: 'Pink'    },
  { bg: 'rgba(251,191,36,.13)',  border: 'rgba(251,191,36,.3)',  text: '#fbbf24', dot: '#f59e0b', label: 'Gelb'    },
];

// ── Tag-Hilfsfunktionen ──────────────────────────────────

/** Normalisiert einen Tag (String oder Objekt) zu einem Objekt */
function tagObj(t) {
  return typeof t === 'object' && t !== null ? t : { name: String(t), color: 0 };
}

/** Gibt den Anzeigenamen eines Tags zurück */
function tagName(t) {
  return tagObj(t).name;
}

/** Gibt das Farb-Objekt aus TAG_COLORS für einen Tag zurück */
function tagColor(t) {
  const idx = tagObj(t).color;
  return TAG_COLORS[idx] ?? TAG_COLORS[0];
}

// ── Allgemeine Hilfsfunktionen ───────────────────────────

/** HTML-Sonderzeichen escapen */
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Aktuellen Seitennamen (Dateiname) ermitteln */
function getPageKey() {
  return location.pathname.split('/').pop() || 'index.html';
}

// ── Exports (für zukünftige Modul-Migration) ────────────
// Aktuell als globale Variablen verfügbar, da keine ES-Module
// auf GitHub Pages ohne Build-Step genutzt werden.
