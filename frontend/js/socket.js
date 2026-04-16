// ==========================================
// js/socket.js - ARCHIVO COMPLETO Y ACTUALIZADO
// ==========================================
let stompClient = null;
let currentUser = "";
let currentHost = ""; // Guardamos quién es el host de la sala actual

function conectarWebSocket(token, username) {
    if (!token) return;
    currentUser = username;
    
    const socket = new SockJS(`${window.API_BASE_URL}/ws`);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    stompClient.connect({'Authorization': 'Bearer ' + token}, function (frame) {
        console.log('✅ Conectado como: ' + currentUser);

        // 1. ESCUCHAR INVITACIONES
        stompClient.subscribe(`/topic/invites.${currentUser}`, function (message) {
            const inv = JSON.parse(message.body);
            if (confirm(`¡${inv.senderUsername} te invita!\n¿Aceptar e ir a la sala?`)) {
                // El invitado acepta y se mueve al lobby para esperar el inicio del Host
                irALobbyComoInvitado(inv.senderUsername);
                stompClient.send("/app/invite.accept", {}, JSON.stringify({ inviteId: inv.inviteId }));
            }
        });

        // 2. ESCUCHAR CUANDO EL INVITADO ENTRA A LA SALA (Solo lo recibe el Host)
        stompClient.subscribe(`/topic/lobby.guest.joined.${currentUser}`, function (message) {
            const data = JSON.parse(message.body);
            console.log("¡Tu amigo ha entrado a la sala!", data);
            
            // Actualizamos la lista visual del Host
            const list = document.getElementById('lobby-players-list');
            if (list) list.innerHTML = `<li>👤 ${currentUser} (Host)</li><li>⚔️ ${data.guestUsername} (Listo)</li>`;
            
            // Quitamos el mensaje de "Esperando..." y mostramos el botón de INICIAR
            const waitingMsg = document.getElementById('waiting-msg');
            const hostControls = document.getElementById('host-controls');
            if (waitingMsg) waitingMsg.style.display = 'none';
            if (hostControls) hostControls.style.display = 'block';

            // Guardamos el inviteId para dárselo al botón
            localStorage.setItem('current_invite_id', data.inviteId);
        });

        // 3. ESCUCHAR INICIO DE PARTIDA (Cuando el sistema confirma que el host le dio a Iniciar)
        stompClient.subscribe(`/topic/game.start.${currentUser}`, function (message) {
            const gameData = JSON.parse(message.body);
            console.log("🎮 ¡Partida confirmada!", gameData);
            
            // Ambos saltan a la pantalla de juego real
            irAPantallaDeJuego(gameData.opponentUsername);
            localStorage.setItem('current_game_id', gameData.gameId);
            
            if (typeof inicializarJuego === "function") {
                inicializarJuego(gameData);
            }
        });

        // 4. ESCUCHAR ACTUALIZACIONES DE LA PARTIDA (Respuestas rápidas, Resultados)
        stompClient.subscribe(`/topic/game.updates.${currentUser}`, function (message) {
            const update = JSON.parse(message.body);
            
            if (update.type === "RIVAL_ANSWERED") {
                if (typeof rivalHaRespondido === "function") {
                    rivalHaRespondido();
                }
            } 
            else if (update.type === "ROUND_RESULT") {
                console.log("Resultado de la ronda:", update);
                if (typeof procesarResultadoRonda === "function") {
                    procesarResultadoRonda(update);
                }
            }
            else if (update.type === "GAME_OVER") {
                console.log("La partida ha terminado:", update);
                if (typeof finalizarJuego === "function") {
                    finalizarJuego(update);
                }
            }
        });

    }, function(error) {
        setTimeout(() => conectarWebSocket(token, username), 2000);
    });
}

function irALobbyComoInvitado(hostName) {
    const sMenu = document.getElementById('screen-menu');
    const sLobby = document.getElementById('screen-lobby');
    const list = document.getElementById('lobby-players-list');
    const waitingMsg = document.getElementById('waiting-msg');
    const hostControls = document.getElementById('host-controls');

    cambiarPantalla(sMenu, sLobby);
    
    if (list) {
        list.innerHTML = `<li>👤 ${hostName} (Host)</li><li>⚔️ ${currentUser} (Tú)</li>`;
    }
    if (waitingMsg) waitingMsg.innerText = "Esperando a que el Host inicie la partida...";
    if (waitingMsg) waitingMsg.style.display = 'block';
    if (hostControls) hostControls.style.display = 'none'; // El invitado no ve el botón de inicio
}

function irAPantallaDeJuego(oponente) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    const sGame = document.getElementById('screen-game');
    const oppElement = document.getElementById('opponent-name');
    if (sGame) {
        sGame.style.display = 'block'; 
        sGame.classList.remove('hidden');
        if (oppElement) oppElement.innerText = "Contra: " + oponente;
    }
}

function enviarInvitacionJuego(amigoUsername, categoria) {
    if (!stompClient || !stompClient.connected) return;
    
    stompClient.send("/app/game.invite", {}, JSON.stringify({
        receiverUsername: amigoUsername,
        categoryName: categoria || "Cultura General"
    }));
    
    const list = document.getElementById('lobby-players-list');
    if (list) list.innerHTML = `<li>👤 ${currentUser} (Host)</li><li>⏳ Invitando a ${amigoUsername}...</li>`;
    
    alert("🚀 Invitación enviada!");
}

function enviarRespuesta(gameId, respuestaSeleccionada) {
    if (!stompClient || !stompClient.connected) return;

    stompClient.send("/app/game.answer", {}, JSON.stringify({
        gameId: gameId,
        selectedAnswer: respuestaSeleccionada 
    }));
    console.log("Respuesta enviada al servidor:", respuestaSeleccionada);
}