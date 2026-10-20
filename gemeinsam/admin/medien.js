// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Medien: Dateien hochladen und per QR-Code/Kurzlink zeigen
//  Teil von admin.html (Tab „📁 Medien“). Läuft komplett über den Worker
//  (cloudflare/medien.js) – NICHT über config.json, also ohne Entwurf/Veröffentlichen:
//  Jede Aktion wirkt sofort. Einrichtung: cloudflare/ANLEITUNG-MEDIEN.md
//
//  Bewusst ohne Bezug zur Lernwelt: Die Kinder sehen nur den Inhalt
//  (schlichte Seite mit Texten oder direkt die Datei).
// ═══════════════════════════════════════════════════════
'use strict';

const MD = {
  geladen: false, laedt: false, fehler: '', status: 0,
  eintraege: [], belegt: 0, grenze: 0, gratis: 0, maxDatei: 1024 ** 3, basis: '',
  typen: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif', 'mp4', 'm4v', 'mov', 'webm', 'mp3', 'm4a', 'aac', 'wav', 'ogg',
    'pdf', 'txt', 'csv', 'docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt', 'odt', 'ods', 'odp', 'pages', 'key', 'numbers', 'zip', 'ggb'],
  q: '', fach: '', auswahl: [], laeuft: false,
  bearbeiten: null, samInhalt: [], qr: null,
};

// ── Einstieg (aus kern.js beim Öffnen des Tabs) ────────
function buildMedien() {
  mdStil();
  mdGeruest();
  if (!MD.geladen && !MD.laedt) mdLaden();
  else mdZeichnen();
}

// ── Worker-Aufrufe ─────────────────────────────────────
function mdToken() {
  try { const t = JSON.parse(localStorage.getItem('lernwelt-admin-schluessel') || 'null'); return (t && t.token) || ''; }
  catch (e) { return ''; }
}
async function mdPost(pfad, body) {
  try {
    const r = await fetch(ConfigAPI.WORKER_URL + pfad, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + mdToken() },
      body: JSON.stringify(body || {}),
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) showLogin('Sitzung abgelaufen – bitte neu anmelden.');
    return { ok: r.ok, status: r.status, data: d, error: d.error || (r.ok ? '' : 'Fehler ' + r.status) };
  } catch (e) {
    return { ok: false, status: 0, data: {}, error: 'Worker nicht erreichbar (Internet?)' };
  }
}
/** Binär-Upload mit Fortschritt (fetch kann keinen Upload-Fortschritt) */
function mdPut(pfad, blob, beiFortschritt) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', ConfigAPI.WORKER_URL + pfad);
    x.setRequestHeader('Authorization', 'Bearer ' + mdToken());
    x.setRequestHeader('Content-Type', 'application/octet-stream');
    x.upload.onprogress = ev => { if (ev.lengthComputable && beiFortschritt) beiFortschritt(ev.loaded / ev.total); };
    x.onload = () => {
      let d = {};
      try { d = JSON.parse(x.responseText || '{}'); } catch (e) {}
      if (x.status >= 200 && x.status < 300) resolve(d);
      else reject(Object.assign(new Error(d.error || ('Fehler ' + x.status)), { status: x.status }));
    };
    x.onerror = () => reject(Object.assign(new Error('Verbindung unterbrochen'), { status: 0 }));
    x.send(blob);
  });
}
const mdWarte = ms => new Promise(r => setTimeout(r, ms));

