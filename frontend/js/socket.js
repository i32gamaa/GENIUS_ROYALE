// ==========================================
// js/socket.js - VERSIÓN DEFINITIVA CHATS Y ESTADOS 🛡️👻💬
// ==========================================

let stompClient = null;
let currentUser = "";
window.invitacionesPendientes = []; 
window.toastCallbacks = {}; 

window.mostrarToastExito = function(mensaje) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.innerHTML = `<img src="images/logo.jpeg" class="toast-logo" alt="Logo"><div class="toast-content">${mensaje} ✔️</div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 3000);
};

window.mostrarToastError = function(mensaje) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.innerHTML = `<img src="images/logo.jpeg" class="toast-logo" alt="Logo"><div class="toast-content">${mensaje}</div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 4000); 
};

window.mostrarToastInfo = function(mensaje) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-info';
    toast.innerHTML = `<img src="images/logo.jpeg" class="toast-logo" alt="Logo"><div class="toast-content">${mensaje}</div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 3000);
};

window.mostrarToastConfirmacion = function(mensaje, callbackAceptar) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const idToast = 'confirm-' + Date.now();
    window.toastCallbacks[idToast] = callbackAceptar; 
    const toast = document.createElement('div');
    toast.className = 'toast toast-warning';
    toast.id = idToast;
    toast.innerHTML = `
        <img src="images/logo.jpeg" class="toast-logo" alt="Logo">
        <div class="toast-content" style="flex:1;">${mensaje}</div>
        <div class="toast-actions">
            <button class="toast-btn" onclick="window.ejecutarToastCallback('${idToast}')" title="Sí">✔️</button>
            <button class="toast-btn" onclick="window.cerrarToast('${idToast}')" title="No">❌</button>
        </div>
    `;
    container.appendChild(toast);
};

window.ejecutarToastCallback = function(idToast) {
    if (window.toastCallbacks[idToast]) { window.toastCallbacks[idToast](); delete window.toastCallbacks[idToast]; }
    window.cerrarToast(idToast);
};

window.cerrarToast = function(idToast) {
    const toast = document.getElementById(idToast);
    if (toast) { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }
    delete window.toastCallbacks[idToast];
};

window.mostrarToastInvitacion = function(inv) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const senderName = inv.senderUsername || inv.sender || "Un amigo";
    const idInv = inv.inviteId || inv.id;
    const toast = document.createElement('div');
    toast.className = 'toast toast-invite';
    toast.id = `toast-inv-${idInv}`;
    toast.innerHTML = `
        <img src="images/logo.jpeg" class="toast-logo" alt="Logo">
        <div class="toast-content">
            Has recibido una invitación a sala de <strong>${senderName}</strong>
        </div>
        <div class="toast-actions">
            <button class="toast-btn" onclick="window.responderInvitacion(${idInv}, true, '${senderName}', this)" title="Aceptar">✔️</button>
            <button class="toast-btn" onclick="window.responderInvitacion(${idInv}, false, '${senderName}', this)" title="Rechazar">❌</button>
        </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        const toastElement = document.getElementById(`toast-inv-${idInv}`);
        if (toastElement) {
            toastElement.classList.add('fade-out'); setTimeout(() => toastElement.remove(), 400);
            window.invitacionesPendientes.push(inv);
            if (typeof actualizarBandejaMensajes === "function") actualizarBandejaMensajes();
            if (typeof actualizarNotificacionMensajes === "function") actualizarNotificacionMensajes();
        }
    }, 7000);
};

