// ==========================================
// js/menu.js - FIX AUSENTES Y SALIDAS
// ==========================================

window.verificarBotonReconexion = function() {
    const btnRejoin = document.getElementById('btn-rejoin-lobby');
    if (btnRejoin) {
        if (sessionStorage.getItem('last_voluntary_game_id')) {
            btnRejoin.style.display = 'block';
        } else {
            btnRejoin.style.display = 'none';
        }
    }
};

window.actualizarBandejaMensajes = function() {
    const mList = document.getElementById('messages-list');
    if (!mList) return;

    if (!window.invitacionesPendientes || window.invitacionesPendientes.length === 0) {
        mList.innerHTML = '<li style="color: #555;">No tienes invitaciones de sala pendientes.</li>';
        return;
    }

    mList.innerHTML = "";
    window.invitacionesPendientes.forEach(inv => {
        const idInv = inv.inviteId || inv.id;
        const senderName = inv.senderUsername || inv.sender || "Un amigo";
        mList.innerHTML += `
            <li style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #eee;">
                <span>Sala de <strong>${senderName}</strong></span>
                <div>
                    <button class="btn-primary btn-modal-style" style="padding:6px 12px; font-size:1.1rem; margin-right:5px;" onclick="window.responderInvitacion(${idInv}, true, '${senderName}', null); document.getElementById('messages-modal').style.display='none';">✔️</button>
                    <button class="btn-secondary btn-modal-style" style="padding:6px 12px; font-size:1.1rem;" onclick="window.responderInvitacion(${idInv}, false, '${senderName}', null)">❌</button>
                </div>
            </li>
        `;
    });
};

window.actualizarNotificacionMensajes = function() {
    const btn = document.getElementById('btn-messages');
    if (!btn) return;
    if (window.invitacionesPendientes && window.invitacionesPendientes.length > 0) {
        btn.innerHTML = `✉️ Mensajes <span class="badge" style="display:inline-block; animation: pulso-logo 1.5s infinite;">${window.invitacionesPendientes.length}</span>`;
    } else {
        btn.innerHTML = "✉️ Mensajes";
    }
};

