// ==========================================
// js/menu.js - ARCHIVO COMPLETO
// ==========================================
function inicializarMenu() {
    const sMenu = document.getElementById('screen-menu');
    const sLobby = document.getElementById('screen-lobby');
    const btnPrivate = document.getElementById('btn-private-game');
    const btnRequests = document.getElementById('btn-requests');
    const btnAddMenu = document.getElementById('btn-add-friend-menu');
    const closeRequests = document.getElementById('close-requests');

    if (btnPrivate) {
        btnPrivate.onclick = () => {
            cambiarPantalla(sMenu, sLobby);
            cargarListaAmigos();
        };
    }

    if (btnAddMenu) {
        btnAddMenu.onclick = () => {
            const email = prompt("Introduce el email del amigo:");
            if (email) {
                fetch(`${window.API_BASE_URL}/api/amistad/solicitar`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('genius_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email })
                })
                .then(res => res.json())
                .then(d => alert(d.message));
            }
        };
    }

    if (btnRequests) {
        btnRequests.onclick = () => {
            document.getElementById('requests-modal').classList.remove('hidden');
            actualizarBandeja();
        };
    }

    if (closeRequests) {
        closeRequests.onclick = () => {
            document.getElementById('requests-modal').classList.add('hidden');
        };
    }
}

function cargarListaAmigos() {
    const list = document.getElementById('friends-list');
    if(!list) return;
    list.innerHTML = "<li>Cargando amigos...</li>";
    
    fetch(`${window.API_BASE_URL}/api/amistad/lista`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}` }
    })
    .then(res => res.json())
    .then(amigos => {
        list.innerHTML = "";
        if (amigos.length === 0) {
            list.innerHTML = "<li>Aún no tienes amigos aceptados.</li>";
            return;
        }
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
        rList.innerHTML = data.length ? "" : "<li>No tienes peticiones pendientes.</li>";
        data.forEach(r => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${r.senderUsername}</span> <button class="btn-primary" onclick="aceptarSol(${r.id})">✅ Aceptar</button>`;
            rList.appendChild(li);
        });
    });
}

window.aceptarSol = function(id) {
    fetch(`${window.API_BASE_URL}/api/amistad/aceptar/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}` }
    })
    .then(res => res.json())
    .then(data => {
        alert("¡Ahora sois amigos!");
        // Ocultamos el modal y refrescamos la lista de amigos sin recargar la página
        document.getElementById('requests-modal').classList.add('hidden');
        cargarListaAmigos();
    });
};

document.addEventListener('DOMContentLoaded', inicializarMenu);