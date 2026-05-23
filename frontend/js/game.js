// ==========================================
// js/game.js - VERSIÓN COMPLETA: REHIDRATACIÓN TOTAL SIN PERDIDA DE DATOS 🤫🎲🃏
// ==========================================

let preguntas = [];
let preguntaActual = 0;
let temporizador = null;
let gameIdActual = "";
let respuestaElegida = null;
let tiempoRestanteGlobal = 15;
let gameOverData = null; 

let estoyEliminado = false;
let alivePlayers = [];
let targetSpectatorIndex = 0;
let respuestasRondaLive = {}; 

const ALL_WILDCARDS = [
    { id: '5050', name: '50:50', icon: '✂️', desc: 'Elimina 2 respuestas incorrectas.' },
    { id: 'CAMBIO', name: 'Cambio', icon: '🔄', desc: 'Sustituye la pregunta actual para ti.' },
    { id: 'RULETA', name: 'Ruleta', icon: '🎰', desc: 'Elimina de 0 a 3 fallos al azar.' },
    { id: 'BOMBA', name: 'Bomba', icon: '💣', desc: 'Fuerza una pregunta nueva para TODOS.' },
    { id: 'ANGEL', name: 'Ángel', icon: '👼', desc: 'Revive el último comodín gastado.' }
];
let myWildcards = [];
let usedWildcards = [];
let lastUsedWildcard = null;
let localSubstituteQuestion = null; 

window.addEventListener('beforeunload', () => {
    // 🔥 FIX F5: Comentado para evitar auto-sabotaje al recargar la página.
    // El botón abandonar ya se encarga de salir de forma oficial.
});

document.addEventListener('DOMContentLoaded', () => {
    const btnAbandon = document.getElementById('btn-abandon-game');
    const modalAbandon = document.getElementById('abandon-modal');
    const btnConfirmLobby = document.getElementById('btn-confirm-abandon-lobby');
    const btnCancel = document.getElementById('btn-cancel-abandon');

    if (btnAbandon) {
        btnAbandon.addEventListener('click', () => {
            if (modalAbandon) { modalAbandon.classList.remove('hidden'); modalAbandon.style.display = 'flex'; }
        });
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            if (modalAbandon) { modalAbandon.classList.add('hidden'); modalAbandon.style.display = 'none'; }
        });
    }

    if (btnConfirmLobby) {
        btnConfirmLobby.addEventListener('click', () => {
            if (stompClient && stompClient.connected) {
                stompClient.send("/app/game.leave", {}, JSON.stringify({ gameId: gameIdActual }));
            }
            if (modalAbandon) { modalAbandon.classList.add('hidden'); modalAbandon.style.display = 'none'; }
            resetearVistasDeJuego();
            window.location.replace(window.location.pathname + window.location.search + '#screen-lobby');
            if (typeof cambiarPantalla === "function") cambiarPantalla(document.getElementById('screen-game'), document.getElementById('screen-lobby'));
        });
    }
});

function inicializarJuego(gameData) {
    gameIdActual = gameData.gameId;
    preguntaActual = 0;
    gameOverData = null; 
    estoyEliminado = false;
    respuestasRondaLive = {};
    localSubstituteQuestion = null;

    const isBR = sessionStorage.getItem('current_game_mode') === "Battle Royale";
    
    // Limpiamos la caché local de partidas anteriores por si acaso
    sessionStorage.removeItem(`my_wildcards_${gameIdActual}`);
    sessionStorage.removeItem(`used_wildcards_${gameIdActual}`);
    sessionStorage.removeItem(`last_used_wildcard_${gameIdActual}`);

    myWildcards = [];
    usedWildcards = [];
    lastUsedWildcard = null;
    
    if (document.getElementById('btn-wildcards')) document.getElementById('btn-wildcards').style.display = 'none';
    if (document.getElementById('global-chat-btn')) document.getElementById('global-chat-btn').style.display = 'none';

    if (!isBR) {
        let shuffled = [...ALL_WILDCARDS].sort(() => 0.5 - Math.random());
        myWildcards = shuffled.slice(0, 3);
        sessionStorage.setItem(`my_wildcards_${gameIdActual}`, JSON.stringify(myWildcards)); // Guardado en Caché
        window.renderWildcards();
    }

    const playersStr = sessionStorage.getItem('current_game_players');
    alivePlayers = playersStr ? JSON.parse(playersStr) : [];
    targetSpectatorIndex = 0;
    
    document.getElementById('game-loading').style.display = 'none';
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('game-results').style.display = 'none';
    document.getElementById('spectator-controls').style.display = 'none';
    
    const scoreElement = document.querySelector('.score');
    if (scoreElement) scoreElement.textContent = isBR ? "🏆 Aciertos: 0" : "🏆 Puntuación: 0 pts";

    const btnAbandon = document.getElementById('btn-abandon-game');
    if(btnAbandon) { btnAbandon.style.display = 'none'; btnAbandon.classList.add('hidden'); }

    ejecutarIntroEpica(() => {
        descargarPreguntasConReintento();
    });
}

window.toggleWildcards = function() {
    const panel = document.getElementById('wildcards-panel');
    if (panel) panel.classList.toggle('open');
};

window.renderWildcards = function() {
    const list = document.getElementById('wildcards-list');
    if (!list) return;
    list.innerHTML = '';
    myWildcards.forEach(w => {
        const isUsed = usedWildcards.includes(w.id);
        list.innerHTML += `
            <div class="wildcard-btn ${isUsed ? 'used' : ''}" onclick="window.usarComodin('${w.id}')">
                <span style="font-size:2rem;">${w.icon}</span>
                <div style="display:flex; flex-direction:column; text-align:left;">
                    <span style="color:#FFD700; font-size:1.1rem;">${w.name}</span>
                    <span style="color:#aaa; font-size:0.8rem; font-weight:normal;">${w.desc}</span>
                </div>
            </div>
        `;
    });
};

