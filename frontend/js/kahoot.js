// ==========================================
// js/kahoot.js - ESCUDO SUPREMO, LOBBY Y BLOQUEOS TOTALES
// ==========================================

let kahootWebSocketConectado = false;
let kahootIsQuitting = false; 
window.kahootCinematicaActiva = false; 
let kahootJustLoaded = true;
setTimeout(() => kahootJustLoaded = false, 1500);

window.kahootSafeGuard = Date.now();
window.renovarSafeguardKahoot = function() {
    window.kahootSafeGuard = Date.now();
};

document.addEventListener('change', function(e) {
    if (e.target && (e.target.id === 'pin-game-mode' || e.target.id === 'pin-game-category')) {
        window.notificarCambioLobbyKahoot();
    }
});

// 🔥 1. EL ESCUDO: Asegura que la pantalla visible sea siempre la correcta ante F5 🔥
setInterval(() => {
    if (kahootIsQuitting || window.kahootCinematicaActiva) return; 

    if (sessionStorage.getItem('is_pin_room') === 'true') {
        let targetHash = '#screen-lobby-code';
        const inGame = sessionStorage.getItem('current_game_mode') !== null;
        
        if (inGame) {
            const resultsActive = 
                document.getElementById('kr-host-view').style.display === 'flex' || 
                document.getElementById('kr-guest-view').style.display === 'flex' ||
                document.getElementById('kr-guest-final-view').style.display === 'flex' ||
                document.getElementById('kr-host-podium').style.display === 'flex';
            
            targetHash = resultsActive ? '#screen-result-code' : '#screen-game-code';
        }

        const currentHash = window.location.hash;
        
        if (currentHash !== targetHash && currentHash !== '') {
            window.history.replaceState(null, null, targetHash);
        }

        document.querySelectorAll('.screen').forEach(s => {
            if ('#' + s.id === targetHash) {
                if (s.style.display === 'none' || s.classList.contains('hidden')) {
                    s.classList.remove('hidden');
                    s.style.display = 'flex';
                }
            } else {
                if (s.style.display !== 'none' && ['screen-lobby-code', 'screen-game-code', 'screen-result-code'].includes(s.id)) {
                    s.classList.add('hidden');
                    s.style.display = 'none';
                }
            }
        });
    }
}, 50);

// 🔥 GESTOR DE CONEXIÓN ROBUSTO 🔥
setInterval(() => {
    if (kahootIsQuitting) return;

    if (sessionStorage.getItem('is_pin_room') === 'true') {
        const myName = sessionStorage.getItem('genius_username');
        const isGuest = sessionStorage.getItem('is_guest') === 'true';
        const gameId = sessionStorage.getItem('current_game_id');

        if (typeof stompClient !== 'undefined' && stompClient && stompClient.connected && !kahootWebSocketConectado) {
            kahootWebSocketConectado = true;
            window.suscribirseAKahoot(stompClient, myName);
            setTimeout(() => {
                const payload = JSON.stringify({ gameId: gameId, username: myName });
                if (isGuest) stompClient.send("/app/kahoot.join", {}, payload);
                else stompClient.send("/app/kahoot.sync", {}, payload);
            }, 200);
        }
    } else {
        kahootWebSocketConectado = false;
    }
}, 200);

