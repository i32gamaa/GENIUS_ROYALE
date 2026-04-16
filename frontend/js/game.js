// ==========================================
// js/game.js - VERSIÓN FINAL "PODIO PREMIUM"
// ==========================================

let preguntas = [];
let preguntaActual = 0;
let temporizador = null;
let gameIdActual = "";
let respuestaElegida = null;
let tiempoRestanteGlobal = 15;
let gameOverData = null; 

function inicializarJuego(gameData) {
    gameIdActual = gameData.gameId;
    preguntaActual = 0;
    gameOverData = null; 
    setTimeout(() => { descargarPreguntasConReintento(); }, 1500); 
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

    if (preguntaActual >= preguntas.length) return;

    const pregunta = preguntas[preguntaActual];
    const preguntaElemento = document.querySelector('.question');
    const opcionesElemento = document.querySelector('.options');
    const timerElemento = document.querySelector('.timer');

    respuestaElegida = null; 
    timerElemento.style.color = "#03DAC6"; 
    timerElemento.style.animation = "none"; 

    preguntaElemento.textContent = pregunta.questionText;
    opcionesElemento.innerHTML = '';

    let opcionesMezcladas = [pregunta.correctAnswer, pregunta.wrongAnswer1, pregunta.wrongAnswer2, pregunta.wrongAnswer3];
    opcionesMezcladas = opcionesMezcladas.sort(() => Math.random() - 0.5);

    opcionesMezcladas.forEach((opcion) => {
        const boton = document.createElement('button');
        boton.textContent = opcion;
        boton.classList.add('option-button');
        boton.addEventListener('click', () => {
            if (respuestaElegida !== null) return; 
            respuestaElegida = opcion;
            clearInterval(temporizador); 
            boton.style.border = "3px solid #FFD700";
            document.querySelectorAll('.option-button').forEach(btn => btn.style.pointerEvents = 'none');
            if (typeof enviarRespuesta === "function") enviarRespuesta(gameIdActual, opcion);
            timerElemento.textContent = "¡Respuesta enviada! Esperando a los demás... ⏳";
        });
        opcionesElemento.appendChild(boton);
    });
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
            if (respuestaElegida === null) {
                respuestaElegida = "TIMEOUT";
                document.querySelectorAll('.option-button').forEach(btn => btn.style.pointerEvents = 'none');
                timerElemento.style.color = "#F44336"; 
                timerElemento.textContent = "¡TIEMPO AGOTADO! ⏰ Esperando a los demás...";
                if (typeof enviarRespuesta === "function") enviarRespuesta(gameIdActual, "TIMEOUT");
            }
        } else if (respuestaElegida === null) {
            timerElemento.textContent = `Tiempo restante: ${tiempoRestanteGlobal} segundos`;
        }
    }, 1000);
}

function rivalHaRespondido() {
    if (respuestaElegida === null && tiempoRestanteGlobal > 5) {
        tiempoRestanteGlobal = 5;
        const timerElemento = document.querySelector('.timer');
        timerElemento.style.color = "#E91E63"; 
        timerElemento.style.animation = "pulso-logo 1s infinite"; 
    }
}

function procesarResultadoRonda(update) {
    clearInterval(temporizador); 
    const respuestaCorrecta = update.correctAnswer;
    const botones = document.querySelectorAll('.option-button');
    const timerElemento = document.querySelector('.timer');
    timerElemento.style.animation = "none"; 
    let haAcertado = (respuestaElegida === respuestaCorrecta);

    botones.forEach(btn => {
        if (btn.textContent === respuestaCorrecta) {
            btn.style.backgroundColor = '#4CAF50'; 
            btn.style.color = 'white';
        } else if (btn.textContent === respuestaElegida && !haAcertado) {
            btn.style.backgroundColor = '#F44336'; 
            btn.style.color = 'white';
        }
    });

    const pregunta = preguntas[preguntaActual];
    let puntosGanados = (pregunta.difficultyLevel.includes("facil") ? 100 : (pregunta.difficultyLevel.includes("inter") ? 200 : 300));

    if (haAcertado) {
        timerElemento.style.color = '#4CAF50';
        timerElemento.innerHTML = `¡CORRECTO! <strong>+${puntosGanados} Pts</strong> 🎉`;
    } else {
        timerElemento.style.color = '#F44336';
        timerElemento.innerHTML = (respuestaElegida === "TIMEOUT") ? "¡MUY LENTO! ⏰" : "¡INCORRECTO! Has fallado. 😢";
    }

    const scoreElement = document.querySelector('.score');
    if (scoreElement && update.scores) {
        let rankingText = Object.entries(update.scores)
            .sort((a, b) => b[1] - a[1]) 
            .map(([name, pts]) => `${name}: ${pts}`)
            .join(" | ");
        scoreElement.textContent = `🏆 Ranking: ${rankingText}`; 
    }

    setTimeout(() => {
        preguntaActual++;
        if (gameOverData) mostrarPodioFinal(gameOverData);
        else mostrarPregunta();
    }, 5000);
}