window.usarComodin = function(id) {
    if (usedWildcards.includes(id)) return;
    if (respuestaElegida !== null || estoyEliminado) {
        window.mostrarToastError("No puedes usar un comodín ahora mismo.");
        return; 
    }

    if (id !== 'ANGEL') {
        usedWildcards.push(id);
        lastUsedWildcard = id;
    } else {
        usedWildcards.push('ANGEL');
        if (lastUsedWildcard) {
            usedWildcards = usedWildcards.filter(w => w !== lastUsedWildcard);
        } else {
            window.mostrarToastError("No hay ningún comodín gastado para revivir.");
            return;
        }
    }
    
    // 🔥 Guardar estado de comodines en Caché local por si hay F5
    sessionStorage.setItem(`used_wildcards_${gameIdActual}`, JSON.stringify(usedWildcards));
    if (lastUsedWildcard) sessionStorage.setItem(`last_used_wildcard_${gameIdActual}`, lastUsedWildcard);

    window.renderWildcards();
    window.toggleWildcards(); 

    const wc = ALL_WILDCARDS.find(w => w.id === id);
    const myName = sessionStorage.getItem('genius_username');
    const lobbyId = sessionStorage.getItem('current_game_id'); 

    if (stompClient && stompClient.connected && lobbyId) {
        stompClient.send("/app/chat.room", {}, JSON.stringify({ 
            gameId: lobbyId, 
            message: `🤖 SISTEMA: ¡${myName} ha utilizado el comodín ${wc.icon} ${wc.name}!` 
        }));
    }

    const btnOptions = Array.from(document.querySelectorAll('.option-button'));
    const currentQ = localSubstituteQuestion || preguntas[preguntaActual];
    const correctText = currentQ.correctAnswer || currentQ.correct; 
    let wrongBtns = btnOptions.filter(b => b.textContent !== correctText);

    if (id === '5050') {
        wrongBtns.sort(() => 0.5 - Math.random());
        wrongBtns[0].style.opacity = '0.2'; wrongBtns[0].style.pointerEvents = 'none';
        wrongBtns[1].style.opacity = '0.2'; wrongBtns[1].style.pointerEvents = 'none';
    } 
    else if (id === 'RULETA') {
        // 🎰 Calculamos el resultado final pero lo mostramos DESPUÉS de la animación
        let count = Math.floor(Math.random() * 4);
        wrongBtns.sort(() => 0.5 - Math.random());

        // Creamos el overlay de la ruleta giratoria
        const rouletteOverlay = document.createElement('div');
        rouletteOverlay.id = 'roulette-overlay';
        rouletteOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.82); z-index: 9999;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            animation: fadeInOverlay 0.3s ease;
        `;

        const nums = [0, 1, 2, 3];
        const SPIN_MS   = 2200;   // duración del giro
        const SETTLE_MS = 800;    // tiempo mostrando el resultado antes de cerrar

        rouletteOverlay.innerHTML = `
            <style>
                @keyframes fadeInOverlay { from { opacity:0; } to { opacity:1; } }
                @keyframes spinNumber {
                    0%   { transform: translateY(0)   scale(1);    opacity:1; }
                    40%  { transform: translateY(-18px) scale(1.3); opacity:1; }
                    60%  { transform: translateY(8px)  scale(0.9);  opacity:0.7; }
                    100% { transform: translateY(0)   scale(1);    opacity:1; }
                }
                .roulette-num {
                    animation: spinNumber 0.18s ease-in-out infinite;
                }
                .roulette-settled {
                    transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
                    transform: scale(1.4) !important;
                    animation: none !important;
                }
            </style>
            <div style="text-align:center;">
                <div style="font-size:3rem; margin-bottom:10px;">🎰</div>
                <div style="font-size:1.1rem; color:#ccc; margin-bottom:18px; letter-spacing:2px; text-transform:uppercase;">Girando la Ruleta...</div>
                <div style="
                    width: 140px; height: 140px;
                    border-radius: 50%;
                    border: 6px solid #FFD700;
                    box-shadow: 0 0 30px #FFD700, inset 0 0 20px rgba(255,215,0,0.15);
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 20px auto;
                    background: radial-gradient(circle, #1a0a3a, #0d0d0d);
                ">
                    <span id="roulette-number" class="roulette-num" style="
                        font-size: 4rem; font-weight: 900;
                        color: #FFD700;
                        text-shadow: 0 0 20px #FFD700;
                        display:inline-block;
                    ">?</span>
                </div>
                <div style="font-size:0.95rem; color:#aaa;">Fallos eliminados: <strong id="roulette-label" style="color:#FFD700;">…</strong></div>
            </div>
        `;
        document.body.appendChild(rouletteOverlay);

        const numEl   = document.getElementById('roulette-number');
        const labelEl = document.getElementById('roulette-label');

        // Giro aleatorio continuo
        const spinInterval = setInterval(() => {
            numEl.textContent = nums[Math.floor(Math.random() * nums.length)];
        }, 120);

        // Parar en el resultado real
        setTimeout(() => {
            clearInterval(spinInterval);
            numEl.textContent = count;
            numEl.classList.remove('roulette-num');
            numEl.classList.add('roulette-settled');
            numEl.style.color = count === 0 ? '#F44336' : '#4CAF50';
            numEl.style.textShadow = count === 0
                ? '0 0 20px #F44336'
                : '0 0 20px #4CAF50';
            if (labelEl) labelEl.textContent = count === 0
                ? '¡Ninguno! (mala suerte)'
                : count === 3 ? '¡Los 3! (máximo)' : count;
        }, SPIN_MS);

        // Cerrar overlay y aplicar el efecto real
        setTimeout(() => {
            rouletteOverlay.style.transition = 'opacity 0.3s';
            rouletteOverlay.style.opacity = '0';
            setTimeout(() => {
                if (rouletteOverlay.parentNode) rouletteOverlay.parentNode.removeChild(rouletteOverlay);
                for (let i = 0; i < count; i++) {
                    wrongBtns[i].style.opacity = '0.2';
                    wrongBtns[i].style.pointerEvents = 'none';
                }
            }, 300);
        }, SPIN_MS + SETTLE_MS);
    }
    else if (id === 'CAMBIO') {
        fetch(`${window.API_BASE_URL}/api/game/random`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` } })
        .then(res => res.json())
        .then(data => {
            localSubstituteQuestion = data;
            document.querySelector('.question').textContent = `🔄 (CAMBIO) ${data.questionText}`;
            let mix = [data.correctAnswer, data.wrongAnswer1, data.wrongAnswer2, data.wrongAnswer3].sort(() => 0.5 - Math.random());
            const opContainer = document.querySelector('.options');
            opContainer.innerHTML = '';
            
            mix.forEach(op => {
                const b = document.createElement('button');
                b.textContent = op;
                b.classList.add('option-button');
                b.onclick = () => {
                    if (respuestaElegida !== null || estoyEliminado) return;
                    respuestaElegida = op;
                    sessionStorage.setItem(`respuesta_elegida_${gameIdActual}_${preguntaActual}`, op); // Guardar si ha respondido
                    clearInterval(temporizador);
                    b.style.border = "3px solid #FFD700";
                    document.querySelectorAll('.option-button').forEach(btn => btn.style.pointerEvents = 'none');
                    if (op === data.correctAnswer) {
                        enviarRespuesta(gameIdActual, preguntas[preguntaActual].correctAnswer);
                    } else {
                        enviarRespuesta(gameIdActual, "WRONG_ANSWER");
                    }
                    document.querySelector('.timer').textContent = "¡Respuesta enviada! Esperando... ⏳";
                };
                opContainer.appendChild(b);
            });
        });
    }
    else if (id === 'BOMBA') {
        if (stompClient && stompClient.connected) {
            stompClient.send("/app/game.bomb", {}, JSON.stringify({ gameId: gameIdActual })); 
        }
    }
};

