// ==========================================
// js/socket.js - VERSIÓN ANTI-IMÁN 🛡️
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
    if (window.toastCallbacks[idToast]) {
        window.toastCallbacks[idToast](); 
        delete window.toastCallbacks[idToast];
    }
    window.cerrarToast(idToast);
};

window.cerrarToast = function(idToast) {
    const toast = document.getElementById(idToast);
    if (toast) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }
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
            toastElement.classList.add('fade-out');
            setTimeout(() => toastElement.remove(), 400);
            window.invitacionesPendientes.push(inv);
            if (typeof actualizarBandejaMensajes === "function") actualizarBandejaMensajes();
            if (typeof actualizarNotificacionMensajes === "function") actualizarNotificacionMensajes();
        }
    }, 7000);
};

window.responderInvitacion = function(inviteId, aceptar, senderName, btnElement) {
    if (btnElement) {
        const toast = btnElement.closest('.toast');
        if (toast) {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }
    }

    window.invitacionesPendientes = window.invitacionesPendientes.filter(i => (i.inviteId || i.id) !== inviteId);
    if (typeof actualizarBandejaMensajes === "function") actualizarBandejaMensajes();
    if (typeof actualizarNotificacionMensajes === "function") actualizarNotificacionMensajes();

    if (aceptar) {
        sessionStorage.removeItem('current_game_id');
        sessionStorage.removeItem('current_host_name');
        sessionStorage.removeItem('last_voluntary_game_id'); 
        if (typeof verificarBotonReconexion === "function") verificarBotonReconexion();

        irALobbyComoInvitado(senderName);
        stompClient.send("/app/invite.accept", {}, JSON.stringify({ inviteId: inviteId }));
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

        stompClient.subscribe(`/topic/friends.${currentUser}`, function (message) {
            const data = JSON.parse(message.body);
            if (data.type === "FRIEND_REQUEST") {
                window.mostrarToastInfo(`🤝 ${data.sender} te ha enviado una solicitud de amistad.`);
                if (typeof actualizarBandeja === "function") {
                    actualizarBandeja(); 
                }
            }
        });

        stompClient.subscribe(`/topic/invites.${currentUser}`, function (message) {
            const inv = JSON.parse(message.body);
            window.mostrarToastInvitacion(inv);
        });

        stompClient.subscribe(`/topic/lobby.guest.joined.${currentUser}`, function (message) {
            const data = JSON.parse(message.body);
            
            if (data.type === "KICKED") {
                window.mostrarToastError("❌ Has sido expulsado de la sala.");
                sessionStorage.removeItem('current_game_id');
                sessionStorage.removeItem('current_host_name');
                sessionStorage.removeItem('last_voluntary_game_id'); 
                const sMenu = document.getElementById('screen-menu');
                const sLobby = document.getElementById('screen-lobby');
                if (typeof cambiarPantalla === "function") cambiarPantalla(sLobby, sMenu);
                if (typeof verificarBotonReconexion === "function") verificarBotonReconexion();
                return; 
            }

            if (data.type === "ROOM_CLOSED") {
                const nombreDelHost = data.hostName ? data.hostName : "El anfitrión";
                window.mostrarToastError(`❌ ${nombreDelHost} ha cerrado la sala.`); 
                
                sessionStorage.removeItem('current_game_id');
                sessionStorage.removeItem('current_host_name');
                sessionStorage.removeItem('last_voluntary_game_id'); 
                const sMenu = document.getElementById('screen-menu');
                const sLobby = document.getElementById('screen-lobby');
                
                if (typeof cambiarPantalla === "function") cambiarPantalla(sLobby, sMenu);
                if (typeof verificarBotonReconexion === "function") verificarBotonReconexion();
                return; 
            }

            if (data.type === "LOBBY_UPDATE") {
                
                const lastLeftId = sessionStorage.getItem('last_voluntary_game_id');
                if (lastLeftId === data.gameId) {
                    if (window.location.hash !== '#screen-lobby') {
                        return; 
                    } else {
                        sessionStorage.removeItem('last_voluntary_game_id');
                        if (typeof verificarBotonReconexion === "function") verificarBotonReconexion();
                    }
                }

                const isViewingResults = document.getElementById('game-results') && document.getElementById('game-results').style.display === 'block';
                const currentHash = window.location.hash;
                
                if (!isViewingResults && (currentHash === '#screen-game' || (data.gameId !== "" && currentHash !== '#screen-lobby'))) {
                    document.querySelectorAll('.screen').forEach(s => {
                        s.style.display = 'none';
                        s.classList.add('hidden');
                    });
                    const sLobby = document.getElementById('screen-lobby');
                    if (sLobby) {
                        sLobby.classList.remove('hidden');
                        sLobby.style.display = 'block'; 
                        window.location.hash = '#screen-lobby';
                    }
                    if (typeof resetearVistasDeJuego === "function") resetearVistasDeJuego();
                }

                const list = document.getElementById('lobby-players-list');
                if (list && data.playersInfo) {
                    list.innerHTML = ""; 
                    
                    data.playersInfo.forEach((p) => {
                        const li = document.createElement('li');
                        li.style.display = "flex";
                        li.style.justifyContent = "space-between";
                        li.style.alignItems = "center";
                        li.style.marginBottom = "10px";
                        
                        let statusHtml = p.status === "Ausente" 
                            ? `<span style="color: #F44336; font-size: 0.8em; margin-left: 5px;">(Ausente)</span>` 
                            : `<span style="color: #4CAF50; font-size: 0.8em; margin-left: 5px;">(Listo)</span>`;

                        let nameHtml = p.isHost 
                            ? `<div>👑 <strong style="color: #FFD700">${p.username} (Host)</strong></div>` 
                            : `<div>👤 <span style="color: ${p.username === currentUser ? '#03DAC6' : 'white'}">${p.username}</span> ${statusHtml}</div>`;
                        
                        let kickBtnHtml = "";
                        if (data.hostName === currentUser && !p.isHost) {
                            kickBtnHtml = `<button onclick="window.expulsarJugador('${p.username}')" style="background:none; border:none; cursor:pointer; font-size:1.2rem; transition: transform 0.2s;" title="Expulsar jugador">❌</button>`;
                        }

                        li.innerHTML = `${nameHtml} ${kickBtnHtml}`;
                        
                        if (p.isHost) list.prepend(li); 
                        else list.appendChild(li); 
                    });
                }

                const waitingMsg = document.getElementById('waiting-msg');
                const hostControls = document.getElementById('host-controls');

                if (data.hostName === currentUser) {
                    if (data.players.length >= 2) {
                        if (hostControls) hostControls.style.display = 'block';
                        if (waitingMsg) waitingMsg.style.display = 'none';
                    } else {
                        if (hostControls) hostControls.style.display = 'none';
                        if (waitingMsg) {
                            waitingMsg.innerText = `Esperando a que se unan los jugadores (Máx 10)...`;
                            waitingMsg.style.display = 'block';
                        }
                    }
                } else {
                    if (waitingMsg) {
                        waitingMsg.innerText = `Esperando al Host (${data.players.length}/10)...`;
                        waitingMsg.style.display = 'block';
                    }
                    if (hostControls) hostControls.style.display = 'none';
                }
                sessionStorage.setItem('current_game_id', data.gameId);
                sessionStorage.setItem('current_host_name', data.hostName);
            }
        });

        stompClient.subscribe(`/topic/game.start.${currentUser}`, function (message) {
            const gameData = JSON.parse(message.body);
            sessionStorage.removeItem('last_voluntary_game_id'); 
            irAPantallaDeJuego(gameData.players); 
            sessionStorage.setItem('current_game_id', gameData.gameId);
            if (typeof inicializarJuego === "function") inicializarJuego(gameData);
        });

        stompClient.subscribe(`/topic/game.updates.${currentUser}`, function (message) {
            const update = JSON.parse(message.body);
            if (update.type === "RIVAL_ANSWERED") {
                if (typeof rivalHaRespondido === "function") rivalHaRespondido();
            } else if (update.type === "ROUND_RESULT") {
                if (typeof procesarResultadoRonda === "function") procesarResultadoRonda(update);
            } else if (update.type === "GAME_OVER") {
                sessionStorage.removeItem('last_voluntary_game_id');
                if (typeof finalizarJuego === "function") finalizarJuego(update);
            }
        });

        setTimeout(() => {
            const hash = window.location.hash;
            if (hash === '#screen-lobby' || hash === '#screen-game') {
                const list = document.getElementById('lobby-players-list');
                if (list && list.children.length === 0) {
                    list.innerHTML = `<li style="margin-bottom:10px;">👑 <strong style="color: #FFD700">${currentUser} (Host)</strong></li>`;
                }
                stompClient.send("/app/lobby.sync", {}, JSON.stringify({}));
                if (typeof cargarListaAmigos === "function") cargarListaAmigos();
                if (typeof cargarCategorias === "function") cargarCategorias();
            }
        }, 1200); 

    }, function(error) {
        setTimeout(() => conectarWebSocket(token, username), 2000);
    });
}

