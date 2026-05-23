// ==========================================
// js/menu.js - VERSIÓN CHATS, WHATSAPP Y STATS AVANZADOS 📸💬
// ==========================================

window.addEventListener('beforeunload', () => {
    /*const gameId = sessionStorage.getItem('current_game_id');
    if (stompClient && stompClient.connected && gameId) {
        stompClient.send("/app/lobby.leave", {}, JSON.stringify({ gameId: gameId }));
    }*/
});

window.categoriasParaVotar = []; window.miVoto = null;
window.waActiveFriend = null; 

// 🔥 CIERRE INTELIGENTE DEL MENÚ DESPLEGABLE 🔥
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('chat-dropdown-menu');
    if (dropdown && !dropdown.classList.contains('hidden') && !e.target.closest('#chat-dropdown-menu') && !e.target.matches('button[onclick*="chat-dropdown-menu"]')) {
        dropdown.classList.add('hidden');
    }
});

const emojisNativos = ['😀','😂','🥰','😎','😭','😡','👍','🙏','🔥','💀','🎲','🏆','👑','👀','💯'];
window.toggleEmojiPicker = function(type) {
    const picker = document.getElementById('emoji-picker-' + type);
    if(picker.innerHTML === "") {
        emojisNativos.forEach(e => {
            const s = document.createElement('span');
            s.innerText = e;
            s.onclick = () => {
                const input = document.getElementById(type === 'room' ? 'room-chat-input' : 'wa-chat-input');
                input.value += e;
                picker.classList.add('hidden');
            };
            picker.appendChild(s);
        });
    }
    picker.classList.toggle('hidden');
};

window.unreadPrivates = {};

window.actualizarBadgesAmigos = function() {
    let total = 0;
    for (let user in window.unreadPrivates) { total += window.unreadPrivates[user]; }
    const badgeMenu = document.getElementById('sidebar-amigos-badge');
    if (badgeMenu) {
        if (total > 0) { badgeMenu.innerText = total; badgeMenu.style.display = 'inline-block'; } 
        else { badgeMenu.style.display = 'none'; }
    }
    for (let user in window.unreadPrivates) {
        const fb = document.getElementById('wa-badge-' + user);
        if (fb) {
            if (window.unreadPrivates[user] > 0) { fb.innerText = window.unreadPrivates[user]; fb.style.display = 'inline-block'; } 
            else { fb.style.display = 'none'; }
        }
    }
};

window.abrirSeleccionModoPublico = function() {
    const sMenu = document.getElementById('screen-menu'); const sPublic = document.getElementById('screen-public-modes');
    if (typeof cambiarPantalla === "function") cambiarPantalla(sMenu, sPublic);
    document.getElementById('global-chat-btn').style.display = 'none';
};

window.unirseAPartidaPublica = function(modo) {
    const sPublic = document.getElementById('screen-public-modes'); const sLobby = document.getElementById('screen-lobby');
    if (typeof cambiarPantalla === "function") cambiarPantalla(sPublic, sLobby);
    sessionStorage.setItem('is_public_room', 'true');
    sessionStorage.setItem('public_room_mode', modo);
    document.getElementById('lobby-title').innerText = "Matchmaking Público"; document.getElementById('config-private-only').style.display = 'none'; document.getElementById('config-public-display').style.display = 'block'; document.getElementById('public-mode-label').innerText = modo.toUpperCase(); document.getElementById('lobby-add-friend-section').style.display = 'none'; document.getElementById('waiting-msg').innerText = "Buscando jugadores..."; 
    const list = document.getElementById('lobby-players-list'); if (list) list.innerHTML = "";
    document.getElementById('global-chat-btn').style.display = 'flex';
    document.getElementById('room-chat-messages').innerHTML = ''; 
    if (stompClient && stompClient.connected) stompClient.send("/app/game.public.join", {}, JSON.stringify({ gameMode: modo }));
};

window.verificarBotonReconexion = function() {
    const btnRejoin = document.getElementById('btn-rejoin-lobby');
    if (btnRejoin) {
        if (sessionStorage.getItem('last_voluntary_game_id')) { btnRejoin.style.display = 'block'; } 
        else { btnRejoin.style.display = 'none'; }
    }
};

window.actualizarBandejaMensajes = function() {
    const mList = document.getElementById('messages-list'); if (!mList) return;
    if (!window.invitacionesPendientes || window.invitacionesPendientes.length === 0) { mList.innerHTML = '<li style="color: #555;">No tienes invitaciones de sala pendientes.</li>'; return; }
    mList.innerHTML = "";
    window.invitacionesPendientes.forEach(inv => {
        const idInv = inv.inviteId || inv.id; const senderName = inv.senderUsername || inv.sender || "Un amigo";
        mList.innerHTML += `<li style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #eee;"><span>Sala de <strong>${senderName}</strong></span><div><button class="btn-primary btn-modal-style" style="padding:6px 12px; font-size:1.1rem; margin-right:5px;" onclick="window.responderInvitacion(${idInv}, true, '${senderName}', null); document.getElementById('messages-modal').style.display='none';">✔️</button><button class="btn-secondary btn-modal-style" style="padding:6px 12px; font-size:1.1rem;" onclick="window.responderInvitacion(${idInv}, false, '${senderName}', null)">❌</button></div></li>`;
    });
};