window.responderInvitacion = function(inviteId, aceptar, senderName, btnElement) {
    if (btnElement) {
        const toast = btnElement.closest('.toast');
        if (toast) { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }
    }
    window.invitacionesPendientes = window.invitacionesPendientes.filter(i => (i.inviteId || i.id) !== inviteId);
    if (typeof actualizarBandejaMensajes === "function") actualizarBandejaMensajes();
    if (typeof actualizarNotificacionMensajes === "function") actualizarNotificacionMensajes();
    if (aceptar) {
        sessionStorage.removeItem('current_game_id'); sessionStorage.removeItem('current_host_name'); sessionStorage.removeItem('last_voluntary_game_id'); 
        if (typeof verificarBotonReconexion === "function") verificarBotonReconexion();
        irALobbyComoInvitado(senderName);
        stompClient.send("/app/invite.accept", {}, JSON.stringify({ inviteId: inviteId }));
    }
};

window.mostrarPantallaVotacion = function(categorias) {
    document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.style.display = 'none'; });
    const sVote = document.getElementById('screen-voting');
    if (sVote) { sVote.classList.remove('hidden'); sVote.style.display = 'flex'; }
    
    document.getElementById('global-chat-btn').style.display = 'none';

    const grid = document.getElementById('voting-grid');
    if (grid) {
        grid.innerHTML = "";
        categorias.forEach(cat => {
            const safeId = cat.replace(/\s+/g, '-');
            const div = document.createElement('div');
            div.className = 'vote-card';
            div.id = `vote-${safeId}`;
            div.innerHTML = `<h3 style="margin:0; color:#FFD700; font-family:'Cinzel Decorative', cursive;">${cat}</h3><p style="margin-top:10px; color:#aaa; font-weight:bold;"><span id="count-${safeId}">0</span> votos</p>`;
            div.onclick = () => window.enviarVoto(cat);
            grid.appendChild(div);
        });
    }
    let sec = 10; 
    const t = document.getElementById('voting-timer');
    if (t) t.innerText = `${sec}s`;
    if (window.votingInterval) clearInterval(window.votingInterval);
    window.votingInterval = setInterval(() => { 
        sec--; 
        if (t) t.innerText = `${sec}s`; 
        if (sec <= 0) clearInterval(window.votingInterval); 
    }, 1000);
};

window.enviarVoto = function(categoria) {
    if (window.miVoto) return; 
    window.miVoto = categoria;
    document.querySelectorAll('.vote-card').forEach(c => c.classList.remove('selected'));
    const safeId = categoria.replace(/\s+/g, '-');
    const card = document.getElementById(`vote-${safeId}`);
    if (card) card.classList.add('selected');
    const gameId = sessionStorage.getItem('current_game_id');
    if (stompClient && stompClient.connected) stompClient.send("/app/game.vote", {}, JSON.stringify({ gameId: gameId, category: categoria }));
};

window.actualizarContadorVotos = function(votos) {
    Object.entries(votos).forEach(([cat, num]) => {
        const safeId = cat.replace(/\s+/g, '-');
        const el = document.getElementById(`count-${safeId}`);
        if (el) el.innerText = num;
    });
};

window.procesarResultadoVotacion = function(ganador, esEmpate, opcionesEmpatadas) {
    if (esEmpate) {
        let i = 0;
        const interval = setInterval(() => {
            document.querySelectorAll('.vote-card').forEach(c => c.classList.remove('highlight'));
            const safeId = opcionesEmpatadas[i % opcionesEmpatadas.length].replace(/\s+/g, '-');
            const target = document.getElementById(`vote-${safeId}`);
            if (target) target.classList.add('highlight');
            i++;
        }, 100);
        setTimeout(() => {
            clearInterval(interval);
            document.querySelectorAll('.vote-card').forEach(c => c.classList.remove('highlight', 'selected'));
            const safeWinnerId = ganador.replace(/\s+/g, '-');
            const winCard = document.getElementById(`vote-${safeWinnerId}`);
            if (winCard) { winCard.classList.add('selected'); winCard.style.borderColor = "#FFD700"; winCard.style.boxShadow = "0 0 40px #FFD700"; }
        }, 2000);
    } else {
        document.querySelectorAll('.vote-card').forEach(c => c.classList.remove('selected'));
        const safeWinnerId = ganador.replace(/\s+/g, '-');
        const winCard = document.getElementById(`vote-${safeWinnerId}`);
        if (winCard) { winCard.classList.add('selected'); winCard.style.boxShadow = "0 0 40px #03DAC6"; }
    }
};

