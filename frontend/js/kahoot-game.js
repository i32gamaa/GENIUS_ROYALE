// ==========================================
// js/kahoot-game.js - MOTOR GRÁFICO GENIUS ROYALE (F5 A PRUEBA DE BOMBAS)
// ==========================================

let kahootTimerInterval;
let kahootTimeRemaining = 15;
let kahootTotalPlayers = 0;
let kahootHostWaitingResults = false;

const bgColors = ['rgba(233, 30, 99, 0.2)', 'rgba(3, 218, 198, 0.2)', 'rgba(255, 215, 0, 0.2)', 'rgba(156, 39, 176, 0.2)'];
const borderColors = ['#E91E63', '#03DAC6', '#FFD700', '#9C27B0'];

const originalInicializarJuego = window.inicializarJuego;
window.inicializarJuego = function(gameData) {
    if (sessionStorage.getItem('is_pin_room') === 'true') {
        window.iniciarCinematicaKahoot(gameData);
    } else if (originalInicializarJuego) {
        originalInicializarJuego(gameData);
    }
};

window.asegurarSuscripcionJuego = function() {
    const myName = sessionStorage.getItem('genius_username');
    if (!window.kahootGameSub && typeof stompClient !== 'undefined' && stompClient && stompClient.connected) {
        window.kahootGameSub = stompClient.subscribe('/topic/kahoot.game.' + myName, function(message) {
            window.procesarMensajeJuegoKahoot(JSON.parse(message.body));
        });
    }
};

window.initEmojiUI = function() {
    if (!document.getElementById('kahoot-emoji-style')) {
        const style = document.createElement('style');
        style.id = 'kahoot-emoji-style';
        style.innerHTML = `
            .floating-emoji { position: fixed; bottom: -50px; font-size: 4.5rem; z-index: 9999999; pointer-events: none; animation: floatUp 2.5s ease-out forwards; text-shadow: 0 0 15px rgba(0,0,0,0.8); }
            @keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-80vh) scale(1.5); opacity: 0; } }
            .kahoot-emoji-btn { background: rgba(0,0,0,0.6); border: 2px solid #FFD700; border-radius: 50%; display: flex; justify-content: center; align-items: center; transition: 0.3s; cursor: pointer; box-shadow: 0 0 10px #FFD700; color: white; padding: 0; margin: 0; outline: none; }
            .kahoot-emoji-btn:hover { transform: scale(1.1); }
            .kahoot-emoji-picker { position: absolute; bottom: 60px; left: 0; z-index: 999999; background: rgba(0,0,0,0.9); border: 2px solid #03DAC6; border-radius: 15px; padding: 10px; display: none; grid-template-columns: repeat(3, 1fr); gap: 10px; box-shadow: 0 0 20px rgba(3,218,198,0.4); width: max-content; }
            .kahoot-emoji-picker span { font-size: 2.2rem; cursor: pointer; transition: 0.2s; text-align: center; display: inline-block; }
            .kahoot-emoji-picker span:hover { transform: scale(1.3); }
        `;
        document.head.appendChild(style);
    }

    const isHost = sessionStorage.getItem('genius_username') === sessionStorage.getItem('current_host_name');
    if (isHost) return; 

    if (document.getElementById('kahoot-emoji-container')) {
        document.getElementById('kahoot-emoji-container').style.display = 'block';
        return;
    }

    const guestNameElem = document.getElementById('kg-guest-name');
    if (guestNameElem) {
        const flexWrapper = document.createElement('div');
        flexWrapper.style.display = 'flex';
        flexWrapper.style.alignItems = 'center';
        flexWrapper.style.gap = '15px';
        
        guestNameElem.parentNode.insertBefore(flexWrapper, guestNameElem);
        flexWrapper.appendChild(guestNameElem);

        const emojiContainer = document.createElement('div');
        emojiContainer.id = 'kahoot-emoji-container';
        emojiContainer.style.position = 'relative'; 
        emojiContainer.innerHTML = `
            <div id="kahoot-emoji-picker" class="kahoot-emoji-picker">
                <span onclick="window.sendKahootEmoji('😂')">😂</span>
                <span onclick="window.sendKahootEmoji('😍')">😍</span>
                <span onclick="window.sendKahootEmoji('😭')">😭</span>
                <span onclick="window.sendKahootEmoji('😡')">😡</span>
                <span onclick="window.sendKahootEmoji('😎')">😎</span>
                <span onclick="window.sendKahootEmoji('💩')">💩</span>
            </div>
            <button id="kahoot-emoji-btn" class="kahoot-emoji-btn" style="width: 40px; height: 40px; font-size: 1.5rem;" onclick="document.getElementById('kahoot-emoji-picker').style.display = document.getElementById('kahoot-emoji-picker').style.display === 'grid' ? 'none' : 'grid';">😀</button>
        `;
        flexWrapper.appendChild(emojiContainer);
    }
};

