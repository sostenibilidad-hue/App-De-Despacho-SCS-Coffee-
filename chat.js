/**
 * chat.js — Chat interno CSC Coffee (grupo "Equipo" + mensajes individuales).
 * No modifica app.js ni sidebar.js: agrega un botón "Chat" al menú lateral y
 * un panel propio. Usa WEB_APP_URL, fetchJson, currentUser y showSection de app.js.
 * Se carga con UNA línea en index.html, después de editar-usuarios.js.
 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var app = $('appScreen');
  var main = app && app.querySelector('main.container');
  var side = document.querySelector('.csc-side');
  if (!app || !main || !side || app.getAttribute('data-csc-chat')) return;
  app.setAttribute('data-csc-chat', '1');

  var LS = 'csc_chat_read:';
  var me = null, users = [], msgs = [], seen = {}, lastId = 0;
  var active = 'group', isOpen = false, busy = false, offline = false, filter = '';
  var readTs = {};

  /* ---------------- Estilos ---------------- */
  var st = document.createElement('style');
  st.textContent = [
    '#panel-chat{display:none;}',
    '.chat-wrap{display:flex;height:calc(100vh - 130px);min-height:440px;background:#fff;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;box-shadow:0 2px 14px rgba(61,36,18,.06);}',
    '.chat-list{width:310px;flex-shrink:0;border-right:1px solid var(--line);display:flex;flex-direction:column;background:#FDFAF6;}',
    '.chat-list-head{padding:14px 14px 10px;}',
    '.chat-list-head h3{margin:0 0 10px;font-size:17px;color:var(--navy-deep);}',
    '.chat-search{width:100%;padding:9px 12px;border:1px solid var(--line);border-radius:10px;font-size:14px;font-family:inherit;background:#fff;box-sizing:border-box;}',
    '.chat-convs{flex:1;overflow-y:auto;padding:0 8px 10px;}',
    '.chat-conv{display:flex;align-items:center;gap:11px;padding:10px;border-radius:12px;cursor:pointer;border:none;background:transparent;width:100%;text-align:left;font-family:inherit;}',
    '.chat-conv:hover{background:#F4ECE2;}',
    '.chat-conv.active{background:#EBDCC8;}',
    '.chat-av{width:40px;height:40px;border-radius:50%;background:var(--navy);color:#fff;font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
    '.chat-av.grp{background:#E9C98C;color:var(--navy-deep);}',
    '.chat-conv-body{flex:1;min-width:0;}',
    '.chat-conv-name{font-size:14.5px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.chat-conv-last{font-size:12.5px;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.chat-conv-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;}',
    '.chat-conv-time{font-size:11px;color:var(--ink-soft);}',
    '.chat-unread{min-width:19px;height:19px;border-radius:10px;background:var(--err);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px;box-sizing:border-box;}',
    '.chat-main{flex:1;min-width:0;display:flex;flex-direction:column;}',
    '.chat-head{display:flex;align-items:center;gap:11px;padding:12px 16px;border-bottom:1px solid var(--line);background:#fff;}',
    '.chat-back{display:none;border:none;background:#FAF5EE;border-radius:10px;width:38px;height:38px;font-size:20px;cursor:pointer;color:var(--navy-deep);}',
    '.chat-head-name{font-weight:800;color:var(--navy-deep);font-size:15.5px;}',
    '.chat-head-sub{font-size:12px;color:var(--ink-soft);}',
    '.chat-status{margin-left:auto;font-size:11.5px;color:var(--err);font-weight:700;}',
    '.chat-msgs{flex:1;overflow-y:auto;padding:16px;background:#F8F3EC;display:flex;flex-direction:column;gap:6px;}',
    '.chat-day{align-self:center;font-size:11.5px;color:var(--ink-soft);background:#EFE4D5;padding:3px 12px;border-radius:10px;margin:8px 0 4px;}',
    '.chat-msg{max-width:min(78%,520px);padding:8px 12px 6px;border-radius:14px;font-size:14.5px;line-height:1.4;word-break:break-word;white-space:pre-wrap;box-shadow:0 1px 2px rgba(61,36,18,.08);}',
    '.chat-msg.me{align-self:flex-end;background:var(--navy);color:#fff;border-bottom-right-radius:4px;}',
    '.chat-msg.other{align-self:flex-start;background:#fff;color:var(--ink);border-bottom-left-radius:4px;}',
    '.chat-msg.pending{opacity:.6;}',
    '.chat-msg.failed{background:var(--err-bg);color:var(--err);}',
    '.chat-who{font-size:12px;font-weight:800;color:var(--indigo-light);margin-bottom:2px;}',
    '.chat-time{font-size:10.5px;opacity:.7;text-align:right;margin-top:2px;white-space:nowrap;}',
    '.chat-empty{margin:auto;color:var(--ink-soft);font-size:14px;text-align:center;padding:20px;}',
    '.chat-form{display:flex;gap:10px;align-items:flex-end;padding:12px 14px;border-top:1px solid var(--line);background:#fff;}',
    '.chat-form textarea{flex:1;resize:none;max-height:120px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;font-size:15px;font-family:inherit;line-height:1.35;box-sizing:border-box;}',
    '.chat-send{width:44px;height:44px;border:none;border-radius:12px;background:var(--navy);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
    '.chat-send:disabled{opacity:.45;cursor:default;}',
    '.csc-item.csc-chat{position:relative;}',
    '.chat-badge{display:none;margin-left:auto;min-width:19px;height:19px;border-radius:10px;background:var(--err);color:#fff;font-size:11px;font-weight:800;font-style:normal;align-items:center;justify-content:center;padding:0 5px;box-sizing:border-box;}',
    '.chat-badge.show{display:flex;}',
    '.csc-side.collapsed .chat-badge{position:absolute;top:4px;right:10px;margin:0;min-width:16px;height:16px;font-size:10px;}',
    '@media (max-width:760px){',
    '  .chat-wrap{height:calc(100vh - 110px);height:calc(100dvh - 110px);}',
    '  .chat-list{width:100%;border-right:none;}',
    '  .chat-main{display:none;}',
    '  .chat-wrap.in-thread .chat-list{display:none;}',
    '  .chat-wrap.in-thread .chat-main{display:flex;}',
    '  .chat-back{display:block;}',
    '  .chat-msg{max-width:86%;}',
    '}'
  ].join('\n');
  document.head.appendChild(st);

  /* ---------------- Panel ---------------- */
  var panel = document.createElement('section');
  panel.id = 'panel-chat';
  panel.innerHTML =
    '<div class="chat-wrap" id="chatWrap">' +
      '<div class="chat-list">' +
        '<div class="chat-list-head"><h3>Chat del equipo</h3>' +
        '<input class="chat-search" id="chatSearch" type="search" placeholder="Buscar compañero…" autocomplete="off"></div>' +
        '<div class="chat-convs" id="chatConvs"></div>' +
      '</div>' +
      '<div class="chat-main">' +
        '<div class="chat-head"><button type="button" class="chat-back" id="chatBack" aria-label="Volver">‹</button>' +
          '<div class="chat-av grp" id="chatHeadAv">E</div>' +
          '<div><div class="chat-head-name" id="chatHeadName">Equipo CSC</div><div class="chat-head-sub" id="chatHeadSub">Todos los usuarios autorizados</div></div>' +
          '<div class="chat-status" id="chatStatus"></div></div>' +
        '<div class="chat-msgs" id="chatMsgs"></div>' +
        '<div class="chat-form"><textarea id="chatInput" rows="1" maxlength="1000" placeholder="Escribe un mensaje…"></textarea>' +
          '<button type="button" class="chat-send" id="chatSend" aria-label="Enviar">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg></button></div>' +
      '</div>' +
    '</div>';
  main.appendChild(panel);

  /* ---------------- Botón en el menú ---------------- */
  var navChat = document.createElement('button');
  navChat.type = 'button';
  navChat.className = 'csc-item csc-chat';
  navChat.innerHTML =
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/></svg>' +
    '<span>Chat</span><i class="chat-badge" id="chatBadge"></i>';
  var adminBtn = $('adminBtn');
  var anchor = adminBtn && adminBtn.previousElementSibling && adminBtn.previousElementSibling.classList.contains('csc-label')
    ? adminBtn.previousElementSibling : side.querySelector('.csc-bottom');
  side.insertBefore(navChat, anchor);

  /* ---------------- Utilidades ---------------- */
  function enc(s) { return encodeURIComponent(s); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmtTime(ts) { return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function dayLabel(ts) {
    var d = new Date(ts), t = new Date(), y = new Date(Date.now() - 864e5);
    if (dayKey(ts) === dayKey(t.getTime())) return 'Hoy';
    if (dayKey(ts) === dayKey(y.getTime())) return 'Ayer';
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  }
  function convOf(m) { return m.tipo === 'grupo' ? 'group' : (m.de === me ? m.para : m.de); }
  function userByCed(c) { for (var i = 0; i < users.length; i++) if (users[i].cedula === c) return users[i]; return null; }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function lastOf(conv) { for (var i = msgs.length - 1; i >= 0; i--) if (convOf(msgs[i]) === conv) return msgs[i]; return null; }
  function unreadOf(conv) {
    var n = 0, r = readTs[conv] || 0;
    for (var i = msgs.length - 1; i >= 0; i--) {
      var m = msgs[i]; if (m.ts <= r) break;
      if (convOf(m) === conv && m.de !== me && !m.temp) n++;
    }
    return n;
  }
  function saveRead() { try { localStorage.setItem(LS + me, JSON.stringify(readTs)); } catch (e) {} }
  function markRead(conv) {
    var l = lastOf(conv);
    if (l && !l.temp && (readTs[conv] || 0) < l.ts) { readTs[conv] = l.ts; saveRead(); }
  }
  function totalUnread() {
    var t = unreadOf('group');
    users.forEach(function (u) { t += unreadOf(u.cedula); });
    return t;
  }
  function inThread(v) { $('chatWrap').classList.toggle('in-thread', v); }

  /* ---------------- Render ---------------- */
  function renderBadge() {
    var n = totalUnread(), b = $('chatBadge');
    b.textContent = n > 99 ? '99+' : String(n);
    b.classList.toggle('show', n > 0);
  }

  function convRow(conv, name, sub, grp) {
    var last = lastOf(conv), un = unreadOf(conv);
    var row = el('button', 'chat-conv' + (conv === active ? ' active' : ''));
    row.type = 'button';
    row.appendChild(el('div', 'chat-av' + (grp ? ' grp' : ''), grp ? '👥' : name.charAt(0).toUpperCase()));
    var body = el('div', 'chat-conv-body');
    body.appendChild(el('div', 'chat-conv-name', name));
    var preview = last ? ((last.de === me ? 'Tú: ' : (grp ? last.nombre.split(' ')[0] + ': ' : '')) + last.texto) : sub;
    body.appendChild(el('div', 'chat-conv-last', preview));
    row.appendChild(body);
    var meta = el('div', 'chat-conv-meta');
    if (last) meta.appendChild(el('div', 'chat-conv-time', fmtTime(last.ts)));
    if (un) meta.appendChild(el('div', 'chat-unread', un > 99 ? '99+' : String(un)));
    row.appendChild(meta);
    row.addEventListener('click', function () { selectConv(conv); });
    return row;
  }

  function renderList() {
    var box = $('chatConvs'); box.textContent = '';
    var q = norm(filter);
    if (!q) box.appendChild(convRow('group', 'Equipo CSC', 'Todos los usuarios autorizados', true));
    var list = users.filter(function (u) { return !q || norm(u.nombre).indexOf(q) !== -1; });
    list.sort(function (a, b) {
      var la = lastOf(a.cedula), lb = lastOf(b.cedula);
      return (lb ? lb.ts : 0) - (la ? la.ts : 0) || a.nombre.localeCompare(b.nombre);
    });
    list.forEach(function (u) { box.appendChild(convRow(u.cedula, u.nombre, u.rol === 'admin' ? 'Administrador' : 'Usuario', false)); });
    if (q && !list.length) box.appendChild(el('div', 'chat-empty', 'Sin resultados'));
    renderBadge();
  }

  function renderHead() {
    var av = $('chatHeadAv');
    if (active === 'group') {
      av.className = 'chat-av grp'; av.textContent = '👥';
      $('chatHeadName').textContent = 'Equipo CSC';
      $('chatHeadSub').textContent = 'Todos los usuarios autorizados';
    } else {
      var u = userByCed(active);
      av.className = 'chat-av'; av.textContent = u ? u.nombre.charAt(0).toUpperCase() : '?';
      $('chatHeadName').textContent = u ? u.nombre : 'Usuario';
      $('chatHeadSub').textContent = 'Mensaje individual';
    }
    $('chatStatus').textContent = offline ? 'Sin conexión…' : '';
  }

  function renderThread(forceBottom) {
    var box = $('chatMsgs');
    var nearBottom = forceBottom || box.scrollHeight - box.scrollTop - box.clientHeight < 90;
    box.textContent = '';
    var list = msgs.filter(function (m) { return convOf(m) === active; });
    if (!list.length) {
      box.appendChild(el('div', 'chat-empty', active === 'group' ? 'Aún no hay mensajes en el chat del equipo. ¡Escribe el primero!' : 'Aún no hay mensajes con esta persona.'));
    }
    var prevDay = '';
    list.forEach(function (m) {
      var dk = dayKey(m.ts);
      if (dk !== prevDay) { box.appendChild(el('div', 'chat-day', dayLabel(m.ts))); prevDay = dk; }
      var mine = m.de === me;
      var b = el('div', 'chat-msg ' + (mine ? 'me' : 'other') + (m.temp ? ' pending' : '') + (m.failed ? ' failed' : ''));
      if (!mine && active === 'group') b.appendChild(el('div', 'chat-who', m.nombre));
      b.appendChild(document.createTextNode(m.texto));
      b.appendChild(el('div', 'chat-time', m.failed ? 'No enviado — toca para reintentar' : (m.temp ? 'Enviando…' : fmtTime(m.ts))));
      if (m.failed) b.addEventListener('click', function () { retry(m); });
      box.appendChild(b);
    });
    if (nearBottom) box.scrollTop = box.scrollHeight;
  }

  function selectConv(conv) {
    active = conv; markRead(conv); filter = ''; $('chatSearch').value = '';
    renderList(); renderHead(); renderThread(true); inThread(true);
    if (window.matchMedia('(min-width:761px)').matches) $('chatInput').focus();
  }

  /* ---------------- Red ---------------- */
  function api(params) {
    var q = Object.keys(params).map(function (k) { return k + '=' + enc(params[k]); }).join('&');
    return fetchJson(WEB_APP_URL + '?' + q);
  }

  function addMsg(m) {
    if (seen[m.id]) return false;
    seen[m.id] = 1; m.ts = Number(m.ts) || Number(m.id);
    msgs.push(m);
    if (m.ts > lastId) lastId = m.ts;
    return true;
  }

  async function loadUsers() {
    var d = await api({ action: 'chatUsers', cedula: me });
    if (!d.ok) throw new Error(d.error || 'Error');
    users = d.users || [];
  }

  async function poll() {
    if (busy || !me) return;
    busy = true;
    try {
      if (!users.length) await loadUsers();
      var first = lastId === 0 && !msgs.length;
      var d = await api({ action: 'chatList', cedula: me, since: lastId });
      if (!d.ok) throw new Error(d.error || 'Error');
      offline = false;
      var changed = false;
      (d.messages || []).forEach(function (m) { if (addMsg(m)) changed = true; });
      msgs.sort(function (a, b) { return a.ts - b.ts; });
      if (first && !localStorage.getItem(LS + me)) {
        // Primera vez en este equipo: el historial anterior no cuenta como "sin leer".
        ['group'].concat(users.map(function (u) { return u.cedula; })).forEach(function (c) { var l = lastOf(c); if (l) readTs[c] = l.ts; });
        saveRead();
      }
      if (isOpen) { markRead(active); }
      if (changed || first) { renderList(); if (isOpen) renderThread(); } else renderBadge();
      if (isOpen) renderHead();
    } catch (e) {
      offline = true; if (isOpen) renderHead();
    }
    busy = false;
  }

  async function send(texto, tempMsg) {
    var tipo = active === 'group' ? 'grupo' : 'directo';
    var temp = tempMsg;
    if (!temp) {
      temp = { id: 'tmp' + Date.now(), ts: Date.now(), de: me, nombre: currentUser.nombre, tipo: tipo, para: tipo === 'directo' ? active : '', texto: texto, temp: true };
      msgs.push(temp);
    } else { temp.failed = false; temp.temp = true; }
    renderList(); renderThread(true);
    try {
      var d = await fetchJson(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'chatSend', cedula: me, tipo: temp.tipo, para: temp.para, texto: temp.texto }) }, 2);
      if (!d.ok) throw new Error(d.error || 'Error');
      msgs = msgs.filter(function (m) { return m !== temp; });
      addMsg(d.message);
      msgs.sort(function (a, b) { return a.ts - b.ts; });
      markRead(convOf(d.message));
    } catch (e) {
      temp.temp = false; temp.failed = true;
    }
    renderList(); renderThread(true);
  }
  function retry(m) { send(m.texto, m); }

  /* ---------------- Eventos ---------------- */
  function doSend() {
    var ta = $('chatInput'), t = ta.value.trim();
    if (!t) return;
    ta.value = ''; ta.style.height = 'auto';
    send(t);
  }
  $('chatSend').addEventListener('click', doSend);
  $('chatInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  $('chatInput').addEventListener('input', function () {
    this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
  $('chatSearch').addEventListener('input', function () { filter = this.value; renderList(); });
  $('chatBack').addEventListener('click', function () { inThread(false); });

  function closeChat() {
    if (!isOpen) return;
    isOpen = false; panel.style.display = 'none'; navChat.classList.remove('active');
    if (typeof showSection === 'function') showSection('hub'); // devuelve el inicio; el botón pulsado abre lo suyo
  }
  function openChat() {
    if (!me) return;
    ['panel-hub', 'panel-group', 'panel-admin'].forEach(function (id) { var p = $(id); if (p) p.style.display = 'none'; });
    panel.style.display = 'block'; isOpen = true; navChat.classList.add('active');
    side.classList.remove('open');
    var ov = document.querySelector('.csc-overlay'); if (ov) ov.classList.remove('show');
    inThread(false); renderList(); renderHead(); renderThread(true); poll();
  }
  navChat.addEventListener('click', openChat);

  // Cualquier otro botón del menú (o el "volver" flotante) cierra el chat primero.
  side.addEventListener('click', function (e) {
    var b = e.target.closest('.csc-item, .icon-btn');
    if (b && b !== navChat && b.id !== 'logoutBtn') closeChat();
  }, true);
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#floatingBack')) closeChat();
  }, true);

  /* ---------------- Sesión y ciclo de consulta ---------------- */
  function resetSession() {
    if (isOpen) { isOpen = false; panel.style.display = 'none'; navChat.classList.remove('active'); }
    me = null; users = []; msgs = []; seen = {}; lastId = 0; readTs = {}; active = 'group'; offline = false;
    $('chatBadge').classList.remove('show');
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(LS) === 0) localStorage.removeItem(k); }); } catch (e) {}
  }

  function tick() {
    var cu = (typeof currentUser !== 'undefined') ? currentUser : null;
    var ced = cu && cu.cedula ? String(cu.cedula).trim() : null;
    if (!ced) { if (me) resetSession(); setTimeout(tick, 2000); return; }
    if (ced !== me) {
      if (me) resetSession();
      me = ced;
      try { readTs = JSON.parse(localStorage.getItem(LS + me) || '{}') || {}; } catch (e) { readTs = {}; }
    }
    var hidden = document.hidden;
    var p = hidden ? Promise.resolve() : poll();
    p.then(function () { setTimeout(tick, hidden ? 30000 : (isOpen ? 4000 : 20000)); });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && me) poll(); });
  tick();
})();
