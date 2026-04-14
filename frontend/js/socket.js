let stompClient = null;

function conectarWebSocket(token) {
    console.log("Intentando conectar al WebSocket del servidor...");
    const socket = new SockJS(`${API_BASE_URL}/ws`);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    stompClient.connect({'Authorization': 'Bearer ' + token}, function (frame) {
        console.log('✅ ¡Conectado al servidor de Genius Royale! ' + frame);
    }, function(error) {
        console.error('❌ Error de conexión WebSockets:', error);
    });
}