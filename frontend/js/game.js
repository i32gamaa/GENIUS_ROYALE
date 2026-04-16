// ==========================================
// js/game.js - VERSIÓN FINAL "REMATCH READY"
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
        headers: { 'Authorization': `Bearer ${localStorage.getItem('genius_token')}` }
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
            timerElemento.textContent = "¡Respuesta enviada! Esperando al rival... ⏳";
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
                timerElemento.textContent = "¡TIEMPO AGOTADO! ⏰ Esperando al rival...";
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
        timerElemento.innerHTML = (respuestaElegida === "TIMEOUT") ? "¡MUY LENTO! ⏰ La correcta era la verde." : "¡INCORRECTO! Has fallado. 😢";
    }

    const scoreElement = document.querySelector('.score');
    if (scoreElement) scoreElement.textContent = `Puntuación: J1: ${update.playerOneScore} | J2: ${update.playerTwoScore}`; 

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
    
    const myUsername = localStorage.getItem('genius_username');
    const titleText = document.getElementById('personal-result-title');
    const msgText = document.getElementById('personal-result-message');
    const winnerText = document.getElementById('winner-announcement');
    
    if (update.winnerUsername === "Empate") {
        titleText.textContent = "⚖️ ¡EMPATE TÉCNICO!";
        titleText.style.color = "#FF9800";
        msgText.textContent = "¡Batalla legendaria! Nadie cede.";
    } else if (update.winnerUsername === myUsername) {
        titleText.textContent = "🏆 ¡HAS GANADO! 🏆";
        titleText.style.color = "#4CAF50";
        msgText.textContent = "¡Eres un genio! Has aplastado a tu rival.";
    } else {
        titleText.textContent = "💀 ¡HAS PERDIDO! 💀";
        titleText.style.color = "#F44336";
        msgText.textContent = "¡Otro día será! Toca estudiar un poco más.";
    }
    
    winnerText.textContent = (update.winnerUsername === "Empate") ? "" : `Ganador: ${update.winnerUsername}`;
    document.getElementById('res-p1-score').textContent = update.playerOneScore + " Pts";
    document.getElementById('res-p2-score').textContent = update.playerTwoScore + " Pts";

    // --- LÓGICA DE BOTONES DE REVANCHA ---
    document.getElementById('btn-back-to-lobby').onclick = () => {
        resetearVistasDeJuego();
        const sGame = document.getElementById('screen-game');
        const sLobby = document.getElementById('screen-lobby');
        
        // Si tengo un inviteId, es que soy el Host -> Muestro mi botón de Iniciar
        const hostControls = document.getElementById('host-controls');
        const waitingMsg = document.getElementById('waiting-msg');
        if (localStorage.getItem('current_invite_id')) {
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
        localStorage.removeItem('current_invite_id'); // Limpiamos para que no crea que sigue en sala
        if (typeof cambiarPantalla === "function") cambiarPantalla(sGame, sMenu);
    };
}

function resetearVistasDeJuego() {
    document.getElementById('game-results').style.display = 'none';
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('game-loading').style.display = 'block'; 
    gameOverData = null; 
}