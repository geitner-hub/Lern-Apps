// ═══════════════════════════════════════════════════════
//  Lernwelt – sync-code.js
//  Sicherungscodes für die automatische Pass-Sicherung.
//  Wird vom Admin (Karten erzeugen) und vom Pass (Karte scannen) benutzt.
//
//  Code: 12 Zeichen Crockford-Base32, angezeigt als K7QM-3HXP-9RT4
//        11 Zufallszeichen (55 Bit) + 1 Prüfzeichen gegen Tippfehler.
//        Groß/klein egal; O wird als 0 gelesen, I und L als 1.
//
//  Aus dem Code wird IM GERÄT abgeleitet (Web Crypto):
//    id   – 16 Byte (hex), Kennung des Eintrags beim Worker
//    auth – 32 Byte (hex), wird bei jeder Anfrage mitgeschickt
//    key  – AES-GCM-256-Schlüssel, verlässt das Gerät nie
//  Der Worker bekommt beim Anlegen nur id und SHA-256(auth).
//
//  WICHTIG: SALT, ITER und die HKDF-Infos nie ändern –
//  sonst passen alle gedruckten Karten nicht mehr.
//
//  Verwendung:
//    const code = LernSyncCode.erzeugen();              // 'K7QM3HXP9RT4'
//    LernSyncCode.formatieren(code);                     // 'K7QM-3HXP-9RT4'
//    LernSyncCode.normalisieren(' k7qm-3hxp-9rt4 ');     // 'K7QM3HXP9RT4' oder '' (ungültig)
//    const { id, auth, key } = await LernSyncCode.ableiten(code);
//    const hash = await LernSyncCode.authHash(auth);     // für den Admin
//    LernSyncCode.url(code);                             // Link für den QR-Code
//    LernSyncCode.ausText(text);                         // Code aus Link/Text fischen
// ═══════════════════════════════════════════════════════

'use strict';

const LernSyncCode = (() => {
  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';   // Crockford, ohne I L O U
  const DATEN    = 11;                                   // Zufallszeichen
  const SALT     = 'lernwelt-sync-v1';
  const ITER     = 200000;
  const enc      = new TextEncoder();

  function pruefzeichen(daten) {
    let s = 0;
    for (let i = 0; i < daten.length; i++) s += (ALPHABET.indexOf(daten[i]) + 1) * (i + 1);
    return ALPHABET[s % 31];
  }

  function erzeugen() {
    const b = crypto.getRandomValues(new Uint8Array(DATEN));
    const daten = Array.from(b, x => ALPHABET[x & 31]).join('');   // 256/32 → gleichverteilt
    return daten + pruefzeichen(daten);
  }

  /** Eingabe bereinigen; '' wenn kein gültiger Code (auch bei falschem Prüfzeichen). */
  function normalisieren(eingabe) {
    const s = String(eingabe || '').toUpperCase()
      .replace(/[\s\-_.]/g, '')
      .replace(/O/g, '0').replace(/[IL]/g, '1');
    if (s.length !== DATEN + 1) return '';
    for (const ch of s) if (!ALPHABET.includes(ch)) return '';
    return pruefzeichen(s.slice(0, DATEN)) === s[DATEN] ? s : '';
  }

  function formatieren(code) {
    const c = normalisieren(code) || String(code || '');
    return c.replace(/(.{4})(?=.)/g, '$1-');
  }

  /** Link für den QR-Code (öffnet die Lernwelt und verbindet den Pass). */
  function url(code) {
    const base = (typeof lwBaseUrl === 'function') ? lwBaseUrl() : new URL('./', location.href).href;
    return base + '#sync=' + normalisieren(code);
  }

  /** Code aus einem Link (…#sync=…) oder beliebigem Text holen; '' wenn keiner drin ist. */
  function ausText(text) {
    const t = String(text || '');
    const m = t.match(/#sync=([A-Za-z0-9-]+)/);
    if (m) return normalisieren(m[1]);
    const kandidaten = t.match(/[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}/g) || [];
    for (const k of kandidaten) { const c = normalisieren(k); if (c) return c; }
    return '';
  }

  const hex = b => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
  const vonHex = h => Uint8Array.from(h.match(/../g), x => parseInt(x, 16));

  async function ableiten(code) {
    const c = normalisieren(code);
    if (!c) throw new Error('Ungültiger Code');
    const pw = await crypto.subtle.importKey('raw', enc.encode(c), 'PBKDF2', false, ['deriveBits']);
    const grund = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT), iterations: ITER }, pw, 256);
    const hk = await crypto.subtle.importKey('raw', grund, 'HKDF', false, ['deriveBits', 'deriveKey']);
    const hkdf = info => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode('lernwelt-sync|' + info) });
    const [idBits, authBits, key] = await Promise.all([
      crypto.subtle.deriveBits(hkdf('id'), hk, 128),
      crypto.subtle.deriveBits(hkdf('auth'), hk, 256),
      crypto.subtle.deriveKey(hkdf('key'), hk, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
    ]);
    return { code: c, id: hex(idBits), auth: hex(authBits), key };
  }

  async function authHash(authHex) {
    return hex(await crypto.subtle.digest('SHA-256', vonHex(authHex)));
  }

  return { erzeugen, normalisieren, formatieren, url, ausText, ableiten, authHash, ALPHABET };
})();

if (typeof window !== 'undefined') window.LernSyncCode = LernSyncCode;
