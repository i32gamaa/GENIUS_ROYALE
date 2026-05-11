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
    if (primeraCarga && token && hash === '#screen-menu' && (rutaInicialF5 === '#screen-lobby' || rutaInicialF5 === '#screen-game' || rutaInicialF5 === '#screen-lobby-code')) {        window.location.hash = rutaInicialF5; // Devolvemos el golpe y mantenemos la ruta original
        return;
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

// Ejecutamos el enrutador nada más cargar la página web
enrutarPantalla();

// Quitamos el candado de "primera carga" pasado 1 segundo, para que a partir de ahora 
// la navegación dentro de la app funcione con total normalidad.
setTimeout(() => { primeraCarga = false; }, 1000);

// Función para moverse entre pantallas
window.cambiarPantalla = function(pantallaOcultar, pantallaMostrar) {
    if (pantallaMostrar) {
        // Doble validación del escudo por si se llama directamente a esta función al arrancar
    if (primeraCarga && pantallaMostrar.id === 'screen-menu' && (rutaInicialF5 === '#screen-lobby' || rutaInicialF5 === '#screen-game' || rutaInicialF5 === '#screen-lobby-code')) {            window.location.hash = rutaInicialF5;
        } else {
            window.location.hash = '#' + pantallaMostrar.id;
        }
    }
};