window.expulsarJugador = function(usernameTarget) {
    window.mostrarToastConfirmacion(`¿Expulsar a <strong>${usernameTarget}</strong> de la sala?`, () => {
        const gameId = sessionStorage.getItem('current_game_id');
        if (stompClient && stompClient.connected && gameId) {
            stompClient.send("/app/lobby.kick", {}, JSON.stringify({
                gameId: gameId,
                usernameToKick: usernameTarget
            }));
        }
    });
};

function irALobbyComoInvitado(hostName) {
    document.querySelectorAll('.screen').forEach(s => {
        s.style.display = 'none';
        s.classList.add('hidden');
    });
    
    const sLobby = document.getElementById('screen-lobby');
    if (sLobby) {
        sLobby.classList.remove('hidden');
        sLobby.style.display = 'block'; 
        window.location.hash = '#screen-lobby';
    }

    if (typeof resetearVistasDeJuego === "function") {
        resetearVistasDeJuego();
    }
    
    const waitingMsg = document.getElementById('waiting-msg');
    const hostControls = document.getElementById('host-controls');

    if (waitingMsg) {
        waitingMsg.innerText = "Conectando con la sala...";
        waitingMsg.style.display = 'block';
    }
    if (hostControls) hostControls.style.display = 'none';
}

function irAPantallaDeJuego(players) {
    const sLobby = document.getElementById('screen-lobby');
    const sGame = document.getElementById('screen-game');
    
    if (typeof cambiarPantalla === "function") {
        cambiarPantalla(sLobby, sGame);
    }
    
    const oppElement = document.getElementById('opponent-name');
    if (oppElement) {
        let num = Array.isArray(players) ? players.length : 2;
        oppElement.innerText = `🏆 MODO ROYALE: ${num} Jugadores`;
    }
}

function enviarInvitacionJuego(amigoUsername, categoria) {
    if (!stompClient || !stompClient.connected) return;
    stompClient.send("/app/game.invite", {}, JSON.stringify({
        receiverUsername: amigoUsername,
        categoryName: categoria || "Cultura General"
    }));
    
    window.mostrarToastExito("Has invitado a " + amigoUsername);
}

function enviarRespuesta(gameId, respuestaSeleccionada) {
    if (!stompClient || !stompClient.connected) return;
    stompClient.send("/app/game.answer", {}, JSON.stringify({
        gameId: gameId,
        selectedAnswer: respuestaSeleccionada 
    }));
}