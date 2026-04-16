// ==========================================
// js/menu.js - VERSIÓN BATTLE ROYALE
// ==========================================
function inicializarMenu() {
    const sMenu = document.getElementById('screen-menu');
    const sLobby = document.getElementById('screen-lobby');
    
    const btnPrivate = document.getElementById('btn-private-game');
    const btnLogout = document.getElementById('btn-logout');
    const btnLeaveLobby = document.getElementById('btn-leave-lobby');
    const btnStart = document.getElementById('btn-start-game-final');
    
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
        btnLogout.onclick = () => { sessionStorage.clear(); location.reload(); };
    }

    if (btnLeaveLobby) {
        btnLeaveLobby.onclick = () => { if (typeof cambiarPantalla === "function") cambiarPantalla(sLobby, sMenu); };
    }

    if (btnPrivate) {
        btnPrivate.onclick = () => {
            if (typeof cambiarPantalla === "function") cambiarPantalla(sMenu, sLobby);
            
            // Ponemos solo al host al principio
            const list = document.getElementById('lobby-players-list');
            if(list) list.innerHTML = `<li>👑 <strong>${sessionStorage.getItem('genius_username')} (Host)</strong></li>`;
            
            const hostControls = document.getElementById('host-controls');
            const waitingMsg = document.getElementById('waiting-msg');
            if(hostControls) hostControls.style.display = 'none';
            if(waitingMsg) {
                waitingMsg.style.display = 'block';
                waitingMsg.innerText = 'Esperando a que se unan los jugadores (Máx 10)...';
            }
            
            // Todo abierto para poder invitar a varios
            document.querySelectorAll('#panel-private-friends hr, #panel-private-friends h3:not(:first-of-type), .add-friend-box, #friends-list').forEach(el => el.style.display = '');

            cargarListaAmigos();
            cargarCategorias();
        };
    }

    if (btnStart) {
        btnStart.onclick = () => {
            // ¡ARREGLO CRÍTICO AQUI! Mandamos el gameId, no el inviteId
            const gameId = sessionStorage.getItem('current_game_id');
            const selectedCategory = document.getElementById('game-category').value; 
            
            if (!gameId) return alert("Error: La sala aún no está lista.");
            
            if (stompClient && stompClient.connected) {
                stompClient.send("/app/game.start.private", {}, JSON.stringify({ 
                    gameId: gameId,
                    categoryName: selectedCategory
                }));
            }
        };
    }

    // --- Funciones de Amistad (Intactas) ---
    function enviarSolicitud(email) {
        if (!email) return alert("Introduce un email.");
        fetch(`${window.API_BASE_URL}/api/amistad/solicitar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        })
        .then(res => res.json())
        .then(d => {
            alert(d.message);
            if (modalFriendEmail) modalFriendEmail.value = "";
            if (inputFriendName) inputFriendName.value = "";
            if (addFriendModal) { addFriendModal.classList.add('hidden'); addFriendModal.style.display = 'none'; }
        });
    }

    if (btnAddMenu) { btnAddMenu.onclick = () => { if (addFriendModal) { addFriendModal.classList.remove('hidden'); addFriendModal.style.display = 'flex'; if (modalFriendEmail) modalFriendEmail.focus(); } }; }
    if (btnCloseAddFriend) { btnCloseAddFriend.onclick = () => { addFriendModal.classList.add('hidden'); addFriendModal.style.display = 'none'; }; }
    if (btnSendFriendReq) { btnSendFriendReq.onclick = () => enviarSolicitud(modalFriendEmail.value.trim()); }
    if (btnAddLobby && inputFriendName) { btnAddLobby.onclick = () => enviarSolicitud(inputFriendName.value.trim()); }
    if (btnRequests) { btnRequests.onclick = () => { if (requestsModal) { requestsModal.classList.remove('hidden'); requestsModal.style.display = 'flex'; actualizarBandeja(); } }; }
    if (closeReq) { closeReq.onclick = () => { requestsModal.classList.add('hidden'); requestsModal.style.display = 'none'; }; }
}

function cargarCategorias() {
    const catSelect = document.getElementById('game-category');
    if (!catSelect) return;
    fetch(`${window.API_BASE_URL}/api/game/categories`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(res => res.json())
    .then(categorias => {
        catSelect.innerHTML = "<option value='Cultura General'>Cultura General</option>";
        categorias.forEach(cat => {
            if (cat.name !== "Cultura General") catSelect.innerHTML += `<option value='${cat.name}'>${cat.name}</option>`;
        });
    });
}

function cargarListaAmigos() {
    const list = document.getElementById('friends-list');
    if (!list) return;
    fetch(`${window.API_BASE_URL}/api/amistad/lista`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(res => res.json())
    .then(amigos => {
        list.innerHTML = "";
        amigos.forEach(a => {
            list.innerHTML += `<li style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${a.username}</span> <button class="btn-info" style="padding: 5px 10px;" onclick="window.invitar('${a.username}')">Invitar</button></li>`;
        });
    });
}

window.invitar = function(username) {
    const catSelect = document.getElementById('game-category');
    const categoria = catSelect ? catSelect.value : "Cultura General";
    if (typeof enviarInvitacionJuego === "function") enviarInvitacionJuego(username, categoria);
};

window.aceptarSol = function(id) {
    fetch(`${window.API_BASE_URL}/api/amistad/aceptar/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } }).then(() => { alert("¡Amigo añadido!"); document.getElementById('requests-modal').style.display = 'none'; cargarListaAmigos(); });
};

window.rechazarSol = function(id) {
    fetch(`${window.API_BASE_URL}/api/amistad/rechazar/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } }).then(res => res.json()).then(data => { alert(data.message); actualizarBandeja(); });
};

function actualizarBandeja() {
    const rList = document.getElementById('requests-list');
    rList.innerHTML = "<li>Cargando...</li>";
    fetch(`${window.API_BASE_URL}/api/amistad/pendientes`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(res => res.json())
    .then(data => {
        if (data.length === 0) { rList.innerHTML = `<li style="color: #555;">No tienes peticiones pendientes.</li>`; return; }
        rList.innerHTML = "";
        data.forEach(r => {
            rList.innerHTML += `<li style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;"><strong>${r.senderUsername}</strong> <div><button class="btn-primary" onclick="aceptarSol(${r.id})">✅</button> <button class="btn-secondary" onclick="rechazarSol(${r.id})">❌</button></div></li>`;
        });
    });
}

document.addEventListener('DOMContentLoaded', inicializarMenu);