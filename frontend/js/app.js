// ==========================================
// DETECCIÓN AUTOMÁTICA DE SERVIDOR
// ==========================================
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Si estás en tu PC, usa localhost. Si estás en Vercel, usa Render.
const API_BASE_URL = isLocal 
    ? 'http://localhost:8081' 
    : 'https://genius-royale-backend.onrender.com';

console.log("🚀 Conectado a la API en:", API_BASE_URL);

// Referencias globales de las pantallas
const screenLogin = document.getElementById('screen-login');
const screenRegister = document.getElementById('screen-register');
const screenMenu = document.getElementById('screen-menu');
const displayUsername = document.getElementById('display-username');

// Función global para cambiar pantallas
function cambiarPantalla(pantallaOcultar, pantallaMostrar) {
    if (!pantallaOcultar || !pantallaMostrar) return;
    
    pantallaOcultar.classList.add('hidden');
    pantallaOcultar.style.display = 'none'; // Refuerzo para asegurar que se oculta
    
    pantallaMostrar.classList.remove('hidden');
    pantallaMostrar.style.display = 'block'; // Refuerzo para asegurar que se ve
}