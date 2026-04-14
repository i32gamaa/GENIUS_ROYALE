// ==========================================
// js/auth.js - ARCHIVO COMPLETO
// ==========================================

function inicializarAuth() {
    // 1. REFERENCIAS DE PANTALLAS (Vienen de app.js)
    const sLogin = document.getElementById('screen-login');
    const sRegister = document.getElementById('screen-register');
    const sMenu = document.getElementById('screen-menu');

    // 2. REFERENCIAS PARA NAVEGAR ENTRE PANTALLAS
    const linkToRegister = document.getElementById('link-to-register');
    const linkToLogin = document.getElementById('link-to-login');

    if (linkToRegister && sLogin && sRegister) {
        linkToRegister.onclick = function(e) {
            e.preventDefault();
            console.log("Cambiando a Registro...");
            cambiarPantalla(sLogin, sRegister);
        };
    }

    if (linkToLogin && sLogin && sRegister) {
        linkToLogin.onclick = function(e) {
            e.preventDefault();
            console.log("Cambiando a Login...");
            cambiarPantalla(sRegister, sLogin);
        };
    }

    // 3. LÓGICA DE REGISTRO
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.onsubmit = function(event) {
            event.preventDefault();
            const btnRegister = registerForm.querySelector('.btn-login');
            btnRegister.innerText = "Registrando...";
            btnRegister.disabled = true;

            const datosRegistro = {
                username: document.getElementById('reg-username').value,
                email: document.getElementById('reg-email').value,
                password: document.getElementById('reg-password').value
            };

            fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosRegistro)
            })
            .then(response => response.json())
            .then(data => {
                btnRegister.innerText = "Registrarse";
                btnRegister.disabled = false;
                if (data.success) {
                    alert("¡Usuario guardado en la tabla Usuario!");
                    cambiarPantalla(sRegister, sLogin);
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("Error de conexión con el backend local.");
                btnRegister.innerText = "Registrarse";
                btnRegister.disabled = false;
            });
        };
    }

    // 4. LÓGICA DE LOGIN
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = function(event) {
            event.preventDefault();
            const btnLogin = loginForm.querySelector('.btn-login');
            btnLogin.innerText = "Cargando...";
            btnLogin.disabled = true;

            const datosLogin = { 
                email: document.getElementById('username').value, 
                password: document.getElementById('password').value 
            };

            fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosLogin)
            })
            .then(response => response.json())
            .then(data => {
                btnLogin.innerText = "Entrar";
                btnLogin.disabled = false;
                if (data.success && data.token) {
                    localStorage.setItem('genius_token', data.token);
                    const displayUser = document.getElementById('display-username');
                    if (displayUser) displayUser.innerText = data.user.username;
                    cambiarPantalla(sLogin, sMenu);
                    if (typeof conectarWebSocket === "function") conectarWebSocket(data.token);
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("Error de conexión.");
                btnLogin.innerText = "Entrar";
                btnLogin.disabled = false;
            });
        };
    }
}

// Iniciar cuando el navegador esté listo
document.addEventListener('DOMContentLoaded', inicializarAuth);
// Ejecución inmediata por si acaso
setTimeout(inicializarAuth, 100);
