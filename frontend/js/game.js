// ==========================================
// js/game.js - VERSIÓN COMPLETA: ANIMACIONES, AVATARES Y TENSION 🤫🎲
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

window.addEventListener('beforeunload', () => {
    if (stompClient && stompClient.connected) {
        if (gameIdActual && !estoyEliminado) {
            stompClient.send("/app/game.leave", {}, JSON.stringify({ gameId: gameIdActual }));
        }
        const lobbyId = sessionStorage.getItem('current_game_id');
        if (lobbyId) {
            stompClient.send("/app/lobby.leave", {}, JSON.stringify({ gameId: lobbyId }));
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const btnAbandon = document.getElementById('btn-abandon-game');
    const modalAbandon = document.getElementById('abandon-modal');
    const btnConfirmLobby = document.getElementById('btn-confirm-abandon-lobby');
    const btnCancel = document.getElementById('btn-cancel-abandon');

    if (btnAbandon) {
        btnAbandon.addEventListener('click', () => { 
            if (modalAbandon) { 
                modalAbandon.classList.remove('hidden'); 
                modalAbandon.style.display = 'flex'; 
            } 
        });
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', () => { 
            if (modalAbandon) { 
                modalAbandon.classList.add('hidden'); 
                modalAbandon.style.display = 'none'; 
            } 
        });
    }

    if (btnConfirmLobby) {
        btnConfirmLobby.addEventListener('click', () => {
            if (stompClient && stompClient.connected) {
                stompClient.send("/app/game.leave", {}, JSON.stringify({ gameId: gameIdActual }));
            }
            if (modalAbandon) { 
                modalAbandon.classList.add('hidden'); 
                modalAbandon.style.display = 'none'; 
            }
            resetearVistasDeJuego();
            window.location.replace(window.location.pathname + window.location.search + '#screen-lobby');
            if (typeof cambiarPantalla === "function") {
                cambiarPantalla(document.getElementById('screen-game'), document.getElementById('screen-lobby'));
            }
        });
    }
});

