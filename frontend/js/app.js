// ==========================================
// js/app.js - ARCHIVO COMPLETO
// ==========================================
// Definimos la URL de forma global en el objeto window
window.API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8081' 
    : 'https://genius-royale-backend.onrender.com';

console.log("🚀 Sistema inicializado. API en:", window.API_BASE_URL);

function cambiarPantalla(pantallaOcultar, pantallaMostrar) {
    if (!pantallaOcultar || !pantallaMostrar) return;
    pantallaOcultar.classList.add('hidden');
    pantallaOcultar.style.display = 'none';
    pantallaMostrar.classList.remove('hidden');
    pantallaMostrar.style.display = 'block';
}