window.aplicarBombaLive = function(update) {
    respuestaElegida = null;
    sessionStorage.removeItem(`respuesta_elegida_${gameIdActual}_${preguntaActual}`); // Limpiamos si tiran bomba
    clearInterval(temporizador);
    localSubstituteQuestion = null;
    
    let newQ = JSON.parse(update.correctAnswer);
    preguntas[preguntaActual] = {
        questionText: "💣 " + newQ.text,
        correctAnswer: newQ.correct,
        wrongAnswer1: newQ.w1,
        wrongAnswer2: newQ.w2,
        wrongAnswer3: newQ.w3
    };
    
    // Eliminamos el guardado del timer para que se reinicie
    sessionStorage.removeItem(`q_end_time_${gameIdActual}_${preguntaActual}`);
    sessionStorage.removeItem(`opciones_${gameIdActual}_${preguntaActual}`);
    mostrarPregunta(); 
};

function ejecutarIntroEpica(callback) {
    const introBox = document.getElementById('game-intro');
    const title = document.getElementById('intro-title');
    const mode = document.getElementById('intro-mode');
    const cat = document.getElementById('intro-category');
    const start = document.getElementById('intro-start');

    const curMode = sessionStorage.getItem('current_game_mode') || "Quizziz";
    const curCat = sessionStorage.getItem('current_game_category') || "Cultura General";

    mode.innerText = `MODO: ${curMode.toUpperCase()}`;
    cat.innerText = `CATEGORÍA: ${curCat.toUpperCase()}`;

    introBox.style.display = 'flex';
    title.style.opacity = '0'; title.style.transform = 'scale(0.5)';
    mode.style.opacity = '0'; mode.style.transform = 'translateY(20px)';
    cat.style.opacity = '0'; cat.style.transform = 'translateY(20px)';
    start.style.opacity = '0'; start.style.transform = 'scale(2)';

    setTimeout(() => { title.style.opacity = '1'; title.style.transform = 'scale(1)'; }, 500);
    setTimeout(() => { mode.style.opacity = '1'; mode.style.transform = 'translateY(0)'; }, 1500);
    setTimeout(() => { cat.style.opacity = '1'; cat.style.transform = 'translateY(0)'; }, 2500);
    setTimeout(() => { 
        start.style.opacity = '1'; start.style.transform = 'scale(1)'; 
        introBox.style.background = 'radial-gradient(circle, #F44336, #000)';
    }, 3500);
    
    setTimeout(() => {
        introBox.style.opacity = '0';
        setTimeout(() => {
            introBox.style.display = 'none';
            introBox.style.opacity = '1';
            introBox.style.background = 'radial-gradient(circle, #2D0A4E, #000)';
            callback();
        }, 500);
    }, 5000);
}

