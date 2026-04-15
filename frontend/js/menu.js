// ==========================================
// js/menu.js - ARCHIVO COMPLETO
// ==========================================
function inicializarMenu() {
    const sMenu = document.getElementById('screen-menu');
    const sLobby = document.getElementById('screen-lobby');
    const btnPrivate = document.getElementById('btn-private-game');
    const btnStart = document.getElementById('btn-start-game-final');

    if (btnPrivate) {
        btnPrivate.onclick = () => {
            cambiarPantalla(sMenu, sLobby);
            // El host entra solo
            const list = document.getElementById('lobby-players-list');
            if(list) list.innerHTML = `<li>👤 ${localStorage.getItem('genius_username')} (Host)</li>`;
            
            const hostControls = document.getElementById('host-controls');
            if(hostControls) hostControls.style.display = 'none'; // Se activa al invitar
            
            cargarListaAmigos();
        };
    }

    if (btnStart) {
        btnStart.onclick = () => {
            // Aquí puedes llamar a una función que dispare el inicio o simplemente
            // esperar a que el backend procese el matchmaking. 
            // Como ya tenemos game.start por socket, este botón es para confirmar visualmente.
            console.log("🚀 Partida lanzada por el host");
        };
    }
}

function cargarListaAmigos() {
    const list = document.getElementById('friends-list');
    if (!list) return;
    fetch(`${window.API_BASE_URL}/api/amistad/lista`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}` }
    })
    .then(res => res.json())
    .then(amigos => {
        list.innerHTML = "";
        amigos.forEach(a => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${a.username}</span> <button class="btn-info" onclick="window.invitar('${a.username}')">Invitar</button>`;
            list.appendChild(li);
        });
    });
}

window.invitar = function(username) {
    // Al invitar, el host activa sus controles
    const hostControls = document.getElementById('host-controls');
    if (hostControls) hostControls.style.display = 'block';
    
    if (typeof enviarInvitacionJuego === "function") {
        enviarInvitacionJuego(username, "Cultura General");
    }
};

window.aceptarSol = function(id) {
    fetch(`${window.API_BASE_URL}/api/amistad/aceptar/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}` }
    }).then(() => {
        alert("Amigo añadido!");
        document.getElementById('requests-modal').classList.add('hidden');
        cargarListaAmigos();
    });
};

document.addEventListener('DOMContentLoaded', inicializarMenu);