window.actualizarNotificacionMensajes = function() {
    const badge = document.getElementById('messages-badge'); if (!badge) return;
    if (window.invitacionesPendientes && window.invitacionesPendientes.length > 0) { badge.innerText = window.invitacionesPendientes.length; badge.style.display = 'inline-block'; } 
    else { badge.style.display = 'none'; }
};

window.ejecutarIntroCinematica = function() {
    const introOverlay = document.getElementById('login-intro-animation'); const gridMenu = document.getElementById('main-grid-menu'); const sidebar = document.getElementById('menu-sidebar'); 
    if (!introOverlay || !gridMenu) return;
    if (!sessionStorage.getItem('login_intro_played')) {
        introOverlay.style.display = 'flex'; introOverlay.style.opacity = '1'; gridMenu.style.opacity = '0'; if (sidebar) sidebar.style.transform = 'translateX(-100%)';
        const logo = document.getElementById('cinematic-logo'); const title = document.getElementById('cinematic-title'); const subtitle = document.getElementById('cinematic-subtitle');
        if (logo) { logo.style.transition = 'none'; logo.style.opacity = '0'; logo.style.transform = 'scale(0.5) translateY(20px)'; }
        title.style.transition = 'none'; subtitle.style.transition = 'none'; title.style.opacity = '0'; title.style.transform = 'translateY(40px)'; subtitle.style.opacity = '0'; subtitle.style.transform = 'translateY(20px)'; void title.offsetWidth;
        if (logo) logo.style.transition = 'all 1.5s cubic-bezier(0.25, 1, 0.5, 1)'; title.style.transition = 'all 1.5s cubic-bezier(0.25, 1, 0.5, 1) 0.3s'; subtitle.style.transition = 'all 1.5s ease 0.8s';
        setTimeout(() => { if (logo) { logo.style.opacity = '1'; logo.style.transform = 'scale(1) translateY(0)'; } title.style.opacity = '1'; title.style.transform = 'translateY(0)'; }, 100);
        setTimeout(() => { subtitle.style.opacity = '1'; subtitle.style.transform = 'translateY(0)'; }, 800);
        setTimeout(() => { introOverlay.style.opacity = '0'; gridMenu.style.opacity = '1'; if (sidebar) sidebar.style.transform = 'translateX(0)'; setTimeout(() => { introOverlay.style.display = 'none'; }, 1000); }, 4500); 
        sessionStorage.setItem('login_intro_played', 'true');
    } else { introOverlay.style.display = 'none'; gridMenu.style.opacity = '1'; if (sidebar) sidebar.style.transform = 'translateX(0)'; }
};

window.cargarMiPerfil = function() {
    fetch(`${window.API_BASE_URL}/api/auth/me`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(res => res.json())
    .then(user => {
        const avatarStr = user.fotoPerfil || 'images/invitado.jpg'; sessionStorage.setItem('genius_avatar', avatarStr);
        const modalName = document.getElementById('modal-my-username'); const modalWins = document.getElementById('stat-wins'); const modalCorrects = document.getElementById('stat-corrects'); const modalDate = document.getElementById('stat-date'); const myPics = [document.getElementById('modal-my-photo'), document.getElementById('sidebar-profile-pic')];
        if (modalName) modalName.innerText = user.username; if (modalWins) modalWins.innerText = user.partidasGanadas || 0; if (modalCorrects) modalCorrects.innerText = user.preguntasAcertadas || 0;
        if (modalDate && user.createdAt) { modalDate.innerText = new Date(user.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }); }
        myPics.forEach(pic => { if (pic) pic.src = avatarStr; });
    }).catch(err => console.error("Error cargando perfil:", err));
};

window.abrirMiPerfil = function() { document.getElementById('my-profile-modal').style.display = 'flex'; document.getElementById('my-profile-modal').classList.remove('hidden'); window.cargarMiPerfil(); };
window.cerrarMiPerfil = function() { document.getElementById('my-profile-modal').style.display = 'none'; };