function inicializarMenu() {
    const sMenu = document.getElementById('screen-menu');
    const sLobby = document.getElementById('screen-lobby');
    
    const btnPrivate = document.getElementById('btn-private-game');
    const btnLogout = document.getElementById('btn-logout');
    const btnLeaveLobby = document.getElementById('btn-leave-lobby');
    const btnStart = document.getElementById('btn-start-game-final');
    const btnRejoin = document.getElementById('btn-rejoin-lobby');
    
    const btnRequests = document.getElementById('btn-requests');
    const requestsModal = document.getElementById('requests-modal');
    const closeReq = document.getElementById('close-requests');
    
    const btnMessages = document.getElementById('btn-messages');
    const messagesModal = document.getElementById('messages-modal');
    const closeMessages = document.getElementById('close-messages');

    const btnAddMenu = document.getElementById('btn-add-friend-menu');
    const addFriendModal = document.getElementById('add-friend-modal');
    const btnCloseAddFriend = document.getElementById('btn-close-add-friend');
    const btnSendFriendReq = document.getElementById('btn-send-friend-req');
    const modalFriendUsername = document.getElementById('modal-friend-username');
    const btnAddLobby = document.getElementById('btn-add-friend-lobby');
    const inputFriendName = document.getElementById('input-friend-name');

    window.verificarBotonReconexion(); 
    actualizarBandeja(); 

    if (btnLogout) {
        btnLogout.onclick = () => { sessionStorage.clear(); location.reload(); };
    }

    if (btnLeaveLobby) {
        btnLeaveLobby.onclick = () => { 
            const gameId = sessionStorage.getItem('current_game_id');
            const hostName = sessionStorage.getItem('current_host_name');
            const myName = sessionStorage.getItem('genius_username');

            if (gameId && typeof stompClient !== 'undefined' && stompClient !== null && stompClient.connected) {
                stompClient.send("/app/lobby.leave", {}, JSON.stringify({ gameId: gameId }));
                
                if (hostName !== myName) {
                    sessionStorage.setItem('last_voluntary_game_id', gameId);
                } else {
                    sessionStorage.removeItem('last_voluntary_game_id');
                }
            }
            
            sessionStorage.removeItem('current_game_id');
            sessionStorage.removeItem('current_host_name');
            window.verificarBotonReconexion(); 
            
            // 🔥 EL FIX: Avisamos a la URL de que volvemos al menú para que el Anti-Imán nos proteja
            window.location.hash = '#screen-menu';
            
            if (typeof cambiarPantalla === "function") cambiarPantalla(sLobby, sMenu); 
        };
    }

    if (btnRejoin) {
        btnRejoin.onclick = () => {
            const lastGameId = sessionStorage.getItem('last_voluntary_game_id');
            if (lastGameId && stompClient && stompClient.connected) {
                if (typeof cambiarPantalla === "function") cambiarPantalla(sMenu, sLobby);
                
                // 🔥 EL FIX: Avisamos a la URL de que volvemos a la sala activamente
                window.location.hash = '#screen-lobby';
                
                const waitingMsg = document.getElementById('waiting-msg');
                if (waitingMsg) {
                    waitingMsg.innerText = "Reconectando con tu sala...";
                    waitingMsg.style.display = 'block';
                }
                stompClient.send("/app/lobby.rejoin", {}, JSON.stringify({ gameId: lastGameId }));
            }
        };
    }

    if (btnPrivate) {
        btnPrivate.onclick = () => {
            if (typeof cambiarPantalla === "function") cambiarPantalla(sMenu, sLobby);
            
            const list = document.getElementById('lobby-players-list');
            if(list) list.innerHTML = `<li style="margin-bottom:10px;">👑 <strong style="color:#FFD700">${sessionStorage.getItem('genius_username')} (Host)</strong></li>`;
            
            const hostControls = document.getElementById('host-controls');
            const waitingMsg = document.getElementById('waiting-msg');
            if(hostControls) hostControls.style.display = 'none';
            if(waitingMsg) {
                waitingMsg.style.display = 'block';
                waitingMsg.innerText = 'Esperando a que se unan los jugadores (Máx 10)...';
            }
            
            document.querySelectorAll('#panel-private-friends hr, #panel-private-friends h3:not(:first-of-type), .add-friend-box, #friends-list').forEach(el => el.style.display = '');

            sessionStorage.setItem('current_host_name', sessionStorage.getItem('genius_username'));

            cargarListaAmigos();
            cargarCategorias();
        };
    }

    if (btnStart) {
        btnStart.onclick = () => {
            const listaJugadoresTexto = document.getElementById('lobby-players-list').innerText;
            
            if (listaJugadoresTexto.includes('(Ausente)')) {
                window.mostrarToastError("⚠️ Hay jugadores AUSENTES. Espera o expúlsalos para iniciar.");
                return; 
            }

            const gameId = sessionStorage.getItem('current_game_id');
            const selectedCategory = document.getElementById('game-category').value; 
            
            if (!gameId) {
                window.mostrarToastError("⚠️ Error: La sala aún no está lista.");
                return;
            }
            
            if (stompClient && stompClient.connected) {
                stompClient.send("/app/game.start.private", {}, JSON.stringify({ 
                    gameId: gameId,
                    categoryName: selectedCategory
                }));
            }
        };
    }

    if (btnMessages) {
        btnMessages.onclick = () => {
            if (messagesModal) {
                messagesModal.classList.remove('hidden');
                messagesModal.style.display = 'flex';
                window.actualizarBandejaMensajes();
            }
        };
    }
    if (closeMessages) {
        closeMessages.onclick = () => {
            if (messagesModal) {
                messagesModal.classList.add('hidden');
                messagesModal.style.display = 'none';
            }
        };
    }

    function enviarSolicitud(usernameToTarget) {
        if (!usernameToTarget) {
            window.mostrarToastError("⚠️ Por favor, introduce un nombre de usuario.");
            return;
        }
        
        fetch(`${window.API_BASE_URL}/api/amistad/solicitar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameToTarget }) 
        })
        .then(res => res.json())
        .then(d => {
            if (d.success) {
                window.mostrarToastExito(d.message);
            } else {
                window.mostrarToastError(d.message);
            }
            if (modalFriendUsername) modalFriendUsername.value = "";
            if (inputFriendName) inputFriendName.value = "";
            if (addFriendModal) { addFriendModal.classList.add('hidden'); addFriendModal.style.display = 'none'; }
        });
    }

    if (btnAddMenu) { btnAddMenu.onclick = () => { if (addFriendModal) { addFriendModal.classList.remove('hidden'); addFriendModal.style.display = 'flex'; if (modalFriendUsername) modalFriendUsername.focus(); } }; }
    if (btnCloseAddFriend) { btnCloseAddFriend.onclick = () => { addFriendModal.classList.add('hidden'); addFriendModal.style.display = 'none'; }; }
    
    if (btnSendFriendReq) { btnSendFriendReq.onclick = () => enviarSolicitud(modalFriendUsername.value.trim()); }
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
            list.innerHTML += `<li style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${a.username}</span> <button class="btn-info btn-modal-style" style="padding: 5px 10px;" onclick="window.invitar('${a.username}')">Invitar</button></li>`;
        });
    });
}

window.invitar = function(username) {
    const catSelect = document.getElementById('game-category');
    const categoria = catSelect ? catSelect.value : "Cultura General";
    if (typeof enviarInvitacionJuego === "function") enviarInvitacionJuego(username, categoria);
};

window.aceptarSol = function(id) {
    fetch(`${window.API_BASE_URL}/api/amistad/aceptar/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(() => { 
        window.mostrarToastExito("¡Amigo añadido!"); 
        document.getElementById('requests-modal').style.display = 'none'; 
        cargarListaAmigos(); 
        actualizarBandeja(); 
    });
};

window.rechazarSol = function(id) {
    fetch(`${window.API_BASE_URL}/api/amistad/rechazar/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(res => res.json())
    .then(data => { 
        window.mostrarToastInfo(data.message); 
        actualizarBandeja(); 
    });
};

window.actualizarBandeja = function() {
    const rList = document.getElementById('requests-list');
    const badge = document.getElementById('requests-badge');
    
    if (rList) rList.innerHTML = "<li>Cargando...</li>";
    
    fetch(`${window.API_BASE_URL}/api/amistad/pendientes`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
    .then(res => res.json())
    .then(data => {
        if (badge) {
            if (data.length > 0) {
                badge.innerText = data.length;
                badge.style.display = 'inline-block';
                badge.style.animation = 'pulso-logo 1.5s infinite';
            } else {
                badge.style.display = 'none';
                badge.style.animation = 'none';
            }
        }

        if (!rList) return;

        if (data.length === 0) { rList.innerHTML = `<li style="color: #555;">No tienes peticiones pendientes.</li>`; return; }
        rList.innerHTML = "";
        data.forEach(r => {
            rList.innerHTML += `
                <li style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
                    <strong>${r.senderUsername}</strong> 
                    <div>
                        <button class="btn-primary btn-modal-style" style="padding:6px 12px; margin-right:5px;" onclick="window.aceptarSol(${r.id})">✅</button> 
                        <button class="btn-secondary btn-modal-style" style="padding:6px 12px;" onclick="window.rechazarSol(${r.id})">❌</button>
                    </div>
                </li>`;
        });
    });
}

document.addEventListener('DOMContentLoaded', inicializarMenu);