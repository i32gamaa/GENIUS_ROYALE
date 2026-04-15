// ==========================================
// js/socket.js - ARCHIVO COMPLETO
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

        // 2. ESCUCHAR INICIO DE PARTIDA (Cuando el Host da al botón o el sistema confirma)
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

    }, function(error) {
        setTimeout(() => conectarWebSocket(token, username), 2000);
    });
}

function irALobbyComoInvitado(hostName) {
    // Cambiamos visualmente al lobby para que el invitado no se quede en el menú
    const sMenu = document.getElementById('screen-menu');
    const sLobby = document.getElementById('screen-lobby');
    const list = document.getElementById('lobby-players-list');
    const waitingMsg = document.getElementById('waiting-msg');
    const hostControls = document.getElementById('host-controls');

    cambiarPantalla(sMenu, sLobby);
    
    if (list) {
        list.innerHTML = `<li>👤 ${hostName} (Host)</li><li>⚔️ ${currentUser}</li>`;
    }
    if (waitingMsg) waitingMsg.innerText = "Esperando a que el Host inicie la partida...";
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
    
    // El host ya está en el lobby, actualizamos su lista
    const list = document.getElementById('lobby-players-list');
    if (list) list.innerHTML = `<li>👤 ${currentUser} (Host)</li><li>⏳ Invitando a ${amigoUsername}...</li>`;
    
    alert("🚀 Invitación enviada!");
}