window.subirFotoPerfil = function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas'); const MAX_WIDTH = 250; const MAX_HEIGHT = 250; let width = img.width; let height = img.height;
            if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
            canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
            const base64String = canvas.toDataURL('image/jpeg', 0.8);
            fetch(`${window.API_BASE_URL}/api/auth/photo`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ foto: base64String }) })
            .then(res => res.json()).then(data => { if (data.success) { window.mostrarToastExito("📸 Foto actualizada"); window.cargarMiPerfil(); } else { window.mostrarToastError(data.message); } });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.abrirListaAmigosStats = function() {
    const layout = document.querySelector('.wa-layout');
    if (layout) layout.classList.remove('mobile-chat-open');

    const modal = document.getElementById('friends-stats-modal');
    modal.style.display = 'flex'; modal.classList.remove('hidden');
    
    document.getElementById('wa-chat-placeholder').style.display = 'flex';
    document.getElementById('wa-active-chat').style.display = 'none';
    document.getElementById('friend-stats-overlay').style.display = 'none';
    window.waActiveFriend = null;

    const list = document.getElementById('wa-friend-list');
    list.innerHTML = "<div class='loader' style='margin:20px auto;'></div>";
    
    fetch(`${window.API_BASE_URL}/api/amistad/lista`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(res => res.json())
    .then(amigos => {
        list.innerHTML = "";
        if (amigos.length === 0) { list.innerHTML = "<p style='text-align:center; color:#aaa; padding:20px;'>No tienes amigos aún.</p>"; return; }
        amigos.forEach(a => {
            let avatar = a.fotoPerfil || 'images/invitado.jpg';
            let unread = window.unreadPrivates[a.username] || a.unreadCount || 0;
            if(a.unreadCount && !window.unreadPrivates[a.username]) window.unreadPrivates[a.username] = a.unreadCount;
            let displayBadge = unread > 0 ? 'inline-block' : 'none';

            list.innerHTML += `
                <div class="wa-friend-item" id="wa-friend-${a.username}" onclick="window.abrirChatAmigo('${a.username}', '${avatar}')">
                    <img src="${avatar}" class="wa-friend-img">
                    <div style="flex:1; overflow:hidden;">
                        <h4 style="margin:0; color:white;">${a.username}</h4>
                        <span id="wa-snippet-${a.username}" class="wa-friend-snippet">${a.lastMessage || 'Toca para chatear'}</span>
                    </div>
                    <span id="wa-badge-${a.username}" class="friend-unread-badge" style="display:${displayBadge};">${unread}</span>
                </div>`;
        });
        window.actualizarBadgesAmigos();
    });
};

window.cerrarListaAmigosStats = function() { document.getElementById('friends-stats-modal').style.display = 'none'; };

window.actualizarEstadoAmigo = function() {
    if (!window.waActiveFriend) return;
    fetch(`${window.API_BASE_URL}/api/amistad/amigo/${window.waActiveFriend}/status`)
    .then(res => res.json())
    .then(data => {
        const statusEl = document.getElementById('wa-chat-status');
        if (statusEl && statusEl.innerText !== "Escribiendo...") {
            if(data.online) { statusEl.innerText = "En línea"; statusEl.style.color = "#4CAF50"; } 
            else {
                let date = new Date(data.lastSeen);
                let hours = date.getHours().toString().padStart(2, '0');
                let mins = date.getMinutes().toString().padStart(2, '0');
                statusEl.innerText = `Desconectado, últ. vez a las ${hours}:${mins}`;
                statusEl.style.color = "#aaa";
            }
        }
    });
};

window.waReplyingTo = null;

window.iniciarRespuesta = function(sender, btnElement) {
    const bubble = btnElement.closest('.msg-bubble');
    const clone = bubble.cloneNode(true);
    const rBtn = clone.querySelector('.reply-icon-btn'); if (rBtn) rBtn.remove();
    const oldQuote = clone.querySelector('.replied-msg-bubble'); if (oldQuote) oldQuote.remove();
    
    let text = clone.innerText.replace(/✓✓/g, '').replace(/✓/g, '').trim();
    if(clone.querySelector('img')) text = "📷 Foto";

    window.waReplyingTo = { sender: sender, text: text };

    let previewArea = document.getElementById('wa-reply-preview');
    if (!previewArea) {
        previewArea = document.createElement('div');
        previewArea.id = 'wa-reply-preview';
        previewArea.className = 'wa-reply-preview';
        const inputArea = document.querySelector('.wa-chat-area .chat-input-area');
        inputArea.parentNode.insertBefore(previewArea, inputArea);
    }
    
    previewArea.innerHTML = `
        <div style="flex: 1; overflow: hidden; border-left: 4px solid #03DAC6; padding-left: 10px;">
            <strong style="color: #03DAC6; font-size: 0.9rem;">Respondiendo a ${sender}</strong>
            <div style="color: #ccc; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${text}</div>
        </div>
        <button onclick="window.cancelarRespuesta()" style="background: none; border: none; color: #F44336; font-size: 1.5rem; cursor: pointer; margin-left: 15px;">✖</button>
    `;
    previewArea.style.display = 'flex';
    document.getElementById('wa-chat-input').focus();
};

window.cancelarRespuesta = function() {
    window.waReplyingTo = null;
    const previewArea = document.getElementById('wa-reply-preview');
    if (previewArea) previewArea.style.display = 'none';
};

// 🔥 NUEVO: CONTROL DEL VISOR DE IMÁGENES 🔥
window.abrirVisorImagen = function(src) {
    const modal = document.getElementById('image-viewer-modal');
    const img = document.getElementById('image-viewer-img');
    if (modal && img) {
        img.src = src;
        img.classList.remove('zoomed-in');
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
};

window.cerrarVisorImagen = function(e) {
    if(e) e.stopPropagation();
    const modal = document.getElementById('image-viewer-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

// 🔥 GENERADOR DE BURBUJAS (Solo Texto e Imágenes) 🔥
window.crearCuerpoMensaje = function(m) {
    if (m.type === 'IMAGE') {
        return `<img src="${m.message}" class="chat-image" onclick="window.abrirVisorImagen(this.src)">`;
    } else {
        return m.message;
    }
};

window.renderizarHistorialChat = function(msgs) {
    const chatBox = document.getElementById('wa-messages');
    chatBox.innerHTML = "";
    
    if (!Array.isArray(msgs)) {
        chatBox.innerHTML = `<p style="text-align:center; color:#F44336; margin-top:20px;">Error al cargar el historial.</p>`;
        return;
    }

    const myName = sessionStorage.getItem('genius_username');
    if (msgs.length === 0) {
        chatBox.innerHTML = `<p style="text-align:center; color:#aaa; font-style:italic; margin-top:20px;">Empieza la conversación con ${window.waActiveFriend}</p>`;
    } else {
        msgs.forEach(m => {
            const isOwn = m.sender === myName;
            let tick = isOwn ? (m.isRead ? '<span class="msg-ticks msg-ticks-read">✓✓</span>' : '<span class="msg-ticks">✓✓</span>') : '';
            let replyBtn = `<button class="reply-icon-btn" onclick="window.iniciarRespuesta('${m.sender}', this)" title="Responder">↩️</button>`;
            
            let msgContent = window.crearCuerpoMensaje(m);
            chatBox.innerHTML += `<div class="msg-bubble ${isOwn ? 'msg-own-wa' : 'msg-other'}" id="msg-${m.tempId || m.id}">${replyBtn}${msgContent} ${tick}</div>`;
        });
    }
    chatBox.scrollTop = chatBox.scrollHeight;
};

window.abrirChatAmigo = function(username, avatar) {
    window.waActiveFriend = username;
    window.unreadPrivates[username] = 0;
    window.actualizarBadgesAmigos();
    
    const badgeEl = document.getElementById(`wa-badge-${username}`);
    if(badgeEl) badgeEl.style.display = 'none';

    document.querySelectorAll('.wa-friend-item').forEach(el => el.classList.remove('active'));
    const friendElement = document.getElementById(`wa-friend-${username}`);
    if(friendElement) friendElement.classList.add('active');

    const layout = document.querySelector('.wa-layout');
    if (layout) layout.classList.add('mobile-chat-open');

    document.getElementById('wa-chat-placeholder').style.display = 'none';
    document.getElementById('wa-active-chat').style.display = 'flex';
    document.getElementById('friend-stats-overlay').style.display = 'none';

    document.getElementById('wa-chat-name').innerText = username;
    document.getElementById('wa-chat-avatar').src = avatar;
    document.getElementById('wa-chat-status').innerText = "Cargando...";

    window.actualizarEstadoAmigo();
    if(window.statusInterval) clearInterval(window.statusInterval);
    window.statusInterval = setInterval(window.actualizarEstadoAmigo, 10000);

    const chatBox = document.getElementById('wa-messages');
    chatBox.innerHTML = "<div class='loader' style='margin:20px auto;'></div>";
    chatBox.classList.remove('chat-crumbling'); 
    
    window.cancelarRespuesta(); 

    fetch(`${window.API_BASE_URL}/api/amistad/chat/${username}`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(res => res.json())
    .then(msgs => {
        window.renderizarHistorialChat(msgs);
        if(stompClient && stompClient.connected) stompClient.send("/app/chat.read", {}, JSON.stringify({ sender: username }));
    }).catch(e => {
        chatBox.innerHTML = `<p style="text-align:center; color:#F44336; margin-top:20px;">Falló la conexión al servidor.</p>`;
    });
};

window.volverAlMenuChatsMovil = function(e) {
    if(e) e.stopPropagation(); 
    const layout = document.querySelector('.wa-layout');
    if (layout) layout.classList.remove('mobile-chat-open');
    window.waActiveFriend = null;
};

const originalRecibirMensajePrivado = window.recibirMensajePrivado;
window.recibirMensajePrivado = function(data) {
    if (data.message === "[MULTIMEDIA_FETCH_REQUIRED]") {
        if (window.waActiveFriend === data.sender) {
            fetch(`${window.API_BASE_URL}/api/amistad/chat/${data.sender}`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
            .then(res => res.json()).then(msgs => window.renderizarHistorialChat(msgs));
        } else {
            window.unreadPrivates[data.sender] = (window.unreadPrivates[data.sender] || 0) + 1;
            window.actualizarBadgesAmigos();
            window.mostrarToastInfo(`📷 Nuevo mensaje multimedia de ${data.sender}`);
        }
        return;
    }
    if (originalRecibirMensajePrivado) originalRecibirMensajePrivado(data);
};

// 🔥 ENVÍO DE FOTOS DESDE EL CHAT 🔥
window.enviarFotoChat = function(event) {
    if (!window.waActiveFriend) return;
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas'); const MAX = 600; let w = img.width, h = img.height;
            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } }
            canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
            window.enviarMensajeMultimedia(canvas.toDataURL('image/jpeg', 0.8), 'IMAGE');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.enviarMensajeMultimedia = function(base64Data, type) {
    const chatBox = document.getElementById('wa-messages');
    if(chatBox.innerHTML.includes("Empieza la conversación")) chatBox.innerHTML = "";
    
    let tempId = Date.now();
    let replyBtn = `<button class="reply-icon-btn" onclick="window.iniciarRespuesta('Tú', this)" title="Responder">↩️</button>`;
    
    let fakeObj = { type: type, message: base64Data, tempId: tempId.toString() };
    let preview = window.crearCuerpoMensaje(fakeObj);
    
    chatBox.innerHTML += `<div id="msg-${tempId}" class="msg-bubble msg-own-wa">${replyBtn}${preview} <span class="msg-ticks">✓</span></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    
    const snippetEl = document.getElementById(`wa-snippet-${window.waActiveFriend}`);
    if(snippetEl) snippetEl.innerText = type === 'IMAGE' ? "Tú: 📷 Foto" : "Tú: 🎤 Audio";

    fetch(`${window.API_BASE_URL}/api/amistad/chat/${window.waActiveFriend}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: base64Data, type: type, tempId: tempId.toString() })
    })
    .then(res => res.json())
    .then(data => {
        const msgElement = document.getElementById(`msg-${data.tempId}`);
        if(msgElement) {
            let realContent = window.crearCuerpoMensaje(data);
            msgElement.innerHTML = `${replyBtn}${realContent} <span class="msg-ticks">✓✓</span>`;
        }
    });
};

window.isTyping = false;
document.addEventListener('input', function(e) {
    if (e.target.id === 'wa-chat-input' && window.waActiveFriend && stompClient && stompClient.connected) {
        if (!window.isTyping) {
            window.isTyping = true;
            stompClient.send("/app/chat.typing", {}, JSON.stringify({ to: window.waActiveFriend, isTyping: true }));
        }
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            window.isTyping = false;
            stompClient.send("/app/chat.typing", {}, JSON.stringify({ to: window.waActiveFriend, isTyping: false }));
        }, 2000);
    }
});