window.iniciarCinematicaKahoot = function(data) {
    const isHost = sessionStorage.getItem('genius_username') === sessionStorage.getItem('current_host_name');
    kahootTotalPlayers = data.players.length - 1; 
    
    sessionStorage.removeItem('kahoot_last_game_data');
    sessionStorage.removeItem('kahoot_guest_answered');
    sessionStorage.removeItem('kahoot_guest_score');

    document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.style.display = 'none'; });
    
    const introScreen = document.createElement('div');
    introScreen.style.position = 'fixed'; introScreen.style.top = '0'; introScreen.style.left = '0';
    introScreen.style.width = '100vw'; introScreen.style.height = '100vh';
    introScreen.style.background = 'radial-gradient(circle, #2D0A4E, #000)';
    introScreen.style.zIndex = '999999';
    introScreen.style.display = 'flex'; introScreen.style.flexDirection = 'column';
    introScreen.style.justifyContent = 'center'; introScreen.style.alignItems = 'center';
    introScreen.style.textAlign = 'center';
    
    introScreen.innerHTML = `
        <h1 id="dyn-intro-title" style="font-family: 'Cinzel Decorative', cursive; font-size: 5rem; color: #FFD700; text-shadow: 0 0 30px #FFD700; opacity: 0; transform: scale(0.5); transition: all 0.5s ease-out; margin:0;">¡GENIUS ROYALE!</h1>
        <h2 id="dyn-intro-mode" style="font-family: 'Montserrat', sans-serif; font-size: 3rem; color: #03DAC6; margin-top: 20px; opacity: 0; transform: translateY(20px); transition: all 0.5s ease-out;">MODO: ${data.gameMode}</h2>
        <h2 id="dyn-intro-category" style="font-family: 'Montserrat', sans-serif; font-size: 2.5rem; color: #FF9800; margin-top: 20px; opacity: 0; transform: translateY(20px); transition: all 0.5s ease-out;">CATEGORÍA: ${data.category}</h2>
        <h1 id="dyn-intro-start" style="font-family: 'Cinzel Decorative', cursive; font-size: 6rem; color: #F44336; margin-top: 40px; text-shadow: 0 0 40px #F44336; opacity: 0; transform: scale(2); transition: all 0.3s ease-out;">¡¡A COMPETIR!!</h1>
    `;
    document.body.appendChild(introScreen);

    const myName = sessionStorage.getItem('genius_username');
    const gameId = sessionStorage.getItem('current_game_id');
    
    window.asegurarSuscripcionJuego();

    setTimeout(() => { document.getElementById('dyn-intro-title').style.opacity = '1'; document.getElementById('dyn-intro-title').style.transform = 'scale(1)'; }, 100);
    setTimeout(() => { document.getElementById('dyn-intro-mode').style.opacity = '1'; document.getElementById('dyn-intro-mode').style.transform = 'translateY(0)'; }, 1000);
    setTimeout(() => { document.getElementById('dyn-intro-category').style.opacity = '1'; document.getElementById('dyn-intro-category').style.transform = 'translateY(0)'; }, 2000);
    setTimeout(() => { document.getElementById('dyn-intro-start').style.opacity = '1'; document.getElementById('dyn-intro-start').style.transform = 'scale(1)'; }, 3000);

    setTimeout(() => {
        introScreen.remove();
        window.kahootCinematicaActiva = false; 
        sessionStorage.setItem('current_game_mode', 'Kahoot');

        if (typeof window.renovarSafeguardKahoot === "function") window.renovarSafeguardKahoot();
        
        window.initEmojiUI();

        document.getElementById('screen-game-code').classList.remove('hidden');
        document.getElementById('screen-game-code').style.display = 'flex';
        window.location.hash = '#screen-game-code';

        if (isHost) {
            document.getElementById('btn-force-end-game').style.display = 'block';
            document.getElementById('kg-guest-view').style.display = 'none';
            document.getElementById('kg-host-view').style.display = 'flex';
            stompClient.send("/app/kahoot.nextQuestion", {}, JSON.stringify({ gameId: gameId }));
        } else {
            document.getElementById('btn-force-end-game').style.display = 'none';
            document.getElementById('kg-host-view').style.display = 'none';
            document.getElementById('kg-guest-view').style.display = 'flex';
            document.getElementById('kg-guest-pin').innerText = gameId;
            document.getElementById('kg-guest-name').innerText = myName;
            document.getElementById('kg-guest-score-live').innerText = "0"; 
        }
    }, 5000);
};

