// ==========================================
// js/app.js - ENRUTADOR MAESTRO Y SEGURIDAD
// ==========================================
window.API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8081' 
    : 'https://genius-royale-backend.onrender.com';

// 1. Guardamos la ruta exacta donde el usuario hizo F5
const rutaInicialF5 = window.location.hash;

// 2. CANDADO: Bloquea redirecciones automáticas de auth.js durante el arranque
let primeraCarga = true; 

function enrutarPantalla() {
    const token = sessionStorage.getItem('genius_token');
    const username = sessionStorage.getItem('genius_username');
    let hash = window.location.hash;

    // Si entra por primera vez sin ruta, asume Login
    if (!hash) hash = '#screen-login';

    // Inyectamos el nombre de usuario AL INSTANTE para que no parpadee
    if (username) {
        document.querySelectorAll('#display-username').forEach(el => el.innerText = username);
    }

    // Seguridad: Si el usuario le da "Atrás" en Chrome y llega al login, lo deslogueamos.
    if (hash === '#screen-login' && token) {
        sessionStorage.clear(); 
        if (typeof stompClient !== 'undefined' && stompClient !== null) {
            stompClient.disconnect();
        }
    }

    // Seguridad: Si le da "Adelante" sin sesión, patada de vuelta al Login.
    if (!sessionStorage.getItem('genius_token') && hash !== '#screen-login' && hash !== '#screen-register') {
        window.location.hash = '#screen-login';
        return; 
    }

    // 🔥 ESCUDO ANTI-SECUESTROS: 
    // Si es la primera carga y auth.js intenta forzarnos al Menú, pero nosotros queríamos el Lobby... ¡Lo bloqueamos!
    if (primeraCarga && token && hash === '#screen-menu' && (rutaInicialF5 === '#screen-lobby' || rutaInicialF5 === '#screen-game' || rutaInicialF5 === '#screen-lobby-code' || rutaInicialF5 === '#screen-public-modes')) {        window.location.hash = rutaInicialF5; // Devolvemos el golpe y mantenemos la ruta original
        return;
    }

    // 🛡️ LIMPIEZA DE BANDERA DE MODOS PÚBLICOS:
    // Si el usuario está en el menú o en cualquier pantalla que no sea #screen-public-modes,
    // limpiamos la bandera. Cubre tanto el F5 desde el menú como la navegación con botón.
    if (hash !== '#screen-public-modes') {
        sessionStorage.removeItem('in_public_mode_selection');
    }

    // Ocultar todas las pantallas completamente
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.add('hidden');
        s.style.display = 'none';
    });

    // Encender solo la pantalla de la URL actual
    const targetScreen = document.querySelector(hash);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        targetScreen.style.display = (hash === '#screen-game') ? 'block' : 'flex'; 
    }
    
}

// Escuchador que se dispara cuando se usan las flechas "Atrás/Adelante"
window.addEventListener("hashchange", enrutarPantalla);

// ==========================================
// 🔒 BLOQUEO DE FLECHA ⬅️ DURANTE PARTIDA ACTIVA
// Instala una entrada "ancla" en el historial del navegador sobre #screen-game.
// Cuando el usuario pulsa ⬅️, choca contra el ancla en vez de salir de la pantalla.
// El popstate la repone al instante, creando un muro infranqueable.
// Se reactiva automáticamente tras F5 si current_game_id sigue en sessionStorage.
// ==========================================
window.instalarBloqueoNavegacionJuego = function() {
    history.replaceState({ bloqueadoEnJuego: true }, '', '#screen-game');
    history.pushState({ bloqueadoEnJuego: true }, '', '#screen-game');
};

// ==========================================
// 🛡️ INTERCEPTOR DE FLECHA ATRÁS (LOBBY + PARTIDA)
// ==========================================
window.addEventListener("popstate", function() {
    const hash = window.location.hash;
    const isPinRoom = sessionStorage.getItem('is_pin_room') === 'true';
    const hayPartidaActiva = sessionStorage.getItem('current_game_id') !== null;

    // 🔒 BLOQUEO DURANTE PARTIDA: si hay partida activa y seguimos en #screen-game,
    // cualquier ⬅️ se neutraliza reponiendo el ancla. Cubre intro animada,
    // preguntas y podio final. Se desactiva solo cuando el botón de salir
    // del podio limpia current_game_id antes de cambiar de pantalla.
    if (!isPinRoom && hayPartidaActiva && hash === '#screen-game') {
        history.pushState({ bloqueadoEnJuego: true }, '', '#screen-game');
        return;
    }

    // 🛡️ FIX transición lobby→juego: ignorar el popstate del cambio de hash legítimo
    if (window._transicionAJuegoEnCurso) return;

    // ⬅️ DESDE LOBBY PÚBLICO → volver a selección de modos (no salir completamente)
    // Si venimos de un lobby público y el hash es #screen-public-modes,
    // hacemos lobby.leave silencioso y mostramos la pantalla de selección
    // sin limpiar la sesión ni redirigir al menú.
    const esLobbyPublico = sessionStorage.getItem('is_public_room') === 'true';
    if (!isPinRoom && hayPartidaActiva && hash === '#screen-public-modes' && esLobbyPublico) {
        // Salida limpia del lobby sin redirigir — el usuario sigue en la app
        if (typeof window.ejecutarSalidaLobbyPublicoSilencioso === 'function') {
            window.ejecutarSalidaLobbyPublicoSilencioso();
        }
        return;
    }

    // ⬅️ DESDE LOBBY NORMAL: ejecutar salida limpia completa
    // (no del modo Kahoot PIN, que tiene su propio sistema en kahoot.js)
    if (!isPinRoom && hayPartidaActiva && hash !== '#screen-lobby') {
        if (typeof window.ejecutarSalidaLobby === 'function') {
            window.ejecutarSalidaLobby();
        }
    }
});

// Ejecutamos el enrutador nada más cargar la página web
enrutarPantalla();

// Quitamos el candado de "primera carga" pasado 1 segundo, para que a partir de ahora 
// la navegación dentro de la app funcione con total normalidad.
setTimeout(() => { primeraCarga = false; }, 1000);

// Función para moverse entre pantallas
window.cambiarPantalla = function(pantallaOcultar, pantallaMostrar) {
    if (pantallaMostrar) {
        // Doble validación del escudo por si se llama directamente a esta función al arrancar
    if (primeraCarga && pantallaMostrar.id === 'screen-menu' && (rutaInicialF5 === '#screen-lobby' || rutaInicialF5 === '#screen-game' || rutaInicialF5 === '#screen-lobby-code' || rutaInicialF5 === '#screen-public-modes')) {            window.location.hash = rutaInicialF5;
        } else {
            window.location.hash = '#' + pantallaMostrar.id;
        }
    }
};

// 🔥 CONTROL DEL OVERLAY DE RECONEXIÓN 🔥
document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('genius_token');
    const savedRoomId = sessionStorage.getItem('current_game_id');
    const isPlaying = sessionStorage.getItem('is_pin_room') === 'true' || savedRoomId;

    // Si NO hay sesión (estás en login) o NO estás en partida, quitamos el cartel inmediatamente.
    if (!token || !isPlaying) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }
});