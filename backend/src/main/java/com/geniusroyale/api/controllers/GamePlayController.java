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
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class GamePlayController {

    @Autowired private SimpMessagingTemplate messagingTemplate;
    @Autowired private GameRepository gameRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private QuestionRepository questionRepository;

    private static final Map<String, Map<String, String>> RESPUESTAS_EN_VIVO = new ConcurrentHashMap<>();

    @MessageMapping("/game.leave")
    @Transactional
    public void leaveGame(Principal principal, @Payload Map<String, String> payload) {
        String username = userRepository.findByEmail(principal.getName()).orElseThrow().getUsername();
        String gameId = payload.get("gameId");
        
        Game game = gameRepository.findById(gameId).orElse(null);
        if (game == null || "FINISHED".equals(game.getGameState())) return;

        if (!game.getEliminatedPlayers().contains(username)) {
            game.getEliminatedPlayers().add(username);
            
            GameUpdateDTO update = new GameUpdateDTO();
            update.setType("PLAYER_LEFT");
            update.setWinnerUsername(username); 
            for (User u : game.getPlayers()) {
                messagingTemplate.convertAndSend("/topic/game.updates." + u.getUsername(), update);
            }

            long aliveCount = game.getPlayers().stream().filter(p -> !game.getEliminatedPlayers().contains(p.getUsername())).count();
            
            if (aliveCount <= 1 && game.getPlayers().size() > 1) {
                terminarPartidaAbruptamente(game);
            } else {
                gameRepository.save(game);
            }
        }
    }

    // 🔥 NUEVO: LÓGICA DEL COMODÍN BOMBA 🔥
    @MessageMapping("/game.bomb")
    @Transactional
    public void dropBomb(Principal principal, @Payload Map<String, String> payload) {
        String username = userRepository.findByEmail(principal.getName()).orElseThrow().getUsername();
        String gameId = payload.get("gameId");
        Game game = gameRepository.findById(gameId).orElse(null);
        
        if (game == null || "FINISHED".equals(game.getGameState())) return;

        List<Question> pool = questionRepository.findAllByDifficultyLevel(Difficulty.intermedia);
        if(!pool.isEmpty()) {
            Collections.shuffle(pool);
            Question newQ = pool.get(0);
            
            String[] qIds = game.getQuestionIds().split(",");
            int idx = game.getCurrentQuestionIndex();
            if(idx < qIds.length) {
                qIds[idx] = String.valueOf(newQ.getId());
                game.setQuestionIds(String.join(",", qIds));
                gameRepository.save(game);
            }
            
            RESPUESTAS_EN_VIVO.remove(gameId); 
            
            GameUpdateDTO bombUpdate = new GameUpdateDTO();
            bombUpdate.setType("BOMB_DROPPED");
            bombUpdate.setWinnerUsername(username);
            String qJson = String.format("{\"text\":\"%s\", \"correct\":\"%s\", \"w1\":\"%s\", \"w2\":\"%s\", \"w3\":\"%s\"}",
                newQ.getQuestionText().replace("\"","'"), newQ.getCorrectAnswer().replace("\"","'"), 
                newQ.getWrongAnswer1().replace("\"","'"), newQ.getWrongAnswer2().replace("\"","'"), newQ.getWrongAnswer3().replace("\"","'"));
            bombUpdate.setCorrectAnswer(qJson);

            for (User u : game.getPlayers()) {
                messagingTemplate.convertAndSend("/topic/game.updates." + u.getUsername(), bombUpdate);
            }
        }
    }

    @MessageMapping("/game.answer")
    @Transactional
    public void handleAnswer(Principal principal, @Payload PlayerAnswerDTO answer) {

        String username = userRepository.findByEmail(principal.getName()).orElseThrow().getUsername();
        Game game = gameRepository.findById(answer.getGameId()).orElseThrow();

        if ("FINISHED".equals(game.getGameState())) return;
        if (game.getEliminatedPlayers().contains(username)) return;

        Map<String, String> respuestasPartida = RESPUESTAS_EN_VIVO.computeIfAbsent(game.getId(), k -> new ConcurrentHashMap<>());

        if (!respuestasPartida.containsKey(username)) {
            respuestasPartida.put(username, answer.getSelectedAnswer());
            GameUpdateDTO rivalUpdate = new GameUpdateDTO();
            rivalUpdate.setType("PLAYER_ANSWERED_LIVE");
            rivalUpdate.setWinnerUsername(username); 
            rivalUpdate.setCorrectAnswer(answer.getSelectedAnswer()); 
            
            for (User u : game.getPlayers()) {
                messagingTemplate.convertAndSend("/topic/game.updates." + u.getUsername(), rivalUpdate);
            }
        }

        long aliveCount = game.getPlayers().stream().filter(p -> !game.getEliminatedPlayers().contains(p.getUsername())).count();

        synchronized (respuestasPartida) {
            if (respuestasPartida.size() >= aliveCount && aliveCount > 0) {
                Map<String, String> respuestasFinales = new HashMap<>(respuestasPartida);
                respuestasPartida.clear();
                processRound(game, respuestasFinales, aliveCount);
            }
        }
    }

    private void processRound(Game game, Map<String, String> respuestasFinales, long aliveCount) {
        String[] questionIds = game.getQuestionIds().split(",");
        int questionIndex = game.getCurrentQuestionIndex();
        Question question = questionRepository.findById(Integer.parseInt(questionIds[questionIndex])).orElseThrow();
        String correctAnswer = question.getCorrectAnswer();
        boolean isBattleRoyale = "Battle Royale".equals(game.getGameMode());

        List<String> eliminadosEstaRonda = new ArrayList<>();

        for (Map.Entry<String, String> entry : respuestasFinales.entrySet()) {
            String pName = entry.getKey();
            String pAns = entry.getValue();

            if (correctAnswer.equals(pAns)) {
                int currentScore = game.getScores().getOrDefault(pName, 0);
                game.getScores().put(pName, currentScore + (isBattleRoyale ? 1 : getScore(question.getDifficultyLevel())));
                
                User u = userRepository.findByUsername(pName).orElse(null);
                if (u != null) {
                    int currentCorrects = u.getPreguntasAcertadas() == null ? 0 : u.getPreguntasAcertadas();
                    u.setPreguntasAcertadas(currentCorrects + 1);
                    userRepository.save(u);
                }
            } else {
                if (isBattleRoyale) {
                    game.getEliminatedPlayers().add(pName);
                    eliminadosEstaRonda.add(pName);
                }
            }
        }

        GameUpdateDTO roundResult = new GameUpdateDTO();
        roundResult.setType("ROUND_RESULT");
        roundResult.setCorrectAnswer(correctAnswer);
        roundResult.setScores(game.getScores());
        
        roundResult.setWinnerUsername(eliminadosEstaRonda.isEmpty() ? "" : String.join(",", eliminadosEstaRonda));

        for (User u : game.getPlayers()) {
            messagingTemplate.convertAndSend("/topic/game.updates." + u.getUsername(), roundResult);
        }

        game.setCurrentQuestionIndex(questionIndex + 1);
        long newAliveCount = aliveCount - eliminadosEstaRonda.size();

        if (game.getCurrentQuestionIndex() >= questionIds.length || (isBattleRoyale && newAliveCount <= 1)) {
            terminarPartida(game);
        } else {
            gameRepository.save(game);
        }
    }

    private void terminarPartida(Game game) {
        game.setGameState("FINISHED");
        boolean isBattleRoyale = "Battle Royale".equals(game.getGameMode());
        
        int maxScore = game.getScores().values().stream().max(Integer::compare).orElse(0);
        List<String> tiedPlayers = new ArrayList<>();
        
        if (isBattleRoyale) {
            long aliveCount = game.getPlayers().stream().filter(p -> !game.getEliminatedPlayers().contains(p.getUsername())).count();
            if (aliveCount == 1) {
                String aliveWinner = game.getPlayers().stream().filter(p -> !game.getEliminatedPlayers().contains(p.getUsername())).findFirst().get().getUsername();
                tiedPlayers.add(aliveWinner);
            } else {
                for (Map.Entry<String, Integer> e : game.getScores().entrySet()) {
                    if (e.getValue() != null && e.getValue().equals(maxScore)) tiedPlayers.add(e.getKey());
                }
            }
        } else {
            for (Map.Entry<String, Integer> e : game.getScores().entrySet()) {
                if (e.getValue() != null && e.getValue().equals(maxScore)) tiedPlayers.add(e.getKey());
            }
        }

        Map<String, String> diceRolls = new HashMap<>();
        for (User p : game.getPlayers()) {
            diceRolls.put(p.getUsername(), String.valueOf((int) (Math.random() * 6) + 1));
        }

        if (tiedPlayers.size() > 1) {
            List<Integer> availableRolls = new ArrayList<>(Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
            Collections.shuffle(availableRolls);
            for (int i = 0; i < tiedPlayers.size(); i++) {
                diceRolls.put(tiedPlayers.get(i), String.valueOf(availableRolls.get(i)));
            }
        }

        String winner = "Empate";
        if (tiedPlayers.size() == 1) {
            winner = tiedPlayers.get(0);
        } 
        
        String dbWinner = tiedPlayers.size() > 1 ? tiedPlayers.stream().max(Comparator.comparingInt(p -> Integer.parseInt(diceRolls.get(p)))).get() : tiedPlayers.get(0);
        
        User w = userRepository.findByUsername(dbWinner).orElse(null);
        if (w != null) {
            int currentWins = w.getPartidasGanadas() == null ? 0 : w.getPartidasGanadas();
            w.setPartidasGanadas(currentWins + 1);
            userRepository.save(w);
        }

        GameUpdateDTO gameOver = new GameUpdateDTO();
        gameOver.setType("GAME_OVER");
        gameOver.setWinnerUsername(winner); 
        gameOver.setScores(game.getScores());
        gameOver.setCorrectAnswer(diceRolls.toString()); 
        
        for (User u : game.getPlayers()) {
            messagingTemplate.convertAndSend("/topic/game.updates." + u.getUsername(), gameOver);
        }
        
        GameLobbyController.finalizarJuegoEnLobby(game.getPlayers());
        gameRepository.save(game);
    }

    private void terminarPartidaAbruptamente(Game game) {
        game.setGameState("FINISHED");
        
        String winner = game.getPlayers().stream()
                .filter(p -> !game.getEliminatedPlayers().contains(p.getUsername()))
                .findFirst()
                .map(User::getUsername)
                .orElse("Empate");

        if (!"Empate".equals(winner)) {
            User w = userRepository.findByUsername(winner).orElse(null);
            if (w != null) {
                int currentWins = w.getPartidasGanadas() == null ? 0 : w.getPartidasGanadas();
                w.setPartidasGanadas(currentWins + 1);
                userRepository.save(w);
            }
        }

        Map<String, String> diceRolls = new HashMap<>();
        for (User p : game.getPlayers()) {
            if (p.getUsername().equals(winner)) {
                diceRolls.put(p.getUsername(), "6"); 
            } else {
                diceRolls.put(p.getUsername(), String.valueOf((int) (Math.random() * 3) + 1)); 
            }
        }

        GameUpdateDTO gameOver = new GameUpdateDTO();
        gameOver.setType("GAME_OVER_ABORTED"); 
        gameOver.setWinnerUsername(winner);
        gameOver.setScores(game.getScores());
        gameOver.setCorrectAnswer(diceRolls.toString()); 
        
        for (User u : game.getPlayers()) {
            messagingTemplate.convertAndSend("/topic/game.updates." + u.getUsername(), gameOver);
        }
        
        GameLobbyController.finalizarJuegoEnLobby(game.getPlayers());
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