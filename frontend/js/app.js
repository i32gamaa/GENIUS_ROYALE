// ==========================================
// js/app.js - CONFIGURACIÓN GLOBAL
// ==========================================
window.API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8081' 
    : 'https://genius-royale-backend.onrender.com';

console.log("🚀 API conectada a:", window.API_BASE_URL);

function cambiarPantalla(pantallaOcultar, pantallaMostrar) {
    if (!pantallaOcultar || !pantallaMostrar) return;
    
    // Ocultar todas por seguridad primero
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.add('hidden');
        s.style.display = 'none';
    });

    // Mostrar la elegida
    pantallaMostrar.classList.remove('hidden');
    pantallaMostrar.style.display = 'block';
}