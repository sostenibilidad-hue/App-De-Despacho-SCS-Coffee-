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

  var LS = 'csc_chat_read:', MSG_LS = 'csc_chat_msgs:', USR_LS = 'csc_chat_users:', ASKED_LS = 'csc_notif_asked';
  var notified = {}, baseline = false, titleBase = document.title, swReg = null, actx = null, toastTimer = null;
  var lastPollAt = 0;
  var myFoto = '', usersAt = 0;
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
    '.chat-av{background-size:cover;background-position:center;}',
    '#cscAvatar{cursor:pointer;background-size:cover;background-position:center;}',
    '.csc-photo-actions{display:flex;gap:12px;margin-top:3px;}',
    '.csc-photo-actions button{background:none;border:none;padding:0;color:#E9C98C;font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:underline;text-underline-offset:2px;}',
    '.csc-photo-actions button:disabled{opacity:.6;cursor:default;}',
    '.chat-av.adm{box-shadow:0 0 0 2px #fff,0 0 0 4px #E9C98C;}',
    '.chat-av.sm{width:22px;height:22px;font-size:10px;font-weight:800;}',
    '.chat-av.sm.adm{box-shadow:0 0 0 1.5px #fff,0 0 0 3px #E9C98C;}',
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
    '.chat-who{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800;color:var(--indigo-light);margin-bottom:4px;}',
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
    '.chat-notif-btn{display:none;width:100%;margin:0 0 10px;padding:8px 10px;border:1px dashed #C9A66B;border-radius:10px;background:#FFF6E3;color:#6B3F1D;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;}',
    '.chat-notif-btn.show{display:block;}',
    '.chat-notif-note{display:none;margin:0 0 10px;font-size:11.5px;color:var(--ink-soft);}',
    '.chat-notif-note.show{display:block;}',
    '.chat-toast{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));left:50%;transform:translate(-50%,-140%);transition:transform .25s ease;z-index:2000;width:min(92vw,380px);background:#3D2412;color:#fff;border-radius:14px;padding:11px 14px;box-shadow:0 10px 30px rgba(0,0,0,.35);cursor:pointer;display:flex;gap:10px;align-items:center;}',
    '.chat-toast.show{transform:translate(-50%,0);}',
    '.chat-toast b{display:block;font-size:13.5px;}',
    '.chat-toast span{display:block;font-size:12.5px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;}',
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
        '<button type="button" class="chat-notif-btn" id="chatNotifBtn">\uD83D\uDD14 Activar avisos de mensajes nuevos</button>' +
        '<div class="chat-notif-note" id="chatNotifNote">Los avisos están bloqueados en este navegador. Actívalos en los permisos del sitio.</div>' +
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
    document.title = (n > 0 ? '(' + n + ') ' : '') + titleBase;
    bellRefresh();
  }

  /* La campanita (app.js) suma estos mensajes sin leer a sus pendientes. */
  function bellRefresh() {
    try {
      if (typeof renderNotifBadge === 'function') renderNotifBadge();
      var np = $('notifPanel');
      if (np && np.classList.contains('open') && typeof renderNotifPanel === 'function') renderNotifPanel();
    } catch (e) {}
  }
  function unreadItems() {
    if (!me) return [];
    var out = [];
    ['group'].concat(users.map(function (u) { return u.cedula; })).forEach(function (c) {
      var n = unreadOf(c); if (!n) return;
      var l = lastOf(c), u = c === 'group' ? null : userByCed(c);
      out.push({
        conv: c, count: n, ts: l ? l.ts : 0,
        name: c === 'group' ? 'Equipo CSC' : (u ? u.nombre : 'Usuario'),
        preview: l ? ((c === 'group' ? String(l.nombre).split(' ')[0] + ': ' : '') + (l.texto || (l.adjNombre ? attLabel(l) : ''))) : ''
      });
    });
    out.sort(function (a, b) { return b.ts - a.ts; });
    return out;
  }

  /* ---------------- Avatares automáticos ----------------
   * Cada persona recibe siempre el mismo color (según su cédula) y sus iniciales.
   * Los administradores llevan un aro dorado. */
  var AV_COLORS = ['#6B3F1D', '#2F6B4F', '#8A3B3B', '#3A5A8C', '#7A4F9A', '#A05A12', '#2E7D7A', '#9A4A6B', '#5B6B2E', '#4A4F7A'];
  function avHash(str) { var h = 0; str = String(str || ''); for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
  function initialsOf(name) {
    var w = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    return (w[0].charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase();
  }
  function photoUrl(id) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w128'; }
  /* Pinta un avatar: grupo (👥) o persona (iniciales + color propio). */
  function paintAv(node, ced, name, isGroup, small) {
    var u = ced ? userByCed(ced) : null;
    var admin = !!(u && u.rol === 'admin');
    node.className = 'chat-av' + (isGroup ? ' grp' : '') + (small ? ' sm' : '') + (admin && !isGroup ? ' adm' : '');
    node.style.backgroundImage = '';
    if (isGroup) { node.textContent = '👥'; node.style.background = ''; node.style.color = ''; return node; }
    node.textContent = initialsOf(name || (u && u.nombre));
    node.style.background = AV_COLORS[avHash(ced || name) % AV_COLORS.length];
    node.style.color = '#fff';
    // Foto de perfil (si la persona subió una): va encima del color; si no, queda el avatar automático.
    var foto = (ced && ced === me) ? myFoto : (u && u.foto) || '';
    if (foto) {
      node.style.backgroundImage = 'url(' + photoUrl(foto) + ')';
      node.style.backgroundSize = 'cover'; node.style.backgroundPosition = 'center';
      node.style.color = 'transparent';
    }
    return node;
  }

  function convRow(conv, name, sub, grp) {
    var last = lastOf(conv), un = unreadOf(conv);
    var row = el('button', 'chat-conv' + (conv === active ? ' active' : ''));
    row.type = 'button';
    row.appendChild(paintAv(el('div', 'chat-av'), grp ? null : conv, name, grp));
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
      paintAv(av, null, '', true);
      $('chatHeadName').textContent = 'Equipo CSC';
      $('chatHeadSub').textContent = 'Todos los usuarios autorizados';
    } else {
      var u = userByCed(active);
      paintAv(av, active, u ? u.nombre : '', false);
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
      if (!mine && active === 'group') {
        var who = el('div', 'chat-who');
        who.appendChild(paintAv(el('div', 'chat-av'), m.de, m.nombre, false, true));
        who.appendChild(el('span', '', m.nombre));
        b.appendChild(who);
      }
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
  /* Petición con tiempo máximo: si el servidor no responde, se corta (antes se quedaba colgada para siempre). */
  function timedJson(url, opts, ms) {
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, ms);
    opts = opts || {};
    if (ctl) opts.signal = ctl.signal;
    return fetchJson(url, opts, 1).then(
      function (d) { clearTimeout(timer); return d; },
      function (e) { clearTimeout(timer); throw e; }
    );
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function hasPending() { return msgs.some(function (m) { return m.temp; }); }
  function api(params) {
    var q = Object.keys(params).map(function (k) { return k + '=' + enc(params[k]); }).join('&');
    return timedJson(WEB_APP_URL + '?' + q, undefined, 15000);
  }

  /* Si el servidor guardó el mensaje pero la respuesta se perdió o tardó, la propia consulta lo confirma. */
  function reconcileOwn(m) {
    for (var i = 0; i < msgs.length; i++) {
      var t = msgs[i];
      if ((t.temp || t.failed) && !t.done && t.de === me && String(t.texto || '') === String(m.texto || '') &&
          t.tipo === m.tipo && String(t.para || '') === String(m.para || '') && (!!t.adjNombre === !!m.adjNombre)) {
        t.done = true; msgs.splice(i, 1); return true;
      }
    }
    return false;
  }

  /* Copia local: al abrir el chat los mensajes y la lista de personas salen al instante. */
  function saveLocal() {
    try {
      var keep = msgs.filter(function (m) { return !m.temp && !m.failed; }).slice(-150);
      localStorage.setItem(MSG_LS + me, JSON.stringify(keep));
      if (users.length) localStorage.setItem(USR_LS + me, JSON.stringify({ u: users, f: myFoto }));
    } catch (e) {}
  }
  function loadLocal() {
    try {
      var c = JSON.parse(localStorage.getItem(MSG_LS + me) || '[]') || [];
      c.forEach(function (m) { addMsg(m); });
      msgs.sort(function (a, b) { return a.ts - b.ts; });
      var u = JSON.parse(localStorage.getItem(USR_LS + me) || 'null');
      if (u && u.u && u.u.length) { users = u.u; myFoto = u.f || ''; applyMyPhoto(); }
    } catch (e) {}
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
    usersAt = Date.now();
    myFoto = (d.me && d.me.foto) || '';
    applyMyPhoto();
  }

  async function poll() {
    if (busy && Date.now() - lastPollAt > 30000) busy = false;   // seguro anti-atasco
    if (busy || !me) return;
    busy = true; lastPollAt = Date.now();
    try {
      var first = lastId === 0 && !msgs.length;
      // Personas y mensajes se piden A LA VEZ (antes eran una petición tras otra).
      var pu = null;
      if (!users.length) { pu = loadUsers(); pu.catch(function () {}); }
      else if (Date.now() - usersAt > 120000) {   // cada 2 min, EN SEGUNDO PLANO: fotos/usuarios nuevos
        usersAt = Date.now();
        loadUsers().then(function () { renderList(); if (isOpen) { renderHead(); renderThread(); } saveLocal(); }).catch(function () {});
      }
      var pl = api({ action: 'chatList', cedula: me, since: lastId });
      pl.catch(function () {});
      if (pu) await pu;
      var d = await pl;
      if (!d.ok) throw new Error(d.error || 'Error');
      offline = false;
      var changed = false, incoming = [];
      (d.messages || []).forEach(function (m) {
        if (m.de === me && reconcileOwn(m)) changed = true;
        if (addMsg(m)) { changed = true; if (m.de !== me) incoming.push(m); }
      });
      msgs.sort(function (a, b) { return a.ts - b.ts; });
      if (first && !localStorage.getItem(LS + me)) {
        // Primera vez en este equipo: el historial anterior no cuenta como "sin leer".
        ['group'].concat(users.map(function (u) { return u.cedula; })).forEach(function (c) { var l = lastOf(c); if (l) readTs[c] = l.ts; });
        saveRead();
        incoming = [];
      }
      if (isOpen && !document.hidden) { markRead(active); }
      if (changed || first || pu) { renderList(); if (isOpen) renderThread(); saveLocal(); } else renderBadge();
      if (isOpen) renderHead();
      if (baseline && incoming.length) notifyIncoming(incoming);
      baseline = true;
    } catch (e) {
      offline = true; if (isOpen) renderHead();
    }
    busy = false;
  }

  /* ---------------- Avisos: sonido, vibración, mensaje flotante y notificación del sistema ---------------- */
  function unlockAudio() {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {}
  }
  function beep() {
    try {
      unlockAudio();
      if (actx) {
        var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
        o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.setValueAtTime(1175, t + 0.12);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.45);
      }
    } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([150, 80, 150]); } catch (e) {}
  }
  function convTitle(m) { return m.tipo === 'grupo' ? 'Equipo CSC' : m.nombre; }
  function msgBody(m) { return (m.tipo === 'grupo' ? String(m.nombre).split(' ')[0] + ': ' : '') + (m.texto || (m.adjNombre ? attLabel(m) : 'Mensaje nuevo')); }

  /* Aviso genérico (lo usa app.js para "Nuevo despacho"): sonido + mensaje flotante / notificación del sistema. */
  function notifyGeneric(title, body, fn) {
    beep();
    if (document.hidden) {
      if ('Notification' in window && Notification.permission === 'granted') {
        var o = { body: body, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'csc-despacho', renotify: true, vibrate: [200, 100, 200], data: { conv: '' } };
        var fb = function () { try { var n = new Notification(title, o); n.onclick = function () { window.focus(); if (fn) fn(); n.close(); }; } catch (e) {} };
        if (swReg && swReg.showNotification) swReg.showNotification(title, o).catch(fb); else fb();
      }
    } else showToastRaw(title, body, fn);
  }

  function showToast(m) {
    showToastRaw(convTitle(m), msgBody(m), function () { openConv(convOf(m)); });
  }

  function showToastRaw(title, body, fn) {
    var t = $('chatToast');
    if (!t) {
      t = el('div', 'chat-toast'); t.id = 'chatToast';
      document.body.appendChild(t);
      t.addEventListener('click', function () { t.classList.remove('show'); if (t._fn) t._fn(); });
    }
    t.textContent = '';
    t.appendChild(el('div', '', '\uD83D\uDCAC'));
    var box = el('div'); box.appendChild(el('b', '', title)); box.appendChild(el('span', '', body));
    t.appendChild(box);
    t._fn = fn;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 6000);
  }

  function sysNotify(m) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var conv = convOf(m), opts = {
      body: msgBody(m), icon: 'icon-192.png', badge: 'icon-192.png', tag: 'csc-chat-' + conv,
      renotify: true, vibrate: [200, 100, 200], data: { conv: conv }
    };
    var fallback = function () {
      try { var n = new Notification(convTitle(m), opts); n.onclick = function () { window.focus(); openConv(conv); n.close(); }; } catch (e) {}
    };
    if (swReg && swReg.showNotification) swReg.showNotification(convTitle(m), opts).catch(fallback);
    else fallback();
  }

  function notifyIncoming(list) {
    var viewing = isOpen && !document.hidden;
    var fresh = list.filter(function (m) {
      if (notified[m.id]) return false;
      notified[m.id] = 1;
      return !(viewing && convOf(m) === active);   // si ya está mirando esa conversación, no hace falta avisar
    });
    if (!fresh.length) return;
    var m = fresh[fresh.length - 1];
    beep();
    if (document.hidden) sysNotify(m); else showToast(m);
  }

  /* Permiso para notificaciones del sistema (hay que pedirlo con un toque del usuario). */
  function notifSupported() { return 'Notification' in window; }
  function updateNotifUI() {
    var b = $('chatNotifBtn'), n = $('chatNotifNote');
    if (!b || !n) return;
    var perm = notifSupported() ? Notification.permission : 'unsupported';
    b.classList.toggle('show', perm === 'default');
    n.classList.toggle('show', perm === 'denied');
  }
  function askNotif() {
    if (!notifSupported() || Notification.permission !== 'default') { updateNotifUI(); return; }
    try {
      var r = Notification.requestPermission(function () { updateNotifUI(); });
      if (r && r.then) r.then(updateNotifUI);
    } catch (e) {}
  }
  $('chatNotifBtn').addEventListener('click', function () { unlockAudio(); askNotif(); });
  // Primer toque tras iniciar sesión: desbloquea el sonido y pide permiso (una sola vez por equipo).
  document.addEventListener('pointerup', function () {
    if (!me) return;
    unlockAudio();
    var asked = false; try { asked = !!localStorage.getItem(ASKED_LS); } catch (e) {}
    if (!asked && notifSupported() && Notification.permission === 'default') {
      try { localStorage.setItem(ASKED_LS, '1'); } catch (e) {}
      askNotif();
    }
  }, { passive: true });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function (r) { swReg = r; return navigator.serviceWorker.ready; })
      .then(function (r) { swReg = r; }).catch(function () {});
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.cscOpenChat) openConv(e.data.conv);
    });
  }

  async function send(texto, tempMsg, fileData) {
    var tipo = active === 'group' ? 'grupo' : 'directo';
    var temp = tempMsg;
    if (!temp) {
      temp = { id: 'tmp' + Date.now(), cid: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), ts: Date.now(), de: me, nombre: currentUser.nombre, tipo: tipo, para: tipo === 'directo' ? active : '', texto: texto, temp: true };
      if (fileData) { temp.file = fileData; temp.adjNombre = fileData.filename; temp.preview = fileData.preview || ''; }
      msgs.push(temp);
    } else { temp.failed = false; temp.temp = true; }
    renderList(); renderThread(true);
    setTimeout(function () { if (me) poll(); }, 2000);   // confirma pronto aunque la respuesta del envío tarde
    try {
      var body = JSON.stringify({ action: 'chatSend', cedula: me, cid: temp.cid, tipo: temp.tipo, para: temp.para, texto: temp.texto, file: temp.file ? { base64: temp.file.base64, mimeType: temp.file.mimeType, filename: temp.file.filename } : undefined });
      var d = null, lastErr = null, wait = temp.file ? 60000 : 20000;
      for (var i = 0; i < 3 && !temp.done && !d; i++) {
        try { d = await timedJson(WEB_APP_URL, { method: 'POST', body: body }, wait); }
        catch (err) { lastErr = err; if (!temp.done) await sleep(700); }
      }
      if (!temp.done) {
        if (!d) throw lastErr || new Error('Error');
        if (!d.ok) throw new Error(d.error || 'Error');
        msgs = msgs.filter(function (m) { return m !== temp; });
        addMsg(d.message);
        msgs.sort(function (a, b) { return a.ts - b.ts; });
        markRead(convOf(d.message));
      }
      saveLocal();
    } catch (e) {
      if (temp.done) { renderList(); renderThread(true); return; }
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
  function openConv(conv) {
    if (!me) return;
    if (!isOpen) openChat();
    selectConv(conv || 'group');
  }
  window.cscChat = { unreadItems: unreadItems, open: openConv, notify: notifyGeneric };

  // Cualquier otro botón del menú (o el "volver" flotante) cierra el chat primero.
  side.addEventListener('click', function (e) {
    var b = e.target.closest('.csc-item, .icon-btn');
    if (b && b !== navChat && b.id !== 'logoutBtn') closeChat();
  }, true);
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#floatingBack')) closeChat();
  }, true);

  /* ---------------- Mi foto de perfil ---------------- */
  var photoBtn = null, photoDel = null, photoInput = null;
  (function buildPhotoUI() {
    var sub = side.querySelector('.csc-user-sub');
    if (!sub) return;
    var box = document.createElement('div');
    box.className = 'csc-photo-actions';
    photoBtn = document.createElement('button'); photoBtn.type = 'button'; photoBtn.textContent = 'Cambiar foto';
    photoDel = document.createElement('button'); photoDel.type = 'button'; photoDel.textContent = 'Quitar'; photoDel.style.display = 'none';
    box.appendChild(photoBtn); box.appendChild(photoDel);
    sub.parentNode.appendChild(box);
    photoInput = document.createElement('input');
    photoInput.type = 'file'; photoInput.accept = 'image/*'; photoInput.style.display = 'none';
    document.body.appendChild(photoInput);
    var pick = function () { if (me) photoInput.click(); };
    photoBtn.addEventListener('click', pick);
    var av = $('cscAvatar'); if (av) { av.title = 'Cambiar foto de perfil'; av.addEventListener('click', pick); }
    photoInput.addEventListener('change', function () {
      var file = photoInput.files && photoInput.files[0];
      photoInput.value = '';
      if (file) changePhoto(file);
    });
    photoDel.addEventListener('click', removePhoto);
  })();

  /* Recorta al centro (cuadrado) y reduce a 256 px: pesa ~20 KB y sube al instante. */
  function squarePhoto(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var sz = Math.min(img.width, img.height), sx = (img.width - sz) / 2, sy = (img.height - sz) / 2;
        var c = document.createElement('canvas'); c.width = c.height = 256;
        c.getContext('2d').drawImage(img, sx, sy, sz, sz, 0, 0, 256, 256);
        resolve({ base64: c.toDataURL('image/jpeg', 0.85).split(',')[1], mimeType: 'image/jpeg', filename: 'perfil.jpg' });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('No se pudo leer esa imagen.')); };
      img.src = url;
    });
  }

  function applyMyPhoto() {
    var av = $('cscAvatar');
    if (av) {
      if (myFoto) { av.style.backgroundImage = 'url(' + photoUrl(myFoto) + ')'; av.style.color = 'transparent'; }
      else { av.style.backgroundImage = ''; av.style.color = ''; }
    }
    if (photoBtn) photoBtn.textContent = myFoto ? 'Cambiar foto' : 'Subir foto';
    if (photoDel) photoDel.style.display = myFoto ? '' : 'none';
  }

  function repaintAll() { renderList(); renderHead(); if (isOpen) renderThread(); }

  async function changePhoto(file) {
    var label = photoBtn ? photoBtn.textContent : '';
    if (photoBtn) { photoBtn.disabled = true; photoBtn.textContent = 'Subiendo…'; }
    try {
      var f = await squarePhoto(file);
      var d = await fetchJson(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'chatSetPhoto', cedula: me, file: f }) }, 2);
      if (!d.ok) throw new Error(d.error || 'Error');
      myFoto = (d.result && d.result.foto) || '';
      applyMyPhoto(); repaintAll();
    } catch (e) {
      window.alert('No se pudo guardar la foto: ' + (e.message || e));
      if (photoBtn) photoBtn.textContent = label;
    }
    if (photoBtn) photoBtn.disabled = false;
    applyMyPhoto();
  }

  async function removePhoto() {
    if (!window.confirm('¿Quitar tu foto de perfil? Volverá tu avatar con iniciales.')) return;
    if (photoDel) photoDel.disabled = true;
    try {
      var d = await fetchJson(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'chatRemovePhoto', cedula: me }) }, 2);
      if (!d.ok) throw new Error(d.error || 'Error');
      myFoto = ''; applyMyPhoto(); repaintAll();
    } catch (e) { window.alert('No se pudo quitar la foto: ' + (e.message || e)); }
    if (photoDel) photoDel.disabled = false;
  }

  /* ---------------- Sesión y ciclo de consulta ---------------- */
  function resetSession() {
    if (isOpen) { isOpen = false; panel.style.display = 'none'; navChat.classList.remove('active'); }
    me = null; users = []; msgs = []; seen = {}; lastId = 0; readTs = {}; active = 'group'; offline = false;
    myFoto = ''; usersAt = 0; applyMyPhoto();
    notified = {}; baseline = false; document.title = titleBase; bellRefresh();
    clearAttach(); closeEmoji();
    $('chatBadge').classList.remove('show');
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(LS) === 0 || k.indexOf(MSG_LS) === 0 || k.indexOf(USR_LS) === 0) localStorage.removeItem(k); }); } catch (e) {}
  }

  function tick() {
    var cu = (typeof currentUser !== 'undefined') ? currentUser : null;
    var ced = cu && cu.cedula ? String(cu.cedula).trim() : null;
    if (!ced) { if (me) resetSession(); setTimeout(tick, 700); return; }
    if (ced !== me) {
      if (me) resetSession();
      me = ced;
      try { readTs = JSON.parse(localStorage.getItem(LS + me) || '{}') || {}; } catch (e) { readTs = {}; }
      loadLocal(); renderList(); updateNotifUI();
    }
    var hidden = document.hidden;
    // También en segundo plano se consulta (más espaciado) para poder avisar de mensajes nuevos.
    poll().then(function () { setTimeout(tick, hasPending() ? 1500 : (hidden ? 20000 : (isOpen ? 3000 : 8000))); });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden || !me) return;
    if (isOpen) { markRead(active); renderList(); }
    if (Date.now() - lastPollAt > 2000) poll();
    updateNotifUI();
  });
  tick();
})();
