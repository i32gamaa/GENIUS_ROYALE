// ==========================================
// js/app.js - ARCHIVO COMPLETO
// ==========================================
window.API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8081' 
    : 'https://genius-royale-backend.onrender.com';

console.log("🚀 API conectada a:", window.API_BASE_URL);

// Función mejorada con control de Historial del Navegador (Botón Atrás)
function cambiarPantalla(pantallaOcultar, pantallaMostrar, guardarEnHistorial = true) {
    if (!pantallaMostrar) return;

    // Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.add('hidden');
        s.style.display = 'none';
    });

    // Mostrar la elegida
    pantallaMostrar.classList.remove('hidden');
    
    // EL TRUCO: Lo dejamos vacío en vez de 'block' para que el CSS (Flexbox) lo vuelva a centrar
    pantallaMostrar.style.display = ''; 

    // Guardar en el historial del navegador para la flecha de "Atrás"
    if (guardarEnHistorial) {
        history.pushState({ screenId: pantallaMostrar.id }, "", "#" + pantallaMostrar.id);
    }
}

// Escuchador del botón "Atrás" del navegador
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.screenId) {
        const targetScreen = document.getElementById(event.state.screenId);
        if (targetScreen) {
            // Cambiamos la pantalla sin guardar nuevo historial
            cambiarPantalla(null, targetScreen, false);
        }
    }
});

// Guardamos el estado inicial al cargar la web
document.addEventListener("DOMContentLoaded", () => {
    history.replaceState({ screenId: 'screen-login' }, "", "#screen-login");
});