window.restaurarEstadoF5Kahoot = function() {
    const cached = sessionStorage.getItem('kahoot_last_game_data');
    if (cached) {
        window.initEmojiUI(); 
        if (typeof window.renovarSafeguardKahoot === "function") window.renovarSafeguardKahoot();
        document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.style.display = 'none'; });
        document.getElementById('screen-game-code').classList.remove('hidden');
        document.getElementById('screen-game-code').style.display = 'flex';
        window.procesarMensajeJuegoKahoot(JSON.parse(cached), true); 
        
        const checkStomp = setInterval(() => {
            if (typeof stompClient !== 'undefined' && stompClient && stompClient.connected) {
                clearInterval(checkStomp);
                window.asegurarSuscripcionJuego();
                const gameId = sessionStorage.getItem('current_game_id');
                const myName = sessionStorage.getItem('genius_username');
                stompClient.send("/app/kahoot.getGameState", {}, JSON.stringify({ gameId: gameId, username: myName }));
            }
        }, 200);
    }
};

window.reconectarJuegoKahoot = function() {
    setTimeout(() => {
        if (typeof stompClient !== 'undefined' && stompClient && stompClient.connected) {
            window.asegurarSuscripcionJuego();
            const gameId = sessionStorage.getItem('current_game_id');
            const myName = sessionStorage.getItem('genius_username');
            stompClient.send("/app/kahoot.getGameState", {}, JSON.stringify({ gameId: gameId, username: myName }));
        }
    }, 500);
};

