// --- app.js ---

// 1. Referencia a los elementos del HTML
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const btnLogin = document.querySelector('.btn-login'); // Selecciona por clase

// 2. Escuchar el evento 'submit' (cuando se pulsa el botón Entrar o Enter)
loginForm.addEventListener('submit', function(event) {
    // IMPORTANTE: Evita que la página se recargue automáticamente (comportamiento por defecto)
    event.preventDefault();

    // Cambiar el texto del botón para feedback visual
    btnLogin.innerText = "Cargando...";
    btnLogin.disabled = true;

    // Recoger los valores introducidos por el usuario
    const username = usernameInput.value;
    const password = passwordInput.value;

    // Crear el objeto de datos (JSON)
    const datosLogin = {
        username: username,
        password: password
    };

    console.log("Intentando login con:", datosLogin);

    // 3. LLAMADA A LA API CON FETCH (Reemplaza a Retrofit de Android)
    // Usaremos la URL de producción que ya tienes configurada en Render
    const API_BASE_URL = 'https://genius-royale-api.onrender.com'; 

    fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST', // Tipo de petición (igual que en Android)
        headers: {
            'Content-Type': 'application/json' // Decimos al servidor que enviamos JSON
        },
        body: JSON.stringify(datosLogin) // Convertimos el objeto JS a texto JSON
    })
    .then(response => {
        // Manejo preliminar de la respuesta HTTP (200, 401, 500...)
        if (!response.ok) {
            // Si no es OK (ej: 401 Unauthorized), lanzamos un error para el .catch
            throw new Error('Credenciales incorrectas o error en servidor');
        }
        return response.json(); // Si es OK, convertimos la respuesta a JSON
    })
    .then(data => {
        // Manejo de los datos reales devueltos por tu API (ResponseDTO)
        console.log("Respuesta del servidor:", data);

        // Restaurar botón
        btnLogin.innerText = "Entrar";
        btnLogin.disabled = false;

        // Suponiendo que tu API devuelve un objeto con { success: true, token: "..." }
        // O ajusta esto según la estructura real de tu objeto de respuesta Java
        if (data.token) {
            // LOGIN ÉXITO
            alert("¡Login correcto!");
            
            // --- REEMPLAZO DE SharedPreferences (Android) ---
            // Guardamos el token en LocalStorage del navegador para futuras peticiones
            localStorage.setItem('genius_token', data.token);
            localStorage.setItem('genius_username', username);

            // Redirigir a la pantalla principal del juego (que crearemos luego)
            // window.location.href = 'menu.html'; 
            console.log("Token guardado. Listo para redirigir a menu.html (créalo primero)");

        } else {
            // LOGIN FALLIDO (Lógica del servidor, ej: usuario no existe pero pass correcta)
            alert("Error en login: " + (data.message || "Credenciales inválidas"));
        }
    })
    .catch(error => {
        // Manejo de errores de red o errores lanzados arriba
        console.error("Error en la petición:", error);
        alert("Hubo un problema al conectar con el servidor: " + error.message);
        
        // Restaurar botón
        btnLogin.innerText = "Entrar";
        btnLogin.disabled = false;
    });
});