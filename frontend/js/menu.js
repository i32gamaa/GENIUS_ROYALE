// Referencias a los elementos del menú
const btnPlay = document.getElementById('btn-play');
const btnSettings = document.getElementById('btn-settings');
const btnLogout = document.getElementById('btn-logout');
const displayUsername = document.getElementById('display-username');
const btnPublicGame = document.getElementById('btn-public-game');
const btnPrivateGame = document.getElementById('btn-private-game');
const btnAddFriend = document.getElementById('btn-add-friend');
const profilePicture = document.getElementById('profile-picture');
const statsModal = document.getElementById('stats-modal');
const closeStatsButton = document.getElementById('close-stats');

// Función para inicializar el menú principal
function inicializarMenu(usuario, fotoPerfil) {
    // Mostrar el nombre del usuario en el menú
    displayUsername.textContent = `¡Hola, ${usuario}!`;

    // Mostrar la foto de perfil
    profilePicture.src = fotoPerfil;
    profilePicture.addEventListener('click', () => {
        console.log('Mostrando estadísticas del usuario...');
        statsModal.classList.remove('hidden');
    });

    closeStatsButton.addEventListener('click', () => {
        statsModal.classList.add('hidden');
    });

    // Configurar eventos de los botones
    btnPlay.addEventListener('click', () => {
        console.log('Iniciando el juego...');
        // Aquí puedes agregar la lógica para iniciar el juego
        cambiarPantalla(screenMenu, screenGame); // screenGame debe estar definido en app.js
    });

    btnSettings.addEventListener('click', () => {
        console.log('Abriendo configuración...');
        // Aquí puedes agregar la lógica para abrir la configuración
    });

    btnLogout.addEventListener('click', () => {
        console.log('Cerrando sesión...');
        // Aquí puedes agregar la lógica para cerrar sesión
        cambiarPantalla(screenMenu, screenLogin);
    });

    btnPublicGame.addEventListener('click', () => {
        console.log('Iniciando partida pública...');
        inicializarJuego(); // Llama a la función para iniciar el juego público
    });

    btnPrivateGame.addEventListener('click', () => {
        console.log('Creando partida privada...');
        const codigoPartida = prompt('Introduce un código para la partida privada:');
        if (codigoPartida) {
            console.log(`Conectando a la partida privada con código: ${codigoPartida}`);
            // Aquí puedes agregar la lógica para unirse a la partida privada
        }
    });

    btnAddFriend.addEventListener('click', () => {
        console.log('Añadiendo amigo...');
        const emailAmigo = prompt('Introduce el email de tu amigo para añadirlo:');
        if (emailAmigo) {
            console.log(`Enviando solicitud de amistad a: ${emailAmigo}`);
            // Aquí puedes agregar la lógica para enviar la solicitud de amistad
        }
    });
}

// Exportar la función para usarla en otros archivos
export { inicializarMenu };