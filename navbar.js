// ═══════════════════════════════════════════════════════
//  Lern-Apps Navbar – navbar.js
//  Einbindung: <script src="navbar.js"></script>
//  am Ende des <body> jeder App-Seite einfügen.
// ═══════════════════════════════════════════════════════

(function () {
  // Pfad zur index.html – funktioniert wenn alle Dateien
  // im selben Ordner liegen (Standard-Setup)
  const HOME = 'index.html';

  const style = document.createElement('style');
  style.textContent = `
    #lern-home-btn {
      position: fixed;
      bottom: 1.2rem;
      left: 1.2rem;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: .5rem;
      background: #1a1f5e;
      color: #fff;
      text-decoration: none;
      font-family: 'Nunito', 'Segoe UI', sans-serif;
      font-weight: 800;
      font-size: .88rem;
      padding: .55rem 1.1rem .55rem .85rem;
      border-radius: 99px;
      box-shadow: 0 4px 20px rgba(26,31,94,.35);
      border: 2px solid rgba(255,255,255,.12);
      transition: transform .18s ease, box-shadow .18s ease, background .15s;
      user-select: none;
      cursor: pointer;
    }
    #lern-home-btn:hover {
      transform: translateY(-3px) scale(1.04);
      box-shadow: 0 8px 28px rgba(26,31,94,.45);
      background: #252b7a;
    }
    #lern-home-btn:active {
      transform: scale(.97);
    }
    #lern-home-btn .home-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f7c948;
      flex-shrink: 0;
      box-shadow: 0 0 8px rgba(247,201,72,.6);
    }
    #lern-home-btn .home-icon {
      font-size: 1.05rem;
      line-height: 1;
    }
    @media (max-width: 480px) {
      #lern-home-btn .home-label {
        display: none;
      }
      #lern-home-btn {
        padding: .65rem .75rem;
        font-size: 1.1rem;
      }
    }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('a');
  btn.id = 'lern-home-btn';
  btn.href = HOME;
  btn.title = 'Zurück zur App-Auswahl';
  btn.innerHTML = `
    <span class="home-dot"></span>
    <span class="home-icon">🏠</span>
    <span class="home-label">Alle Apps</span>
  `;
  document.body.appendChild(btn);
})();
