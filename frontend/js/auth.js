const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const btnLogin = document.querySelector('.btn-login');

const linkToRegister = document.getElementById('link-to-register');
const linkToLogin = document.getElementById('link-to-login');

// Navegación Login <-> Registro
linkToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    cambiarPantalla(screenLogin, screenRegister);
});

linkToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    cambiarPantalla(screenRegister, screenLogin);
});

// Lógica de Login
loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    btnLogin.innerText = "Cargando...";
    btnLogin.disabled = true;

    const datosLogin = { 
        username: usernameInput.value, 
        password: passwordInput.value 
    };

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
            localStorage.setItem('genius_token', data.token);
            displayUsername.innerText = datosLogin.username;
            cambiarPantalla(screenLogin, screenMenu);
            conectarWebSocket(data.token);
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error al iniciar sesión.");
        btnLogin.innerText = "Entrar";
        btnLogin.disabled = false;
    });
});