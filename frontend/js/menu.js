// ==========================================
// js/menu.js - ARCHIVO COMPLETO
// ==========================================
function inicializarMenu() {
    const sMenu = document.getElementById('screen-menu');
    const sLobby = document.getElementById('screen-lobby');
    const btnPrivate = document.getElementById('btn-private-game');
    const btnRequests = document.getElementById('btn-requests');
    const btnAddMenu = document.getElementById('btn-add-friend-menu');

    if (btnPrivate) {
        btnPrivate.onclick = () => {
            cambiarPantalla(sMenu, sLobby);
            cargarListaAmigos();
        };
    }

    if (btnAddMenu) {
        btnAddMenu.onclick = () => {
            const email = prompt("Email del amigo:");
            if (email) {
                fetch(`${window.API_BASE_URL}/api/amistad/solicitar`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('genius_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email })
                }).then(res => res.json()).then(d => alert(d.message));
            }
        };
    }

    if (btnRequests) {
        btnRequests.onclick = () => {
            document.getElementById('requests-modal').classList.remove('hidden');
            actualizarBandeja();
        };
    }
}

function cargarListaAmigos() {
    const list = document.getElementById('friends-list');
    if(!list) return;
    list.innerHTML = "<li>Cargando...</li>";
    
    fetch(`${window.API_BASE_URL}/api/amistad/lista`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}` }
    })
    .then(res => res.json())
    .then(amigos => {
        list.innerHTML = "";
        amigos.forEach(a => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${a.username}</span> <button class="btn-info" onclick="invitarAmigo('${a.username}')">Invitar</button>`;
            list.appendChild(li);
        });
    });
}

window.invitarAmigo = function(name) {
    if (typeof enviarInvitacionJuego === "function") {
        enviarInvitacionJuego(name, "Cultura General");
    }
};

function actualizarBandeja() {
    const rList = document.getElementById('requests-list');
    fetch(`${window.API_BASE_URL}/api/amistad/pendientes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}` }
    })
    .then(res => res.json())
    .then(data => {
        rList.innerHTML = data.length ? "" : "<li>No hay peticiones</li>";
        data.forEach(r => {
            const li = document.createElement('li');
            li.innerHTML = `${r.senderUsername} <button onclick="aceptarSol(${r.id})">✅</button>`;
            rList.appendChild(li);
        });
    });
}

window.aceptarSol = function(id) {
    fetch(`${window.API_BASE_URL}/api/amistad/aceptar/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}` }
    }).then(() => {
        alert("¡Aceptado!");
        document.getElementById('requests-modal').classList.add('hidden');
    });
};

document.addEventListener('DOMContentLoaded', inicializarMenu);