function descargarPreguntasConReintento() {
    fetch(`${window.API_BASE_URL}/api/game/${gameIdActual}/questions`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` }
    })
    .then(res => {
        if (!res.ok) throw new Error("Aún no se ha guardado en BD");
        return res.json();
    })
    .then(data => {
        preguntas = data; 
        mostrarPregunta();
    })
    .catch(err => {
        setTimeout(descargarPreguntasConReintento, 1000);
    });
}

function mostrarPregunta() {
    const loadingScreen = document.getElementById('game-loading');
    const gameUI = document.getElementById('game-ui');
    const podium = document.getElementById('game-results');
    
    localSubstituteQuestion = null;
    const isBR = sessionStorage.getItem('current_game_mode') === "Battle Royale";
    
    if (!isBR && document.getElementById('btn-wildcards')) {
        document.getElementById('btn-wildcards').style.display = 'flex';
        if (preguntaActual === 0) {
            setTimeout(() => {
                if (typeof window.mostrarToastInfo === "function") window.mostrarToastInfo("🃏 ¡Ya puedes consultar tus comodines!");
            }, 1000);
        }
    }

    if (document.getElementById('global-chat-btn')) {
        document.getElementById('global-chat-btn').style.display = 'flex';
    }

    if (loadingScreen) loadingScreen.style.display = 'none';
    if (gameUI) gameUI.style.display = 'flex';
    if (podium) podium.style.display = 'none';
    
    const btnAbandon = document.getElementById('btn-abandon-game');
    if(btnAbandon) {
        btnAbandon.classList.remove('hidden');
        btnAbandon.style.display = 'block';
    }

    if (preguntaActual >= preguntas.length) return;

    respuestasRondaLive = {}; 
    const pregunta = preguntas[preguntaActual];
    const preguntaElemento = document.querySelector('.question');
    const opcionesElemento = document.querySelector('.options');
    const timerElemento = document.querySelector('.timer');
    const specControls = document.getElementById('spectator-controls');

    // 🔥 Recuperar estado tras F5 🔥
    respuestaElegida = sessionStorage.getItem(`respuesta_elegida_${gameIdActual}_${preguntaActual}`) || null;
    timerElemento.style.color = "#03DAC6"; 
    timerElemento.style.animation = "none"; 

    preguntaElemento.textContent = `${preguntaActual + 1}. ${pregunta.questionText}`;
    opcionesElemento.innerHTML = '';

    // 🔥 Fijar orden de opciones tras F5 🔥
    let opcionesMezcladas = [];
    const savedOptionsStr = sessionStorage.getItem(`opciones_${gameIdActual}_${preguntaActual}`);
    if (savedOptionsStr) {
        opcionesMezcladas = JSON.parse(savedOptionsStr);
    } else {
        opcionesMezcladas = [pregunta.correctAnswer, pregunta.wrongAnswer1, pregunta.wrongAnswer2, pregunta.wrongAnswer3].sort(() => Math.random() - 0.5);
        sessionStorage.setItem(`opciones_${gameIdActual}_${preguntaActual}`, JSON.stringify(opcionesMezcladas));
    }

    opcionesMezcladas.forEach((opcion) => {
        const boton = document.createElement('button');
        boton.textContent = opcion;
        boton.classList.add('option-button');
        
        if (estoyEliminado) {
            boton.style.opacity = "0.5";
            boton.style.cursor = "not-allowed";
        } else if (respuestaElegida !== null) {
            if (respuestaElegida === opcion) {
                boton.style.border = "3px solid #FFD700";
            }
            boton.style.pointerEvents = 'none';
        } else {
            boton.addEventListener('click', () => {
                if (respuestaElegida !== null || estoyEliminado) return; 
                respuestaElegida = opcion;
                sessionStorage.setItem(`respuesta_elegida_${gameIdActual}_${preguntaActual}`, opcion); // Guardar respuesta local
                clearInterval(temporizador); 
                boton.style.border = "3px solid #FFD700";
                document.querySelectorAll('.option-button').forEach(btn => btn.style.pointerEvents = 'none');
                if (typeof enviarRespuesta === "function") enviarRespuesta(gameIdActual, opcion);
                timerElemento.textContent = "¡Respuesta enviada! Esperando a los demás... ⏳";
            });
        }
        opcionesElemento.appendChild(boton);
    });

    if (estoyEliminado) {
        specControls.style.display = 'flex';
        configurarEspectador();
        actualizarVistaEspectador(); 
    } else {
        specControls.style.display = 'none';
    }

    iniciarTemporizador();
}

function iniciarTemporizador() {
    const timerElemento = document.querySelector('.timer');
    
    // Si ya había respondido (F5), no activamos el contador regresivo visual
    if (respuestaElegida !== null && !estoyEliminado) {
        timerElemento.textContent = "¡Respuesta enviada! Esperando a los demás... ⏳";
        return;
    }

    // 🔥 Sincronización milimétrica de tiempo con Caché Local 🔥
    const savedEndTimeStr = sessionStorage.getItem(`q_end_time_${gameIdActual}_${preguntaActual}`);
    let endTime = 0;

    if (savedEndTimeStr) {
        endTime = parseInt(savedEndTimeStr);
    } else {
        endTime = Date.now() + (15 * 1000); // 15 segundos exactos desde que aparece
        sessionStorage.setItem(`q_end_time_${gameIdActual}_${preguntaActual}`, endTime);
    }

    if (temporizador) clearInterval(temporizador);

    temporizador = setInterval(() => {
        tiempoRestanteGlobal = Math.ceil((endTime - Date.now()) / 1000);
        
        if (tiempoRestanteGlobal <= 0) {
            clearInterval(temporizador); 
            if (respuestaElegida === null && !estoyEliminado) {
                respuestaElegida = "TIMEOUT";
                sessionStorage.setItem(`respuesta_elegida_${gameIdActual}_${preguntaActual}`, "TIMEOUT");
                document.querySelectorAll('.option-button').forEach(btn => btn.style.pointerEvents = 'none');
                timerElemento.style.color = "#F44336"; 
                timerElemento.textContent = "¡TIEMPO AGOTADO! ⏰ Esperando a los demás...";
                if (typeof enviarRespuesta === "function") enviarRespuesta(gameIdActual, "TIMEOUT");
            }
        } else if (respuestaElegida === null && !estoyEliminado) {
            timerElemento.textContent = `Tiempo restante: ${tiempoRestanteGlobal} segundos`;
        } else if (estoyEliminado) {
            timerElemento.textContent = `Modo Espectador: 👻 ${tiempoRestanteGlobal}s`;
        }
    }, 1000);
}

function rivalHaRespondidoLive(update) {
    respuestasRondaLive[update.winnerUsername] = update.correctAnswer;
    if (!estoyEliminado) return; 
    actualizarVistaEspectador();
}

function actualizarVistaEspectador() {
    if (!estoyEliminado) return;
    
    const myName = sessionStorage.getItem('genius_username');
    const specVivos = alivePlayers.filter(p => p !== myName);
    const targetName = specVivos[targetSpectatorIndex];

    if (!targetName) return;

    document.querySelectorAll('.option-button').forEach(btn => {
        btn.style.border = "none";
        btn.style.opacity = "0.5";
    });

    const targetAnswer = respuestasRondaLive[targetName];
    if (targetAnswer) {
        const btnSeleccionado = Array.from(document.querySelectorAll('.option-button')).find(b => b.textContent === targetAnswer);
        if (btnSeleccionado) {
            btnSeleccionado.style.border = "3px solid #FF9800";
            btnSeleccionado.style.opacity = "1";
        }
    }
}

function rivalHaRespondido() {
    if (respuestaElegida === null && tiempoRestanteGlobal > 5 && !estoyEliminado) {
        tiempoRestanteGlobal = 5;
        const timerElemento = document.querySelector('.timer');
        timerElemento.style.color = "#E91E63"; 
        timerElemento.style.animation = "pulso-logo 1s infinite"; 
    }
}

function configurarEspectador() {
    const specTarget = document.getElementById('spec-target');
    const myName = sessionStorage.getItem('genius_username');
    
    let specVivos = alivePlayers.filter(p => p !== myName);
    
    if (specVivos.length === 0) {
        specTarget.innerText = "Nadie vivo";
        return;
    }

    if (targetSpectatorIndex >= specVivos.length) targetSpectatorIndex = 0;
    
    let avatars = JSON.parse(sessionStorage.getItem('player_avatars')) || {};
    
    const updateSpecTargetUI = () => {
        let targetName = specVivos[targetSpectatorIndex];
        let avatarSrc = avatars[targetName] || 'images/default-profile.png';
        specTarget.innerHTML = `<img src="${avatarSrc}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; vertical-align:middle; margin-right:5px; border:2px solid #FF9800;"> ${targetName}`;
    };

    updateSpecTargetUI();
    
    document.getElementById('spec-prev').onclick = () => {
        targetSpectatorIndex = (targetSpectatorIndex - 1 + specVivos.length) % specVivos.length;
        updateSpecTargetUI();
        actualizarVistaEspectador();
    };
    document.getElementById('spec-next').onclick = () => {
        targetSpectatorIndex = (targetSpectatorIndex + 1) % specVivos.length;
        updateSpecTargetUI();
        actualizarVistaEspectador();
    };
}

function procesarResultadoRonda(update) {
    clearInterval(temporizador); 
    const respuestaCorrecta = update.correctAnswer;
    const eliminadosAhora = update.winnerUsername ? update.winnerUsername.split(",") : [];
    const myName = sessionStorage.getItem('genius_username');
    
    const botones = document.querySelectorAll('.option-button');
    const timerElemento = document.querySelector('.timer');
    timerElemento.style.animation = "none"; 
    
    let haAcertado = (respuestaElegida === respuestaCorrecta);

    const isBR = sessionStorage.getItem('current_game_mode') === "Battle Royale";

    let survivingCount = alivePlayers.length - eliminadosAhora.length;
    let isGameOver = isBR && survivingCount <= 1;

    const specVivos = alivePlayers.filter(p => p !== myName);
    const targetName = specVivos[targetSpectatorIndex];

    botones.forEach(btn => {
        if (btn.textContent === respuestaCorrecta) {
            btn.style.backgroundColor = '#4CAF50'; 
            btn.style.color = 'white';
            btn.style.opacity = '1';
        } else if (!estoyEliminado && btn.textContent === respuestaElegida && !haAcertado) {
            btn.style.backgroundColor = '#F44336'; 
            btn.style.color = 'white';
            btn.style.opacity = '1';
        } else if (estoyEliminado && targetName && respuestasRondaLive[targetName] === btn.textContent && btn.textContent !== respuestaCorrecta) {
            btn.style.backgroundColor = '#F44336'; 
            btn.style.color = 'white';
            btn.style.opacity = '1';
        }
    });

    if (!estoyEliminado) {
        if (haAcertado) {
            timerElemento.style.color = '#4CAF50';
            timerElemento.innerHTML = isBR ? `¡VIVES UNA RONDA MÁS! 🛡️` : `¡CORRECTO! <strong>+Pts</strong> 🎉`;
        } else {
            timerElemento.style.color = '#F44336';
            if (isBR) {
                estoyEliminado = true;
                if (!isGameOver) {
                    timerElemento.innerHTML = "💀 ¡HAS SIDO ELIMINADO! 💀";
                    if (typeof mostrarToastError === "function") mostrarToastError("💀 Caíste... Entrando en Modo Espectador.");
                } else {
                    timerElemento.innerHTML = "💀 ¡FIN DE LA PARTIDA! 💀";
                }
            } else {
                timerElemento.innerHTML = (respuestaElegida === "TIMEOUT") ? "¡MUY LENTO! ⏰" : "¡INCORRECTO! Has fallado. 😢";
            }
        }
    } else {
        timerElemento.style.color = '#FF9800';
        timerElemento.innerHTML = `La correcta era: ${respuestaCorrecta}`;
    }

    alivePlayers = alivePlayers.filter(p => !eliminadosAhora.includes(p));

    const scoreElement = document.querySelector('.score');
    if (scoreElement && update.scores) {
        const myScore = update.scores[myName] || 0;
        scoreElement.textContent = isBR ? `🏆 Aciertos: ${myScore}` : `🏆 Puntuación: ${myScore} pts`; 
    }

    setTimeout(() => {
        preguntaActual++;
        if (gameOverData) mostrarPodioFinal(gameOverData);
        else mostrarPregunta();
    }, 5000);
}

function finalizarJuego(update) {
    gameOverData = update;
    sessionStorage.setItem('saved_game_over_data', JSON.stringify(update)); // 🔥 Guardamos el podio
}

function forzarFinalAbrupto(update) {
    clearInterval(temporizador);
    gameOverData = update;
    sessionStorage.setItem('saved_game_over_data', JSON.stringify(update)); // 🔥 Guardamos el podio
    mostrarPodioFinal(update);
}

function animarDados(sortedScores, diceStr, leaderboardDiv, myUsername, isBR, skipAnimation, callback) {
    let scoreCounts = {};
    sortedScores.forEach(s => { scoreCounts[s[1]] = (scoreCounts[s[1]] || 0) + 1; });
    
    let tiedScores = new Set();
    for (let score in scoreCounts) {
        if (scoreCounts[score] > 1) tiedScores.add(parseInt(score));
    }

    // Extraemos los resultados de los dados SIEMPRE al principio
    let tieBreakerRolls = {};
    if (diceStr) {
        try {
            let cleanStr = diceStr.replace(/[{}]/g, '');
            let pairs = cleanStr.split(',');
            pairs.forEach(p => {
                let parts = p.split('=');
                if(parts.length === 2) tieBreakerRolls[parts[0].trim()] = parseInt(parts[1].trim());
            });
        } catch(e) {}
    }

    if (tiedScores.size === 0) {
        callback(sortedScores, {});
        return;
    }

    // 🔥 SALTO DE ANIMACIÓN PARA EL F5 🔥
    if (skipAnimation) {
        sortedScores.sort((a, b) => {
            if (b[1] === a[1]) return (tieBreakerRolls[b[0]] || 0) - (tieBreakerRolls[a[0]] || 0);
            return b[1] - a[1];
        });
        callback(sortedScores, tieBreakerRolls);
        return;
    }

    const titleText = document.getElementById('personal-result-title');
    const msgText = document.getElementById('personal-result-message');
    const winnerText = document.getElementById('winner-announcement');
    
    let myPlayerScore = sortedScores.find(s => s[0] === myUsername);
    if (myPlayerScore && tiedScores.has(myPlayerScore[1])) {
        if (titleText) { titleText.textContent = "🎲 ¡DESEMPATE EN CURSO! 🎲"; titleText.style.color = "#FF9800"; }
        if (msgText) msgText.textContent = "Tu posición final está por decidir...";
        if (winnerText) winnerText.textContent = "Lanzando los dados de la suerte...";
    } else {
        if (titleText) { titleText.textContent = "🎲 RESOLVIENDO EMPATES 🎲"; titleText.style.color = "#FF9800"; }
        if (msgText) msgText.textContent = "Esperando a que los demás desempaten...";
        if (winnerText) winnerText.textContent = "";
    }

    leaderboardDiv.innerHTML = "<h3 style='color:#FF9800; text-align:center;'>🎲 EMPATE DETECTADO 🎲<br><span style='font-size:0.9rem; color:#ccc;'>Lanzando dados de desempate...</span></h3>";
    
    let ul = document.createElement('ul');
    ul.style.listStyle = 'none'; ul.style.padding = '0';
    leaderboardDiv.appendChild(ul);

    let avatars = JSON.parse(sessionStorage.getItem('player_avatars')) || {};

    sortedScores.forEach(([name, pts]) => {
        let li = document.createElement('li');
        li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.alignItems = 'center';
        li.style.padding = '12px'; li.style.marginBottom = '8px';
        li.style.background = 'rgba(255,255,255,0.05)';
        li.style.borderRadius = '8px';
        
        let diceHtml = tiedScores.has(pts) ? `<span id="dice-${name}" style="font-size:1.5rem; font-weight:bold;">🎲 ?</span>` : `<span style="opacity:0.5; font-size:1.2rem;">✔️ Salvado</span>`;
        let avatarSrc = avatars[name] || 'images/default-profile.png';
        let imgHtml = `<img src="${avatarSrc}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; margin-right:10px; border:2px solid #03DAC6; vertical-align:middle;">`;
        
        li.innerHTML = `<div style="display:flex; align-items:center;">${imgHtml}<span style="font-size:1.2rem; color:white;">${name} <strong style="color:#FFD700; margin-left:5px;">(${pts} pts)</strong></span></div> ${diceHtml}`;
        ul.appendChild(li);
    });

    let interval = setInterval(() => {
        sortedScores.forEach(([name, pts]) => {
            if (tiedScores.has(pts)) {
                let el = document.getElementById(`dice-${name}`);
                if(el) el.innerText = `🎲 ${Math.floor(Math.random()*10)+1}`; 
            }
        });
    }, 150);

    setTimeout(() => {
        clearInterval(interval);
        
        sortedScores.sort((a, b) => {
            if (b[1] === a[1]) return (tieBreakerRolls[b[0]] || 0) - (tieBreakerRolls[a[0]] || 0);
            return b[1] - a[1];
        });

        sortedScores.forEach(([name, pts]) => {
            if (tiedScores.has(pts)) {
                let el = document.getElementById(`dice-${name}`);
                if(el) el.innerHTML = `<span style="color:#03DAC6; font-size:1.8rem; transform:scale(1.2); transition:all 0.3s;">🎲 ${tieBreakerRolls[name]}</span>`;
            }
        });

        setTimeout(() => callback(sortedScores, tieBreakerRolls), 3500);

    }, 4000);
}

function mostrarPodioFinal(update) {
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('spectator-controls').style.display = 'none';
    document.getElementById('btn-wildcards').style.display = 'none'; 
    document.getElementById('wildcards-panel').classList.remove('open');
    
    const btnAbandon = document.getElementById('btn-abandon-game');
    if(btnAbandon) { btnAbandon.classList.add('hidden'); btnAbandon.style.display = 'none'; }

    const podium = document.getElementById('game-results');
    if (podium) podium.style.display = 'block';
    
    const myUsername = sessionStorage.getItem('genius_username');
    const isBR = sessionStorage.getItem('current_game_mode') === "Battle Royale";

    const titleText = document.getElementById('personal-result-title');
    const msgText = document.getElementById('personal-result-message');
    const winnerText = document.getElementById('winner-announcement');

    if (titleText) { titleText.textContent = "🏆 CALCULANDO RESULTADOS 🏆"; titleText.style.color = "#FFF"; }
    if (msgText) msgText.textContent = "Procesando...";
    if (winnerText) winnerText.textContent = "";
    
    let leaderboard = document.getElementById('royale-leaderboard');
    if (!leaderboard) {
        leaderboard = document.createElement('div');
        leaderboard.id = 'royale-leaderboard';
        leaderboard.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
        leaderboard.style.borderRadius = "15px";
        leaderboard.style.padding = "20px";
        leaderboard.style.marginTop = "20px";
        leaderboard.style.marginBottom = "25px";
        leaderboard.style.boxShadow = "0 4px 15px rgba(0,0,0,0.5)";
        leaderboard.style.maxWidth = "400px";
        leaderboard.style.margin = "20px auto";
        winnerText.parentNode.insertBefore(leaderboard, winnerText.nextSibling);
    }

    if (update.scores) {
        let sortedScores = Object.entries(update.scores).sort((a, b) => b[1] - a[1]);
        
        // 🔥 FIX CLASIFICACIÓN ABORTADA: NO reordenamos por winnerUsername.
        // El sort por puntos ya es correcto. winnerUsername lo usamos solo
        // para los títulos/mensajes del podio, no para cambiar el orden.
        // (Antes ponía al ganador primero aunque tuviera menos puntos que el que abandonó)
        
        // 🔥 AQUÍ LE PASAMOS LA BANDERA AL MOTOR DE DADOS 🔥
        animarDados(sortedScores, update.correctAnswer, leaderboard, myUsername, isBR, update.skipAnimation, (finalSorted, diceRolls) => {
            
            const trueWinner = finalSorted[0][0]; 
            let avatars = JSON.parse(sessionStorage.getItem('player_avatars')) || {};
            let winnerAvatar = avatars[trueWinner] || 'images/default-profile.png';
            
            if (update.type === "GAME_OVER_ABORTED" && trueWinner === "Empate") {
                titleText.textContent = "⚖️ ¡PARTIDA ABORTADA!";
                titleText.style.color = "#FF9800";
                if(msgText) msgText.textContent = "Se vació la sala.";
                winnerText.textContent = "Sin ganador";
            } else if (update.type === "GAME_OVER_ABORTED" && trueWinner === myUsername) {
                titleText.textContent = "👑 ¡VICTORIA MAGISTRAL! 👑";
                titleText.style.color = "#4CAF50";
                if(msgText) msgText.textContent = "¡Tus rivales huyeron despavoridos!";
                winnerText.innerHTML = `<img src="${winnerAvatar}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; vertical-align:middle; margin-right:10px; border:2px solid #FFD700; box-shadow: 0 0 15px #FFD700;"> 👑 Ganador absoluto: ${trueWinner}`;
            } else if (trueWinner === myUsername) {
                titleText.textContent = isBR ? "👑 ¡VICTORIA MAGISTRAL! 👑" : "🏆 ¡HAS GANADO! 🏆";
                titleText.style.color = "#4CAF50";
                if(msgText) msgText.textContent = isBR ? "Sobreviviste a la masacre." : "¡Eres un genio! Has aplastado a tus rivales.";
                winnerText.innerHTML = `<img src="${winnerAvatar}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; vertical-align:middle; margin-right:10px; border:2px solid #FFD700; box-shadow: 0 0 15px #FFD700;"> 👑 Ganador absoluto: ${trueWinner}`;
            } else {
                titleText.textContent = "💀 ¡HAS PERDIDO! 💀";
                titleText.style.color = "#F44336";
                if(msgText) msgText.textContent = update.type === "GAME_OVER_ABORTED" ? "Has abandonado y perdido el duelo." : "¡Otro día será! Toca estudiar un poco más.";
                winnerText.innerHTML = `<img src="${winnerAvatar}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; vertical-align:middle; margin-right:10px; border:2px solid #FFD700; box-shadow: 0 0 15px #FFD700;"> 👑 Ganador absoluto: ${trueWinner}`;
            }

            let scoresHtml = "<h3 style='color:#FFD700; margin-top:0; margin-bottom:15px; text-transform:uppercase; letter-spacing: 2px;'>Clasificación Final</h3>";
            scoresHtml += "<ul style='list-style:none; padding:0; margin:0;'>";
            
            finalSorted.forEach(([name, pts], index) => {
                let medalla = "👾"; 
                let colorNombre = "white";
                let fontWeight = "normal";

                if (index === 0) medalla = "🥇";
                else if (index === 1) medalla = "🥈";
                else if (index === 2) medalla = "🥉";

                if (name === myUsername) { colorNombre = "#03DAC6"; fontWeight = "bold"; }

                let scoreText = pts + ' pts';
                if (isBR) scoreText = pts === 1 ? pts + ' pregun. acertada' : pts + ' pregun. acertadas';
                
                let dadoHtml = diceRolls[name] ? `<span style='font-size:0.8rem; color:#aaa; margin-left:5px;'>(🎲 ${diceRolls[name]})</span>` : '';
                let avatarSrc = avatars[name] || 'images/default-profile.png';
                let imgHtml = `<img src="${avatarSrc}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; margin-right:15px; margin-left:10px; border:2px solid ${colorNombre};">`;

                scoresHtml += `
                    <li style='
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center;
                        padding: 10px 15px; 
                        margin-bottom: 8px;
                        background: rgba(255,255,255,0.05);
                        border-radius: 8px;
                        color: ${colorNombre};
                        font-weight: ${fontWeight};
                        font-size: 1.2rem;
                        border-left: ${name === myUsername ? '4px solid #03DAC6' : '4px solid transparent'};
                    '>
                        <div style="display:flex; align-items:center;"><span>${medalla}</span> ${imgHtml} <span>${name}</span> ${dadoHtml}</div>
                        <span style='color: #FFD700; font-weight: bold; font-size: 0.9rem;'>${scoreText}</span>
                    </li>`;
            });
            scoresHtml += "</ul>";
            leaderboard.innerHTML = scoresHtml;
        });
    }

    const btnVolver = document.getElementById('btn-back-to-lobby');
    if (btnVolver) {
        btnVolver.onclick = () => {
            sessionStorage.removeItem('saved_game_over_data'); 
            resetearVistasDeJuego(); 
            window.location.replace(window.location.pathname + window.location.search + '#screen-lobby');
            const sGame = document.getElementById('screen-game');
            const sLobby = document.getElementById('screen-lobby');
            if (typeof cambiarPantalla === "function") cambiarPantalla(sGame, sLobby);
            if (typeof stompClient !== 'undefined' && stompClient.connected) stompClient.send("/app/lobby.sync", {}, JSON.stringify({}));
        };
    }
}

window.abrirModalAbandonar = function() {
    const modal = document.getElementById('abandon-modal');
    if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
};

window.cerrarModalAbandonar = function() {
    const modal = document.getElementById('abandon-modal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
};

function resetearVistasDeJuego() {
    const results = document.getElementById('game-results');
    if (results) results.style.display = 'none';
    const ui = document.getElementById('game-ui');
    if (ui) ui.style.display = 'none';
    const loading = document.getElementById('game-loading');
    if (loading) loading.style.display = 'none'; 
    const spec = document.getElementById('spectator-controls');
    if (spec) spec.style.display = 'none';
    
    document.getElementById('btn-wildcards').style.display = 'none';
    document.getElementById('wildcards-panel').classList.remove('open');
    
    const btnAbandon = document.getElementById('btn-abandon-game');
    if(btnAbandon) { btnAbandon.classList.add('hidden'); btnAbandon.style.display = 'none'; }
    
    gameOverData = null; 
    estoyEliminado = false;
    
    const sGame = document.getElementById('screen-game');
    if (sGame) { sGame.style.display = 'none'; sGame.classList.add('hidden'); }
}

// 🔥 REHIDRATACIÓN MAGISTRAL 🔥
window.rehidratarJuego = function(reconnectData) {
    console.log("🔥 Rehidratando partida en curso...", reconnectData);

    gameIdActual = reconnectData.gameId;
    preguntaActual = reconnectData.currentQuestionIndex;
    estoyEliminado = reconnectData.isEliminated;
    
    // Recuperar Comodines de la Caché Local
    const swc = sessionStorage.getItem(`my_wildcards_${gameIdActual}`);
    if (swc) {
        myWildcards = JSON.parse(swc);
    } else if (reconnectData.gameMode !== "Battle Royale") {
        // 🔥 FIX F5: sessionStorage se perdió al recargar pero la partida sigue activa.
        // Regeneramos un set de 3 comodines aleatorios y los persistimos de nuevo,
        // igual que hace inicializarJuego() la primera vez.
        let shuffled = [...ALL_WILDCARDS].sort(() => 0.5 - Math.random());
        myWildcards = shuffled.slice(0, 3);
        sessionStorage.setItem(`my_wildcards_${gameIdActual}`, JSON.stringify(myWildcards));
    }
    const uws = sessionStorage.getItem(`used_wildcards_${gameIdActual}`);
    if (uws) usedWildcards = JSON.parse(uws);
    lastUsedWildcard = sessionStorage.getItem(`last_used_wildcard_${gameIdActual}`);

    alivePlayers = reconnectData.players.filter(p => !reconnectData.eliminatedPlayers.includes(p));
    
    gameOverData = null;
    respuestasRondaLive = {};
    localSubstituteQuestion = null;

    sessionStorage.setItem('current_game_mode', reconnectData.gameMode);
    sessionStorage.setItem('current_game_category', reconnectData.category);
    sessionStorage.setItem('current_game_players', JSON.stringify(reconnectData.players));

    const isBR = reconnectData.gameMode === "Battle Royale";

    document.querySelectorAll('.screen').forEach(s => { s.style.display = 'none'; s.classList.add('hidden'); });
    const sGame = document.getElementById('screen-game');
    if (sGame) { sGame.style.display = 'block'; sGame.classList.remove('hidden'); window.location.hash = '#screen-game'; }

    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('game-results').style.display = 'none';
    document.getElementById('spectator-controls').style.display = 'none';
    
    const loadingScreen = document.getElementById('game-loading');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        loadingScreen.innerHTML = `
            <h1 class="responsive-title cinematic-title" style="color: #03DAC6; font-size: 3rem; text-shadow: 0 0 20px rgba(3,218,198,0.5);">¡RECONECTANDO AL CAMPO DE BATALLA!</h1>
            <p style="font-size: 1.5rem; color: #ccc;">Sincronizando estado y preguntas...</p>
            <div class="loader" style="margin: 30px auto; border-top-color: #FFD700;"></div>
        `;
    }

    const scoreElement = document.querySelector('.score');
    const myName = sessionStorage.getItem('genius_username');
    const myScore = reconnectData.scores[myName] || 0;
    if (scoreElement) scoreElement.textContent = isBR ? `🏆 Aciertos: ${myScore}` : `🏆 Puntuación: ${myScore} pts`;

    fetch(`${window.API_BASE_URL}/api/game/${gameIdActual}/questions`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` }
    })
    .then(res => {
        if (!res.ok) throw new Error("Error al descargar la partida de BD");
        return res.json();
    })
    .then(data => {
        preguntas = data;
        
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.innerHTML = `
                    <h1 class="responsive-title cinematic-title" style="color: #FFD700; font-size: 3rem; text-shadow: 0 0 20px rgba(255,215,0,0.5);">¡PREPARANDO DUELO!</h1>
                    <p id="opponent-name" style="font-size: 1.5rem; color: #ccc;"></p>
                    <div class="loader" style="margin: 30px auto; border-top-color: #03DAC6;"></div>
                `;
            }
            mostrarPregunta();
        }, 1500); 
    })
    .catch(err => {
        console.error("Error al rehidratar preguntas:", err);
    });
};


