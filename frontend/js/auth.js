// ==========================================
// js/auth.js - ARCHIVO COMPLETO
// ==========================================
function inicializarAuth() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = function(e) {
            e.preventDefault();
            const btn = loginForm.querySelector('.btn-login');
            btn.innerText = "Entrando...";
            
            const email = document.getElementById('username').value;
            const pass = document.getElementById('password').value;

            fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: pass })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    localStorage.setItem('genius_token', data.token);
                    localStorage.setItem('genius_username', data.user.username); // Guardamos para el socket
                    document.getElementById('display-username').innerText = data.user.username;
                    
                    cambiarPantalla(document.getElementById('screen-login'), document.getElementById('screen-menu'));
                    
                    // CONEXIÓN INMEDIATA NADA MÁS ENTRAR
                    if (typeof conectarWebSocket === "function") {
                        conectarWebSocket(data.token, data.user.username);
                    }
                } else {
                    alert(data.message);
                    btn.innerText = "Entrar";
                }
            })
            .catch(err => {
                console.error(err);
                btn.innerText = "Entrar";
            });
        };
    }
}
document.addEventListener('DOMContentLoaded', inicializarAuth);