window.enviarMensajePrivado = function() {
    const input = document.getElementById('wa-chat-input');
    const msgTexto = input.value.trim();
    if (!msgTexto || !window.waActiveFriend) return;

    let finalMsg = msgTexto;
    if (window.waReplyingTo) {
        finalMsg = `<div class="replied-msg-bubble"><strong>${window.waReplyingTo.sender}</strong><br>${window.waReplyingTo.text}</div>` + msgTexto;
    }

    const chatBox = document.getElementById('wa-messages');
    if(chatBox.innerHTML.includes("Empieza la conversación")) chatBox.innerHTML = "";
    
    let tempId = Date.now();
    let replyBtn = `<button class="reply-icon-btn" onclick="window.iniciarRespuesta('Tú', this)" title="Responder">↩️</button>`;
    
    chatBox.innerHTML += `<div id="msg-${tempId}" class="msg-bubble msg-own-wa">${replyBtn}${finalMsg} <span class="msg-ticks">✓</span></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    input.value = "";
    document.getElementById('emoji-picker-wa').classList.add('hidden');

    window.cancelarRespuesta(); 

    const snippetEl = document.getElementById(`wa-snippet-${window.waActiveFriend}`);
    if(snippetEl) snippetEl.innerText = "Tú: " + msgTexto;

    fetch(`${window.API_BASE_URL}/api/amistad/chat/${window.waActiveFriend}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalMsg, type: "TEXT", tempId: tempId.toString() })
    })
    .then(res => res.json())
    .then(data => {
        const msgElement = document.getElementById(`msg-${data.tempId}`);
        if(msgElement) {
            let rBtn = `<button class="reply-icon-btn" onclick="window.iniciarRespuesta('Tú', this)" title="Responder">↩️</button>`;
            msgElement.innerHTML = `${rBtn}${data.message} <span class="msg-ticks">✓✓</span>`;
        }
    });
};