window.arrancarPartidaKahoot = function() {
    window.renovarSafeguardKahoot(); 
    const btnStartPin = document.getElementById('btn-start-pin-game');
    if(btnStartPin) {
        btnStartPin.innerText = "⏳ CARGANDO...";
        btnStartPin.disabled = true;
        setTimeout(() => {
            btnStartPin.innerText = "🚀 INICIAR PARTIDA";
            btnStartPin.disabled = false;
        }, 3000);
    }
    const gameId = sessionStorage.getItem('current_game_id');
    const myName = sessionStorage.getItem('genius_username');
    
    const modeSelect = document.getElementById('pin-game-mode');
    const catSelect = document.getElementById('pin-game-category');
    const selectedMode = modeSelect ? modeSelect.value : "Quizziz";
    const selectedCat = catSelect ? catSelect.value : "Cultura General";

    if (typeof stompClient !== 'undefined' && stompClient !== null && stompClient.connected && gameId) {
        stompClient.send("/app/kahoot.start", {}, JSON.stringify({ 
            gameId: gameId, 
            username: myName,
            mode: selectedMode,
            category: selectedCat
        }));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.history.pushState({kahootLock: true}, null, window.location.href);

    // 🔥 NUEVO: RADAR DE INVITADOS POR QR 🔥
    const urlParams = new URLSearchParams(window.location.search);
    const pinDesdeUrl = urlParams.get('pin');
    
    // Si la URL trae un PIN y el jugador no está ya en una sala...
    if (pinDesdeUrl && !sessionStorage.getItem('is_pin_room')) {
        setTimeout(() => {
            window.abrirModalInvitado();
            const pinInput = document.getElementById('guest-pin-input');
            const nickInput = document.getElementById('guest-nick-input');
            
            if (pinInput) {
                pinInput.value = pinDesdeUrl;
                pinInput.readOnly = true; // Lo bloqueamos para que no lo borre por accidente
                pinInput.style.opacity = '0.7'; 
            }
            if (nickInput) {
                nickInput.focus(); // Le ponemos el cursor directamente en el nombre
            }
            // Limpiamos la URL de arriba para que quede limpia y profesional
            window.history.replaceState(null, null, window.location.pathname);
        }, 500); 
    }

    const isPinRoom = sessionStorage.getItem('is_pin_room') === 'true';
    if (isPinRoom) {
        const gameId = sessionStorage.getItem('current_game_id');
        const isHost = sessionStorage.getItem('genius_username') === sessionStorage.getItem('current_host_name');
        
        if (sessionStorage.getItem('current_game_mode') === null) {
            window.prepararVistaSalaKahoot(isHost, gameId);
        } else {
            if (typeof window.restaurarEstadoF5Kahoot === "function") window.restaurarEstadoF5Kahoot();
        }

        const cachedData = sessionStorage.getItem('kahoot_last_data');
        if (cachedData) actualizarInterfazKahoot(JSON.parse(cachedData));
    }

    const btnStartPin = document.getElementById('btn-start-pin-game');
    if(btnStartPin) btnStartPin.onclick = window.arrancarPartidaKahoot;
    
    const btnLeavePin = document.getElementById('btn-leave-pin-lobby');
    if(btnLeavePin) btnLeavePin.onclick = () => window.salirDeKahoot(true);
});

window.notificarCambioLobbyKahoot = function() {
    const gameId = sessionStorage.getItem('current_game_id');
    const myName = sessionStorage.getItem('genius_username');
    const isHost = myName === sessionStorage.getItem('current_host_name');
    if (isHost && typeof stompClient !== 'undefined' && stompClient && stompClient.connected) {
        stompClient.send("/app/kahoot.settings", {}, JSON.stringify({ gameId: gameId, username: myName, mode: document.getElementById('pin-game-mode').value, category: document.getElementById('pin-game-category').value }));
    }
};

