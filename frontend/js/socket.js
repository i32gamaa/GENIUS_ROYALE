// ==========================================
// js/socket.js - ARCHIVO COMPLETO
// ==========================================
let stompClient = null;
let currentUser = "";

function conectarWebSocket(token, username) {
    if (!token || !username) return;
    currentUser = username; 
    
    const socket = new SockJS(`${window.API_BASE_URL}/ws`);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    stompClient.connect({'Authorization': 'Bearer ' + token}, function (frame) {
        console.log('✅ WebSocket Conectado para:', currentUser);

        // 1. ESCUCHAR INVITACIONES
        stompClient.subscribe(`/topic/invites.${currentUser}`, function (message) {
            const inv = JSON.parse(message.body);
            // Si el usuario acepta, enviamos la confirmación al servidor
            const aceptar = confirm(`¡${inv.senderUsername} te invita a jugar!\n¿Aceptas?`);
            if (aceptar) {
                stompClient.send("/app/invite.accept", {}, JSON.stringify({ inviteId: inv.inviteId }));
            }
        });

        // 2. ESCUCHAR INICIO DE PARTIDA (Esto le llega a AMBOS al mismo tiempo)
        stompClient.subscribe(`/topic/game.start.${currentUser}`, function (message) {
            const gameData = JSON.parse(message.body);
            console.log("🎮 ¡PARTIDA CREADA EN SERVIDOR!", gameData);
            
            // Forzamos el salto a la pantalla de juego
            iniciarPartidaAutomaticamente(gameData);
        });

    }, function(error) {
        console.error('❌ Error WebSocket:', error);
        setTimeout(() => conectarWebSocket(token, username), 3000);
    });
}

function iniciarPartidaAutomaticamente(gameData) {
    console.log("Cambiando a pantalla de juego...");
    localStorage.setItem('current_game_id', gameData.gameId);
    
    // Referencias a las pantallas
    const sMenu = document.getElementById('screen-menu');
    const sLobby = document.getElementById('screen-lobby');
    const sGame = document.getElementById('screen-game');
    const requestsModal = document.getElementById('requests-modal');

    // 1. Cerramos cualquier modal que estorbe
    if (requestsModal) requestsModal.classList.add('hidden');

    // 2. Ocultamos Menú y Lobby
    if (sMenu) { sMenu.classList.add('hidden'); sMenu.style.display = 'none'; }
    if (sLobby) { sLobby.classList.add('hidden'); sLobby.style.display = 'none'; }

    // 3. Mostramos la pantalla de Juego
    if (sGame) {
        sGame.classList.remove('hidden');
        sGame.style.display = 'block';
        sGame.innerHTML = `
            <div class="game-container">
                <h1 style="color: #FFD700;">¡PARTIDA INICIADA!</h1>
                <p>Rival: <span style="color: white; font-weight: bold;">${gameData.opponentUsername}</span></p>
                <div class="loading-spinner"></div>
                <p>Cargando preguntas de la base de datos...</p>
            </div>
        `;
    }

    // 4. Lanzamos el motor de la Fase 3
    if (typeof inicializarJuego === "function") {
        inicializarJuego(gameData);
    }
}

function enviarInvitacionJuego(amigoUsername, categoria) {
    if (!stompClient || !stompClient.connected) {
        alert("⚠️ Conexión de red inestable. Espera un segundo.");
        return;
    }
    stompClient.send("/app/game.invite", {}, JSON.stringify({
        receiverUsername: amigoUsername,
        categoryName: categoria || "Cultura General"
    }));
    alert("🚀 Invitación enviada. Esperando respuesta...");
}