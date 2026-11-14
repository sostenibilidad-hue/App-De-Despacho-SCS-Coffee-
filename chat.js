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
  var lastPollAt = 0;
  var me = null, users = [], msgs = [], seen = {}, lastId = 0;
  var active = 'group', isOpen = false, busy = false, offline = false, filter = '';
  var readTs = {};
  var pendingFile = null, sendingFile = false;
  var MAX_BYTES = 8 * 1024 * 1024;
  var DOC_EXT = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv'];
  var IMG_EXT = ['jpg','jpeg','png','gif','webp'];

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
    '.chat-form{position:relative;flex-direction:column;align-items:stretch;gap:8px;}',
    '.chat-row{display:flex;gap:8px;align-items:flex-end;}',
    '.chat-tool{width:42px;height:42px;border:1px solid var(--line);border-radius:12px;background:#FAF5EE;color:var(--navy-deep);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;padding:0;font-family:inherit;}',
    '.chat-tool:hover,.chat-tool.on{background:#EBDCC8;}',
    '.chat-tool:disabled{opacity:.45;cursor:default;}',
    '.chat-attach{display:none;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:12px;background:#FDFAF6;}',
    '.chat-attach.show{display:flex;}',
    '.chat-attach img{width:46px;height:46px;object-fit:cover;border-radius:8px;flex-shrink:0;}',
    '.chat-attach .ficon{width:46px;height:46px;border-radius:8px;background:#EBDCC8;color:var(--navy-deep);font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;text-transform:uppercase;}',
    '.chat-attach .fname{flex:1;min-width:0;font-size:13.5px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.chat-attach .fsub{font-size:11.5px;color:var(--ink-soft);font-weight:400;}',
    '.chat-attach .fx{border:none;background:transparent;font-size:20px;line-height:1;color:var(--ink-soft);cursor:pointer;padding:4px 8px;}',
    '.chat-emoji{display:none;position:absolute;left:14px;bottom:calc(100% - 6px);width:min(340px,calc(100% - 28px));background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 8px 28px rgba(61,36,18,.18);z-index:20;overflow:hidden;}',
    '.chat-emoji.show{display:block;}',
    '.chat-emoji-tabs{display:flex;border-bottom:1px solid var(--line);background:#FDFAF6;}',
    '.chat-emoji-tabs button{flex:1;border:none;background:transparent;padding:8px 0;font-size:18px;cursor:pointer;border-bottom:3px solid transparent;}',
    '.chat-emoji-tabs button.on{border-bottom-color:#6B3F1D;background:#F4ECE2;}',
    '.chat-emoji-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;padding:8px;max-height:210px;overflow-y:auto;}',
    '.chat-emoji-grid button{border:none;background:transparent;font-size:22px;padding:5px 0;border-radius:8px;cursor:pointer;line-height:1;}',
    '.chat-emoji-grid button:hover{background:#F4ECE2;}',
    '.chat-img{display:block;max-width:100%;width:240px;max-height:260px;object-fit:cover;border-radius:10px;margin:2px 0 4px;background:#EFE4D5;cursor:zoom-in;}',
    '.chat-file{display:flex;align-items:center;gap:10px;padding:8px 10px;margin:2px 0 4px;border-radius:10px;text-decoration:none;color:inherit;background:rgba(0,0,0,.07);min-width:200px;}',
    '.chat-msg.other .chat-file{background:#F4ECE2;}',
    '.chat-file .ficon{width:38px;height:38px;border-radius:8px;background:#E9C98C;color:#3D2412;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;text-transform:uppercase;}',
    '.chat-file .fname{font-size:13.5px;font-weight:700;word-break:break-all;line-height:1.25;}',
    '.chat-file .fsub{font-size:11px;opacity:.75;}',
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
        '<div class="chat-form" id="chatForm">' +
          '<div class="chat-emoji" id="chatEmoji"><div class="chat-emoji-tabs" id="chatEmojiTabs"></div><div class="chat-emoji-grid" id="chatEmojiGrid"></div></div>' +
          '<div class="chat-attach" id="chatAttach"></div>' +
          '<div class="chat-row">' +
            '<input type="file" id="chatFile" hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv">' +
            '<button type="button" class="chat-tool" id="chatClip" aria-label="Adjuntar imagen o documento" title="Adjuntar imagen o documento">' +
              '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5l-8.6 8.6a5.5 5.5 0 01-7.8-7.8l8.6-8.6a3.7 3.7 0 015.2 5.2l-8.6 8.6a1.8 1.8 0 01-2.6-2.6l7.9-7.9"/></svg></button>' +
            '<button type="button" class="chat-tool" id="chatEmojiBtn" aria-label="Emojis" title="Emojis">\uD83D\uDE0A</button>' +
            '<textarea id="chatInput" rows="1" maxlength="1000" placeholder="Escribe un mensaje…"></textarea>' +
            '<button type="button" class="chat-send" id="chatSend" aria-label="Enviar">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg></button>' +
          '</div>' +
        '</div>' +
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
  var anchor = side.querySelector('.csc-label-modulos') ||
    (adminBtn && adminBtn.previousElementSibling && adminBtn.previousElementSibling.classList.contains('csc-label')
      ? adminBtn.previousElementSibling : side.querySelector('.csc-bottom'));
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

  function extOf(n) { var m = /\.([a-zA-Z0-9]{1,5})$/.exec(String(n || '')); return m ? m[1].toLowerCase() : ''; }
  function isImgName(n) { return IMG_EXT.indexOf(extOf(n)) !== -1; }
  function fmtKB(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function attLabel(m) { return isImgName(m.adjNombre) ? '\uD83D\uDCF7 Foto' : '\uD83D\uDCCE ' + (m.adjNombre || 'Documento'); }

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
    var preview = last ? ((last.de === me ? 'Tú: ' : (grp ? last.nombre.split(' ')[0] + ': ' : '')) + (last.texto || (last.adjNombre ? attLabel(last) : ''))) : sub;
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
      if (m.adjNombre) {
        var isImg = isImgName(m.adjNombre);
        var viewUrl = m.adjId ? 'https://drive.google.com/file/d/' + m.adjId + '/view' : '';
        var dlUrl = m.adjId ? 'https://drive.google.com/uc?export=download&id=' + m.adjId : '';
        if (isImg) {
          var im = document.createElement('img');
          im.className = 'chat-img'; im.alt = m.adjNombre; im.loading = 'lazy';
          im.src = m.adjId ? 'https://drive.google.com/thumbnail?id=' + m.adjId + '&sz=w600' : (m.preview || '');
          if (viewUrl) im.addEventListener('click', function (ev) { ev.stopPropagation(); window.open(viewUrl, '_blank', 'noopener'); });
          b.appendChild(im);
        } else {
          var fa = document.createElement(dlUrl ? 'a' : 'div');
          fa.className = 'chat-file';
          if (dlUrl) { fa.href = dlUrl; fa.target = '_blank'; fa.rel = 'noopener'; fa.addEventListener('click', function (ev) { ev.stopPropagation(); }); }
          fa.appendChild(el('div', 'ficon', extOf(m.adjNombre) || 'doc'));
          var fb = el('div'); fb.appendChild(el('div', 'fname', m.adjNombre.replace(/^\d+_\d+_/, '')));
          fb.appendChild(el('div', 'fsub', dlUrl ? 'Toca para descargar' : 'Subiendo…'));
          fa.appendChild(fb);
          b.appendChild(fa);
        }
      }
      if (m.texto) b.appendChild(document.createTextNode(m.texto));
      b.appendChild(el('div', 'chat-time', m.failed ? (m.errMsg ? m.errMsg + ' — toca para reintentar' : 'No enviado — toca para reintentar') : (m.temp ? 'Enviando…' : fmtTime(m.ts))));
      if (m.failed) b.addEventListener('click', function () { retry(m); });
      box.appendChild(b);
    });
    if (nearBottom) box.scrollTop = box.scrollHeight;
  }

  function selectConv(conv) {
    active = conv; markRead(conv); filter = ''; $('chatSearch').value = ''; closeEmoji();
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
    busy = true; lastPollAt = Date.now();
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

  async function send(texto, tempMsg, fileData) {
    var tipo = active === 'group' ? 'grupo' : 'directo';
    var temp = tempMsg;
    if (!temp) {
      temp = { id: 'tmp' + Date.now(), ts: Date.now(), de: me, nombre: currentUser.nombre, tipo: tipo, para: tipo === 'directo' ? active : '', texto: texto, temp: true };
      if (fileData) { temp.file = fileData; temp.adjNombre = fileData.filename; temp.preview = fileData.preview || ''; }
      msgs.push(temp);
    } else { temp.failed = false; temp.temp = true; }
    renderList(); renderThread(true);
    try {
      var d = await fetchJson(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'chatSend', cedula: me, tipo: temp.tipo, para: temp.para, texto: temp.texto, file: temp.file ? { base64: temp.file.base64, mimeType: temp.file.mimeType, filename: temp.file.filename } : undefined }) }, 2);
      if (!d.ok) throw new Error(d.error || 'Error');
      msgs = msgs.filter(function (m) { return m !== temp; });
      addMsg(d.message);
      msgs.sort(function (a, b) { return a.ts - b.ts; });
      markRead(convOf(d.message));
    } catch (e) {
      temp.temp = false; temp.failed = true;
      if (e && /archivo|tipo|MB/i.test(String(e.message))) temp.errMsg = String(e.message);
    }
    renderList(); renderThread(true);
  }
  function retry(m) { send(m.texto, m, m.file); }

  /* ---------------- Eventos ---------------- */
  function doSend() {
    var ta = $('chatInput'), t = ta.value.trim();
    if ((!t && !pendingFile) || sendingFile) return;
    var f = pendingFile;
    ta.value = ''; ta.style.height = 'auto';
    clearAttach(); closeEmoji();
    send(t, null, f);
  }

  /* ---------------- Adjuntos ---------------- */
  function clearAttach() {
    pendingFile = null; $('chatFile').value = '';
    var box = $('chatAttach'); box.classList.remove('show'); box.textContent = '';
  }
  function showAttach(f, sizeTxt) {
    var box = $('chatAttach'); box.textContent = '';
    if (f.preview) { var im = document.createElement('img'); im.src = f.preview; im.alt = ''; box.appendChild(im); }
    else box.appendChild(el('div', 'ficon', extOf(f.filename) || 'doc'));
    var mid = el('div', 'fname', f.filename);
    mid.appendChild(el('div', 'fsub', sizeTxt));
    box.appendChild(mid);
    var x = el('button', 'fx', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Quitar adjunto');
    x.addEventListener('click', clearAttach);
    box.appendChild(x); box.classList.add('show');
  }
  async function attachFile(file) {
    if (!file) return;
    var ext = extOf(file.name) || (file.type.indexOf('image/') === 0 ? file.type.slice(6).replace('jpeg', 'jpg') : '');
    var isImg = file.type.indexOf('image/') === 0 || IMG_EXT.indexOf(ext) !== -1;
    if (!isImg && DOC_EXT.indexOf(ext) === -1) { alert('Tipo de archivo no permitido. Usa imágenes, PDF, Word, Excel, PowerPoint, TXT o CSV.'); clearAttach(); return; }
    if (!isImg && file.size > MAX_BYTES) { alert('El archivo supera el máximo de 8 MB.'); clearAttach(); return; }
    sendingFile = true; $('chatSend').disabled = true;
    try {
      var fd;
      if (isImg && typeof compressImageFile === 'function') {
        var named = file.name && extOf(file.name) ? file : new File([file], 'foto_' + Date.now() + '.' + (ext || 'png'), { type: file.type });
        fd = await compressImageFile(named, 1600, 0.78);
        if (!isImgName(fd.filename)) fd.filename = 'foto_' + Date.now() + '.jpg';
        fd.preview = 'data:' + fd.mimeType + ';base64,' + fd.base64;
      } else {
        fd = await new Promise(function (res, rej) {
          var r = new FileReader();
          r.onload = function () { res({ base64: String(r.result).split(',')[1], mimeType: file.type, filename: file.name, preview: '' }); };
          r.onerror = function () { rej(new Error('No se pudo leer el archivo')); };
          r.readAsDataURL(file);
        });
      }
      if (fd.base64.length * 0.75 > MAX_BYTES) { alert('El archivo supera el máximo de 8 MB.'); clearAttach(); }
      else { pendingFile = fd; showAttach(fd, fmtKB(Math.round(fd.base64.length * 0.75))); }
    } catch (e) { alert('No se pudo preparar el archivo.'); clearAttach(); }
    sendingFile = false; $('chatSend').disabled = false;
  }
  $('chatClip').addEventListener('click', function () { closeEmoji(); $('chatFile').click(); });
  $('chatFile').addEventListener('change', function () { attachFile(this.files && this.files[0]); });
  $('chatInput').addEventListener('paste', function (e) {
    var items = (e.clipboardData && e.clipboardData.files) || [];
    if (items.length) { e.preventDefault(); attachFile(items[0]); }
  });

  /* ---------------- Emojis ---------------- */
  var EMO = [
    ['\uD83D\uDE0A', 'Caras', '\uD83D\uDE00 \uD83D\uDE03 \uD83D\uDE04 \uD83D\uDE01 \uD83D\uDE06 \uD83D\uDE05 \uD83D\uDE02 \uD83E\uDD23 \uD83D\uDE0A \uD83D\uDE07 \uD83D\uDE42 \uD83D\uDE09 \uD83D\uDE0D \uD83E\uDD29 \uD83D\uDE18 \uD83D\uDE0B \uD83D\uDE1C \uD83E\uDD14 \uD83E\uDD28 \uD83D\uDE10 \uD83D\uDE11 \uD83D\uDE36 \uD83D\uDE44 \uD83D\uDE0F \uD83D\uDE0C \uD83D\uDE34 \uD83D\uDE2A \uD83D\uDE37 \uD83E\uDD12 \uD83E\uDD75 \uD83E\uDD76 \uD83E\uDD73 \uD83D\uDE0E \uD83E\uDD13 \uD83D\uDE15 \uD83D\uDE1F \uD83D\uDE2E \uD83D\uDE33 \uD83D\uDE22 \uD83D\uDE2D \uD83D\uDE24 \uD83D\uDE20 \uD83D\uDE21 \uD83E\uDD2F \uD83D\uDE31 \uD83D\uDE2C \uD83E\uDD7A'],
    ['\uD83D\uDC4D', 'Gestos', '\uD83D\uDC4D \uD83D\uDC4E \uD83D\uDC4C \u270C\uFE0F \uD83E\uDD1E \uD83E\uDD1D \uD83D\uDC4F \uD83D\uDE4C \uD83D\uDE4F \uD83D\uDCAA \uD83D\uDC4B \uD83E\uDD19 \uD83D\uDC4A \u270A \u261D\uFE0F \uD83D\uDC49 \uD83D\uDC48 \uD83D\uDC46 \uD83D\uDC47 \uD83E\uDEF6 \u2764\uFE0F \uD83E\uDDE1 \uD83D\uDC9B \uD83D\uDC9A \uD83D\uDC99 \uD83D\uDC9C \uD83D\uDDA4 \uD83D\uDC94 \uD83D\uDD25 \u2B50 \u2728 \uD83C\uDF89 \uD83C\uDF8A \uD83D\uDCAF \uD83D\uDCA5 \uD83D\uDCA1 \uD83C\uDF1F \uD83C\uDFC6 \uD83E\uDD47'],
    ['\uD83D\uDE9A', 'Trabajo', '\uD83D\uDE9A \uD83D\uDE9B \uD83D\uDE9C \uD83D\uDE97 \uD83D\uDEE3\uFE0F \u26FD \uD83D\uDCE6 \uD83D\uDCCB \uD83D\uDCDD \uD83D\uDCC4 \uD83D\uDCC1 \uD83D\uDCC2 \uD83D\uDCCE \uD83D\uDCF7 \uD83D\uDCF8 \uD83D\uDDBC\uFE0F \uD83D\uDCCA \uD83D\uDCC8 \uD83D\uDCC9 \uD83D\uDCC5 \u23F0 \u231B \uD83D\uDCDE \uD83D\uDCF1 \uD83D\uDCBB \uD83D\uDDA8\uFE0F \uD83D\uDCE7 \uD83D\uDCE2 \uD83D\uDD0D \uD83D\uDD12 \uD83D\uDD11 \uD83D\uDCB0 \uD83E\uDDFE \uD83C\uDFED \uD83C\uDFE2 \uD83D\uDCCD \uD83D\uDDFA\uFE0F \u2615 \uD83C\uDF3E \uD83C\uDF31 \u2699\uFE0F'],
    ['\u2705', 'Símbolos', '\u2705 \u274C \u2714\uFE0F \u2716\uFE0F \u26A0\uFE0F \u2757 \u2753 \u203C\uFE0F \uD83D\uDEAB \u26D4 \uD83D\uDD34 \uD83D\uDFE0 \uD83D\uDFE1 \uD83D\uDFE2 \uD83D\uDD35 \u26AA \u26AB \u2B06\uFE0F \u2B07\uFE0F \u27A1\uFE0F \u2B05\uFE0F \uD83D\uDD04 \uD83D\uDD01 \uD83C\uDD97 \uD83C\uDD95 \uD83D\uDD1D \uD83D\uDCAC \uD83D\uDCAD \uD83D\uDC40 \uD83D\uDE4B \uD83D\uDE45 \uD83E\uDD37 \uD83D\uDE4E \uD83D\uDE4D \u2600\uFE0F \uD83C\uDF27\uFE0F \u26C8\uFE0F \uD83C\uDF19']
  ];
  var emoTab = 0;
  function renderEmoji() {
    var tabs = $('chatEmojiTabs'), grid = $('chatEmojiGrid');
    tabs.textContent = ''; grid.textContent = '';
    EMO.forEach(function (c, i) {
      var t = el('button', i === emoTab ? 'on' : '', c[0]); t.type = 'button'; t.title = c[1];
      t.addEventListener('click', function () { emoTab = i; renderEmoji(); });
      tabs.appendChild(t);
    });
    EMO[emoTab][2].split(' ').forEach(function (e) {
      var b = el('button', '', e); b.type = 'button';
      b.addEventListener('click', function () { insertEmoji(e); });
      grid.appendChild(b);
    });
  }
  function insertEmoji(e) {
    var ta = $('chatInput'), a = ta.selectionStart || 0, z = ta.selectionEnd || 0;
    if (ta.value.length + e.length > 1000) return;
    ta.value = ta.value.slice(0, a) + e + ta.value.slice(z);
    ta.focus(); ta.selectionStart = ta.selectionEnd = a + e.length;
    ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }
  function closeEmoji() { $('chatEmoji').classList.remove('show'); $('chatEmojiBtn').classList.remove('on'); }
  $('chatEmojiBtn').addEventListener('click', function (ev) {
    ev.stopPropagation();
    var box = $('chatEmoji'), on = !box.classList.contains('show');
    if (on) renderEmoji();
    box.classList.toggle('show', on); this.classList.toggle('on', on);
  });
  $('chatEmoji').addEventListener('click', function (ev) { ev.stopPropagation(); });
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest || !ev.target.closest('#chatEmoji')) closeEmoji();
  });

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
    clearAttach(); closeEmoji();
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
  document.addEventListener('visibilitychange', function () { if (!document.hidden && me && Date.now() - lastPollAt > 15000) poll(); });
  tick();
})();
