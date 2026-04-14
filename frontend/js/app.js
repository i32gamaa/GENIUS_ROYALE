//const API_BASE_URL = 'https://genius-royale-backend.onrender.com'; 
const API_BASE_URL = 'http://localhost:8081';
// Referencias globales de las pantallas
const screenLogin = document.getElementById('screen-login');
const screenRegister = document.getElementById('screen-register');
const screenMenu = document.getElementById('screen-menu');
const displayUsername = document.getElementById('display-username');

// Función global para cambiar pantallas
function cambiarPantalla(pantallaOcultar, pantallaMostrar) {
    pantallaOcultar.classList.add('hidden');
    pantallaMostrar.classList.remove('hidden');
}