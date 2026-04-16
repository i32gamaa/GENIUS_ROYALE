// ==========================================
// js/socket.js - VERSIÓN ROYALE DEFINITIVA
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
            if (confirm(`¡${inv.senderUsername} te invita a un Royale!\n¿Aceptar e ir a la sala?`)) {
                irALobbyComoInvitado(inv.senderUsername);
                stompClient.send("/app/invite.accept", {}, JSON.stringify({ inviteId: inv.inviteId }));
            }
        });

        // ESCUCHAR CUANDO ALGUIEN ENTRA (MAGIA MULTIJUGADOR)
        stompClient.subscribe(`/topic/lobby.guest.joined.${currentUser}`, function (message) {
            const data = JSON.parse(message.body);
            
            if (data.type === "LOBBY_UPDATE") {
                const list = document.getElementById('lobby-players-list');
                
                if (list && data.players) {
                    list.innerHTML = ""; // Limpiamos la lista vieja
                    
                    // Dibujamos a TODOS los jugadores que nos manda el servidor
                    data.players.forEach((name) => {
                        const isHost = (name === data.hostName); 
                        const li = document.createElement('li');
                        
                        li.innerHTML = isHost ? `👑 <strong>${name} (Host)</strong>` : `👤 ${name} (Listo)`;
                        if (name === currentUser && !isHost) li.style.color = "#03DAC6"; 
                        
                        if (isHost) list.prepend(li); // Host siempre arriba
                        else list.appendChild(li); // Invitados debajo
                    });
                }

                const waitingMsg = document.getElementById('waiting-msg');
                const hostControls = document.getElementById('host-controls');

                // Si soy el Host real, muestro el botón de iniciar
                if (data.hostName === currentUser) {
                    if (data.players.length >= 2) {
                        if (hostControls) hostControls.style.display = 'block';
                        if (waitingMsg) waitingMsg.style.display = 'none';
                    }
                } else {
                    if (waitingMsg) {
                        waitingMsg.innerText = `Esperando al Host (${data.players.length}/10)...`;
                        waitingMsg.style.display = 'block';
                    }
                    if (hostControls) hostControls.style.display = 'none';
                }
                sessionStorage.setItem('current_game_id', data.gameId);
            }
        });

        stompClient.subscribe(`/topic/game.start.${currentUser}`, function (message) {
            const gameData = JSON.parse(message.body);
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
                if (typeof finalizarJuego === "function") finalizarJuego(update);
            }
        });

    }, function(error) {
        setTimeout(() => conectarWebSocket(token, username), 2000);
    });
}

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
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    const sGame = document.getElementById('screen-game');
    const oppElement = document.getElementById('opponent-name');
    if (sGame) {
        sGame.style.display = 'block'; 
        sGame.classList.remove('hidden');
        if (oppElement) {
            let num = Array.isArray(players) ? players.length : 2;
            oppElement.innerText = `🏆 MODO ROYALE: ${num} Jugadores`;
        }
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