window.procesarMensajeJuegoKahoot = function(data, isRestore = false) {
    const isHost = sessionStorage.getItem('genius_username') === sessionStorage.getItem('current_host_name');

    if (data.type === "EMOJI") {
        const emojiDiv = document.createElement('div');
        emojiDiv.innerText = data.emoji;
        emojiDiv.className = 'floating-emoji';
        emojiDiv.style.left = (Math.random() * 80 + 10) + '%'; 
        document.body.appendChild(emojiDiv);
        setTimeout(() => emojiDiv.remove(), 2500);
        return; 
    }

    if (!isRestore) sessionStorage.setItem('kahoot_last_game_data', JSON.stringify(data));

    if (data.type === "QUESTION") {
        kahootHostWaitingResults = false;
        
        if (typeof window.renovarSafeguardKahoot === "function") window.renovarSafeguardKahoot();
        
        document.getElementById('kr-host-view').style.display = 'none';
        document.getElementById('kr-host-podium').style.display = 'none';
        document.getElementById('kr-guest-view').style.display = 'none';
        document.getElementById('kr-guest-final-view').style.display = 'none';

        document.getElementById('screen-result-code').style.display = 'none';
        document.getElementById('screen-game-code').classList.remove('hidden');
        document.getElementById('screen-game-code').style.display = 'flex';
        window.location.hash = '#screen-game-code';

        if (isHost) {
            document.getElementById('btn-force-end-game').style.display = 'block';
            document.getElementById('kg-guest-view').style.display = 'none';
            document.getElementById('kg-host-view').style.display = 'flex';
            
            document.getElementById('kg-host-question').innerText = `Q${data.qNumber}/${data.totalQ}: ${data.text}`;
            for(let i=0; i<4; i++) {
                const box = document.getElementById(`kg-opt-${i}`);
                box.querySelector('.txt').innerText = data.options[i];
                box.style.opacity = '1';
                box.style.border = `2px solid ${borderColors[i]}`;
                box.style.background = bgColors[i];
                box.style.boxShadow = `inset 0 0 20px rgba(0,0,0,0.5)`;
            }
            
            document.getElementById('kg-host-answers-count').innerText = (isRestore || data.isReconnect) ? "?" : "0";
            
            if (!(isRestore || data.isReconnect)) {
                kahootTimeRemaining = 15;
                document.getElementById('kg-host-timer').innerText = kahootTimeRemaining;
                if(kahootTimerInterval) clearInterval(kahootTimerInterval);
                kahootTimerInterval = setInterval(() => {
                    kahootTimeRemaining--;
                    document.getElementById('kg-host-timer').innerText = kahootTimeRemaining;
                    if (kahootTimeRemaining <= 0) {
                        clearInterval(kahootTimerInterval);
                        pedirResultadosKahoot();
                    }
                }, 1000);
            }
        } else {
            document.getElementById('btn-force-end-game').style.display = 'none';
            document.getElementById('kg-host-view').style.display = 'none';
            document.getElementById('kg-guest-view').style.display = 'flex';

            document.getElementById('kg-guest-pin').innerText = sessionStorage.getItem('current_game_id');
            document.getElementById('kg-guest-name').innerText = sessionStorage.getItem('genius_username');
            document.getElementById('kg-guest-score-live').innerText = sessionStorage.getItem('kahoot_guest_score') || "0";

            document.getElementById('kg-guest-qnum').innerText = `P. ${data.qNumber}`;
            for(let i=0; i<4; i++) document.getElementById(`guest-opt-${i}-txt`).innerText = data.options[i];
            
            const answeredLocal = sessionStorage.getItem('kahoot_guest_answered') === data.qNumber.toString();
            
            // 🔥 ESCUDO BATTLE ROYALE (MUERTE SÚBITA) 🔥
            if (data.eliminated) {
                document.getElementById('kg-guest-controls').style.display = 'none';
                document.getElementById('kg-guest-wait').style.display = 'flex';
                
                const loader = document.querySelector('#kg-guest-wait .loader');
                if(loader) loader.style.display = 'none';
                
                const waitH2 = document.querySelector('#kg-guest-wait h2');
                if(waitH2) {
                    waitH2.innerText = "¡ELIMINADO! 💀";
                    waitH2.style.color = "#F44336";
                }
                const waitP = document.querySelector('#kg-guest-wait p');
                if(waitP) waitP.innerText = "Muerte Súbita. Has pasado a Modo Espectador.";
            } 
            else if (data.alreadyAnswered || answeredLocal) {
                document.getElementById('kg-guest-controls').style.display = 'none';
                document.getElementById('kg-guest-wait').style.display = 'flex';
                
                const loader = document.querySelector('#kg-guest-wait .loader');
                if(loader) loader.style.display = 'block';
                
                const waitH2 = document.querySelector('#kg-guest-wait h2');
                if(waitH2) {
                    waitH2.innerText = "¡Respuesta enviada!";
                    waitH2.style.color = "#FFD700";
                }
                const waitP = document.querySelector('#kg-guest-wait p');
                if(waitP) waitP.innerText = "Espera a que los demás respondan...";
            } else {
                document.getElementById('kg-guest-controls').style.display = 'grid';
                document.getElementById('kg-guest-wait').style.display = 'none';
                
                if (!(isRestore || data.isReconnect)) {
                    kahootTimeRemaining = 15;
                    if(kahootTimerInterval) clearInterval(kahootTimerInterval);
                    kahootTimerInterval = setInterval(() => { kahootTimeRemaining--; }, 1000);
                }
            }
        }
    } 
    else if (data.type === "ANSWER_ACK" && isHost) {
        document.getElementById('kg-host-answers-count').innerText = data.totalAnswers;
        if (data.totalAnswers >= kahootTotalPlayers && !kahootHostWaitingResults) {
            clearInterval(kahootTimerInterval);
            pedirResultadosKahoot();
        }
    } 
    else if (data.type === "RESULTS" || data.type === "FINAL_RESULTS") {
        if(kahootTimerInterval) clearInterval(kahootTimerInterval);
        
        sessionStorage.setItem('kahoot_guest_answered', 'false');

        if (isHost) {
            document.getElementById('btn-force-end-game').style.display = 'none';
            for(let i=0; i<4; i++) {
                const box = document.getElementById(`kg-opt-${i}`);
                if (i !== data.correctIndex) {
                    box.style.opacity = '0.2'; box.style.boxShadow = 'none';
                } else {
                    box.style.border = '5px solid #00E676';
                    box.style.background = 'rgba(0, 230, 118, 0.3)';
                    box.style.boxShadow = '0 0 40px #00E676';
                }
            }
            
            const renderTablonHost = () => {
                if (typeof window.renovarSafeguardKahoot === "function") window.renovarSafeguardKahoot();
                document.getElementById('screen-game-code').style.display = 'none';
                document.getElementById('screen-result-code').classList.remove('hidden');
                document.getElementById('screen-result-code').style.display = 'flex';
                window.location.hash = '#screen-result-code';
                
                document.getElementById('kr-host-view').style.display = 'flex';
                document.getElementById('kr-host-podium').style.display = 'none';
                document.getElementById('kr-guest-view').style.display = 'none';
                document.getElementById('kr-guest-final-view').style.display = 'none';

                const list = document.getElementById('kr-leaderboard-container');
                list.innerHTML = "";
                data.leaderboard.forEach((p, index) => {
                    const isTop1 = index === 0;
                    list.innerHTML += `
                        <div style="display:flex; align-items:center; background: rgba(255,255,255,0.05); border-left: 5px solid ${isTop1 ? '#FFD700' : '#03DAC6'}; padding: 15px 25px; border-radius: 10px; transition: transform 0.5s ease-in-out;">
                            <span style="font-size: 2rem; font-weight: bold; color: ${isTop1 ? '#FFD700' : '#FFF'}; width: 60px;">#${p.rank}</span>
                            <span style="font-size: 1.8rem; flex: 1; color: #FFF; font-weight:bold;">${p.username}</span>
                            <div style="display:flex; align-items:center; gap:15px;">
                                <span id="lb-gained-${p.username}" style="color:#00E676; font-size:1.5rem; font-weight:bold; opacity:0; transform:translateY(10px); transition: all 0.5s;">+${p.gained}</span>
                                <span id="lb-score-${p.username}" style="font-size: 2.2rem; font-family: 'Cinzel Decorative'; color: #FFD700;">${(isRestore || data.isReconnect) ? p.score : p.prevScore}</span>
                            </div>
                        </div>
                    `;
                });

                if (!(isRestore || data.isReconnect)) {
                    setTimeout(() => {
                        data.leaderboard.forEach(p => {
                            if (p.gained > 0) {
                                const gainedSpan = document.getElementById(`lb-gained-${p.username}`);
                                gainedSpan.style.opacity = '1'; gainedSpan.style.transform = 'translateY(0)';
                                setTimeout(() => {
                                    gainedSpan.style.opacity = '0';
                                    document.getElementById(`lb-score-${p.username}`).innerText = p.score;
                                }, 1000);
                            }
                        });
                    }, 500);
                }

                const btnNext = document.getElementById('btn-next-kahoot-question');
                btnNext.style.display = 'block';
                
                if (data.type === "FINAL_RESULTS") {
                    btnNext.innerText = "VER PODIO 🏆";
                    btnNext.onclick = () => {
                        document.getElementById('kr-host-view').style.display = 'none';
                        document.getElementById('kr-host-podium').style.display = 'flex';
                        
                        const p1 = data.leaderboard.find(p => p.rank === 1);
                        const p2 = data.leaderboard.find(p => p.rank === 2);
                        const p3 = data.leaderboard.find(p => p.rank === 3);
                        const p4 = data.leaderboard.find(p => p.rank === 4);
                        
                        if(p1) { document.getElementById('podium-1-name').innerText = p1.username; document.getElementById('podium-1-score').innerText = p1.score + " pts"; }
                        if(p2) { document.getElementById('podium-2-name').innerText = p2.username; document.getElementById('podium-2-score').innerText = p2.score + " pts"; }
                        if(p3) { document.getElementById('podium-3-name').innerText = p3.username; document.getElementById('podium-3-score').innerText = p3.score + " pts"; }
                        if(p4) {
                            document.getElementById('podium-4-container').style.display = 'flex';
                            document.getElementById('podium-4-name').innerText = p4.username;
                            document.getElementById('podium-4-score').innerText = p4.score + " pts";
                        }
                    };
                } else {
                    btnNext.innerText = "SIGUIENTE PREGUNTA ➔";
                    btnNext.onclick = () => {
                        btnNext.style.display = 'none';
                        stompClient.send("/app/kahoot.nextQuestion", {}, JSON.stringify({ gameId: sessionStorage.getItem('current_game_id') }));
                    };
                }
            };

            if (isRestore || data.isReconnect) {
                renderTablonHost(); 
            } else {
                setTimeout(renderTablonHost, 5000); 
            }

        } else {
            // INVITADO
            document.getElementById('kg-guest-score-live').innerText = data.myScore;
            sessionStorage.setItem('kahoot_guest_score', data.myScore); 
            
            if (typeof window.renovarSafeguardKahoot === "function") window.renovarSafeguardKahoot();
            document.getElementById('screen-game-code').style.display = 'none';
            document.getElementById('screen-result-code').classList.remove('hidden');
            document.getElementById('screen-result-code').style.display = 'flex';
            window.location.hash = '#screen-result-code';

            if (data.type === "FINAL_RESULTS") {
                document.getElementById('kr-host-view').style.display = 'none';
                document.getElementById('kr-host-podium').style.display = 'none';
                document.getElementById('kr-guest-view').style.display = 'none';
                document.getElementById('kr-guest-final-view').style.display = 'flex';

                document.getElementById('kr-guest-final-rank').innerText = `#${data.myRank}`;
                document.getElementById('kr-guest-final-score').innerText = data.myScore;
                
                const finalMotto = document.getElementById('kr-guest-final-motto');
                if (data.myRank === 1) finalMotto.innerText = "🏆 ¡ERES EL CAMPEÓN! 🏆";
                else if (data.myRank <= 3) finalMotto.innerText = "🥈 ¡EN EL PODIO! 🥉";
                else finalMotto.innerText = "¡Gran esfuerzo!";

            } else {
                document.getElementById('kr-host-view').style.display = 'none';
                document.getElementById('kr-host-podium').style.display = 'none';
                document.getElementById('kr-guest-final-view').style.display = 'none';
                document.getElementById('kr-guest-view').style.display = 'flex';
                
                document.getElementById('kr-guest-rank').innerText = `#${data.myRank}`;
                document.getElementById('kr-guest-score-bottom').innerText = data.myScore;
                
                const streakDiv = document.getElementById('kr-guest-streak');
                if (data.myStreak >= 2) { 
                    streakDiv.style.display = 'block';
                    streakDiv.innerHTML = `🔥 Racha de ${data.myStreak} aciertos 🔥`;
                } else {
                    streakDiv.style.display = 'none';
                }

                const titleMsg = document.getElementById('kr-guest-motivational');
                const container = document.getElementById('kr-guest-behind-container');
                const txt = document.getElementById('kr-guest-behind');
                
                // 🔥 ESCUDO BATTLE ROYALE: Frase motivacional roja si has muerto
                if (data.eliminated) {
                    titleMsg.innerText = "Has sido ELIMINADO 💀";
                    titleMsg.style.color = "#F44336";
                    container.style.display = 'block'; 
                    container.style.borderColor = '#F44336';
                    txt.innerHTML = `Muerte Súbita. Ya no puedes responder.`;
                } else if (data.myRank === 1) {
                    titleMsg.innerText = "¡Eres el Rey!";
                    titleMsg.style.color = "#FFF";
                    container.style.display = 'block'; 
                    container.style.borderColor = '#FFD700';
                    txt.innerHTML = `Le sacas <strong style="color:#FFD700;">${data.pointsBehind} pts</strong> al segundo.`;
                } else if (data.pointsBehind > 0) {
                    titleMsg.innerText = "¡Sigue luchando!";
                    titleMsg.style.color = "#FFF";
                    container.style.display = 'block'; 
                    container.style.borderColor = '#E91E63';
                    txt.innerHTML = `A <strong style="color:#FFD700;">${data.pointsBehind} pts</strong> de <strong style="color:#03DAC6;">${data.aheadUser}</strong>`;
                } else {
                    titleMsg.innerText = "Estás en la posición";
                    titleMsg.style.color = "#FFF";
                    container.style.display = 'none';
                }
            }
        }
    }
};

