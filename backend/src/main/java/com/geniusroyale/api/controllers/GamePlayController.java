package com.geniusroyale.api.controllers;

import com.geniusroyale.api.dto.GameUpdateDTO;
import com.geniusroyale.api.dto.PlayerAnswerDTO;
import com.geniusroyale.api.models.Difficulty;
import com.geniusroyale.api.models.Game;
import com.geniusroyale.api.models.Question;
import com.geniusroyale.api.models.User;
import com.geniusroyale.api.repositories.GameRepository;
import com.geniusroyale.api.repositories.QuestionRepository;
import com.geniusroyale.api.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class GamePlayController {

    @Autowired private SimpMessagingTemplate messagingTemplate;
    @Autowired private GameRepository gameRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private QuestionRepository questionRepository;

    // 🔥 EL MOTOR DE RESPUESTAS EN RAM: 
    // Inmune a colisiones aunque 10 jugadores manden TIMEOUT en el mismo milisegundo.
    private static final Map<String, Map<String, String>> RESPUESTAS_EN_VIVO = new ConcurrentHashMap<>();

    @MessageMapping("/game.answer")
    @Transactional
    public void handleAnswer(Principal principal, @Payload PlayerAnswerDTO answer) {

        String username = userRepository.findByEmail(principal.getName()).orElseThrow().getUsername();
        Game game = gameRepository.findById(answer.getGameId()).orElseThrow();

        if ("FINISHED".equals(game.getGameState())) return;

        // 1. Obtenemos la "mesa" de respuestas de esta partida en la RAM
        Map<String, String> respuestasPartida = RESPUESTAS_EN_VIVO.computeIfAbsent(game.getId(), k -> new ConcurrentHashMap<>());

        // 2. Si el jugador no había respondido ya, guardamos su respuesta al instante
        if (!respuestasPartida.containsKey(username)) {
            respuestasPartida.put(username, answer.getSelectedAnswer());

            // Avisar a los demás de que este jugador ya ha contestado (para que el reloj les lata)
            GameUpdateDTO rivalUpdate = new GameUpdateDTO();
            rivalUpdate.setType("RIVAL_ANSWERED");
            for (User u : game.getPlayers()) {
                if (!u.getUsername().equals(username)) {
                    messagingTemplate.convertAndSend("/topic/game.updates." + u.getUsername(), rivalUpdate);
                }
            }
        }

        // 3. ¿Han respondido TODOS los jugadores? (Con synchronized evitamos que 2 TIMEOUTS evalúen esto a la vez)
        synchronized (respuestasPartida) {
            if (respuestasPartida.size() >= game.getPlayers().size()) {
                // Hacemos una copia de las respuestas y limpiamos la RAM para la siguiente ronda
                Map<String, String> respuestasFinales = new HashMap<>(respuestasPartida);
                respuestasPartida.clear();
                
                // Procesamos quién ha ganado
                processRound(game, respuestasFinales);
            }
        }
    }

    private void processRound(Game game, Map<String, String> respuestasFinales) {
        String[] questionIds = game.getQuestionIds().split(",");
        int questionIndex = game.getCurrentQuestionIndex();
        Question question = questionRepository.findById(Integer.parseInt(questionIds[questionIndex])).orElseThrow();
        String correctAnswer = question.getCorrectAnswer();
        int scorePoints = getScore(question.getDifficultyLevel());

        // 1. Comprobar aciertos de todos y sumar puntos en memoria
        for (Map.Entry<String, String> entry : respuestasFinales.entrySet()) {
            if (correctAnswer.equals(entry.getValue())) {
                String pName = entry.getKey();
                int currentScore = game.getScores().getOrDefault(pName, 0);
                game.getScores().put(pName, currentScore + scorePoints);
            }
        }

        // 2. Enviar el resultado de la ronda a todos a la vez
        GameUpdateDTO roundResult = new GameUpdateDTO();
        roundResult.setType("ROUND_RESULT");
        roundResult.setCorrectAnswer(correctAnswer);
        roundResult.setScores(game.getScores());

        for (User u : game.getPlayers()) {
            messagingTemplate.convertAndSend("/topic/game.updates." + u.getUsername(), roundResult);
        }

        // 3. Preparar para la siguiente ronda
        game.setCurrentQuestionIndex(questionIndex + 1);

        // 4. Comprobar si es el final de la partida
        if (game.getCurrentQuestionIndex() >= questionIds.length) {
            game.setGameState("FINISHED");
            
            String winner = game.getScores().entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("Empate");

            GameUpdateDTO gameOver = new GameUpdateDTO();
            gameOver.setType("GAME_OVER");
            gameOver.setWinnerUsername(winner);
            gameOver.setScores(game.getScores());
            
            for (User u : game.getPlayers()) {
                messagingTemplate.convertAndSend("/topic/game.updates." + u.getUsername(), gameOver);
            }
        }

        // 5. Por último, guardamos todo el progreso oficial (Puntos y Pregunta actual) en PostgreSQL
        gameRepository.save(game);
    }

    private int getScore(Difficulty difficulty) {
        switch (difficulty) {
            case facil: return 100;
            case intermedia: return 200;
            case dificil: return 300;
            default: return 100;
        }
    }
}