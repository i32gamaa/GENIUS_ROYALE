// ==========================================
// js/auth.js - VERSIÓN CINEMÁTICA Y CACHÉ INSTANTÁNEA ⚡🎬
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    const screenLogin = document.getElementById('screen-login');
    const screenRegister = document.getElementById('screen-register');
    const screenMenu = document.getElementById('screen-menu');
    
    const linkToRegister = document.getElementById('link-to-register');
    const linkToLogin = document.getElementById('link-to-login');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Navegación
    if (linkToRegister) {
        linkToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof cambiarPantalla === "function") cambiarPantalla(screenLogin, screenRegister);
        });
    }

    if (linkToLogin) {
        linkToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof cambiarPantalla === "function") cambiarPantalla(screenRegister, screenLogin);
        });
    }

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('username').value.trim();
            const passwordInput = document.getElementById('password').value.trim();

            fetch(`${window.API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput, password: passwordInput })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    sessionStorage.setItem('genius_token', data.token);
                    sessionStorage.setItem('genius_username', data.user.username);
                    
                    // 🔥 NUEVO: Guardamos el avatar en el bolsillo para pintarlo instantáneamente 🔥
                    const avatarInstantaneo = data.user.fotoPerfil || 'images/default-profile.png';
                    sessionStorage.setItem('genius_avatar', avatarInstantaneo);
                    
                    sessionStorage.removeItem('login_intro_played');

                    const displayUsername = document.getElementById('display-username');
                    if (displayUsername) displayUsername.innerText = data.user.username;

                    // 🔥 Pintamos la foto en la barra lateral del menú al instante 🔥
                    const sidebarPic = document.getElementById('sidebar-profile-pic');
                    if (sidebarPic) sidebarPic.src = avatarInstantaneo;

                    if (typeof cambiarPantalla === "function") {
                        cambiarPantalla(screenLogin, screenMenu);
                        
                        setTimeout(() => {
                            if (typeof window.ejecutarIntroCinematica === "function") {
                                window.ejecutarIntroCinematica();
                            }
                        }, 50);
                    }
                    
                    // Aseguramos que se actualicen las estadísticas del modal
                    if (typeof window.cargarMiPerfil === "function") window.cargarMiPerfil();
                    
                    if (typeof conectarWebSocket === "function") {
                        conectarWebSocket(data.token, data.user.username);
                    }
                } else {
                    alert("❌ Error: " + data.message);
                }
            })
            .catch(err => {
                console.error("Error en el login:", err);
                alert("❌ Error de conexión con el servidor.");
            });
        });
    }

    // Registro
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const usernameInput = document.getElementById('reg-username').value.trim();
            const emailInput = document.getElementById('reg-email').value.trim();
            const passwordInput = document.getElementById('reg-password').value.trim();

            fetch(`${window.API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput, email: emailInput, password: passwordInput })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("✅ ¡" + data.message + " Ahora inicia sesión.");
                    if (typeof cambiarPantalla === "function") cambiarPantalla(screenRegister, screenLogin);
                    registerForm.reset();
                } else {
                    alert("❌ Error al registrarse: " + data.message);
                }
            })
            .catch(err => alert("❌ Error de conexión con el servidor."));
        });
    }
    
    // Auto-Login
    const savedToken = sessionStorage.getItem('genius_token');
    const savedUsername = sessionStorage.getItem('genius_username');
    
    if (savedToken && savedUsername) {
        const displayUsername = document.getElementById('display-username');
        if (displayUsername) displayUsername.innerText = savedUsername;
        
        // Pintamos el avatar cacheado si existe
        const cachedAvatar = sessionStorage.getItem('genius_avatar');
        if (cachedAvatar) {
            const sidebarPic = document.getElementById('sidebar-profile-pic');
            if (sidebarPic) sidebarPic.src = cachedAvatar;
        }

        if (typeof cambiarPantalla === "function") {
            setTimeout(() => {
                cambiarPantalla(screenLogin, screenMenu);
                if (typeof window.ejecutarIntroCinematica === "function") {
                    window.ejecutarIntroCinematica();
                }
            }, 100);
        }
        
        if (typeof conectarWebSocket === "function") {
            setTimeout(() => conectarWebSocket(savedToken, savedUsername), 200);
        }
    }
});