window.toggleRoomChat = function() {
    const panel = document.getElementById('room-chat-panel');
    const badge = document.getElementById('global-chat-badge');
    if (panel) {
        if (panel.classList.contains('open')) { panel.classList.remove('open'); } 
        else {
            panel.classList.add('open');
            if(badge) { badge.innerText = '0'; badge.style.display = 'none'; }
            const box = document.getElementById('room-chat-messages');
            if (box) box.scrollTop = box.scrollHeight;
        }
    }
};

window.enviarMensajeSala = function() {
    const input = document.getElementById('room-chat-input');
    const msg = input.value.trim();
    const gameId = sessionStorage.getItem('current_game_id');
    
    if (msg && gameId && stompClient && stompClient.connected) {
        stompClient.send("/app/chat.room", {}, JSON.stringify({ gameId: gameId, message: msg }));
        input.value = '';
        document.getElementById('emoji-picker-room').classList.add('hidden');
    } else if (!gameId) {
        window.mostrarToastInfo("Debes estar en una sala para poder chatear.");
    }
};

window.recibirMensajeSala = function(data) {
    const myName = sessionStorage.getItem('genius_username');
    const isOwn = data.sender === myName;
    const box = document.getElementById('room-chat-messages');
    const panel = document.getElementById('room-chat-panel');
    
    if (box.innerHTML.includes("Únete a una sala para chatear")) { box.innerHTML = ""; }
    
    box.innerHTML += `
        <div class="msg-bubble ${isOwn ? 'msg-own' : 'msg-other'}">
            ${!isOwn ? `<div class="msg-author">${data.sender}</div>` : ''}
            ${data.message}
        </div>
    `;
    box.scrollTop = box.scrollHeight;

    if (!panel.classList.contains('open')) {
        const badge = document.getElementById('global-chat-badge');
        if (badge) { badge.innerText = parseInt(badge.innerText || 0) + 1; badge.style.display = 'block'; }
    }
};

window.recibirMensajePrivado = function(data) {
    const chatBox = document.getElementById('wa-messages');
    const panelAmigos = document.getElementById('friends-stats-modal');
    
    if (panelAmigos && panelAmigos.style.display !== 'none' && window.waActiveFriend === data.sender) {
        if (chatBox) {
            chatBox.innerHTML += `<div class="msg-bubble msg-other">${data.message}</div>`;
            chatBox.scrollTop = chatBox.scrollHeight;
        }
        
        const snippetEl = document.getElementById(`wa-snippet-${data.sender}`);
        if (snippetEl) snippetEl.innerText = data.message;
        
        if (stompClient && stompClient.connected) {
            stompClient.send("/app/chat.read", {}, JSON.stringify({ sender: data.sender }));
        }

    } else {
        if(!window.unreadPrivates) window.unreadPrivates = {};
        window.unreadPrivates[data.sender] = (window.unreadPrivates[data.sender] || 0) + 1;
        
        const snippetEl = document.getElementById(`wa-snippet-${data.sender}`);
        if (snippetEl) snippetEl.innerText = data.message;

        if (typeof actualizarBadgesAmigos === "function") window.actualizarBadgesAmigos();
        window.mostrarToastInfo(`💬 Mensaje de ${data.sender}: ${data.message}`);
    }
};

