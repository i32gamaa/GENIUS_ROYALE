// --- app.js ---

// 1. VARIABLES GLOBALES Y REFERENCIAS AL HTML
const API_BASE_URL = 'https://genius-royale-backend.onrender.com'; 
let stompClient = null; // Guardará nuestra conexión en tiempo real

const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const btnLogin = document.querySelector('.btn-login');

// Pantallas
const screenLogin = document.getElementById('screen-login');
const screenMenu = document.getElementById('screen-menu');
const displayUsername = document.getElementById('display-username');

// 2. FUNCIÓN DE NAVEGACIÓN (Cambiar entre pantallas)
function cambiarPantalla(pantallaOcultar, pantallaMostrar) {
    pantallaOcultar.classList.add('hidden');
    pantallaMostrar.classList.remove('hidden');
}

// 3. LÓGICA DE WEBSOCKETS (El Tiempo Real)
function conectarWebSocket(token) {
    console.log("Intentando conectar al WebSocket del servidor...");
    
    // Asumimos que vuestro backend abrirá el socket en la ruta /ws o /game-websocket
    // Dile a tu colega de Java que configure el endpoint WebSocket con este nombre
    const socket = new SockJS(`${API_BASE_URL}/ws`);
    stompClient = Stomp.over(socket);

    // Ocultar mensajes de debug en consola para que quede más limpio
    stompClient.debug = null; 

    // Conectamos pasándole el token por si Spring Security lo pide
    stompClient.connect({'Authorization': 'Bearer ' + token}, function (frame) {
        console.log('✅ ¡Conectado al servidor de Genius Royale! ' + frame);
        
        // Aquí luego nos suscribiremos para recibir invitaciones o entrar a partida
        
    }, function(error) {
        console.error('❌ Error de conexión WebSockets:', error);
    });
}

// 4. EVENTO DE LOGIN
loginForm.addEventListener('submit', function(event) {
    event.preventDefault();

    btnLogin.innerText = "Cargando...";
    btnLogin.disabled = true;

    const username = usernameInput.value;
    const password = passwordInput.value;

    const datosLogin = { username: username, password: password };

    fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosLogin)
    })
    .then(response => {
        if (!response.ok) throw new Error('Credenciales incorrectas');
        return response.json(); 
    })
    .then(data => {
        btnLogin.innerText = "Entrar";
        btnLogin.disabled = false;

        if (data.token) {
            // Guardamos datos
            localStorage.setItem('genius_token', data.token);
            localStorage.setItem('genius_username', username);

            // ¡MAGIA SPA! Cambiamos el nombre en el menú y pasamos de pantalla
            displayUsername.innerText = username;
            cambiarPantalla(screenLogin, screenMenu);

            // Iniciamos la conexión en tiempo real
            conectarWebSocket(data.token);

        } else {
            alert("Error en login: " + (data.message || "Token no recibido"));
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Problema con el servidor: ¿Seguro que las credenciales son correctas y el CORS está bien?");
        btnLogin.innerText = "Entrar";
        btnLogin.disabled = false;
    });
});