function inicializarJuego(gameData) {
    gameIdActual = gameData.gameId; 
    preguntaActual = 0; 
    gameOverData = null; 
    estoyEliminado = false; 
    respuestasRondaLive = {};

    const playersStr = sessionStorage.getItem('current_game_players'); 
    alivePlayers = playersStr ? JSON.parse(playersStr) : []; 
    targetSpectatorIndex = 0;
    
    document.getElementById('game-loading').style.display = 'none'; 
    document.getElementById('game-ui').style.display = 'none'; 
    document.getElementById('game-results').style.display = 'none'; 
    document.getElementById('spectator-controls').style.display = 'none';
    
    const scoreElement = document.querySelector('.score'); 
    const isBR = sessionStorage.getItem('current_game_mode') === "Battle Royale";
    if (scoreElement) {
        scoreElement.textContent = isBR ? "🏆 Aciertos: 0" : "🏆 Puntuación: 0 pts";
    }

    const btnAbandon = document.getElementById('btn-abandon-game');
    if(btnAbandon) { 
        btnAbandon.style.display = 'none'; 
        btnAbandon.classList.add('hidden'); 
    }

    ejecutarIntroEpica(() => { 
        descargarPreguntasConReintento(); 
    });
}

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
    title.style.opacity = '0'; 
    title.style.transform = 'scale(0.5)'; 
    mode.style.opacity = '0'; 
    mode.style.transform = 'translateY(20px)'; 
    cat.style.opacity = '0'; 
    cat.style.transform = 'translateY(20px)'; 
    start.style.opacity = '0'; 
    start.style.transform = 'scale(2)';

    setTimeout(() => { title.style.opacity = '1'; title.style.transform = 'scale(1)'; }, 500); 
    setTimeout(() => { mode.style.opacity = '1'; mode.style.transform = 'translateY(0)'; }, 1500); 
    setTimeout(() => { cat.style.opacity = '1'; cat.style.transform = 'translateY(0)'; }, 2500);
    setTimeout(() => { 
        start.style.opacity = '1'; 
        start.style.transform = 'scale(1)'; 
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

    respuestaElegida = null; 
    timerElemento.style.color = "#03DAC6"; 
    timerElemento.style.animation = "none"; 
    
    preguntaElemento.textContent = `${preguntaActual + 1}. ${pregunta.questionText}`; 
    opcionesElemento.innerHTML = '';
    
    let opcionesMezcladas = [pregunta.correctAnswer, pregunta.wrongAnswer1, pregunta.wrongAnswer2, pregunta.wrongAnswer3].sort(() => Math.random() - 0.5);

    opcionesMezcladas.forEach((opcion) => {
        const boton = document.createElement('button'); 
        boton.textContent = opcion; 
        boton.classList.add('option-button');
        
        if (estoyEliminado) { 
            boton.style.opacity = "0.5"; 
            boton.style.cursor = "not-allowed"; 
        } else {
            boton.addEventListener('click', () => {
                if (respuestaElegida !== null || estoyEliminado) return; 
                
                respuestaElegida = opcion; 
                clearInterval(temporizador); 
                boton.style.border = "3px solid #FFD700"; 
                document.querySelectorAll('.option-button').forEach(btn => btn.style.pointerEvents = 'none');
                
                if (typeof enviarRespuesta === "function") {
                    enviarRespuesta(gameIdActual, opcion); 
                }
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
    tiempoRestanteGlobal = 15; 
    if (temporizador) clearInterval(temporizador);

    temporizador = setInterval(() => {
        tiempoRestanteGlobal--;
        
        if (tiempoRestanteGlobal <= 0) {
            clearInterval(temporizador); 
            if (respuestaElegida === null && !estoyEliminado) {
                respuestaElegida = "TIMEOUT"; 
                document.querySelectorAll('.option-button').forEach(btn => btn.style.pointerEvents = 'none');
                timerElemento.style.color = "#F44336"; 
                timerElemento.textContent = "¡TIEMPO AGOTADO! ⏰ Esperando a los demás...";
                if (typeof enviarRespuesta === "function") {
                    enviarRespuesta(gameIdActual, "TIMEOUT");
                }
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
    
    if (targetSpectatorIndex >= specVivos.length) {
        targetSpectatorIndex = 0;
    }
    
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
        if (gameOverData) {
            mostrarPodioFinal(gameOverData); 
        } else {
            mostrarPregunta(); 
        }
    }, 5000);
}

function finalizarJuego(update) { 
    gameOverData = update; 
}

function forzarFinalAbrupto(update) { 
    clearInterval(temporizador); 
    gameOverData = update; 
    mostrarPodioFinal(update); 
}

function animarDados(sortedScores, diceStr, leaderboardDiv, myUsername, isBR, updateType, callback) {
    let scoreCounts = {}; 
    sortedScores.forEach(s => { 
        scoreCounts[s[1]] = (scoreCounts[s[1]] || 0) + 1; 
    });
    
    let tiedScores = new Set(); 
    for (let score in scoreCounts) { 
        if (scoreCounts[score] > 1) {
            tiedScores.add(parseInt(score)); 
        }
    }

    // 🔥 FIX: SI NO HAY EMPATE DE PUNTOS, SALTAMOS LA RULETA DE DADOS. 
    // Si la hay (incluso en abandono), ¡lanzamos la ruleta para justificar la posición visual! 🔥
    if (tiedScores.size === 0) { 
        callback(sortedScores, {}); 
        return; 
    }

    let tieBreakerRolls = {};
    try {
        let cleanStr = diceStr.replace(/[{}]/g, ''); 
        let pairs = cleanStr.split(',');
        pairs.forEach(p => { 
            let parts = p.split('='); 
            if(parts.length === 2) {
                tieBreakerRolls[parts[0].trim()] = parseInt(parts[1].trim()); 
            }
        });
    } catch(e) {}

    leaderboardDiv.innerHTML = "<h3 style='color:#FF9800; text-align:center;'>🎲 EMPATE DETECTADO 🎲<br><span style='font-size:0.9rem; color:#ccc;'>Lanzando dados de desempate...</span></h3>";
    
    let ul = document.createElement('ul'); 
    ul.style.listStyle = 'none'; 
    ul.style.padding = '0'; 
    leaderboardDiv.appendChild(ul);
    
    let avatars = JSON.parse(sessionStorage.getItem('player_avatars')) || {};

    sortedScores.forEach(([name, pts]) => {
        let li = document.createElement('li'); 
        li.style.display = 'flex'; 
        li.style.justifyContent = 'space-between'; 
        li.style.alignItems = 'center'; 
        li.style.padding = '12px'; 
        li.style.marginBottom = '8px'; 
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
                if(el) {
                    el.innerText = `🎲 ${Math.floor(Math.random()*10)+1}`; 
                }
            } 
        }); 
    }, 150);

    setTimeout(() => {
        clearInterval(interval);
        
        sortedScores.sort((a, b) => { 
            if (b[1] === a[1]) {
                return (tieBreakerRolls[b[0]] || 0) - (tieBreakerRolls[a[0]] || 0); 
            }
            return b[1] - a[1]; 
        });

        sortedScores.forEach(([name, pts]) => { 
            if (tiedScores.has(pts)) { 
                let el = document.getElementById(`dice-${name}`); 
                if(el) {
                    el.innerHTML = `<span style="color:#03DAC6; font-size:1.8rem; transform:scale(1.2); transition:all 0.3s;">🎲 ${tieBreakerRolls[name]}</span>`; 
                }
            } 
        });

        setTimeout(() => callback(sortedScores, tieBreakerRolls), 3500);
    }, 4000);
}

function mostrarPodioFinal(update) {
    document.getElementById('game-ui').style.display = 'none'; 
    document.getElementById('spectator-controls').style.display = 'none';
    
    const btnAbandon = document.getElementById('btn-abandon-game'); 
    if(btnAbandon) { 
        btnAbandon.classList.add('hidden'); 
        btnAbandon.style.display = 'none'; 
    }

    const podium = document.getElementById('game-results'); 
    if (podium) {
        podium.style.display = 'block';
    }
    
    const myUsername = sessionStorage.getItem('genius_username'); 
    const isBR = sessionStorage.getItem('current_game_mode') === "Battle Royale";
    
    const titleText = document.getElementById('personal-result-title'); 
    const msgText = document.getElementById('personal-result-message'); 
    const winnerText = document.getElementById('winner-announcement');
    
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
        
        // 🔥 FIX: Forzamos al superviviente al puesto 🥇 internamente si el rival huye en un 1v1 🔥
        if (update.type === "GAME_OVER_ABORTED" && update.winnerUsername !== "Empate") {
            sortedScores.sort((a, b) => {
                if (a[0] === update.winnerUsername) return -1;
                if (b[0] === update.winnerUsername) return 1;
                return 0;
            });
        }
        
        animarDados(sortedScores, update.correctAnswer, leaderboard, myUsername, isBR, update.type, (finalSorted, diceRolls) => {
            
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

            let scoresHtml = "<h3 style='color:#FFD700; margin-top:0; margin-bottom:15px; text-transform:uppercase; letter-spacing: 2px;'>Clasificación Final</h3><ul style='list-style:none; padding:0; margin:0;'>";
            
            finalSorted.forEach(([name, pts], index) => {
                let medalla = "👾"; 
                let colorNombre = "white"; 
                let fontWeight = "normal";
                
                if (index === 0) medalla = "🥇"; 
                else if (index === 1) medalla = "🥈"; 
                else if (index === 2) medalla = "🥉";
                
                if (name === myUsername) { 
                    colorNombre = "#03DAC6"; 
                    fontWeight = "bold"; 
                }

                let scoreText = pts + ' pts'; 
                if (isBR) {
                    scoreText = pts === 1 ? pts + ' pregun. acertada' : pts + ' pregun. acertadas';
                }
                
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
            resetearVistasDeJuego(); 
            
            sessionStorage.setItem('host_cooldown', Date.now() + 5000);
            
            window.location.replace(window.location.pathname + window.location.search + '#screen-lobby');
            const sGame = document.getElementById('screen-game'); 
            const sLobby = document.getElementById('screen-lobby');
            
            if (typeof cambiarPantalla === "function") {
                cambiarPantalla(sGame, sLobby);
            }
            if (typeof stompClient !== 'undefined' && stompClient.connected) {
                stompClient.send("/app/lobby.sync", {}, JSON.stringify({}));
            }
        };
    }
}

window.abrirModalAbandonar = function() { 
    const modal = document.getElementById('abandon-modal'); 
    if (modal) { 
        modal.classList.remove('hidden'); 
        modal.style.display = 'flex'; 
    } 
};

window.cerrarModalAbandonar = function() { 
    const modal = document.getElementById('abandon-modal'); 
    if (modal) { 
        modal.classList.add('hidden'); 
        modal.style.display = 'none'; 
    } 
};

window.abandonarHaciaLobby = function() {
    if (stompClient && stompClient.connected) {
        stompClient.send("/app/game.leave", {}, JSON.stringify({ gameId: gameIdActual }));
    }
    window.cerrarModalAbandonar(); 
    resetearVistasDeJuego(); 
    window.location.replace(window.location.pathname + window.location.search + '#screen-lobby');
    if (typeof cambiarPantalla === "function") {
        cambiarPantalla(document.getElementById('screen-game'), document.getElementById('screen-lobby'));
    }
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
    
    const btnAbandon = document.getElementById('btn-abandon-game'); 
    if(btnAbandon) { 
        btnAbandon.classList.add('hidden'); 
        btnAbandon.style.display = 'none'; 
    }
    
    gameOverData = null; 
    estoyEliminado = false;
    
    const sGame = document.getElementById('screen-game'); 
    if (sGame) { 
        sGame.style.display = 'none'; 
        sGame.classList.add('hidden'); 
    }
}