function conectarWebSocket(token, username) {
    if (!token) return;
    currentUser = username;
    
    const socket = new SockJS(`${window.API_BASE_URL}/ws`);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    stompClient.connect({'Authorization': 'Bearer ' + token}, function (frame) {
        console.log('✅ Conectado como: ' + currentUser);

        // 🔥 INYECCIÓN QUIRÚRGICA: MÓDULO AISLADO KAHOOT 🔥
        if (sessionStorage.getItem('is_pin_room') === 'true') {
            if (typeof window.suscribirseAKahoot === "function") {
                window.suscribirseAKahoot(stompClient, currentUser);
                
                const roomPin = sessionStorage.getItem('current_game_id');
                const payload = JSON.stringify({ gameId: roomPin, username: currentUser });

                setTimeout(() => {
                    if (sessionStorage.getItem('is_guest') === 'true') {
                        stompClient.send("/app/kahoot.join", {}, payload);
                    } else {
                        stompClient.send("/app/kahoot.sync", {}, payload);
                    }
                }, 300);

                // REDUNDANCIA ANTI-F5: Si tras 1.5s la lista sigue vacía, pide sync de nuevo
                setTimeout(() => {
                    const list = document.getElementById('lobby-pin-players-list');
                    if (list && list.children.length === 0) {
                        stompClient.send("/app/kahoot.sync", {}, payload);
                    }
                }, 1500);
            }
        }

        // ==========================================
        // 🛡️ RE-ENGANCHE AUTOMÁTICO POST-F5 (MATCHMAKING PÚBLICO)
        // ==========================================
        if (sessionStorage.getItem('is_public_room') === 'true') {
            const modoPublico = sessionStorage.getItem('public_room_mode') || 'Battle Royale';
            console.log('🔄 Re-enviando solicitud de Matchmaking tras F5: ' + modoPublico);
            
            // Le damos un pequeño respiro de medio segundo para que las suscripciones se asienten
            setTimeout(() => {
                if (stompClient && stompClient.connected) {
                    stompClient.send("/app/game.public.join", {}, JSON.stringify({ gameMode: modoPublico }));
                }
            }, 500);
        }

        setInterval(() => {
            if (stompClient && stompClient.connected) {
                stompClient.send("/app/user.ping", {}, JSON.stringify({}));
            }
        }, 5000);

        stompClient.subscribe(`/topic/chat.room.${currentUser}`, function (message) { window.recibirMensajeSala(JSON.parse(message.body)); });
        stompClient.subscribe(`/topic/chat.private.${currentUser}`, function (message) { window.recibirMensajePrivado(JSON.parse(message.body)); });

        stompClient.subscribe(`/topic/chat.typing.${currentUser}`, function (message) {
            const data = JSON.parse(message.body);
            if (window.waActiveFriend === data.sender) {
                const statusEl = document.getElementById('wa-chat-status');
                if (statusEl) {
                    if (data.isTyping) {
                        statusEl.innerText = "Escribiendo..."; statusEl.style.color = "#03DAC6";
                    } else {
                        window.actualizarEstadoAmigo(); 
                    }
                }
            }
        });

        stompClient.subscribe(`/topic/chat.read.${currentUser}`, function (message) {
            const data = JSON.parse(message.body);
            if (window.waActiveFriend === data.reader) {
                const ticks = document.getElementById('wa-messages').querySelectorAll('.msg-ticks');
                ticks.forEach(t => {
                    t.innerText = "✓✓";
                    t.classList.add('msg-ticks-read');
                });
            }
        });

        stompClient.subscribe(`/topic/friends.${currentUser}`, function (message) {
            const data = JSON.parse(message.body);
            if (data.type === "FRIEND_REQUEST") { window.mostrarToastInfo(`🤝 ${data.sender} te ha enviado una solicitud.`); if (typeof actualizarBandeja === "function") actualizarBandeja(); }
        });

        stompClient.subscribe(`/topic/invites.${currentUser}`, function (message) { window.mostrarToastInvitacion(JSON.parse(message.body)); });

        stompClient.subscribe(`/topic/lobby.guest.joined.${currentUser}`, function (message) {
            const data = JSON.parse(message.body);
            
            if (data.type === "KICKED" || data.type === "ROOM_CLOSED") {
                if(data.type === "KICKED") window.mostrarToastError("❌ Has sido expulsado de la sala.");
                if(data.type === "ROOM_CLOSED") window.mostrarToastError(`❌ La sala ha sido cerrada.`); 
                sessionStorage.removeItem('current_game_id'); sessionStorage.removeItem('current_host_name'); sessionStorage.removeItem('last_voluntary_game_id'); 
                
                // 🔥 Asegurarnos de limpiar la nota pública si nos echan 🔥
                sessionStorage.removeItem('is_public_room');
                sessionStorage.removeItem('public_room_mode');

                const sMenu = document.getElementById('screen-menu'); const sLobby = document.getElementById('screen-lobby');
                if (typeof cambiarPantalla === "function") cambiarPantalla(sLobby, sMenu);
                if (typeof verificarBotonReconexion === "function") verificarBotonReconexion();
                
                document.getElementById('global-chat-btn').style.display = 'none';
                document.getElementById('room-chat-messages').innerHTML = '<p style="text-align:center; color:#aaa; font-size:0.9rem;">Únete a una sala para chatear</p>';
                return; 
            }

            if (data.type === "LOBBY_UPDATE") {
                const currentHash = window.location.hash;
                if (currentHash === '#screen-game' || currentHash === '#screen-voting') return;

                if (data.gameId !== "" && currentHash === '#screen-menu') {
                    const btnRejoin = document.getElementById('btn-rejoin-lobby');
                    if (btnRejoin) btnRejoin.style.display = 'block';
                    sessionStorage.setItem('last_voluntary_game_id', data.gameId);
                } else if (data.gameId === "") {
                    const btnRejoin = document.getElementById('btn-rejoin-lobby');
                    if (btnRejoin) btnRejoin.style.display = 'none';
                    sessionStorage.removeItem('last_voluntary_game_id');
                }

                const lastLeftId = sessionStorage.getItem('last_voluntary_game_id');
                if (lastLeftId === data.gameId) {
                    if (currentHash !== '#screen-lobby' && currentHash !== '#screen-menu') return; 
                    else if (currentHash === '#screen-lobby') {
                        sessionStorage.removeItem('last_voluntary_game_id');
                        if (typeof verificarBotonReconexion === "function") verificarBotonReconexion();
                    }
                }

                const isViewingResults = document.getElementById('game-results') && document.getElementById('game-results').style.display === 'block';
                if (!isViewingResults && (data.gameId !== "" && currentHash !== '#screen-lobby' && currentHash !== '#screen-menu')) {
                    document.querySelectorAll('.screen').forEach(s => { s.style.display = 'none'; s.classList.add('hidden'); });
                    const sLobby = document.getElementById('screen-lobby');
                    if (sLobby) { sLobby.classList.remove('hidden'); sLobby.style.display = 'block'; window.location.hash = '#screen-lobby'; }
                    if (typeof resetearVistasDeJuego === "function") resetearVistasDeJuego();
                    document.getElementById('global-chat-btn').style.display = 'flex';
                }

                const list = document.getElementById('lobby-players-list');
                if (list && data.playersInfo) {
                    list.innerHTML = ""; let playerAvatars = {}; 
                    
                    data.playersInfo.forEach((p) => {
                        let avatar = p.fotoPerfil || 'images/invitado.jpg';
                        playerAvatars[p.username] = avatar;
                        
                        let imgHtml = `<img src="${avatar}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; margin-right:10px; border:2px solid ${p.isHost ? '#FFD700' : '#03DAC6'}; vertical-align:middle;">`;
                        const li = document.createElement('li');
                        li.style.display = "flex"; li.style.justifyContent = "space-between"; li.style.alignItems = "center"; li.style.marginBottom = "10px"; li.style.background = "rgba(255,255,255,0.05)"; li.style.padding = "8px 15px"; li.style.borderRadius = "10px";
                        
                        let statusHtml = p.status === "Ausente" ? `<span style="color: #F44336; font-size: 0.8em; margin-left: 5px;">(Ausente)</span>` : `<span style="color: #4CAF50; font-size: 0.8em; margin-left: 5px;">(Listo)</span>`;
                        let nameHtml = p.isHost ? `<div style="display:flex; align-items:center;">${imgHtml} 👑 <strong style="color: #FFD700; margin-left:5px;">${p.username} (Host)</strong></div>` : `<div style="display:flex; align-items:center;">${imgHtml} 👤 <span style="color: ${p.username === currentUser ? '#03DAC6' : 'white'}; margin-left:5px;">${p.username}</span> ${statusHtml}</div>`;
                        let kickBtnHtml = "";
                        if (data.hostName === currentUser && !p.isHost) {
                            kickBtnHtml = `<button onclick="window.expulsarJugador('${p.username}')" style="background:none; border:none; cursor:pointer; font-size:1.2rem; transition: transform 0.2s;" title="Expulsar jugador">❌</button>`;
                        }
                        li.innerHTML = `${nameHtml} ${kickBtnHtml}`;
                        if (p.isHost) list.prepend(li); else list.appendChild(li); 
                    });
                    sessionStorage.setItem('player_avatars', JSON.stringify(playerAvatars));
                }

                const waitingMsg = document.getElementById('waiting-msg'); const hostControls = document.getElementById('host-controls'); const selectMode = document.getElementById('game-mode'); const selectCat = document.getElementById('game-category');
                
                if (data.hostName === currentUser) {
                    if (selectMode) selectMode.disabled = false; if (selectCat) selectCat.disabled = false;
                    if (data.players.length >= 2) {
                        if (hostControls) {
                            hostControls.style.display = 'block';
                            const cooldownEnd = sessionStorage.getItem('host_cooldown');
                            const btnStart = document.getElementById('btn-start-game-final');
                            if (cooldownEnd && btnStart) {
                                const timeLeft = parseInt(cooldownEnd) - Date.now();
                                if (timeLeft > 0) {
                                    btnStart.disabled = true; btnStart.style.opacity = "0.5";
                                    let secs = Math.ceil(timeLeft / 1000); btnStart.innerText = `⏳ ESPERA (${secs}s)...`;
                                    if(window.cooldownInterval) clearInterval(window.cooldownInterval);
                                    window.cooldownInterval = setInterval(() => {
                                        secs--;
                                        if (secs > 0) { btnStart.innerText = `⏳ ESPERA (${secs}s)...`; } 
                                        else { clearInterval(window.cooldownInterval); btnStart.disabled = false; btnStart.style.opacity = "1"; btnStart.innerText = "🚀 INICIAR PARTIDA"; sessionStorage.removeItem('host_cooldown'); }
                                    }, 1000);
                                } else { btnStart.disabled = false; btnStart.style.opacity = "1"; btnStart.innerText = "🚀 INICIAR PARTIDA"; }
                            } else if (btnStart) { btnStart.disabled = false; btnStart.style.opacity = "1"; btnStart.innerText = "🚀 INICIAR PARTIDA"; }
                        }
                        if (waitingMsg) waitingMsg.style.display = 'none';
                    } else {
                        if (hostControls) hostControls.style.display = 'none';
                        if (waitingMsg) { 
                            // 🔥 TEXTO DINÁMICO PARA MATCHMAKING 🔥
                            if (sessionStorage.getItem('is_public_room') === 'true') {
                                waitingMsg.innerText = `Buscando oponentes (${data.players.length}/10)...`;
                            } else {
                                waitingMsg.innerText = `Esperando a que se unan los jugadores (Máx 10)...`; 
                            }
                            waitingMsg.style.display = 'block'; 
                        }
                    }
                } else {
                    if (selectMode) selectMode.disabled = true; if (selectCat) selectCat.disabled = true;
                    if (selectMode && data.gameMode && selectMode.value !== data.gameMode) { selectMode.value = data.gameMode; selectMode.style.border = "2px solid #03DAC6"; setTimeout(() => selectMode.style.border = "none", 1000); }
                    if (selectCat && data.categoryName && selectCat.value !== data.categoryName) {
                        let exists = Array.from(selectCat.options).some(o => o.value === data.categoryName);
                        if(!exists) { selectCat.add(new Option(data.categoryName, data.categoryName)); }
                        selectCat.value = data.categoryName; selectCat.style.border = "2px solid #FF9800"; setTimeout(() => selectCat.style.border = "none", 1000);
                    }
                    if (waitingMsg) { 
                        // 🔥 TEXTO DINÁMICO PARA MATCHMAKING 🔥
                        if (sessionStorage.getItem('is_public_room') === 'true') {
                            waitingMsg.innerText = `Buscando oponentes (${data.players.length}/10)...`;
                        } else {
                            waitingMsg.innerText = `Esperando al Host (${data.players.length}/10)...`; 
                        }
                        waitingMsg.style.display = 'block'; 
                    }
                    if (hostControls) hostControls.style.display = 'none';
                }
                sessionStorage.setItem('current_game_id', data.gameId); sessionStorage.setItem('current_host_name', data.hostName);
            }
        });

        stompClient.subscribe(`/topic/game.voting.${currentUser}`, function (message) {
            const data = JSON.parse(message.body);
            if (data.type === "START_VOTING") { window.categoriasParaVotar = data.categories; window.miVoto = null; window.mostrarPantallaVotacion(data.categories); } 
            else if (data.type === "VOTE_UPDATE") { window.actualizarContadorVotos(data.votes); } 
            else if (data.type === "VOTING_RESULT") { window.procesarResultadoVotacion(data.winner, data.isTie, data.tiedOptions); }
        });

        stompClient.subscribe(`/topic/game.start.${currentUser}`, function (message) {
            const gameData = JSON.parse(message.body);
            sessionStorage.removeItem('last_voluntary_game_id'); 
            
            // 🔥 LIMPIEZA: Una vez empieza la partida, borramos la marca de "Matchmaking" para que un F5 dentro de la partida no te vuelva a meter a la cola.
            sessionStorage.removeItem('is_public_room');
            sessionStorage.removeItem('public_room_mode');

            sessionStorage.setItem('current_game_mode', gameData.gameMode || "Quizziz"); sessionStorage.setItem('current_game_category', gameData.category || "Cultura General"); sessionStorage.setItem('current_game_players', JSON.stringify(gameData.players));
            
            document.getElementById('global-chat-btn').style.display = 'flex';
            irAPantallaDeJuego(gameData.players, gameData.gameMode); 
            if (typeof inicializarJuego === "function") inicializarJuego(gameData);
        });

        stompClient.subscribe(`/topic/game.updates.${currentUser}`, function (message) {
            const update = JSON.parse(message.body);
            if (update.type === "PLAYER_ANSWERED_LIVE") { if (typeof rivalHaRespondidoLive === "function") rivalHaRespondidoLive(update); } 
            else if (update.type === "RIVAL_ANSWERED") { if (typeof rivalHaRespondido === "function") rivalHaRespondido(); } 
            else if (update.type === "ROUND_RESULT") { if (typeof procesarResultadoRonda === "function") procesarResultadoRonda(update); } 
            else if (update.type === "GAME_OVER") { sessionStorage.removeItem('last_voluntary_game_id'); if (typeof finalizarJuego === "function") finalizarJuego(update); } 
            else if (update.type === "GAME_OVER_ABORTED") { sessionStorage.removeItem('last_voluntary_game_id'); if (typeof forzarFinalAbrupto === "function") forzarFinalAbrupto(update); } 
            else if (update.type === "PLAYER_LEFT") { window.mostrarToastInfo(`🚪 ${update.winnerUsername} ha abandonado la partida.`); }
        });

        setTimeout(() => {
            const hash = window.location.hash;
            stompClient.send("/app/lobby.sync", {}, JSON.stringify({}));
            if (hash === '#screen-lobby' || hash === '#screen-game' || hash === '#screen-voting') {
                const list = document.getElementById('lobby-players-list');
                if (list && list.children.length === 0) {
                    const myAvatar = sessionStorage.getItem('genius_avatar') || 'images/invitado.jpg';
                    list.innerHTML = `<li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; background: rgba(255,255,255,0.05); padding: 8px 15px; border-radius: 10px;"><div style="display:flex; align-items:center;"><img src="${myAvatar}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; margin-right:10px; border:2px solid #FFD700; vertical-align:middle;">👑 <strong style="color: #FFD700; margin-left:5px;">${currentUser} (Host)</strong></div></li>`;
                }
                if (typeof cargarListaAmigos === "function") cargarListaAmigos();
                if (typeof cargarCategorias === "function") cargarCategorias();
            }
        }, 1200); 

    }, function(error) { setTimeout(() => conectarWebSocket(token, username), 2000); });
}