window.rehidratarJuego = function(reconnectData) {
    console.log("🔥 Rehidratando partida en curso...", reconnectData);

    gameIdActual = reconnectData.gameId;
    preguntaActual = reconnectData.currentQuestionIndex;
    estoyEliminado = reconnectData.isEliminated;
    
    const swc = sessionStorage.getItem(`my_wildcards_${gameIdActual}`);
    if (swc) myWildcards = JSON.parse(swc);
    const uws = sessionStorage.getItem(`used_wildcards_${gameIdActual}`);
    if (uws) usedWildcards = JSON.parse(uws);
    lastUsedWildcard = sessionStorage.getItem(`last_used_wildcard_${gameIdActual}`);

    alivePlayers = reconnectData.players.filter(p => !reconnectData.eliminatedPlayers.includes(p));
    
    gameOverData = null;
    respuestasRondaLive = {};
    localSubstituteQuestion = null;

    sessionStorage.setItem('current_game_mode', reconnectData.gameMode);
    sessionStorage.setItem('current_game_category', reconnectData.category);
    sessionStorage.setItem('current_game_players', JSON.stringify(reconnectData.players));

    const isBR = reconnectData.gameMode === "Battle Royale";

    document.querySelectorAll('.screen').forEach(s => { s.style.display = 'none'; s.classList.add('hidden'); });
    const sGame = document.getElementById('screen-game');
    if (sGame) { sGame.style.display = 'block'; sGame.classList.remove('hidden'); window.location.hash = '#screen-game'; }

    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('game-results').style.display = 'none';
    document.getElementById('spectator-controls').style.display = 'none';

    const loadingScreen = document.getElementById('game-loading');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex'; 
        loadingScreen.innerHTML = `
            <div style="text-align: center; width: 100%; padding: 0 20px; box-sizing: border-box;">
                <h1 class="responsive-title cinematic-title" style="color: #03DAC6; font-size: clamp(2rem, 5vw, 3.5rem); text-shadow: 0 0 20px rgba(3,218,198,0.5); margin: 0 auto 20px auto; line-height: 1.2;">¡RECONECTANDO AL CAMPO DE BATALLA!</h1>
                <p style="font-size: 1.5rem; color: #ccc; margin: 0 auto;">Sincronizando estado y preguntas<span class="animated-dots"></span></p>
                <div class="loader" style="margin: 30px auto; border-top-color: #FFD700;"></div>
            </div>
        `;
    }

    const scoreElement = document.querySelector('.score');
    const myName = sessionStorage.getItem('genius_username');
    const myScore = reconnectData.scores[myName] || 0;
    if (scoreElement) scoreElement.textContent = isBR ? `🏆 Aciertos: ${myScore}` : `🏆 Puntuación: ${myScore} pts`;

    fetch(`${window.API_BASE_URL}/api/game/${gameIdActual}/questions`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('genius_token')}` }
    })
    .then(res => {
        if (!res.ok) throw new Error("Error al descargar la partida de BD");
        return res.json();
    })
    .then(data => {
        preguntas = data;
        
        setTimeout(() => {
            const masterOverlay = document.getElementById('loading-overlay');
            if (masterOverlay) masterOverlay.style.display = 'none';

            let isGameOver = false;
            if (preguntaActual >= preguntas.length) isGameOver = true;
            if (isBR && alivePlayers.length <= 1) isGameOver = true;

            if (isGameOver) {
                if (loadingScreen) loadingScreen.style.display = 'none';
                
                // 🔥 AQUÍ ACTIVAMOS LA BANDERA PARA SALTAR LA ANIMACIÓN 🔥
                const savedGameOverStr = sessionStorage.getItem('saved_game_over_data');
                if (savedGameOverStr) {
                    let realUpdate = JSON.parse(savedGameOverStr);
                    realUpdate.skipAnimation = true; 
                    mostrarPodioFinal(realUpdate);
                } else {
                    // 🔥 FIX: Calculamos el ganador real a partir de los scores del servidor
                    // para evitar que todos aparezcan con 0 pts y se lance un falso desempate.
                    const scoresObj = reconnectData.scores || {};
                    const ganadorReal = Object.entries(scoresObj).sort((a, b) => b[1] - a[1])[0];
                    const winnerName = ganadorReal ? ganadorReal[0] : "";

                    let updateFalso = {
                        type: "GAME_OVER",
                        scores: scoresObj,
                        winnerUsername: winnerName,
                        correctAnswer: "",   // Sin diceStr → animarDados no encontrará empates reales
                        skipAnimation: true
                    };
                    mostrarPodioFinal(updateFalso);
                }
            } else {
                mostrarPregunta();
                // 🔥 FIX F5: Repintamos el panel de comodines con los datos recuperados
                // (o regenerados). Sin esto el panel aparece vacío aunque myWildcards esté relleno.
                if (typeof window.renderWildcards === 'function') {
                    window.renderWildcards();
                }
            }

        }, 1500); 
    })
    .catch(err => {
        console.error("Error al rehidratar preguntas:", err);
    });
};