window.abrirModalInvitado = function() {
    const modal = document.getElementById('guest-login-modal');
    if(modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
};

window.cerrarModalInvitado = function() {
    const modal = document.getElementById('guest-login-modal');
    if(modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
};

window.loginInvitado = function(e) {
    if(e) e.preventDefault();
    const pin = document.getElementById('guest-pin-input').value.trim();
    const nick = document.getElementById('guest-nick-input').value.trim();

    if(!pin || !nick) return window.mostrarToastError("⚠️ Introduce el PIN de la sala y tu apodo.");

    kahootIsQuitting = false; 
    const baseUrl = window.API_BASE_URL || ''; 

    fetch(`${baseUrl}/api/kahoot/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin, username: nick })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            window.renovarSafeguardKahoot(); 
            sessionStorage.setItem('genius_token', data.token);
            sessionStorage.setItem('genius_username', data.user.username);
            sessionStorage.setItem('genius_avatar', 'images/invitado.jpg');
            sessionStorage.setItem('is_guest', 'true');
            sessionStorage.setItem('is_pin_room', 'true');
            sessionStorage.setItem('current_game_id', pin);
            
            window.cerrarModalInvitado();
            window.prepararVistaSalaKahoot(false, pin);
            
            for(let i=0; i<5; i++) {
                window.history.pushState({kahootLock: true}, null, window.location.href);
            }
            
            if (typeof conectarWebSocket === "function") conectarWebSocket(data.token, data.user.username);
        } else { window.mostrarToastError("❌ Error: " + data.message); }
    })
    .catch(err => window.mostrarToastError("❌ Error de conexión con el servidor. El PIN podría ser incorrecto."));
};

window.crearSalaPIN = function() {
    window.renovarSafeguardKahoot(); 
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const username = sessionStorage.getItem('genius_username');
    kahootIsQuitting = false;
    sessionStorage.setItem('current_game_id', pin);
    sessionStorage.setItem('current_host_name', username);
    sessionStorage.setItem('is_pin_room', 'true');
    sessionStorage.removeItem('kahoot_last_data'); 
    window.prepararVistaSalaKahoot(true, pin);

    for(let i=0; i<5; i++) {
        window.history.pushState({kahootLock: true}, null, window.location.href);
    }

    if (typeof stompClient !== 'undefined' && stompClient !== null && stompClient.connected) {
        window.suscribirseAKahoot(stompClient, username);
        kahootWebSocketConectado = true;
        setTimeout(() => { stompClient.send("/app/kahoot.create", {}, JSON.stringify({ gameId: pin, username: username })); }, 100);
    }
};

window.prepararVistaSalaKahoot = function(isHost, pin) {
    document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.style.display = 'none'; });
    const sLobbyCode = document.getElementById('screen-lobby-code');
    if(sLobbyCode) { sLobbyCode.classList.remove('hidden'); sLobbyCode.style.display = 'flex'; }
    window.history.replaceState(null, null, '#screen-lobby-code');

    const hostArea = document.getElementById('pin-host-area');
    const hostControls = document.getElementById('pin-host-controls');
    const hostSettings = document.getElementById('pin-host-settings');
    
    const btnEnd = document.getElementById('btn-force-end-game');
    if(btnEnd) btnEnd.style.display = 'none';

    if (isHost) {
        if(hostArea) hostArea.style.display = 'flex';
        if(hostControls) hostControls.style.display = 'block';
        if(hostSettings) hostSettings.style.display = 'flex';
        
        const display = document.getElementById('lobby-pin-display');
        if(display) display.innerText = pin;

        // 🔥 NUEVO: GENERAR EL QR AL VUELO 🔥
        const qrImg = document.getElementById('lobby-qr-code');
        if (qrImg) {
            // Creamos el link exacto de tu web pasándole el PIN por la URL
            const joinUrl = window.location.origin + window.location.pathname + '?pin=' + pin;
            // Usamos una API gratuita que nos devuelve la foto del QR al instante
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(joinUrl)}&color=000000&bgcolor=ffffff`;            qrImg.style.display = 'block';
        }

        const catSelect = document.getElementById('pin-game-category'); 
        if (catSelect && catSelect.children.length <= 1) {
            const baseUrl = window.API_BASE_URL || '';
            fetch(`${baseUrl}/api/game/categories`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
            .then(res => res.json())
            .then(categorias => {
                catSelect.innerHTML = "<option value='Cultura General'>Cultura General</option>";
                categorias.forEach(cat => { if (cat.name !== "Cultura General") catSelect.innerHTML += `<option value='${cat.name}'>${cat.name}</option>`; });
            });
        }
    } else {
        if(hostArea) hostArea.style.display = 'none';
        if(hostControls) hostControls.style.display = 'none';
        if(hostSettings) hostSettings.style.display = 'none';
    }
};

window.suscribirseAKahoot = function(stompClient, username) {
    if (window.kahootSub) window.kahootSub.unsubscribe();
    if (window.kahootErrSub) window.kahootErrSub.unsubscribe();

    window.kahootSub = stompClient.subscribe('/topic/kahoot.' + username, function(message) {
        const data = JSON.parse(message.body);
        if (data.type === "KAHOOT_UPDATE") actualizarInterfazKahoot(data);
        else if (data.type === "KAHOOT_CLOSED") {
            const isHost = sessionStorage.getItem('genius_username') === sessionStorage.getItem('current_host_name');
            if (!isHost) {
                // Notificación exclusiva para el invitado
                if (typeof window.mostrarToastError === "function") {
                    window.mostrarToastError("⚠️ La sala ha sido cerrada por el anfitrión.");
                } else {
                    alert("El anfitrión ha cerrado la sala.");
                }
                setTimeout(() => { window.salirDeKahoot(false); }, 1500);
            }
        }
        else if (data.type === "KAHOOT_BACK_TO_LOBBY") {
            window.renovarSafeguardKahoot(); 
            const isHost = sessionStorage.getItem('genius_username') === sessionStorage.getItem('current_host_name');
            
            if (data.forced) {
                if (isHost) {
                    if (typeof window.mostrarToastInfo === "function") window.mostrarToastInfo("🛑 Has finalizado la partida.");
                    else alert("Has finalizado la partida.");
                } else {
                    if (typeof window.mostrarToastInfo === "function") window.mostrarToastInfo("🛑 El anfitrión ha finalizado la partida.");
                    else alert("El anfitrión ha finalizado la partida.");
                }
                
                if(window.guestReturnInterval) clearInterval(window.guestReturnInterval);
                sessionStorage.removeItem('current_game_mode');
                window.prepararVistaSalaKahoot(isHost, sessionStorage.getItem('current_game_id'));
                return;
            }

            if (isHost) {
                sessionStorage.removeItem('current_game_mode');
                window.prepararVistaSalaKahoot(true, sessionStorage.getItem('current_game_id'));
            } else {
                const finalView = document.getElementById('kr-guest-final-view');
                if (finalView && finalView.style.display === 'flex') {
                    const timerEl = document.getElementById('kr-guest-return-timer');
                    timerEl.style.display = 'block';
                    let timeLeft = 60;
                    timerEl.innerText = `El anfitrión volvió. Regresando a la sala en ${timeLeft}s...`;
                    
                    if(window.guestReturnInterval) clearInterval(window.guestReturnInterval);
                    window.guestReturnInterval = setInterval(() => {
                        timeLeft--;
                        timerEl.innerText = `El anfitrión volvió. Regresando a la sala en ${timeLeft}s...`;
                        if (timeLeft <= 0) {
                            clearInterval(window.guestReturnInterval);
                            if (typeof window.mostrarToastInfo === "function") window.mostrarToastInfo("Tiempo de ver tu puntuación agotado. Volviendo a la sala.");
                            window.invitadoVolverSala();
                        }
                    }, 1000);
                } else {
                    sessionStorage.removeItem('current_game_mode');
                    window.prepararVistaSalaKahoot(false, sessionStorage.getItem('current_game_id'));
                }
            }
        }
        else if (data.type === "KAHOOT_GAME_ABORTED") {
            window.renovarSafeguardKahoot(); 
            window.mostrarToastError("⚠️ El anfitrión ha cancelado la partida.");
            sessionStorage.removeItem('current_game_mode');
            const isHost = sessionStorage.getItem('genius_username') === sessionStorage.getItem('current_host_name');
            window.prepararVistaSalaKahoot(isHost, sessionStorage.getItem('current_game_id'));
        }
    });

    if (window.kahootStartSub) window.kahootStartSub.unsubscribe();
    window.kahootStartSub = stompClient.subscribe('/topic/kahoot.start.' + username, function(message) {
        const data = JSON.parse(message.body);
        window.kahootCinematicaActiva = true; 
        if (typeof window.iniciarCinematicaKahoot === "function") window.iniciarCinematicaKahoot(data);
    });

    if(window.kahootReconSub) window.kahootReconSub.unsubscribe();
    window.kahootReconSub = stompClient.subscribe('/topic/kahoot.reconnect.' + username, function(message) {
        sessionStorage.setItem('current_game_mode', 'Kahoot');
        if (typeof window.reconectarJuegoKahoot === "function") window.reconectarJuegoKahoot();
    });

    if(window.kahootErrSub) window.kahootErrSub.unsubscribe();
    window.kahootErrSub = stompClient.subscribe('/topic/kahoot.error.' + username, function(message) {
        window.mostrarToastError("❌ Aviso: " + message.body);
        setTimeout(() => window.salirDeKahoot(false), 3000);
    });
};

function actualizarInterfazKahoot(data) {
    sessionStorage.setItem('kahoot_last_data', JSON.stringify(data)); 
    
    const count = document.getElementById('pin-players-count');
    if (count) count.innerText = data.players.length;

    const list = document.getElementById('lobby-pin-players-list');
    if (list) {
        list.innerHTML = "";
        data.players.forEach((p) => {
            list.innerHTML += `<li style="background: ${p.isHost ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.1)'}; padding: 10px 20px; border-radius: 20px; display: flex; align-items: center; gap: 10px; border: 2px solid ${p.isHost ? '#FFD700' : '#03DAC6'}; font-weight: bold; color: ${p.isHost ? '#FFD700' : 'white'};"><img src="${p.fotoPerfil}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;"><span>${p.username} ${p.isHost ? '👑' : ''}</span></li>`;
        });
    }
}

// 🔥 ESCUDO ACTIVO: BLOQUEO INCONDICIONAL DE PESTAÑA 🔥
window.salirDeKahoot = function(enviarAlBackend = true) {
    if (kahootIsQuitting) return;
    kahootIsQuitting = true; 
    
    const gameId = sessionStorage.getItem('current_game_id');
    const isGuest = sessionStorage.getItem('is_guest') === 'true';
    const myName = sessionStorage.getItem('genius_username');
    const isHost = myName === sessionStorage.getItem('current_host_name');

    // Muro visual inquebrantable
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.9);z-index:9999999;cursor:wait;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#FFD700;font-family:sans-serif;';
    div.innerHTML = `<h1 style="font-size:2.5rem;text-shadow:0 0 20px #FFD700;">${isHost && enviarAlBackend ? "Destruyendo sala..." : "Saliendo..."}</h1><p style="color:white; margin-top:10px;">Desconectando de forma segura...</p>`;
    document.body.appendChild(div);

    const performExit = () => {
        if (window.kahootSub) { window.kahootSub.unsubscribe(); window.kahootSub = null; }
        if (window.kahootErrSub) { window.kahootErrSub.unsubscribe(); window.kahootErrSub = null; }
        if (window.kahootReconSub) { window.kahootReconSub.unsubscribe(); window.kahootReconSub = null; }
        if (window.kahootStartSub) { window.kahootStartSub.unsubscribe(); window.kahootStartSub = null; }
        if (window.kahootGameSub) { window.kahootGameSub.unsubscribe(); window.kahootGameSub = null; }
        kahootWebSocketConectado = false;

        sessionStorage.removeItem('current_game_id');
        sessionStorage.removeItem('current_host_name');
        sessionStorage.removeItem('is_pin_room');
        sessionStorage.removeItem('kahoot_last_data');
        sessionStorage.removeItem('kahoot_last_game_data');
        sessionStorage.removeItem('kahoot_guest_answered');
        sessionStorage.removeItem('current_game_mode');

        document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.style.display = 'none'; });

        if(isGuest) {
            if (typeof stompClient !== 'undefined' && stompClient !== null) {
                stompClient.disconnect();
            }
            sessionStorage.clear();
            window.location.replace(window.location.pathname + window.location.search + '#screen-login');
        } else {
            window.location.replace(window.location.pathname + window.location.search + '#screen-menu');
        }
        window.location.reload(); 
    };

    if (enviarAlBackend && gameId && myName) {
        const payload = { 
            gameId: gameId, 
            intentional: "true", 
            username: myName, 
            role: isHost ? "HOST" : "GUEST" 
        };

        if (isHost) {
            let ticks = 0;
            // 🛡️ AMETRALLADORA STOMP: Enviamos la orden 5 veces por si el F5 ha provocado pérdida de paquetes.
            const fireStomp = setInterval(() => {
                ticks++;
                if (typeof stompClient !== 'undefined' && stompClient !== null && stompClient.connected) {
                    try { stompClient.send("/app/kahoot.leave", {}, JSON.stringify(payload)); } catch(e){}
                }
                
                // 🛡️ BLOQUEO INCONDICIONAL: El navegador TIENE PROHIBIDO recargar la pestaña antes de 1.5 segundos (5 ticks de 300ms).
                // Esto garantiza matemáticamente que Java reciba la orden, haga el barrido de invitados y los expulse por la red.
                if (ticks >= 5) {
                    clearInterval(fireStomp);
                    setTimeout(performExit, 500); 
                }
            }, 300);
            
        } else {
            if (typeof stompClient !== 'undefined' && stompClient !== null && stompClient.connected) {
                try { stompClient.send("/app/kahoot.leave", {}, JSON.stringify(payload)); } catch(e){}
            }
            setTimeout(performExit, 500);
        }
    } else {
        performExit();
    }
};

