// ==========================================
// js/menu.js - ARCHIVO COMPLETO Y LIMPIO
// ==========================================
function inicializarMenu() {
    const sMenu = document.getElementById('screen-menu');
    const sLobby = document.getElementById('screen-lobby');
    
    const btnPrivate = document.getElementById('btn-private-game');
    const btnLogout = document.getElementById('btn-logout');
    const btnLeaveLobby = document.getElementById('btn-leave-lobby');
    const btnStart = document.getElementById('btn-start-game-final');
    
    // ... (botones modales se mantienen iguales) ...
    const btnRequests = document.getElementById('btn-requests');
    const requestsModal = document.getElementById('requests-modal');
    const closeReq = document.getElementById('close-requests');
    const btnAddMenu = document.getElementById('btn-add-friend-menu');
    const addFriendModal = document.getElementById('add-friend-modal');
    const btnCloseAddFriend = document.getElementById('btn-close-add-friend');
    const btnSendFriendReq = document.getElementById('btn-send-friend-req');
    const modalFriendEmail = document.getElementById('modal-friend-email');
    const btnAddLobby = document.getElementById('btn-add-friend-lobby');
    const inputFriendName = document.getElementById('input-friend-name');

    if (btnLogout) {
        btnLogout.onclick = () => {
            localStorage.clear();
            location.reload(); 
        };
    }

    if (btnLeaveLobby) {
        btnLeaveLobby.onclick = () => {
            if (typeof cambiarPantalla === "function") cambiarPantalla(sLobby, sMenu);
        };
    }

    if (btnPrivate) {
        btnPrivate.onclick = () => {
            if (typeof cambiarPantalla === "function") cambiarPantalla(sMenu, sLobby);
            
            const list = document.getElementById('lobby-players-list');
            if(list) list.innerHTML = `<li>👤 ${localStorage.getItem('genius_username')} (Host)</li>`;
            
            const hostControls = document.getElementById('host-controls');
            const waitingMsg = document.getElementById('waiting-msg');
            if(hostControls) hostControls.style.display = 'none';
            if(waitingMsg) waitingMsg.style.display = 'block';
            
            cargarListaAmigos();
            cargarCategorias(); // Cargamos las temáticas desde la BD
        };
    }

    // EL HOST PULSA INICIAR PARTIDA
    if (btnStart) {
        btnStart.onclick = () => {
            const inviteId = localStorage.getItem('current_invite_id');
            // Leemos la categoría que el host haya dejado seleccionada AHORA MISMO
            const selectedCategory = document.getElementById('game-category').value; 
            
            if (!inviteId) return alert("Error: No se encontró la invitación activa.");
            
            console.log("🚀 El Host inicia la partida con categoría: " + selectedCategory);
            
            if (stompClient && stompClient.connected) {
                // Enviamos el ID y la Categoría al servidor para que genere las preguntas
                stompClient.send("/app/game.start.private", {}, JSON.stringify({ 
                    inviteId: parseInt(inviteId),
                    categoryName: selectedCategory
                }));
            }
        };
    }

    // Funciones de amistad...
    function enviarSolicitud(email) {
        if (!email) return alert("Introduce un email.");
        fetch(`${window.API_BASE_URL}/api/amistad/solicitar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        })
        .then(res => res.json())
        .then(d => {
            alert(d.message);
            if (modalFriendEmail) modalFriendEmail.value = "";
            if (inputFriendName) inputFriendName.value = "";
            if (addFriendModal) {
                addFriendModal.classList.add('hidden');
                addFriendModal.style.display = 'none';
            }
        })
        .catch(err => alert("Error de conexión."));
    }

    if (btnAddMenu) {
        btnAddMenu.onclick = () => {
            if (addFriendModal) {
                addFriendModal.classList.remove('hidden');
                addFriendModal.style.display = 'flex';
                if (modalFriendEmail) modalFriendEmail.focus();
            }
        };
    }
    if (btnCloseAddFriend) {
        btnCloseAddFriend.onclick = () => {
            addFriendModal.classList.add('hidden');
            addFriendModal.style.display = 'none';
        };
    }
    if (btnSendFriendReq) {
        btnSendFriendReq.onclick = () => enviarSolicitud(modalFriendEmail.value.trim());
    }
    if (btnAddLobby && inputFriendName) {
        btnAddLobby.onclick = () => enviarSolicitud(inputFriendName.value.trim());
    }

    if (btnRequests) {
        btnRequests.onclick = () => {
            if (requestsModal) {
                requestsModal.classList.remove('hidden');
                requestsModal.style.display = 'flex';
                actualizarBandeja();
            }
        };
    }
    if (closeReq) {
        closeReq.onclick = () => {
            requestsModal.classList.add('hidden');
            requestsModal.style.display = 'none';
        };
    }
}

function cargarCategorias() {
    const catSelect = document.getElementById('game-category');
    if (!catSelect) return;

    fetch(`${window.API_BASE_URL}/api/game/categories`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}` }
    })
    .then(res => res.json())
    .then(categorias => {
        catSelect.innerHTML = "";
        const optionGeneral = document.createElement('option');
        optionGeneral.value = "Cultura General";
        optionGeneral.textContent = "Cultura General";
        catSelect.appendChild(optionGeneral);

        categorias.forEach(cat => {
            if (cat.name !== "Cultura General") {
                const option = document.createElement('option');
                option.value = cat.name;
                option.textContent = cat.name;
                catSelect.appendChild(option);
            }
        });
    });
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
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.marginBottom = "8px";
            li.innerHTML = `<span>${a.username}</span> <button class="btn-info" style="padding: 5px 10px;" onclick="window.invitar('${a.username}')">Invitar</button>`;
            list.appendChild(li);
        });
    });
}

window.invitar = function(username) {
    if (typeof enviarInvitacionJuego === "function") {
        enviarInvitacionJuego(username, "Cultura General"); 
        // Ya no importa la categoría aquí, el host la elegirá antes de darle a Iniciar.
    }
};

window.aceptarSol = function(id) {
    fetch(`${window.API_BASE_URL}/api/amistad/aceptar/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}` }
    }).then(() => {
        alert("¡Nuevo amigo añadido!");
        const reqModal = document.getElementById('requests-modal');
        if (reqModal) {
            reqModal.style.display = 'none';
            reqModal.classList.add('hidden');
        }
        cargarListaAmigos();
    });
};

window.rechazarSol = function(id) {
    fetch(`${window.API_BASE_URL}/api/amistad/rechazar/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}` }
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        actualizarBandeja(); 
    });
};

function actualizarBandeja() {
    const rList = document.getElementById('requests-list');
    rList.innerHTML = "<li>Cargando...</li>";
    
    fetch(`${window.API_BASE_URL}/api/amistad/pendientes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.length === 0) {
            rList.innerHTML = `<li style="list-style:none; color: #555; padding: 20px 0;">No tienes peticiones pendientes.</li>`;
            return;
        }
        rList.innerHTML = "";
        data.forEach(r => {
            const li = document.createElement('li');
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.padding = "10px 0";
            li.style.borderBottom = "1px solid #eee";
            li.innerHTML = `
                <span style="font-weight: bold;">${r.senderUsername}</span> 
                <div style="display:flex; gap: 5px;">
                    <button class="btn-primary" style="padding: 5px 10px;" onclick="aceptarSol(${r.id})">✅</button>
                    <button class="btn-secondary" style="padding: 5px 10px;" onclick="rechazarSol(${r.id})">❌</button>
                </div>
            `;
            rList.appendChild(li);
        });
    });
}

document.addEventListener('DOMContentLoaded', inicializarMenu);