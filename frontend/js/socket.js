// ==========================================
// js/socket.js - ARCHIVO COMPLETO
// ==========================================
let stompClient = null;
let currentUser = "";

function conectarWebSocket(token, username) {
    if (!token || !username) return;
    currentUser = username; 
    
    // Usamos la variable global de window
    const socket = new SockJS(`${window.API_BASE_URL}/ws`);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    stompClient.connect({'Authorization': 'Bearer ' + token}, function (frame) {
        console.log('✅ WebSocket Conectado para:', currentUser);

        // Suscripción a invitaciones
        stompClient.subscribe(`/topic/invites.${currentUser}`, function (message) {
            console.log("📩 ¡Invitación detectada en el canal!");
            const inv = JSON.parse(message.body);
            const aceptar = confirm(`¡${inv.senderUsername} te invita a jugar!\n¿Aceptas el reto?`);
            if (aceptar) {
                stompClient.send("/app/invite.accept", {}, JSON.stringify({ inviteId: inv.inviteId }));
            }
        });

        // Suscripción a inicio de partida
        stompClient.subscribe(`/topic/game.start.${currentUser}`, function (message) {
            const gameData = JSON.parse(message.body);
            console.log("🎮 PARTIDA RECIBIDA:", gameData);
            alert(`¡Partida confirmada contra ${gameData.opponentUsername}!`);
            iniciarPartidaAutomaticamente(gameData);
        });

    }, function(error) {
        console.error('❌ Error WebSocket:', error);
        setTimeout(() => conectarWebSocket(token, username), 3000);
    });
}

function iniciarPartidaAutomaticamente(gameData) {
    localStorage.setItem('current_game_id', gameData.gameId);
    const sMenu = document.getElementById('screen-menu');
    const sLobby = document.getElementById('screen-lobby');
    const sGame = document.getElementById('screen-game');
    
    if (sMenu) sMenu.style.display = 'none';
    if (sLobby) sLobby.style.display = 'none';
    if (sGame) {
        sGame.style.display = 'block';
        sGame.classList.remove('hidden');
        sGame.innerHTML = `<div class="game-container"><h1>Cargando partida contra ${gameData.opponentUsername}...</h1></div>`;
    }
}

function enviarInvitacionJuego(amigoUsername, categoria) {
    if (!stompClient || !stompClient.connected) {
        alert("⚠️ No estás conectado al servidor de juego.");
        return;
    }
    stompClient.send("/app/game.invite", {}, JSON.stringify({
        receiverUsername: amigoUsername,
        categoryName: categoria || "Cultura General"
    }));
    alert("🚀 Invitación enviada a " + amigoUsername);
}