window.enviarKahootRespuesta = function(index) {
    document.getElementById('kg-guest-controls').style.display = 'none';
    document.getElementById('kg-guest-wait').style.display = 'flex';
    
    const qNum = document.getElementById('kg-guest-qnum').innerText.replace('P. ', '');
    sessionStorage.setItem('kahoot_guest_answered', qNum);

    stompClient.send("/app/kahoot.answer", {}, JSON.stringify({ 
        gameId: sessionStorage.getItem('current_game_id'), 
        username: sessionStorage.getItem('genius_username'), 
        answerIndex: index, 
        timeRemaining: kahootTimeRemaining > 0 ? kahootTimeRemaining : 1
    }));
};

function pedirResultadosKahoot() {
    kahootHostWaitingResults = true;
    stompClient.send("/app/kahoot.showResults", {}, JSON.stringify({ gameId: sessionStorage.getItem('current_game_id') }));
}

window.sendKahootEmoji = function(emoji) {
    document.getElementById('kahoot-emoji-picker').style.display = 'none';
    stompClient.send("/app/kahoot.emoji", {}, JSON.stringify({ 
        gameId: sessionStorage.getItem('current_game_id'), 
        emoji: emoji 
    }));
};

window.forzarFinPartidaKahoot = function() {
    window.salirDeKahoot(true);
};

window.volverAlLobbyKahoot = function() {
    if (typeof stompClient !== 'undefined' && stompClient !== null && stompClient.connected) {
        stompClient.send("/app/kahoot.backToLobby", {}, JSON.stringify({ gameId: sessionStorage.getItem('current_game_id') }));
    }
};