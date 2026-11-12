/**
 * sidebar.js — Barra lateral estilo dashboard CRM para el Sistema de Reportes CSC.
 * No modifica app.js ni index.html: reorganiza la pantalla al cargar y conserva
 * todos los botones y paneles originales (mismos IDs), así la lógica sigue igual.
 * Se carga con UNA línea en index.html, justo después de <script src="app.js"></script>
 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var app = $('appScreen');
  if (!app || app.getAttribute('data-csc-side')) return;
  var header = app.querySelector('.app-header');
  var main = app.querySelector('main.container');
  if (!header || !main) return;
  app.setAttribute('data-csc-side', '1');

  /* ---------------- Estilos ---------------- */
  var css = [
    '.csc-layout{display:flex;min-height:100vh;}',
    '.csc-content{flex:1;min-width:0;display:flex;flex-direction:column;}',
    '.csc-side{width:250px;flex-shrink:0;align-self:flex-start;position:sticky;top:0;height:100vh;display:flex;flex-direction:column;',
    '  background:linear-gradient(180deg,#3D2412 0%,#4E2E17 100%);color:#fff;padding:18px 12px;z-index:300;overflow-y:auto;}',
    '.csc-side .app-header-left{display:flex;flex-direction:row;align-items:center;gap:10px;padding:2px 6px 18px;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,.12);}',
    '.csc-side .logo-badge{width:42px;height:42px;border-radius:11px;padding:6px;margin:0;background:#fff;flex-shrink:0;}',
    '.csc-side .app-header-titles h1{font-size:15px;line-height:1.25;margin:0;color:#fff;}',
    '.csc-label{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#CDB594;font-weight:700;padding:10px 12px 6px;}',
    '.csc-side .csc-item, .csc-side .icon-btn{display:flex;align-items:center;gap:11px;width:100%;padding:11px 12px;margin:0 0 3px;border:none;border-left:3px solid transparent;',
    '  border-radius:10px;background:transparent;color:#EBDCC8;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;text-align:left;}',
    '.csc-side .csc-item:hover, .csc-side .icon-btn:hover{background:rgba(255,255,255,.08);color:#fff;}',
    '.csc-side .csc-item.active, .csc-side .icon-btn.active{background:rgba(255,255,255,.14);color:#fff;border-left-color:#E9C98C;}',
    '.csc-side svg{flex-shrink:0;}',
    '.csc-bottom{margin-top:auto;padding-top:14px;border-top:1px solid rgba(255,255,255,.12);}',
    '.csc-user{display:flex;align-items:center;gap:10px;padding:8px 8px 12px;}',
    '.csc-avatar{width:36px;height:36px;border-radius:50%;background:#E9C98C;color:#3D2412;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
    '.csc-user-name{font-size:13.5px;font-weight:700;color:#fff;line-height:1.2;word-break:break-word;}',
    '.csc-user-sub{font-size:11.5px;color:#CDB594;}',
    '.csc-side #logoutBtn:hover{background:rgba(192,57,43,.35);}',
    /* barra superior blanca */
    '#appScreen .app-header{background:#fff;color:var(--ink);padding:14px 28px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:200;box-shadow:0 2px 10px rgba(61,36,18,.05);}',
    '#appScreen .app-header .greeting{order:0;margin:0;max-width:none;flex:1;min-width:0;}',
    '#appScreen .app-header .greeting h2{font-size:19px;margin:0;color:var(--navy-deep);}',
    '#appScreen .app-header .greeting .clock-line{font-size:12.5px;color:var(--ink-soft);}',
    '#appScreen .app-header .app-header-inner{order:2;margin:0;max-width:none;display:block;}',
    '#appScreen .app-header .notif-btn{background:#FAF5EE;border:1px solid var(--line);}',
    '#appScreen main.container{max-width:1180px;margin:0 auto;padding:24px 32px 48px;width:100%;}',
    '#appScreen .back-row{display:none;}',
    '.csc-burger{display:none;order:-1;width:42px;height:42px;border-radius:10px;border:1px solid var(--line);background:#FAF5EE;color:var(--navy-deep);align-items:center;justify-content:center;cursor:pointer;padding:0;}',
    '.csc-overlay{display:none;position:fixed;inset:0;background:rgba(61,36,18,.5);z-index:250;}',
    '.csc-overlay.show{display:block;}',
    '@media (min-width:900px){.floating-back{display:none !important;}}',
    '@media (max-width:899px){',
    '  .csc-side{position:fixed;left:0;top:0;width:262px;transform:translateX(-100%);transition:transform .25s ease;box-shadow:8px 0 30px rgba(0,0,0,.3);}',
    '  .csc-side.open{transform:none;}',
    '  .csc-burger{display:flex;}',
    '  #appScreen .app-header{padding:12px 16px;}',
    '  #appScreen .app-header .greeting h2{font-size:16.5px;}',
    '  #appScreen main.container{padding:16px 16px 40px;}',
    '}'
  ].join('\n');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------------- Íconos ---------------- */
  function ico(d) {
    return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  }
  var I = {
    home: ico('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
    plus: ico('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
    list: ico('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'),
    users: ico('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14.5c2 .6 3.5 2.5 3.5 5.5"/>'),
    out: ico('<path d="M9 4H5v16h4"/><path d="M16 8l4 4-4 4M20 12H9"/>'),
    menu: ico('<path d="M4 6h16M4 12h16M4 18h16"/>')
  };

  /* ---------------- Estructura ---------------- */
  var layout = document.createElement('div');
  layout.className = 'csc-layout';
  var side = document.createElement('aside');
  side.className = 'csc-side';
  var content = document.createElement('div');
  content.className = 'csc-content';
  var overlay = document.createElement('div');
  overlay.className = 'csc-overlay';

  // Logo + título pasan a la barra lateral (se mueve el elemento original)
  var brand = header.querySelector('.app-header-left');
  if (brand) side.appendChild(brand);

  function navItem(icon, text) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'csc-item';
    b.innerHTML = icon + '<span>' + text + '</span>';
    return b;
  }
  function label(text) {
    var d = document.createElement('div');
    d.className = 'csc-label';
    d.textContent = text;
    return d;
  }

  var navHome = navItem(I.home, 'Inicio');
  var navForm = navItem(I.plus, 'Nuevo reporte');
  var navGal = navItem(I.list, 'Registros guardados');

  side.appendChild(label('Menú'));
  side.appendChild(navHome);
  side.appendChild(navForm);
  side.appendChild(navGal);

  var adminBtn = $('adminBtn');
  if (adminBtn) {
    adminBtn.innerHTML = I.users + '<span>Usuarios</span>';
    side.appendChild(label('Administración'));
    side.appendChild(adminBtn);
  }

  var bottom = document.createElement('div');
  bottom.className = 'csc-bottom';
  var userBox = document.createElement('div');
  userBox.className = 'csc-user';
  userBox.innerHTML = '<div class="csc-avatar" id="cscAvatar">A</div><div><div class="csc-user-name" id="cscUserName">Usuario</div><div class="csc-user-sub">Sesión activa</div></div>';
  bottom.appendChild(userBox);
  var logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    logoutBtn.innerHTML = I.out + '<span>Cerrar sesión</span>';
    bottom.appendChild(logoutBtn);
  }
  side.appendChild(bottom);

  // Botón hamburguesa (solo celular)
  var burger = document.createElement('button');
  burger.type = 'button';
  burger.className = 'csc-burger';
  burger.setAttribute('aria-label', 'Abrir menú');
  burger.innerHTML = I.menu;
  header.insertBefore(burger, header.firstChild);

  content.appendChild(header);
  content.appendChild(main);
  layout.appendChild(side);
  layout.appendChild(content);
  app.appendChild(layout);
  document.body.appendChild(overlay);

  /* ---------------- Navegación ---------------- */
  function vis(el) { return !!el && getComputedStyle(el).display !== 'none'; }
  function click(id) { var e = $(id); if (e) e.click(); }
  function closeMenu() { side.classList.remove('open'); overlay.classList.remove('show'); }

  function goHome() {
    if (vis($('panel-admin'))) click('backFromAdmin');
    else if (vis($('panel-group'))) click('backToHub');
  }
  function openTab(tab) {
    if (vis($('panel-admin'))) click('backFromAdmin');
    if (vis($('panel-hub'))) {
      var card = app.querySelector('.hub-card[data-group="datos"]');
      if (card) card.click();
    }
    var t = app.querySelector('.tab[data-tab="' + tab + '"]');
    if (t) t.click();
  }

  navHome.addEventListener('click', function () { goHome(); closeMenu(); sync(); });
  navForm.addEventListener('click', function () { openTab('form'); closeMenu(); sync(); });
  navGal.addEventListener('click', function () { openTab('gallery'); closeMenu(); sync(); });
  if (adminBtn) adminBtn.addEventListener('click', closeMenu);
  burger.addEventListener('click', function () { side.classList.add('open'); overlay.classList.add('show'); });
  overlay.addEventListener('click', closeMenu);

  /* ---------------- Estado activo y nombre de usuario ---------------- */
  function setActive(el, on) {
    if (!el) return;
    if (el.classList.contains('active') !== on) el.classList.toggle('active', on);
  }
  function sync() {
    var admin = vis($('panel-admin')), group = vis($('panel-group')), hub = vis($('panel-hub'));
    var at = app.querySelector('.tab.active');
    var tab = at ? at.getAttribute('data-tab') : '';
    setActive(navHome, hub && !admin && !group);
    setActive(navForm, group && tab === 'form');
    setActive(navGal, group && tab === 'gallery');
    setActive(adminBtn, admin);

    var gt = $('greetingText');
    if (gt) {
      var name = gt.textContent.replace(/^Hola,?\s*/i, '').trim();
      var un = $('cscUserName'), av = $('cscAvatar');
      if (name && un && un.textContent !== name) {
        un.textContent = name;
        if (av) av.textContent = name.charAt(0).toUpperCase();
      }
    }
  }
  new MutationObserver(sync).observe(app, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
  setInterval(sync, 800);
  sync();
})();
