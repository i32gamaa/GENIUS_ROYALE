// --- ARCHIVO: js/auth.js ---

// 1. REFERENCIAS DEL LOGIN
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username'); // Aquí el usuario escribe su email
const passwordInput = document.getElementById('password');
const btnLogin = document.querySelector('#screen-login .btn-login');

// 2. REFERENCIAS DEL REGISTRO
const registerForm = document.getElementById('register-form');
const regUsernameInput = document.getElementById('reg-username');
const regEmailInput = document.getElementById('reg-email');
const regPasswordInput = document.getElementById('reg-password');
const btnRegister = document.querySelector('#screen-register .btn-login');

// 3. REFERENCIAS PARA NAVEGAR
const linkToRegister = document.getElementById('link-to-register');
const linkToLogin = document.getElementById('link-to-login');

// ==========================================
// CAMBIAR ENTRE PANTALLAS (LOGIN <-> REGISTRO)
// ==========================================
linkToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    cambiarPantalla(screenLogin, screenRegister);
});

linkToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    cambiarPantalla(screenRegister, screenLogin);
});

// ==========================================
// LÓGICA DE REGISTRO
// ==========================================
registerForm.addEventListener('submit', function(event) {
    event.preventDefault();
    btnRegister.innerText = "Registrando...";
    btnRegister.disabled = true;

    // Fíjate que los nombres coinciden con lo que espera Java (username, email, password)
    const datosRegistro = {
        username: regUsernameInput.value,
        email: regEmailInput.value,
        password: regPasswordInput.value
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
            alert("¡Cuenta creada con éxito! Ahora inicia sesión.");
            // Limpiamos los campos
            regUsernameInput.value = '';
            regEmailInput.value = '';
            regPasswordInput.value = '';
            // Volvemos a la pantalla de login automáticamente
            cambiarPantalla(screenRegister, screenLogin); 
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Problema al conectar con el servidor.");
        btnRegister.innerText = "Registrarse";
        btnRegister.disabled = false;
    });
});

// ==========================================
// LÓGICA DE LOGIN
// ==========================================
loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    btnLogin.innerText = "Cargando...";
    btnLogin.disabled = true;

    // Simulación de inicio de sesión sin validación
    const usuarioSimulado = {
        username: "JugadorSimulado",
        fotoPerfil: "images/default-profile.png"
    };

    console.log("Inicio de sesión simulado para:", usuarioSimulado.username);

    // Redirigir al menú principal
    displayUsername.textContent = usuarioSimulado.username;
    cambiarPantalla(screenLogin, screenMenu);

    // Inicializar el menú con el usuario simulado
    inicializarMenu(usuarioSimulado.username, usuarioSimulado.fotoPerfil);

    // Restablecer el botón de inicio de sesión
    btnLogin.innerText = "Entrar";
    btnLogin.disabled = false;
});