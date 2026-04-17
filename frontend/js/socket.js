// ==========================================
// js/socket.js - VERSIÓN ROYALE ADMINISTRADOR
// ==========================================
let stompClient = null;
let currentUser = "";

function conectarWebSocket(token, username) {
    if (!token) return;
    currentUser = username;
    
    const socket = new SockJS(`${window.API_BASE_URL}/ws`);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    stompClient.connect({'Authorization': 'Bearer ' + token}, function (frame) {
        console.log('✅ Conectado como: ' + currentUser);

        stompClient.subscribe(`/topic/invites.${currentUser}`, function (message) {
            const inv = JSON.parse(message.body);
            const idInv = inv.inviteId || inv.id;
            const senderName = inv.senderUsername || inv.sender || "Un amigo";

            if (confirm(`¡${senderName} te invita a un Royale!\n¿Aceptar e ir a la sala?`)) {
                irALobbyComoInvitado(senderName);
                stompClient.send("/app/invite.accept", {}, JSON.stringify({ inviteId: idInv }));
            }
        });

        stompClient.subscribe(`/topic/lobby.guest.joined.${currentUser}`, function (message) {
            const data = JSON.parse(message.body);
            
            if (data.type === "KICKED") {
                alert("❌ Has sido expulsado de la sala por el anfitrión.");
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
                alert(`❌ ${nombreDelHost} ha cerrado la sala.`); 
                
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
            if (window.location.hash === '#screen-lobby') {
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
    if (confirm(`¿Seguro que quieres expulsar a ${usernameTarget} de la sala?`)) {
        const gameId = sessionStorage.getItem('current_game_id');
        if (stompClient && stompClient.connected && gameId) {
            stompClient.send("/app/lobby.kick", {}, JSON.stringify({
                gameId: gameId,
                usernameToKick: usernameTarget
            }));
        }
    }
};

function irALobbyComoInvitado(hostName) {
    const sMenu = document.getElementById('screen-menu');
    const sLobby = document.getElementById('screen-lobby');
    const waitingMsg = document.getElementById('waiting-msg');
    const hostControls = document.getElementById('host-controls');

    if (typeof cambiarPantalla === "function") cambiarPantalla(sMenu, sLobby);
    
    if (waitingMsg) {
        waitingMsg.innerText = "Conectando con la sala...";
        waitingMsg.style.display = 'block';
    }
    if (hostControls) hostControls.style.display = 'none';
}

function irAPantallaDeJuego(players) {
    // 🔥 EL ARREGLO: Forzamos al Enrutador a cambiar la URL a #screen-game
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
    alert("🚀 Invitación enviada a " + amigoUsername + "!");
}

function enviarRespuesta(gameId, respuestaSeleccionada) {
    if (!stompClient || !stompClient.connected) return;
    stompClient.send("/app/game.answer", {}, JSON.stringify({
        gameId: gameId,
        selectedAnswer: respuestaSeleccionada 
    }));
}