window.expulsarJugador = function(usernameTarget) {
    window.mostrarToastConfirmacion(`¿Expulsar a <strong>${usernameTarget}</strong> de la sala?`, () => {
        const gameId = sessionStorage.getItem('current_game_id');
        if (stompClient && stompClient.connected && gameId) { stompClient.send("/app/lobby.kick", {}, JSON.stringify({ gameId: gameId, usernameToKick: usernameTarget })); }
    });
};

function irALobbyComoInvitado(hostName) {
    document.querySelectorAll('.screen').forEach(s => { s.style.display = 'none'; s.classList.add('hidden'); });
    const sLobby = document.getElementById('screen-lobby');
    if (sLobby) { sLobby.classList.remove('hidden'); sLobby.style.display = 'block'; window.location.hash = '#screen-lobby'; }
    if (typeof resetearVistasDeJuego === "function") resetearVistasDeJuego();
    const waitingMsg = document.getElementById('waiting-msg'); const hostControls = document.getElementById('host-controls');
    if (waitingMsg) { waitingMsg.innerText = "Conectando con la sala..."; waitingMsg.style.display = 'block'; }
    if (hostControls) hostControls.style.display = 'none';
    document.getElementById('global-chat-btn').style.display = 'flex';
}

function irAPantallaDeJuego(players, mode) {
    const sLobby = document.getElementById('screen-lobby'); const sGame = document.getElementById('screen-game'); const sVote = document.getElementById('screen-voting');
    if (sVote) { sVote.style.display = 'none'; sVote.classList.add('hidden'); }
    if (sGame) { sGame.style.display = 'block'; sGame.classList.remove('hidden'); }
    if (typeof cambiarPantalla === "function") cambiarPantalla(sLobby, sGame);
    document.getElementById('global-chat-btn').style.display = 'flex';
    const oppElement = document.getElementById('opponent-name');
    if (oppElement) { let num = Array.isArray(players) ? players.length : 2; let modeName = mode ? mode : "Quizziz"; oppElement.innerText = `🏆 MODO ${modeName.toUpperCase()}: ${num} Jugadores`; }
}

function enviarInvitacionJuego(amigoUsername, categoria) {
    if (!stompClient || !stompClient.connected) return;
    stompClient.send("/app/game.invite", {}, JSON.stringify({ receiverUsername: amigoUsername, categoryName: categoria || "Cultura General" }));
    window.mostrarToastExito("Has invitado a " + amigoUsername);
}

function enviarRespuesta(gameId, respuestaSeleccionada) {
    if (!stompClient || !stompClient.connected) return;
    stompClient.send("/app/game.answer", {}, JSON.stringify({ gameId: gameId, selectedAnswer: respuestaSeleccionada }));
}