window.addEventListener('beforeunload', (e) => {
    if (sessionStorage.getItem('is_pin_room') === 'true' && !kahootIsQuitting) {
        e.preventDefault();
        e.returnValue = '¿Cerrar partida?';
        return '¿Cerrar partida?';
    }
});

// 🔥 MURO NUCLEAR: Bloqueo inquebrantable de la flecha de atrás. Nada de auto-salirDeKahoot(true). 🔥
window.addEventListener('popstate', (e) => {
    if (kahootIsQuitting || kahootJustLoaded) return; 
    
    const isPinRoom = sessionStorage.getItem('is_pin_room') === 'true';
    if (isPinRoom) {
        let targetHash = '#screen-lobby-code';
        const inGame = sessionStorage.getItem('current_game_mode') !== null;

        if (inGame) {
            const resultsActive = 
                document.getElementById('kr-host-view').style.display === 'flex' || 
                document.getElementById('kr-guest-view').style.display === 'flex' ||
                document.getElementById('kr-guest-final-view').style.display === 'flex' ||
                document.getElementById('kr-host-podium').style.display === 'flex';
            
            targetHash = resultsActive ? '#screen-result-code' : '#screen-game-code';
        }

        window.history.pushState({kahootLock: true}, null, targetHash);
        window.history.pushState({kahootLock: true}, null, targetHash);
    }
});

window.invitadoVolverSala = function() {
    window.renovarSafeguardKahoot(); 
    if(window.guestReturnInterval) clearInterval(window.guestReturnInterval);
    sessionStorage.removeItem('current_game_mode');
    window.prepararVistaSalaKahoot(false, sessionStorage.getItem('current_game_id'));
};