// 🔥 NUEVO: EJECUTOR INFALIBLE DEL MENÚ DESPLEGABLE 🔥
window.ejecutarOpcionChat = function(opcion) {
    document.getElementById('chat-dropdown-menu').classList.add('hidden');
    if (opcion === 'perfil') {
        window.verStatsAmigo();
    } else if (opcion === 'vaciar') {
        document.getElementById('clear-chat-modal').classList.remove('hidden');
        document.getElementById('clear-chat-modal').style.display = 'flex';
    }
};

window.vaciarChatConfirmado = function() {
    if (!window.waActiveFriend) return;
    const chatBox = document.getElementById('wa-messages');
    document.getElementById('clear-chat-modal').classList.add('hidden');
    document.getElementById('clear-chat-modal').style.display = 'none';

    chatBox.classList.add('chat-crumbling');

    fetch(`${window.API_BASE_URL}/api/amistad/chat/${window.waActiveFriend}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` }
    })
    .then(res => {
        if(!res.ok) throw new Error("Aún no tienes la Base de Datos actualizada");
        return res.json();
    })
    .then(() => {
        setTimeout(() => {
            chatBox.innerHTML = `<p style="text-align:center; color:#aaa; font-style:italic;">Empieza la conversación con ${window.waActiveFriend}</p>`;
            chatBox.classList.remove('chat-crumbling');
        }, 600); 
    })
    .catch(e => {
        chatBox.classList.remove('chat-crumbling');
        window.mostrarToastError("⚠️ Error: " + e.message + ". Reinicia el servidor Spring Boot para aplicar los cambios.");
    });
};