async function mdLaden() {
  MD.laedt = true;
  mdZeichnen();
  const r = await mdPost('/medien/admin/liste', {});
  MD.laedt = false;
  MD.status = r.status;
  if (r.ok) {
    const d = r.data;
    MD.geladen = true; MD.fehler = '';
    MD.eintraege = Array.isArray(d.eintraege) ? d.eintraege : [];
    MD.belegt = Number(d.belegt) || 0; MD.grenze = Number(d.grenze) || 0; MD.gratis = Number(d.gratis) || 0;
    MD.maxDatei = Number(d.maxDatei) || MD.maxDatei;
    MD.basis = typeof d.basis === 'string' && /^(https:\/\/[^\s"'<>]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)\/m\/$/.test(d.basis) ? d.basis : '';
    if (Array.isArray(d.typen) && d.typen.length) MD.typen = d.typen.filter(t => /^[a-z0-9]{1,8}$/.test(t));
  } else {
    MD.fehler = r.status === 423 ? 'In der Testumgebung ist der Medienbereich abgeschaltet.' : r.error;
  }
  mdZeichnen();
}

// ── Hilfen ─────────────────────────────────────────────
function mdGroesse(b) {
  b = Number(b) || 0;
  if (b >= 1024 ** 3) return (b / 1024 ** 3).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' GB';
  if (b >= 1024 ** 2) return (b / 1024 ** 2).toLocaleString('de-DE', { maximumFractionDigits: b >= 1024 ** 2 * 100 ? 0 : 1 }) + ' MB';
  return Math.max(1, Math.round(b / 1024)) + ' KB';
}
function mdEndung(name) { const m = /\.([A-Za-z0-9]{1,8})$/.exec(String(name || '')); return m ? m[1].toLowerCase() : ''; }
function mdIcon(e) {
  if (e.art === 'sammlung') return '📚';
  const t = String(e.typ || '');
  return t.startsWith('image/') ? '🖼️' : t.startsWith('video/') ? '🎬' : t.startsWith('audio/') ? '🎧'
    : t === 'application/pdf' ? '📄' : '📎';
}
const mdLink = code => MD.basis + code;
const mdOhneHttps = url => String(url).replace(/^https:\/\//, '');
const mdFinde = code => MD.eintraege.find(e => e.code === code);
const mdIstVideo = name => ['mp4', 'm4v', 'mov', 'webm'].includes(mdEndung(name));
function mdFachOptionen(gewaehlt) {
  return `<option value="">– ohne Fach –</option>` + FAECHER.map(f =>
    `<option value="${escHtml(f)}"${f === gewaehlt ? ' selected' : ''}>${escHtml((CAT_ICONS[f] || '') + ' ' + f)}</option>`).join('');
}
function mdOrdnerVorschlaege() {
  const s = new Set(MD.eintraege.map(e => e.ordner).filter(Boolean));
  return [...s].sort((a, b) => a.localeCompare(b, 'de')).map(o => `<option value="${escHtml(o)}"></option>`).join('');
}

// ── Grundgerüst (einmal) ───────────────────────────────
function mdGeruest() {
  const box = document.getElementById('medien-inhalt');
  if (!box || box.dataset.fertig) return;
  box.dataset.fertig = '1';
  box.innerHTML = `
    <div id="md-speicher" class="form-card md-speicher">Lädt …</div>

    <div class="sec-header"><span class="sec-title">⬆️ Hochladen</span></div>
    <div class="form-card" style="margin-bottom:1.5rem;">
      <label class="md-drop" id="md-drop">
        <input type="file" id="md-datei" multiple hidden>
        <span class="md-drop-gross">Dateien hierher ziehen oder antippen</span>
        <span class="md-drop-klein">Bilder, Videos, Audio, PDF, Word, PowerPoint, Excel, Pages/Keynote … · bis 1 GB pro Datei</span>
      </label>
      <div id="md-gewaehlt" class="md-gewaehlt"></div>
      <div class="form-grid" style="margin-top:.9rem;">
        <div class="form-group"><label>Fach</label><select id="md-fach"></select></div>
        <div class="form-group"><label>Ordner</label><input type="text" id="md-ordner" maxlength="60" list="md-ordner-liste" placeholder="z. B. Vulkane"><datalist id="md-ordner-liste"></datalist></div>
        <div class="form-group full" id="md-titel-gruppe"><label>Titel</label><input type="text" id="md-titel" maxlength="120" placeholder="Leer = Dateiname"></div>
        <div class="form-group full"><label>Untertitel</label><input type="text" id="md-untertitel" maxlength="200" placeholder="kurze Zeile unter dem Titel (optional)"></div>
        <div class="form-group"><label>Infotext</label><textarea id="md-info" maxlength="2000" placeholder="Erklärung oder Hintergrund (optional)"></textarea></div>
        <div class="form-group"><label>Arbeitsauftrag</label><textarea id="md-auftrag" maxlength="2000" placeholder="z. B. Beschreibe, was du siehst. (optional)"></textarea></div>
        <div class="form-group full" id="md-vtt-gruppe" hidden><label>Untertitel-Spur fürs Video (.vtt oder .srt, optional)</label><input type="file" id="md-vtt" accept=".vtt,.srt,text/vtt"></div>
      </div>
      <p class="md-hinweis" id="md-mehrere-hinweis" hidden>Mehrere Dateien: Fach, Ordner und Texte gelten für alle, Titel ist jeweils der Dateiname. Einzeln ändern geht danach mit ✏️.</p>
      <p class="md-hinweis">Ohne Untertitel, Info und Auftrag öffnet der Link direkt die Datei. Mit Text sehen die Kinder eine schlichte Seite mit Text und Datei. Wer den Link hat, kann den Inhalt öffnen – bitte keine Fotos oder Videos, auf denen Kinder zu erkennen sind.</p>
      <div style="display:flex;justify-content:flex-end;gap:.55rem;margin-top:.6rem;">
        <button class="btn accent" id="md-los" disabled>⬆ Hochladen</button>
      </div>
      <div id="md-fortschritt" class="md-fortschritt"></div>
    </div>

    <div class="sec-header"><span class="sec-title">📁 Meine Medien</span></div>
    <div class="filter-row-admin">
      <input type="search" class="admin-search" id="md-suche" placeholder="Suchen (Titel, Ordner, Code) …" autocomplete="off">
      <select class="fach-filter" id="md-fach-filter"><option value="">Alle Fächer</option></select>
      <button class="btn indigo" id="md-neue-sammlung">📚 Neue Sammlung</button>
      <button class="btn" id="md-neu-laden" title="Liste neu laden">↻</button>
    </div>
    <div id="md-liste"></div>`;

  document.getElementById('md-fach').innerHTML = mdFachOptionen('');
  document.getElementById('md-fach-filter').innerHTML += FAECHER.map(f => `<option value="${escHtml(f)}">${escHtml(f)}</option>`).join('')
    + '<option value="__ohne">ohne Fach</option>';

  const inp = document.getElementById('md-datei');
  inp.addEventListener('change', () => { mdDateienWaehlen([...inp.files]); inp.value = ''; });
  const drop = document.getElementById('md-drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('ueber'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('ueber')));
  drop.addEventListener('drop', e => { e.preventDefault(); mdDateienWaehlen([...(e.dataTransfer && e.dataTransfer.files || [])]); });
  document.getElementById('md-los').addEventListener('click', mdHochladen);
  document.getElementById('md-gewaehlt').addEventListener('click', e => {
    const b = e.target.closest('[data-weg]');
    if (!b || MD.laeuft) return;
    MD.auswahl.splice(Number(b.dataset.weg), 1);
    mdAuswahlZeigen();
  });
  document.getElementById('md-suche').addEventListener('input', e => { MD.q = e.target.value.trim().toLowerCase(); mdListeZeichnen(); });
  document.getElementById('md-fach-filter').addEventListener('change', e => { MD.fach = e.target.value; mdListeZeichnen(); });
  document.getElementById('md-neue-sammlung').addEventListener('click', () => mdBearbeitenOeffnen(null));
  document.getElementById('md-neu-laden').addEventListener('click', mdLaden);
  document.getElementById('md-liste').addEventListener('click', mdListeKlick);
  document.getElementById('md-liste').addEventListener('change', mdListeSchalter);
  window.addEventListener('beforeunload', e => { if (MD.laeuft) { e.preventDefault(); e.returnValue = ''; } });
  mdModalsAnlegen();
}

function mdZeichnen() {
  if (!document.getElementById('md-liste')) return;
  mdSpeicherZeichnen();
  document.getElementById('md-ordner-liste').innerHTML = mdOrdnerVorschlaege();
  document.getElementById('md-datei').accept = MD.typen.map(t => '.' + t).join(',');
  mdAuswahlZeigen();
  mdListeZeichnen();
}

function mdSpeicherZeichnen() {
  const box = document.getElementById('md-speicher');
  if (MD.laedt && !MD.geladen) { box.innerHTML = '<span class="md-leise">Lädt …</span>'; return; }
  if (MD.fehler) {
    const einrichten = MD.status === 501;
    box.innerHTML = `<div class="md-fehler">⚠ ${escHtml(MD.fehler)}</div>` + (einrichten
      ? '<div class="md-leise" style="margin-top:.35rem">Einmalig einrichten: Schritt-für-Schritt-Anleitung in <code>cloudflare/ANLEITUNG-MEDIEN.md</code> (R2-Speicher anlegen und an den Worker binden).</div>'
      : '');
    return;
  }
  const anteil = MD.grenze ? Math.min(1, MD.belegt / MD.grenze) : 0;
  const dateien = MD.eintraege.filter(e => e.art === 'datei' && e.fertig).length;
  const sammlungen = MD.eintraege.filter(e => e.art === 'sammlung').length;
  const aufrufe = MD.eintraege.reduce((s, e) => s + (Number(e.aufrufe) || 0), 0);
  box.innerHTML = `
    <div class="md-speicher-kopf"><b>💾 ${mdGroesse(MD.belegt)}</b> von ${mdGroesse(MD.grenze)} belegt
      <span class="md-leise">(${Math.round(anteil * 100)} % · Gratisrahmen bei Cloudflare: ${mdGroesse(MD.gratis)})</span></div>
    <div class="md-balken"><div style="width:${(anteil * 100).toFixed(1)}%" class="${anteil > .9 ? 'voll' : anteil > .7 ? 'knapp' : ''}"></div></div>
    <div class="md-leise">${dateien} Datei${dateien === 1 ? '' : 'en'} · ${sammlungen} Sammlung${sammlungen === 1 ? '' : 'en'} · ${aufrufe} Aufruf${aufrufe === 1 ? '' : 'e'} insgesamt</div>`;
}

// ── Hochladen ──────────────────────────────────────────
function mdDateienWaehlen(dateien) {
  if (MD.laeuft) { showToast('⏳ Bitte warten, bis der Upload fertig ist', true); return; }
  const neu = [];
  dateien.forEach(d => {
    if (!MD.typen.includes(mdEndung(d.name))) { showToast(`⚠ „${d.name}“: Dateityp nicht erlaubt`, true); return; }
    if (d.size > MD.maxDatei) { showToast(`⚠ „${d.name}“ ist größer als ${mdGroesse(MD.maxDatei)} – bitte vorher verkleinern`, true); return; }
    if (!d.size) { showToast(`⚠ „${d.name}“ ist leer`, true); return; }
    neu.push(d);
  });
  MD.auswahl = MD.auswahl.concat(neu).slice(0, 30);
  mdAuswahlZeigen();
}
function mdAuswahlZeigen() {
  const box = document.getElementById('md-gewaehlt');
  if (!box) return;
  const n = MD.auswahl.length;
  box.innerHTML = MD.auswahl.map((d, i) => `<span class="md-chip">${escHtml(d.name)} <small>${mdGroesse(d.size)}</small>
    <button type="button" data-weg="${i}" title="Entfernen">✕</button></span>`).join('');
  document.getElementById('md-los').disabled = !n || MD.laeuft || !MD.geladen;
  document.getElementById('md-los').textContent = n > 1 ? `⬆ ${n} Dateien hochladen` : '⬆ Hochladen';
  document.getElementById('md-titel-gruppe').hidden = n > 1;
  document.getElementById('md-mehrere-hinweis').hidden = n < 2;
  document.getElementById('md-vtt-gruppe').hidden = !(n === 1 && mdIstVideo(MD.auswahl[0].name));
}

async function mdHochladen() {
  if (MD.laeuft || !MD.auswahl.length) return;
  if (window.LW && LW.TEST) { showToast('🧪 Testumgebung: Hochladen ist hier abgeschaltet', true); return; }
  const wert = id => document.getElementById(id).value;
  const felder = { fach: wert('md-fach'), ordner: wert('md-ordner').trim(), untertitel: wert('md-untertitel').trim(),
    info: wert('md-info').trim(), auftrag: wert('md-auftrag').trim() };
  const dateien = MD.auswahl.slice();
  const titel = dateien.length === 1 ? wert('md-titel').trim() : '';
  const vttEl = document.getElementById('md-vtt');
  const vtt = dateien.length === 1 && mdIstVideo(dateien[0].name) && vttEl.files[0] ? vttEl.files[0] : null;

  MD.laeuft = true;
  mdAuswahlZeigen();
  const fortschritt = document.getElementById('md-fortschritt');
  fortschritt.innerHTML = dateien.map((d, i) => `<div class="md-fz" id="md-fz-${i}"><span class="md-fz-name">${escHtml(d.name)}</span>
    <div class="md-balken klein"><div style="width:0%"></div></div><span class="md-fz-status md-leise">wartet</span></div>`).join('');
  let ok = 0;
  for (let i = 0; i < dateien.length; i++) {
    const zeile = document.getElementById('md-fz-' + i);
    const balken = zeile.querySelector('.md-balken div'), status = zeile.querySelector('.md-fz-status');
    const melde = p => { balken.style.width = (p * 100).toFixed(1) + '%'; status.textContent = Math.floor(p * 100) + ' %'; };
    try {
      status.textContent = 'startet …';
      await mdEineHochladen(dateien[i], { ...felder, titel: titel }, vtt, melde);
      melde(1); status.textContent = '✓ fertig'; zeile.classList.add('ok'); ok++;
    } catch (e) {
      status.textContent = '⚠ ' + (e.message || 'Fehler'); zeile.classList.add('fehler');
    }
  }
  MD.laeuft = false;
  MD.auswahl = [];
  if (ok) ['md-titel', 'md-untertitel', 'md-info', 'md-auftrag'].forEach(id => { document.getElementById(id).value = ''; });
  vttEl.value = '';
  showToast(ok === dateien.length ? `✓ ${ok} Datei${ok === 1 ? '' : 'en'} hochgeladen` : `⚠ ${dateien.length - ok} von ${dateien.length} fehlgeschlagen`, ok !== dateien.length);
  await mdLaden();
}

async function mdEineHochladen(datei, felder, vtt, melde) {
  const neu = await mdPost('/medien/admin/neu', { ...felder, dateiname: datei.name, groesse: datei.size });
  if (!neu.ok) throw new Error(neu.error);
  const { code, mehrteilig, teilGroesse } = neu.data;
  try {
    if (!mehrteilig) {
      await mdPut('/medien/admin/datei?code=' + code, datei, melde);
    } else {
      const T = teilGroesse, anzahl = Math.ceil(datei.size / T), teile = [];
      for (let n = 1; n <= anzahl; n++) {
        const stueck = datei.slice((n - 1) * T, Math.min(datei.size, n * T));
        for (let versuch = 1; ; versuch++) {
          try {
            const r = await mdPut(`/medien/admin/teil?code=${code}&nr=${n}`, stueck, p => melde(((n - 1) * T + p * stueck.size) / datei.size));
            teile.push(r.teil);
            break;
          } catch (e) {
            if (versuch >= 3 || (e.status && e.status < 500)) throw e;   // nur bei Netz-/Serverfehlern wiederholen
            await mdWarte(2000 * versuch);
          }
        }
      }
      const ab = await mdPost('/medien/admin/abschliessen', { code, teile });
      if (!ab.ok) throw new Error(ab.error);
    }
  } catch (e) {
    await mdPost('/medien/admin/abbrechen', { code });
    throw e;
  }
  if (vtt) {
    try { await mdPut('/medien/admin/untertitel?code=' + code, vtt); }
    catch (e) { showToast('⚠ Video ist da, aber die Untertitel nicht: ' + e.message, true); }
  }
  return code;
}

// ── Liste ──────────────────────────────────────────────
function mdPasst(e) {
  if (MD.fach === '__ohne' ? e.fach : (MD.fach && e.fach !== MD.fach)) return false;
  if (!MD.q) return true;
  return [e.titel, e.untertitel, e.ordner, e.code, e.dateiname].some(t => String(t || '').toLowerCase().includes(MD.q));
}
function mdListeZeichnen() {
  const box = document.getElementById('md-liste');
  if (!box) return;
  if (!MD.geladen) { box.innerHTML = MD.laedt ? '<div class="md-leer">Lädt …</div>' : ''; return; }
  const liste = MD.eintraege.filter(mdPasst);
  if (!liste.length) {
    box.innerHTML = `<div class="md-leer">${MD.eintraege.length ? 'Nichts gefunden.' : 'Noch keine Medien – oben die erste Datei hochladen.'}</div>`;
    return;
  }
  // Gruppieren: Fach → Ordner
  const reihenfolge = [...FAECHER, ''];
  const faecher = [...new Set(liste.map(e => e.fach))].sort((a, b) => {
    const ia = reihenfolge.indexOf(a), ib = reihenfolge.indexOf(b);
    return (ia < 0 ? 98 : ia) - (ib < 0 ? 98 : ib) || a.localeCompare(b, 'de');
  });
  box.innerHTML = faecher.map(fach => {
    const imFach = liste.filter(e => e.fach === fach);
    const ordner = [...new Set(imFach.map(e => e.ordner))].sort((a, b) => (a === '') - (b === '') || a.localeCompare(b, 'de'));
    const farbe = (CAT_STYLES[fach] || {}).color || 'var(--muted)';
    return `<div class="md-fach"><div class="md-fach-kopf" style="--f:${escHtml(farbe)}">${escHtml((CAT_ICONS[fach] || '📁') + ' ' + (fach || 'Ohne Fach'))}
        <span class="md-leise">${imFach.length}</span></div>
      ${ordner.map(o => {
        const zeilen = imFach.filter(e => e.ordner === o)
          .sort((a, b) => (a.art !== 'sammlung') - (b.art !== 'sammlung') || a.titel.localeCompare(b.titel, 'de'))
          .map(mdZeile).join('');
        if (!o) return `<div class="md-ordner-inhalt">${zeilen}</div>`;
        return `<details class="md-ordner" open><summary><span>📂 ${escHtml(o)}</span>
            <button class="icon-btn" data-a="ordner" data-fach="${escHtml(fach)}" data-ordner="${escHtml(o)}" title="Ordner umbenennen">✏️</button></summary>
          <div class="md-ordner-inhalt">${zeilen}</div></details>`;
      }).join('')}</div>`;
  }).join('');
}

function mdZeile(e) {
  const c = escHtml(e.code);
  if (!e.fertig) {
    return `<div class="md-zeile unfertig"><span class="md-icon">⏳</span><div class="md-text"><div class="md-titel">${escHtml(e.titel)}</div>
      <div class="md-meta">Upload nicht abgeschlossen · wird nachts automatisch entfernt</div></div>
      <div class="md-knoepfe"><button class="icon-btn on-red" data-a="loeschen" data-c="${c}" title="Entfernen">🗑</button></div></div>`;
  }
  const meta = [];
  if (e.art === 'sammlung') {
    const n = (e.inhalt || []).length;
    meta.push(`${n} Datei${n === 1 ? '' : 'en'}`);
  } else meta.push(mdGroesse(e.groesse));
  meta.push(`👁 ${e.aufrufe || 0}`);
  meta.push(`Code <b>${c}</b>`);
  if (e.info) meta.push('ℹ️ Info');
  if (e.auftrag) meta.push('📝 Auftrag');
  if (e.untertitelDatei) meta.push('🔤 Untertitel');
  return `<div class="md-zeile${e.aktiv ? '' : ' aus'}">
    <span class="md-icon">${mdIcon(e)}</span>
    <div class="md-text"><div class="md-titel">${escHtml(e.titel)}${e.aktiv ? '' : ' <span class="md-aus-marke">aus</span>'}</div>
      ${e.untertitel ? `<div class="md-unter">${escHtml(e.untertitel)}</div>` : ''}
      <div class="md-meta">${meta.join(' · ')}</div></div>
    <div class="md-knoepfe">
      <label class="switch" title="${e.aktiv ? 'Eingeschaltet – Link funktioniert' : 'Ausgeschaltet – Link zeigt „nicht freigegeben“'}"><input type="checkbox" data-aktiv="${c}"${e.aktiv ? ' checked' : ''}><span></span></label>
      <button class="icon-btn on-gold" data-a="qr" data-c="${c}" title="QR-Code und Kurzlink">📲 QR</button>
      <button class="icon-btn" data-a="beamer" data-c="${c}" title="Großansicht für den Beamer">🖥</button>
      <button class="icon-btn" data-a="kopieren" data-c="${c}" title="Kurzlink kopieren">🔗</button>
      <button class="icon-btn" data-a="oeffnen" data-c="${c}" title="Ansehen wie die Kinder">↗</button>
      <button class="icon-btn" data-a="bearbeiten" data-c="${c}" title="Bearbeiten">✏️</button>
      <button class="icon-btn on-red" data-a="loeschen" data-c="${c}" title="Löschen">🗑</button>
    </div></div>`;
}

async function mdListeKlick(ev) {
  const b = ev.target.closest('button[data-a]');
  if (!b) return;
  ev.preventDefault();
  const a = b.dataset.a;
  if (a === 'ordner') { mdOrdnerUmbenennen(b.dataset.fach, b.dataset.ordner); return; }
  const e = mdFinde(b.dataset.c);
  if (!e) return;
  if (a === 'qr') mdQrOeffnen(e);
  else if (a === 'beamer') mdBeamer(e);
  else if (a === 'kopieren') { const ok = await copyText(mdLink(e.code)); showToast(ok ? '🔗 Kurzlink kopiert' : '⚠ Kopieren nicht möglich', !ok); }
  else if (a === 'oeffnen') window.open(mdLink(e.code), '_blank', 'noopener');
  else if (a === 'bearbeiten') mdBearbeitenOeffnen(e);
  else if (a === 'loeschen') mdLoeschen(e);
}

async function mdListeSchalter(ev) {
  const inp = ev.target.closest('input[data-aktiv]');
  if (!inp) return;
  const e = mdFinde(inp.dataset.aktiv);
  if (!e) return;
  const neu = inp.checked;
  const r = await mdPost('/medien/admin/aendern', { code: e.code, aktiv: neu });
  if (!r.ok) { inp.checked = !neu; showToast('⚠ ' + r.error, true); return; }
  e.aktiv = neu;
  showToast(neu ? `✓ „${e.titel}“ eingeschaltet` : `🚫 „${e.titel}“ ausgeschaltet – Link zeigt „nicht freigegeben“`);
  mdListeZeichnen();
}

async function mdLoeschen(e) {
  let text = e.art === 'sammlung'
    ? `Sammlung „${e.titel}“ löschen?\n\nDie Dateien darin bleiben erhalten. Der QR-Code der Sammlung funktioniert danach nicht mehr.`
    : `„${e.titel}“ endgültig löschen?\n\nGedruckte QR-Codes und Links funktionieren danach nicht mehr.`;
  if (e.art === 'datei') {
    const in_ = MD.eintraege.filter(s => s.art === 'sammlung' && (s.inhalt || []).includes(e.code)).map(s => '„' + s.titel + '“');
    if (in_.length) text += `\n\nSie wird auch aus ${in_.length === 1 ? 'der Sammlung' : 'den Sammlungen'} ${in_.join(', ')} entfernt.`;
  }
  if (!e.fertig) text = `Abgebrochenen Upload „${e.titel}“ entfernen?`;
  if (!confirm(text)) return;
  const r = await mdPost(e.fertig ? '/medien/admin/loeschen' : '/medien/admin/abbrechen', { code: e.code });
  if (!r.ok) { showToast('⚠ ' + r.error, true); return; }
  showToast('🗑 Gelöscht');
  mdLaden();
}

async function mdOrdnerUmbenennen(fach, alt) {
  const neu = prompt(`Ordner „${alt}“ umbenennen in:`, alt);
  if (neu === null) return;
  const n = neu.trim().slice(0, 60);
  if (n === alt) return;
  const r = await mdPost('/medien/admin/ordner-umbenennen', { fach, alt, neu: n });
  if (!r.ok) { showToast('⚠ ' + r.error, true); return; }
  showToast(n ? '✓ Ordner umbenannt' : '✓ Ordner aufgelöst');
  mdLaden();
}

// ── Bearbeiten / Sammlung ──────────────────────────────
function mdModalsAnlegen() {
  if (document.getElementById('md-modal')) return;
  const d = document.createElement('div');
  d.innerHTML = `
    <div class="modal-bg" id="md-modal"><div class="modal md-gross" id="md-modal-inhalt"></div></div>
    <div class="modal-bg" id="md-qr"><div class="modal md-qr-box">
      <h2 id="md-qr-titel">📲 QR-Code</h2>
      <div class="md-qr-bild" id="md-qr-bild"></div>
      <div class="md-kurz" id="md-qr-link"></div>
      <div class="md-leise" id="md-qr-code"></div>
      <div class="md-qr-knoepfe">
        <button class="btn green" data-q="png">⬇ QR (PNG)</button>
        <button class="btn green" data-q="pngtext">⬇ QR mit Titel</button>
        <button class="btn" data-q="kopieren">🔗 Link kopieren</button>
        <button class="btn indigo" data-q="beamer">🖥 Beamer</button>
        <button class="btn" data-q="oeffnen">↗ Ansehen</button>
      </div>
      <div class="modal-actions"><button class="btn" data-q="zu">Schließen</button></div>
    </div></div>
    <div id="md-beamer" class="md-beamer" hidden>
      <div class="md-beamer-titel" id="md-beamer-titel"></div>
      <div class="md-beamer-unter" id="md-beamer-unter"></div>
      <canvas id="md-beamer-qr"></canvas>
      <div class="md-beamer-link" id="md-beamer-link"></div>
      <div class="md-beamer-hinweis">Antippen oder Esc zum Schließen</div>
    </div>`;
  while (d.firstElementChild) document.body.appendChild(d.firstElementChild);

  const modal = document.getElementById('md-modal');
  modal.addEventListener('click', e => { if (e.target === modal) mdModalZu(); });
  const qr = document.getElementById('md-qr');
  qr.addEventListener('click', async e => {
    if (e.target === qr) { qr.classList.remove('open'); return; }
    const b = e.target.closest('[data-q]');
    if (!b || !MD.qr) return;
    const q = b.dataset.q;
    if (q === 'zu') qr.classList.remove('open');
    else if (q === 'png') downloadCanvas(mdQrBild(MD.qr, false), 'QR-' + MD.qr.titel);
    else if (q === 'pngtext') downloadCanvas(mdQrBild(MD.qr, true), 'QR-' + MD.qr.titel);
    else if (q === 'kopieren') { const ok = await copyText(mdLink(MD.qr.code)); showToast(ok ? '🔗 Kurzlink kopiert' : '⚠ Kopieren nicht möglich', !ok); }
    else if (q === 'beamer') { qr.classList.remove('open'); mdBeamer(MD.qr); }
    else if (q === 'oeffnen') window.open(mdLink(MD.qr.code), '_blank', 'noopener');
  });
  const beamer = document.getElementById('md-beamer');
  beamer.addEventListener('click', mdBeamerZu);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!beamer.hidden) mdBeamerZu();
    else if (qr.classList.contains('open')) qr.classList.remove('open');
    else if (modal.classList.contains('open')) mdModalZu();
  });
}
function mdModalZu() { document.getElementById('md-modal').classList.remove('open'); MD.bearbeiten = null; }

/** e = vorhandener Eintrag, null = neue Sammlung */
function mdBearbeitenOeffnen(e) {
  if (!MD.geladen) { showToast('⚠ Medien sind noch nicht geladen', true); return; }
  const neu = !e;
  const sammlung = neu || e.art === 'sammlung';
  MD.bearbeiten = e ? e.code : '__neu';
  MD.samInhalt = sammlung && e ? (e.inhalt || []).slice() : [];
  const w = (k, d = '') => escHtml(e ? (e[k] || '') : d);
  const video = e && e.art === 'datei' && String(e.typ).startsWith('video/');
  const box = document.getElementById('md-modal-inhalt');
  box.innerHTML = `
    <h2>${neu ? '📚 Neue Sammlung' : (sammlung ? '📚 Sammlung bearbeiten' : '✏️ Bearbeiten')}</h2>
    ${!neu && !sammlung ? `<div class="md-leise" style="margin:-.6rem 0 .9rem">${mdIcon(e)} ${escHtml(e.dateiname)} · ${mdGroesse(e.groesse)} · Code <b>${escHtml(e.code)}</b></div>` : ''}
    ${neu ? '<p class="md-leise" style="margin:-.6rem 0 .9rem">Mehrere Dateien unter <b>einem</b> QR-Code, z. B. für Stationen. Die Kinder sehen alle Teile untereinander.</p>' : ''}
    <div class="form-grid">
      <div class="form-group full"><label>Titel *</label><input type="text" id="mdb-titel" maxlength="120" value="${w('titel')}"></div>
      <div class="form-group full"><label>Untertitel</label><input type="text" id="mdb-untertitel" maxlength="200" value="${w('untertitel')}"></div>
      <div class="form-group full"><label>Infotext</label><textarea id="mdb-info" maxlength="2000">${w('info')}</textarea></div>
      <div class="form-group full"><label>Arbeitsauftrag</label><textarea id="mdb-auftrag" maxlength="2000">${w('auftrag')}</textarea></div>
      <div class="form-group"><label>Fach</label><select id="mdb-fach">${mdFachOptionen(e ? e.fach : (MD.fach && MD.fach !== '__ohne' ? MD.fach : ''))}</select></div>
      <div class="form-group"><label>Ordner</label><input type="text" id="mdb-ordner" maxlength="60" list="md-ordner-liste" value="${w('ordner')}"></div>
    </div>
    ${video ? `<div class="modal-section md-vtt-box" style="margin-top:1rem">
        <div class="modal-label">🔤 Untertitel-Spur (.vtt oder .srt)</div>
        <div class="md-leise" id="mdb-vtt-status">${e.untertitelDatei ? '✓ Untertitel sind hinterlegt.' : 'Keine Untertitel hinterlegt.'}</div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.45rem;align-items:center">
          <input type="file" id="mdb-vtt" accept=".vtt,.srt,text/vtt" style="max-width:260px">
          <button class="btn sm" id="mdb-vtt-hoch">⬆ Hochladen</button>
          ${e.untertitelDatei ? '<button class="btn sm danger" id="mdb-vtt-weg">Entfernen</button>' : ''}
        </div></div>` : ''}
    ${sammlung ? `<div class="modal-section" id="mdb-sam" style="margin-top:1rem">
        <div class="modal-label">Dateien in der Sammlung (Reihenfolge wie bei den Kindern)</div>
        <ol class="md-sam-liste" id="mdb-sam-liste"></ol>
        <input type="search" id="mdb-sam-suche" placeholder="Datei suchen und mit ➕ hinzufügen …" autocomplete="off" style="margin-top:.5rem">
        <div class="md-sam-treffer" id="mdb-sam-treffer"></div>
      </div>` : ''}
    <div class="modal-actions">
      <button class="btn" id="mdb-abbrechen">Abbrechen</button>
      <button class="btn accent" id="mdb-speichern">${neu ? 'Sammlung anlegen' : '💾 Speichern'}</button>
    </div>`;
  document.getElementById('mdb-abbrechen').onclick = mdModalZu;
  document.getElementById('mdb-speichern').onclick = mdBearbeitenSpeichern;
  if (sammlung) {
    document.getElementById('mdb-sam-suche').addEventListener('input', mdSammlungZeichnen);
    document.getElementById('mdb-sam').addEventListener('click', mdSammlungKlick);
    mdSammlungZeichnen();
  }
  if (video) {
    document.getElementById('mdb-vtt-hoch').onclick = () => mdUntertitel(e, 'hoch');
    const weg = document.getElementById('mdb-vtt-weg');
    if (weg) weg.onclick = () => mdUntertitel(e, 'weg');
  }
  document.getElementById('md-modal').classList.add('open');
  setTimeout(() => document.getElementById('mdb-titel').focus(), 50);
}

function mdSammlungZeichnen() {
  const liste = document.getElementById('mdb-sam-liste');
  if (!liste) return;
  liste.innerHTML = MD.samInhalt.length ? MD.samInhalt.map((c, i) => {
    const e = mdFinde(c);
    return `<li>${e ? mdIcon(e) + ' ' + escHtml(e.titel) : '<i>gelöscht</i>'}${e && !e.aktiv ? ' <span class="md-aus-marke">aus</span>' : ''}
      <span class="md-sam-knoepfe">
        <button class="icon-btn" data-s="hoch" data-i="${i}" ${i === 0 ? 'disabled' : ''} title="nach oben">↑</button>
        <button class="icon-btn" data-s="runter" data-i="${i}" ${i === MD.samInhalt.length - 1 ? 'disabled' : ''} title="nach unten">↓</button>
        <button class="icon-btn on-red" data-s="weg" data-i="${i}" title="aus der Sammlung nehmen">✕</button></span></li>`;
  }).join('') : '<li class="md-leise md-sam-leer">Noch leer – unten Dateien hinzufügen.</li>';
  const q = (document.getElementById('mdb-sam-suche').value || '').trim().toLowerCase();
  const kandidaten = MD.eintraege.filter(e => e.art === 'datei' && e.fertig && !MD.samInhalt.includes(e.code)
    && (!q || [e.titel, e.ordner, e.fach, e.code, e.dateiname].some(t => String(t || '').toLowerCase().includes(q))));
  document.getElementById('mdb-sam-treffer').innerHTML = kandidaten.slice(0, 40).map(e =>
    `<button class="md-treffer" data-s="dazu" data-c="${escHtml(e.code)}">➕ ${mdIcon(e)} ${escHtml(e.titel)}
      <small>${escHtml([e.fach, e.ordner].filter(Boolean).join(' › '))}</small></button>`).join('')
    || `<div class="md-leise">${MD.eintraege.some(e => e.art === 'datei') ? 'Keine weiteren Dateien gefunden.' : 'Noch keine Dateien hochgeladen.'}</div>`;
}
function mdSammlungKlick(ev) {
  const b = ev.target.closest('[data-s]');
  if (!b) return;
  ev.preventDefault();
  const i = Number(b.dataset.i), l = MD.samInhalt;
  if (b.dataset.s === 'dazu') { if (l.length >= 40) { showToast('⚠ Höchstens 40 Dateien pro Sammlung', true); return; } l.push(b.dataset.c); }
  else if (b.dataset.s === 'weg') l.splice(i, 1);
  else if (b.dataset.s === 'hoch' && i > 0) [l[i - 1], l[i]] = [l[i], l[i - 1]];
  else if (b.dataset.s === 'runter' && i < l.length - 1) [l[i + 1], l[i]] = [l[i], l[i + 1]];
  mdSammlungZeichnen();
}

async function mdBearbeitenSpeichern() {
  const code = MD.bearbeiten;
  if (!code) return;
  const wert = id => document.getElementById(id).value.trim();
  const felder = { titel: wert('mdb-titel'), untertitel: wert('mdb-untertitel'), info: wert('mdb-info'),
    auftrag: wert('mdb-auftrag'), fach: document.getElementById('mdb-fach').value, ordner: wert('mdb-ordner') };
  if (!felder.titel) { showToast('⚠ Bitte einen Titel eingeben', true); return; }
  const knopf = document.getElementById('mdb-speichern');
  knopf.disabled = true;
  const e = code === '__neu' ? null : mdFinde(code);
  let r;
  if (!e) r = await mdPost('/medien/admin/sammlung', { ...felder, inhalt: MD.samInhalt });
  else r = await mdPost('/medien/admin/aendern', { code, ...felder, ...(e.art === 'sammlung' ? { inhalt: MD.samInhalt } : {}) });
  knopf.disabled = false;
  if (!r.ok) { showToast('⚠ ' + r.error, true); return; }
  mdModalZu();
  showToast(e ? '✓ Gespeichert' : '📚 Sammlung angelegt');
  await mdLaden();
  if (!e && r.data.code) { const neu = mdFinde(r.data.code); if (neu) mdQrOeffnen(neu); }
}

async function mdUntertitel(e, was) {
  const status = document.getElementById('mdb-vtt-status');
  if (was === 'weg') {
    if (!confirm('Untertitel von diesem Video entfernen?')) return;
    const r = await mdPost('/medien/admin/untertitel-loeschen', { code: e.code });
    if (!r.ok) { showToast('⚠ ' + r.error, true); return; }
    e.untertitelDatei = false;
    status.textContent = 'Keine Untertitel hinterlegt.';
    const weg = document.getElementById('mdb-vtt-weg'); if (weg) weg.remove();
    showToast('✓ Untertitel entfernt');
    mdListeZeichnen();
    return;
  }
  const f = document.getElementById('mdb-vtt').files[0];
  if (!f) { showToast('⚠ Bitte zuerst eine .vtt- oder .srt-Datei wählen', true); return; }
  if (window.LW && LW.TEST) { showToast('🧪 Testumgebung: Hochladen ist hier abgeschaltet', true); return; }
  status.textContent = 'Lädt hoch …';
  try {
    await mdPut('/medien/admin/untertitel?code=' + e.code, f);
    e.untertitelDatei = true;
    status.textContent = '✓ Untertitel sind hinterlegt.';
    showToast('✓ Untertitel hochgeladen');
    mdListeZeichnen();
  } catch (err) {
    status.textContent = '⚠ ' + err.message;
  }
}

// ── QR-Code, PNG, Beamer ───────────────────────────────
function mdQrOeffnen(e) {
  if (!MD.basis) { showToast('⚠ Kurzlink unbekannt – Liste neu laden', true); return; }
  MD.qr = e;
  const link = mdLink(e.code);
  document.getElementById('md-qr-titel').textContent = (e.art === 'sammlung' ? '📚 ' : '📲 ') + e.titel;
  const wrap = document.getElementById('md-qr-bild');
  wrap.innerHTML = '';
  const c = document.createElement('canvas');
  if (!renderQR(c, link, 600)) { showToast('⚠ QR-Code konnte nicht erzeugt werden', true); return; }
  wrap.appendChild(c);
  document.getElementById('md-qr-link').textContent = mdOhneHttps(link);
  document.getElementById('md-qr-code').innerHTML = `Code: <b>${escHtml(e.code)}</b>${e.aktiv ? '' : ' · <span class="md-aus-marke">gerade ausgeschaltet</span>'}`;
  document.getElementById('md-qr').classList.add('open');
}

/** PNG für Arbeitsblätter: nur QR oder QR mit Titel und Kurzlink darunter */
function mdQrBild(e, mitText) {
  const link = mdLink(e.code);
  const qr = document.createElement('canvas');
  renderQR(qr, link, 900);
  if (!mitText) return qr;
  const W = qr.width, rand = Math.round(W * .06);
  const mess = document.createElement('canvas').getContext('2d');
  const schrift = (gew, px) => `${gew} ${px}px Nunito, system-ui, -apple-system, sans-serif`;
  const titelPx = Math.round(W * .055), linkPx = Math.round(W * .032);
  mess.font = schrift(800, titelPx);
  // Titel auf höchstens drei Zeilen umbrechen
  const zeilen = [];
  let z = '';
  String(e.titel).split(/\s+/).forEach(wort => {
    const probe = z ? z + ' ' + wort : wort;
    if (mess.measureText(probe).width > W - 2 * rand && z) { zeilen.push(z); z = wort; } else z = probe;
  });
  if (z) zeilen.push(z);
  if (zeilen.length > 3) { zeilen.length = 3; zeilen[2] += ' …'; }
  const hoehe = W + zeilen.length * titelPx * 1.25 + linkPx * 2.2 + rand;
  const c = document.createElement('canvas');
  c.width = W; c.height = Math.round(hoehe);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, 0, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#0f0e1a';
  ctx.font = schrift(800, titelPx);
  let y = W - rand * .4;
  zeilen.forEach(t => { ctx.fillText(t, W / 2, y); y += titelPx * 1.25; });
  ctx.font = schrift(600, linkPx); ctx.fillStyle = '#555';
  ctx.fillText(mdOhneHttps(link), W / 2, y + linkPx * .4);
  return c;
}

function mdBeamer(e) {
  if (!MD.basis) { showToast('⚠ Kurzlink unbekannt – Liste neu laden', true); return; }
  const b = document.getElementById('md-beamer');
  const link = mdLink(e.code);
  document.getElementById('md-beamer-titel').textContent = e.titel;
  document.getElementById('md-beamer-unter').textContent = e.untertitel || '';
  document.getElementById('md-beamer-link').innerHTML = `${escHtml(mdOhneHttps(link))}<br><span>Code: <b>${escHtml(e.code)}</b></span>`;
  renderQR(document.getElementById('md-beamer-qr'), link, 1100);
  b.hidden = false;
  try { (b.requestFullscreen || b.webkitRequestFullscreen || (() => {})).call(b); } catch (err) {}
}
function mdBeamerZu() {
  const b = document.getElementById('md-beamer');
  b.hidden = true;
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.webkitFullscreenElement) document.webkitExitFullscreen();
  } catch (err) {}
}
document.addEventListener('fullscreenchange', () => {
  const b = document.getElementById('md-beamer');
  if (b && !b.hidden && !document.fullscreenElement) b.hidden = true;
});