function finalizarJuego(update) {
    gameOverData = update;
}

function mostrarPodioFinal(update) {
    document.getElementById('game-ui').style.display = 'none';
    const podium = document.getElementById('game-results');
    if (podium) podium.style.display = 'block';
    
    const myUsername = sessionStorage.getItem('genius_username');
    const titleText = document.getElementById('personal-result-title');
    const msgText = document.getElementById('personal-result-message');
    const winnerText = document.getElementById('winner-announcement');
    
    if (update.winnerUsername === "Empate") {
        titleText.textContent = "⚖️ ¡EMPATE TÉCNICO!";
        titleText.style.color = "#FF9800";
        if(msgText) msgText.textContent = "¡Batalla legendaria! Nadie cede.";
    } else if (update.winnerUsername === myUsername) {
        titleText.textContent = "🏆 ¡HAS GANADO! 🏆";
        titleText.style.color = "#4CAF50";
        if(msgText) msgText.textContent = "¡Eres un genio! Has aplastado a tus rivales.";
    } else {
        titleText.textContent = "💀 ¡HAS PERDIDO! 💀";
        titleText.style.color = "#F44336";
        if(msgText) msgText.textContent = "¡Otro día será! Toca estudiar un poco más.";
    }
    
    winnerText.textContent = (update.winnerUsername === "Empate") ? "¡Empate múltiple!" : `👑 Ganador absoluto: ${update.winnerUsername}`;

    // --- MAGIA VISUAL: OCULTAR LAS CAJAS DE 1VS1 FEAS ---
    const p1ScoreEl = document.getElementById('res-p1-score');
    const p2ScoreEl = document.getElementById('res-p2-score');
    if (p1ScoreEl && p1ScoreEl.parentNode) p1ScoreEl.parentNode.style.display = 'none';
    if (p2ScoreEl && p2ScoreEl.parentNode) p2ScoreEl.parentNode.style.display = 'none';

    const cajasContainer = document.querySelector('.score-boxes') || document.querySelector('.results-grid');
    if (cajasContainer) cajasContainer.style.display = 'none';

    // --- CREAR LA CLASIFICACIÓN MULTIJUGADOR ---
    let leaderboard = document.getElementById('royale-leaderboard');
    if (!leaderboard) {
        leaderboard = document.createElement('div');
        leaderboard.id = 'royale-leaderboard';
        
        // Estilazo de tabla premium
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

    let scoresHtml = "<h3 style='color:#FFD700; margin-top:0; margin-bottom:15px; text-transform:uppercase; letter-spacing: 2px;'>Clasificación Final</h3>";
    scoresHtml += "<ul style='list-style:none; padding:0; margin:0;'>";
    
    if (update.scores) {
        // Ordenamos los puntos de mayor a menor
        const sortedScores = Object.entries(update.scores).sort((a, b) => b[1] - a[1]);
        
        sortedScores.forEach(([name, pts], index) => {
            let medalla = "👾"; 
            let colorNombre = "white";
            let fontWeight = "normal";

            if (index === 0) medalla = "🥇";
            else if (index === 1) medalla = "🥈";
            else if (index === 2) medalla = "🥉";

            // Resaltamos al usuario que está mirando la pantalla
            if (name === myUsername) {
                colorNombre = "#03DAC6"; 
                fontWeight = "bold";
            }

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
                    <span>${medalla} ${name}</span>
                    <span style='color: #FFD700; font-weight: bold;'>${pts} pts</span>
                </li>`;
        });
    }
    scoresHtml += "</ul>";
    leaderboard.innerHTML = scoresHtml;

    // --- BOTONES FINALES ---
    document.getElementById('btn-back-to-lobby').onclick = () => {
        resetearVistasDeJuego();
        const sGame = document.getElementById('screen-game');
        const sLobby = document.getElementById('screen-lobby');
        
        const hostControls = document.getElementById('host-controls');
        const waitingMsg = document.getElementById('waiting-msg');
        if (sessionStorage.getItem('current_invite_id')) {
            if (hostControls) hostControls.style.display = 'block';
            if (waitingMsg) waitingMsg.style.display = 'none';
        } else {
            if (hostControls) hostControls.style.display = 'none';
            if (waitingMsg) waitingMsg.style.display = 'block';
        }

        if (typeof cambiarPantalla === "function") cambiarPantalla(sGame, sLobby);
    };

    document.getElementById('btn-exit-to-menu').onclick = () => {
        const sGame = document.getElementById('screen-game');
        const sMenu = document.getElementById('screen-menu');
        resetearVistasDeJuego();
        sessionStorage.removeItem('current_invite_id'); 
        if (typeof cambiarPantalla === "function") cambiarPantalla(sGame, sMenu);
    };
}

function resetearVistasDeJuego() {
    document.getElementById('game-results').style.display = 'none';
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('game-loading').style.display = 'block'; 
    gameOverData = null; 
}