window.verStatsAmigo = function() {
    const username = window.waActiveFriend;
    if (!username) return;

    document.getElementById('friend-stats-overlay').style.display = 'flex';
    document.getElementById('friend-detail-name').innerText = "Cargando...";
    document.getElementById('friend-detail-wins').innerText = "-";
    document.getElementById('friend-detail-corrects').innerText = "-";

    fetch(`${window.API_BASE_URL}/api/amistad/amigo/${username}/stats`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(res => res.json())
    .then(stats => {
        document.getElementById('friend-detail-name').innerText = stats.username;
        document.getElementById('friend-detail-wins').innerText = stats.partidasGanadas || 0;
        document.getElementById('friend-detail-corrects').innerText = stats.preguntasAcertadas || 0;
        document.getElementById('friend-detail-photo').src = stats.fotoPerfil || 'images/invitado.jpg';
        
        const rankObj = document.getElementById('friend-detail-rank');
        if (rankObj && stats.rango) rankObj.innerText = "Rango: " + stats.rango;

        const dateObj = document.getElementById('friend-detail-date');
        if (dateObj && stats.createdAt) {
            dateObj.innerText = new Date(stats.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        }
    });
};

function inicializarMenu() {
    const sMenu = document.getElementById('screen-menu'); 
    const sLobby = document.getElementById('screen-lobby'); 
    const btnPrivate = document.getElementById('btn-private-game'); 
    const btnLogout = document.getElementById('btn-logout'); 
    const btnLeaveLobby = document.getElementById('btn-leave-lobby'); 
    const btnStart = document.getElementById('btn-start-game-final'); 
    const btnRejoin = document.getElementById('btn-rejoin-lobby'); 
    const btnRequests = document.getElementById('btn-requests'); 
    const requestsModal = document.getElementById('requests-modal'); 
    const closeReq = document.getElementById('close-requests'); 
    const btnMessages = document.getElementById('btn-messages'); 
    const messagesModal = document.getElementById('messages-modal'); 
    const closeMessages = document.getElementById('close-messages'); 
    const btnAddMenu = document.getElementById('btn-add-friend-menu'); 
    const addFriendModal = document.getElementById('add-friend-modal'); 
    const btnCloseAddFriend = document.getElementById('btn-close-add-friend'); 
    const btnSendFriendReq = document.getElementById('btn-send-friend-req'); 
    const modalFriendUsername = document.getElementById('modal-friend-username'); 
    const btnAddLobby = document.getElementById('btn-add-friend-lobby'); 
    const inputFriendName = document.getElementById('input-friend-name');

    window.cargarMiPerfil(); 
    window.verificarBotonReconexion(); 
    window.actualizarBandejaMensajes(); 
    window.actualizarBandeja(); 

    if (sessionStorage.getItem('is_public_room') === 'true') {
        const modo = sessionStorage.getItem('public_room_mode') || 'Battle Royale';
        document.getElementById('lobby-title').innerText = "Matchmaking Público"; 
        document.getElementById('config-private-only').style.display = 'none'; 
        document.getElementById('config-public-display').style.display = 'block'; 
        document.getElementById('public-mode-label').innerText = modo.toUpperCase(); 
        document.getElementById('lobby-add-friend-section').style.display = 'none'; 
        document.getElementById('waiting-msg').innerText = "Buscando jugadores..."; 
    }

    if (btnLogout) { 
        btnLogout.onclick = () => { 
            sessionStorage.clear(); 
            location.reload(); 
        }; 
    }

    // 🔥 Exponemos la lógica de salida como función global para que app.js
    // pueda invocarla también cuando el usuario usa la flecha Atrás del navegador.
    window.ejecutarSalidaLobby = function() {
        const gameId = sessionStorage.getItem('current_game_id'); 
        const hostName = sessionStorage.getItem('current_host_name'); 
        const myName = sessionStorage.getItem('genius_username');
        const isPublic = sessionStorage.getItem('is_public_room') === 'true';
        const publicMode = sessionStorage.getItem('public_room_mode');

        // Guardamos el rejoin ANTES de borrar is_public_room y de enviar lobby.leave.
        if (gameId && hostName !== myName) {
            sessionStorage.setItem('last_voluntary_game_id', gameId);
            if (isPublic && publicMode) {
                sessionStorage.setItem('last_voluntary_public_mode', publicMode);
            }
        }

        sessionStorage.removeItem('is_public_room'); 
        sessionStorage.removeItem('public_room_mode');

        if (gameId && stompClient && stompClient.connected) {
            stompClient.send("/app/lobby.leave", {}, JSON.stringify({ gameId: gameId }));
            if (hostName === myName) { 
                sessionStorage.removeItem('last_voluntary_game_id'); 
                sessionStorage.removeItem('last_voluntary_public_mode');
            }
        }
        sessionStorage.removeItem('current_game_id'); 
        sessionStorage.removeItem('current_host_name'); 
        window.verificarBotonReconexion(); 
        window.location.hash = '#screen-menu';

        const sLobbyLocal = document.getElementById('screen-lobby');
        const sMenuLocal = document.getElementById('screen-menu');
        if (typeof cambiarPantalla === "function") { 
            cambiarPantalla(sLobbyLocal, sMenuLocal); 
        }

        document.getElementById('global-chat-btn').style.display = 'none';
        document.getElementById('room-chat-messages').innerHTML = '<p style="text-align:center; color:#aaa; font-size:0.9rem;">Únete a una sala para chatear</p>';
    };

    if (btnLeaveLobby) {
        // El botón reutiliza la misma función global
        btnLeaveLobby.onclick = window.ejecutarSalidaLobby;
    }

    if (btnRejoin) {
        btnRejoin.onclick = () => {
            const lastGameId = sessionStorage.getItem('last_voluntary_game_id');
            const lastPublicMode = sessionStorage.getItem('last_voluntary_public_mode');
            if (lastGameId && stompClient && stompClient.connected) {
                if (typeof cambiarPantalla === "function") { 
                    cambiarPantalla(sMenu, sLobby); 
                }
                window.location.hash = '#screen-lobby';
                document.getElementById('global-chat-btn').style.display = 'flex';

                if (lastPublicMode) {
                    // 🔥 FIX: Sala pública — necesitamos JOIN, no REJOIN.
                    // lobby.leave sacó al jugador de la sala, así que hay que volver a entrar.
                    sessionStorage.setItem('is_public_room', 'true');
                    sessionStorage.setItem('public_room_mode', lastPublicMode);
                    document.getElementById('lobby-title').innerText = 'Matchmaking Público';
                    document.getElementById('config-private-only').style.display = 'none';
                    document.getElementById('config-public-display').style.display = 'block';
                    document.getElementById('public-mode-label').innerText = lastPublicMode.toUpperCase();
                    document.getElementById('lobby-add-friend-section').style.display = 'none';
                    document.getElementById('waiting-msg').innerText = 'Buscando jugadores...';
                    document.getElementById('waiting-msg').style.display = 'block';
                    const list = document.getElementById('lobby-players-list');
                    if (list) list.innerHTML = '';
                    stompClient.send("/app/game.public.join", {}, JSON.stringify({ gameMode: lastPublicMode }));
                } else {
                    // Sala privada — rejoin normal
                    document.getElementById('waiting-msg').innerText = 'Reconectando con tu sala...';
                    document.getElementById('waiting-msg').style.display = 'block';
                    stompClient.send("/app/lobby.rejoin", {}, JSON.stringify({ gameId: lastGameId }));
                }
            }
        };
    }

    if (btnPrivate) {
        btnPrivate.onclick = () => {
            sessionStorage.removeItem('is_public_room'); 
            sessionStorage.removeItem('public_room_mode');

            if (typeof cambiarPantalla === "function") { 
                cambiarPantalla(sMenu, sLobby); 
            }
            document.getElementById('lobby-title').innerText = "Sala Privada"; 
            document.getElementById('config-private-only').style.display = 'block'; 
            document.getElementById('config-public-display').style.display = 'none'; 
            document.getElementById('lobby-add-friend-section').style.display = 'block';
            
            if (stompClient && stompClient.connected) {
                stompClient.send("/app/game.private.create", {}, JSON.stringify({}));
            }
            
            const list = document.getElementById('lobby-players-list'); 
            const myAvatar = sessionStorage.getItem('genius_avatar') || 'images/invitado.jpg'; 
            const myName = sessionStorage.getItem('genius_username');
            
            if(list) { 
                list.innerHTML = `<li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; background: rgba(255,255,255,0.05); padding: 8px 15px; border-radius: 10px;"><div style="display:flex; align-items:center;"><img src="${myAvatar}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; margin-right:10px; border:2px solid #FFD700; vertical-align:middle;"> 👑 <strong style="color:#FFD700; margin-left:5px;">${myName} (Host)</strong></div></li>`; 
            }
            
            document.getElementById('host-controls').style.display = 'none'; 
            document.getElementById('waiting-msg').innerText = 'Esperando a que se unan los jugadores (Máx 10)...'; 
            document.getElementById('waiting-msg').style.display = 'block';
            
            sessionStorage.setItem('current_host_name', myName); 
            cargarListaAmigos(); 
            cargarCategorias();
            
            document.getElementById('global-chat-btn').style.display = 'flex';
            document.getElementById('room-chat-messages').innerHTML = ''; 
        };
    }

    function notificarCambioLobby() {
        const gameId = sessionStorage.getItem('current_game_id'); 
        const myName = sessionStorage.getItem('genius_username'); 
        const hostName = sessionStorage.getItem('current_host_name');
        if (gameId && myName === hostName && stompClient && stompClient.connected) {
            stompClient.send("/app/lobby.settings.change", {}, JSON.stringify({ 
                gameId: gameId, 
                gameMode: document.getElementById('game-mode').value, 
                categoryName: document.getElementById('game-category').value 
            }));
        }
    }

    document.getElementById('game-mode').addEventListener('change', notificarCambioLobby);
    document.getElementById('game-category').addEventListener('change', notificarCambioLobby);

    if (btnStart) {
        btnStart.onclick = () => {
            btnStart.disabled = true; 
            setTimeout(() => btnStart.disabled = false, 3000);
            const gameId = sessionStorage.getItem('current_game_id'); 
            const gameMode = document.getElementById('game-mode').value; 
            const selectedCategory = document.getElementById('game-category').value; 
            if (stompClient && stompClient.connected) { 
                stompClient.send("/app/game.start.private", {}, JSON.stringify({ 
                    gameId: gameId, 
                    categoryName: selectedCategory, 
                    gameMode: gameMode 
                })); 
            }
        };
    }

    if (btnMessages) { btnMessages.onclick = () => { if (messagesModal) { messagesModal.classList.remove('hidden'); messagesModal.style.display = 'flex'; window.actualizarBandejaMensajes(); } }; }
    if (closeMessages) { closeMessages.onclick = () => { if (messagesModal) { messagesModal.classList.add('hidden'); messagesModal.style.display = 'none'; } }; }
    if (btnAddMenu) { btnAddMenu.onclick = () => { if (addFriendModal) { addFriendModal.classList.remove('hidden'); addFriendModal.style.display = 'flex'; if (modalFriendUsername) modalFriendUsername.focus(); } }; }
    if (btnCloseAddFriend) { btnCloseAddFriend.onclick = () => { addFriendModal.classList.add('hidden'); addFriendModal.style.display = 'none'; }; }
    if (btnRequests) { btnRequests.onclick = () => { if (requestsModal) { requestsModal.classList.remove('hidden'); requestsModal.style.display = 'flex'; window.actualizarBandeja(); } }; }
    if (closeReq) { closeReq.onclick = () => { requestsModal.classList.add('hidden'); requestsModal.style.display = 'none'; }; }
    if (btnSendFriendReq) { btnSendFriendReq.onclick = () => enviarSolicitud(modalFriendUsername.value.trim()); }
    if (btnAddLobby && inputFriendName) { btnAddLobby.onclick = () => enviarSolicitud(inputFriendName.value.trim()); }

    function enviarSolicitud(usernameToTarget) {
        if (!usernameToTarget) { window.mostrarToastError("⚠️ Por favor, introduce un nombre de usuario."); return; }
        fetch(`${window.API_BASE_URL}/api/amistad/solicitar`, { 
            method: 'POST', 
            headers: { 
                'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}`, 
                'Content-Type': 'application/json' 
            }, 
            body: JSON.stringify({ username: usernameToTarget }) 
        })
        .then(res => res.json())
        .then(d => {
            if (d.success) { window.mostrarToastExito(d.message); } else { window.mostrarToastError(d.message); }
            if (modalFriendUsername) modalFriendUsername.value = ""; 
            if (inputFriendName) inputFriendName.value = "";
            if (addFriendModal) { addFriendModal.classList.add('hidden'); addFriendModal.style.display = 'none'; }
        });
    }
}

function cargarCategorias() {
    const catSelect = document.getElementById('game-category'); if (!catSelect) return;
    fetch(`${window.API_BASE_URL}/api/game/categories`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(res => res.json())
    .then(categorias => {
        catSelect.innerHTML = "<option value='Cultura General'>Cultura General</option>";
        categorias.forEach(cat => { if (cat.name !== "Cultura General") { catSelect.innerHTML += `<option value='${cat.name}'>${cat.name}</option>`; } });
    });
}

function cargarListaAmigos() {
    const list = document.getElementById('friends-list'); if (!list) return;
    fetch(`${window.API_BASE_URL}/api/amistad/lista`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(res => res.json())
    .then(amigos => {
        list.innerHTML = "";
        amigos.forEach(a => { list.innerHTML += `<li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; background: rgba(255,255,255,0.05); padding: 8px 15px; border-radius: 10px;"><span>${a.username}</span> <button class="btn-info btn-modal-style" onclick="window.invitar('${a.username}')">Invitar</button></li>`; });
    });
}

window.invitar = function(username) { const catSelect = document.getElementById('game-category'); const categoria = catSelect ? catSelect.value : "Cultura General"; if (typeof enviarInvitacionJuego === "function") { enviarInvitacionJuego(username, categoria); } };
window.aceptarSol = function(id) { fetch(`${window.API_BASE_URL}/api/amistad/aceptar/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } }).then(() => { window.mostrarToastExito("¡Amigo añadido!"); document.getElementById('requests-modal').style.display = 'none'; cargarListaAmigos(); window.actualizarBandeja(); }); };
window.rechazarSol = function(id) { fetch(`${window.API_BASE_URL}/api/amistad/rechazar/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } }).then(res => res.json()).then(data => { window.mostrarToastInfo(data.message); window.actualizarBandeja(); }); };

window.actualizarBandeja = function() {
    const rList = document.getElementById('requests-list'); const badge = document.getElementById('requests-badge');
    if (rList) rList.innerHTML = "<li>Cargando...</li>";
    fetch(`${window.API_BASE_URL}/api/amistad/pendientes`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(res => res.json())
    .then(data => {
        if (badge) { if (data.length > 0) { badge.innerText = data.length; badge.style.display = 'inline-block'; } else { badge.style.display = 'none'; } }
        if (!rList) return;
        if (data.length === 0) { rList.innerHTML = `<li style="color: #555;">No tienes peticiones pendientes.</li>`; return; }
        rList.innerHTML = "";
        data.forEach(r => { rList.innerHTML += `<li style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee;"><strong>${r.senderUsername}</strong> <div><button class="btn-primary btn-modal-style" style="padding:6px 12px; margin-right:5px;" onclick="window.aceptarSol(${r.id})">✅</button> <button class="btn-secondary btn-modal-style" style="padding:6px 12px;" onclick="window.rechazarSol(${r.id})">❌</button></div></li>`; });
    });
};

document.addEventListener('DOMContentLoaded', inicializarMenu);

window.abrirMenuLateral = function() {
    const sidebar = document.getElementById('menu-sidebar');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (sidebar) sidebar.classList.add('sidebar-open');
    if (overlay) overlay.classList.add('active');
};

window.cerrarMenuLateral = function() {
    const sidebar = document.getElementById('menu-sidebar');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (sidebar) sidebar.classList.remove('sidebar-open');
    if (overlay) overlay.classList.remove('active');
};