// ── Aussehen (nur dieser Tab) ──────────────────────────
function mdStil() {
  if (document.getElementById('md-stil')) return;
  const s = document.createElement('style');
  s.id = 'md-stil';
  s.textContent = `
    #medien-inhalt [hidden]{display:none!important;}
    .md-leise{color:var(--muted);font-size:.8rem;}
    .md-fehler{color:var(--red);font-weight:700;font-size:.9rem;}
    .md-speicher{margin-bottom:1.5rem;padding:1rem 1.2rem;}
    .md-speicher-kopf{font-size:.92rem;margin-bottom:.45rem;}
    .md-balken{height:10px;border-radius:99px;background:var(--surface2);overflow:hidden;margin-bottom:.45rem;border:1px solid var(--border);}
    .md-balken div{height:100%;background:linear-gradient(90deg,var(--indigo),var(--indigo2));border-radius:99px;transition:width .3s;}
    .md-balken div.knapp{background:var(--accent);} .md-balken div.voll{background:var(--red);}
    .md-balken.klein{height:7px;margin:0;flex:1;min-width:80px;}
    .md-drop{display:flex;flex-direction:column;align-items:center;gap:.3rem;border:2px dashed var(--border2);border-radius:14px;padding:1.6rem 1rem;cursor:pointer;text-align:center;transition:all .15s;background:var(--surface2);text-transform:none;letter-spacing:normal;}
    .md-drop:hover,.md-drop.ueber{border-color:var(--accent);background:var(--accent-dim);}
    .md-drop-gross{font-weight:800;font-size:1rem;color:var(--text);} .md-drop-gross::before{content:'⬆️ ';}
    .md-drop-klein{font-size:.78rem;color:var(--muted);}
    .md-gewaehlt{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.6rem;}
    .md-chip{display:inline-flex;align-items:center;gap:.35rem;background:var(--surface3);border:1px solid var(--border2);border-radius:99px;padding:.25rem .3rem .25rem .7rem;font-size:.78rem;max-width:100%;}
    .md-chip small{color:var(--muted);} .md-chip button{background:none;border:none;color:var(--muted);cursor:pointer;font-size:.8rem;padding:0 .3rem;}
    .md-hinweis{font-size:.76rem;color:var(--muted);margin-top:.7rem;line-height:1.45;}
    .md-fortschritt{display:flex;flex-direction:column;gap:.35rem;margin-top:.6rem;}
    .md-fz{display:flex;align-items:center;gap:.6rem;font-size:.8rem;}
    .md-fz-name{flex:0 1 40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .md-fz-status{flex:0 0 auto;min-width:4.5rem;text-align:right;}
    .md-fz.ok .md-fz-status{color:var(--green);} .md-fz.fehler .md-fz-status{color:var(--red);}
    .md-fz.fehler .md-balken div{background:var(--red);}
    .md-fach{margin-bottom:1.3rem;}
    .md-fach-kopf{font-family:'Fredoka One',cursive;font-size:1rem;color:#fff;border-left:4px solid var(--f);padding:.15rem .6rem;margin-bottom:.5rem;display:flex;gap:.5rem;align-items:baseline;}
    .md-ordner{margin:0 0 .5rem .4rem;}
    .md-ordner summary{cursor:pointer;font-weight:800;font-size:.86rem;color:var(--text2);padding:.3rem .2rem;display:flex;align-items:center;gap:.5rem;list-style:none;}
    .md-ordner summary::-webkit-details-marker{display:none;}
    .md-ordner summary::before{content:'▸';color:var(--muted);transition:transform .15s;} .md-ordner[open] summary::before{transform:rotate(90deg);}
    .md-ordner summary .icon-btn{padding:.1rem .4rem;font-size:.7rem;opacity:.6;} .md-ordner summary .icon-btn:hover{opacity:1;}
    .md-ordner .md-ordner-inhalt{padding-left:.9rem;border-left:1px dashed var(--border2);margin-left:.35rem;}
    .md-ordner-inhalt{display:flex;flex-direction:column;gap:.4rem;}
    .md-zeile{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:.7rem .9rem;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;}
    .md-zeile.aus{opacity:.55;} .md-zeile.unfertig{border-style:dashed;opacity:.7;}
    .md-icon{font-size:1.5rem;flex:0 0 auto;}
    .md-text{flex:1 1 220px;min-width:0;}
    .md-titel{font-weight:800;font-size:.92rem;overflow-wrap:anywhere;}
    .md-unter{font-size:.8rem;color:var(--text2);}
    .md-meta{font-size:.74rem;color:var(--muted);margin-top:.15rem;} .md-meta b{color:var(--text2);letter-spacing:.06em;}
    .md-knoepfe{display:flex;gap:.3rem;align-items:center;flex-wrap:wrap;}
    .md-knoepfe .switch{margin-right:.2rem;}
    .md-aus-marke{font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;background:var(--red-dim);color:var(--red);border-radius:6px;padding:.05rem .35rem;vertical-align:middle;}
    .md-leer{color:var(--muted);font-size:.88rem;padding:1.4rem;text-align:center;background:var(--surface);border-radius:var(--r);border:1px dashed var(--border2);}
    .modal.md-gross{width:min(640px,95vw);}
    #mdb-sam-suche,#mdb-vtt{background:var(--surface2);border:1px solid var(--border2);border-radius:9px;color:var(--text);font-family:'Nunito',sans-serif;font-size:.86rem;padding:.5rem .75rem;outline:none;width:100%;}
    #mdb-vtt{width:auto;padding:.35rem .5rem;font-size:.78rem;} #mdb-sam-suche:focus{border-color:var(--accent);}
    .md-sam-liste{display:flex;flex-direction:column;gap:.3rem;padding-left:1.4rem;margin:.3rem 0;}
    .md-sam-liste li{background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:.35rem .5rem;font-size:.84rem;display:flex;align-items:center;gap:.4rem;}
    .md-sam-liste li.md-sam-leer{list-style:none;margin-left:-1.4rem;background:none;border-style:dashed;}
    .md-sam-knoepfe{margin-left:auto;display:flex;gap:.2rem;} .md-sam-knoepfe .icon-btn{padding:.12rem .45rem;} .md-sam-knoepfe .icon-btn:disabled{opacity:.3;cursor:default;}
    .md-sam-treffer{display:flex;flex-direction:column;gap:.25rem;max-height:220px;overflow-y:auto;margin-top:.4rem;}
    .md-treffer{text-align:left;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text);padding:.35rem .6rem;font-family:'Nunito',sans-serif;font-size:.82rem;cursor:pointer;}
    .md-treffer:hover{background:var(--surface2);border-color:var(--border2);} .md-treffer small{color:var(--muted);margin-left:.35rem;}
    .md-qr-box{text-align:center;width:min(440px,95vw);}
    .md-qr-box h2{overflow-wrap:anywhere;}
    .md-qr-bild{background:#fff;border-radius:14px;padding:.4rem;display:inline-block;}
    .md-qr-bild canvas{width:240px;height:240px;display:block;image-rendering:pixelated;}
    .md-kurz{font-weight:800;font-size:.95rem;margin:.7rem 0 .2rem;word-break:break-all;user-select:all;-webkit-user-select:all;background:var(--surface2);border-radius:8px;padding:.45rem .7rem;}
    .md-qr-knoepfe{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center;margin-top:.9rem;}
    .md-beamer{position:fixed;inset:0;z-index:2000;background:#fff;color:#0f0e1a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5vh;cursor:pointer;padding:3vh 3vw;text-align:center;}
    .md-beamer[hidden]{display:none;}
    .md-beamer-titel{font-family:'Fredoka One',cursive;font-size:min(6vh,6vw);line-height:1.1;max-width:90vw;overflow-wrap:anywhere;}
    .md-beamer-unter{font-size:min(3vh,3.4vw);color:#555;max-width:90vw;} .md-beamer-unter:empty{display:none;}
    .md-beamer canvas{height:min(62vh,82vw);width:min(62vh,82vw);image-rendering:pixelated;}
    .md-beamer-link{font-weight:800;font-size:min(3.6vh,4vw);word-break:break-all;} .md-beamer-link span{font-weight:600;color:#555;font-size:.85em;}
    .md-beamer-link b{letter-spacing:.12em;color:#0f0e1a;}
    .md-beamer-hinweis{position:absolute;bottom:1.2vh;font-size:.75rem;color:#999;}`;
  document.head.appendChild(s);
}
