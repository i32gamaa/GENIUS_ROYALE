package com.geniusroyale.api.controllers;

import com.geniusroyale.api.dto.GameStartMessage;
import com.geniusroyale.api.dto.LobbyJoinRequest;
import com.geniusroyale.api.dto.InviteRequestDTO;
import com.geniusroyale.api.dto.InviteNotificationDTO;
import com.geniusroyale.api.dto.InviteAcceptDTO;
import com.geniusroyale.api.models.*;
import com.geniusroyale.api.repositories.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Controller
public class GameLobbyController {

    @Autowired private SimpMessagingTemplate messagingTemplate;
    @Autowired private GameRepository gameRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private QuestionRepository questionRepository;
    @Autowired private GameInviteRepository inviteRepository;

    private static final Map<String, Map<String, User>> categoryWaitingPools = new ConcurrentHashMap<>();

    @MessageMapping("/lobby.join")
    @Transactional
    public void joinPublicLobby(Principal principal, @Payload LobbyJoinRequest request) {
        String email = principal.getName();
        User joiningPlayer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + email));

        String categoryName = request.getCategoryName();
        Map<String, User> waitingPool = categoryWaitingPools.computeIfAbsent(categoryName, k -> new ConcurrentHashMap<>());

        synchronized (waitingPool) {
            if (waitingPool.isEmpty()) {
                waitingPool.put(joiningPlayer.getUsername(), joiningPlayer);
            } else {
                User playerOne = waitingPool.remove(waitingPool.keySet().iterator().next());
                User playerTwo = joiningPlayer;

                List<Question> gameQuestions = generateGameQuestions(categoryName); 
                String questionIdList = gameQuestions.stream()
                        .map(q -> String.valueOf(q.getId()))
                        .collect(Collectors.joining(","));

                Game newGame = new Game();
                newGame.setId(UUID.randomUUID().toString());
                newGame.setPlayerOne(playerOne);
                newGame.setPlayerTwo(playerTwo);
                newGame.setGameState("IN_PROGRESS");
                newGame.setQuestionIds(questionIdList);

                if (categoryName != null && !categoryName.equals("Cultura General") && !categoryName.equals("Aleatoria")) {
                    categoryRepository.findByName(categoryName).ifPresent(newGame::setCategory);
                }

                gameRepository.save(newGame);

                String gameId = newGame.getId();
                messagingTemplate.convertAndSend("/topic/game.start." + playerOne.getUsername(),
                        new GameStartMessage(gameId, playerOne.getUsername(), playerTwo.getUsername(), playerTwo.getUsername()));

                messagingTemplate.convertAndSend("/topic/game.start." + playerTwo.getUsername(),
                        new GameStartMessage(gameId, playerOne.getUsername(), playerTwo.getUsername(), playerOne.getUsername()));
            }
        }
    }

    @MessageMapping("/game.invite")
    @Transactional
    public void invitePlayer(Principal principal, @Payload InviteRequestDTO request) {
        User sender = userRepository.findByEmail(principal.getName()).orElseThrow();
        User receiver = userRepository.findByUsername(request.getReceiverUsername()).orElseThrow();

        GameInvite invite = new GameInvite();
        invite.setSender(sender);
        invite.setReceiver(receiver);

        String catName = request.getCategoryName();
        if (catName != null && !catName.equals("Cultura General") && !catName.equals("Aleatoria")) {
            Category category = categoryRepository.findByName(catName).orElse(null);
            if (category != null) {
                invite.setCategory(category);
            }
        }

        GameInvite savedInvite = inviteRepository.save(invite);
        String receiverTopic = "/topic/invites." + receiver.getUsername();
        messagingTemplate.convertAndSend(receiverTopic, new InviteNotificationDTO(savedInvite));
    }

    // 1. EL INVITADO ACEPTA (Solo entran al lobby, no empieza el juego)
    @MessageMapping("/invite.accept")
    @Transactional
    public void acceptInvite(Principal principal, @Payload InviteAcceptDTO request) {
        User receiver = userRepository.findByEmail(principal.getName()).orElseThrow();
        GameInvite invite = inviteRepository.findById(request.getInviteId()).orElseThrow();

        if (!invite.getReceiver().getUsername().equals(receiver.getUsername()) || !invite.getStatus().equals("PENDING")) {
            return;
        }

        invite.setStatus("ACCEPTED");
        inviteRepository.save(invite);

        User sender = invite.getSender();
        
        // Avisamos al Host de que su amigo ya está en la sala listo para jugar
        String payload = String.format("{\"guestUsername\":\"%s\", \"inviteId\":%d}", receiver.getUsername(), invite.getId());
        messagingTemplate.convertAndSend("/topic/lobby.guest.joined." + sender.getUsername(), payload);
    }

    // 2. EL HOST PULSA EL BOTÓN "INICIAR PARTIDA"
    @MessageMapping("/game.start.private")
    @Transactional
    public void startPrivateGame(Principal principal, @Payload Map<String, Object> payload) {
        User sender = userRepository.findByEmail(principal.getName()).orElseThrow();
        Integer inviteId = (Integer) payload.get("inviteId");
        String categoryName = (String) payload.get("categoryName");

        GameInvite invite = inviteRepository.findById(inviteId).orElseThrow();
        User receiver = invite.getReceiver();

        // Generamos las 15 preguntas
        List<Question> gameQuestions = generateGameQuestions(categoryName); 
        String questionIdList = gameQuestions.stream()
                .map(q -> String.valueOf(q.getId()))
                .collect(Collectors.joining(","));

        Category category = null;
        if (categoryName != null && !categoryName.equals("Cultura General") && !categoryName.equals("Aleatoria")) {
            category = categoryRepository.findByName(categoryName).orElse(null);
        }

        // Creamos la partida
        Game newGame = new Game();
        newGame.setId(UUID.randomUUID().toString());
        newGame.setPlayerOne(sender);
        newGame.setPlayerTwo(receiver);
        newGame.setGameState("IN_PROGRESS");
        newGame.setQuestionIds(questionIdList);
        newGame.setCategory(category);
        gameRepository.save(newGame);

        String gameId = newGame.getId();
        
        // Al Host le decimos que su rival es el Receiver
        messagingTemplate.convertAndSend("/topic/game.start." + sender.getUsername(),
                new GameStartMessage(gameId, sender.getUsername(), receiver.getUsername(), receiver.getUsername()));

        // Al Receiver le decimos que su rival es el Host
        messagingTemplate.convertAndSend("/topic/game.start." + receiver.getUsername(),
                new GameStartMessage(gameId, sender.getUsername(), receiver.getUsername(), sender.getUsername()));
    }

    private List<Question> generateGameQuestions(String categoryName) {
        List<Question> easy, medium, hard;

        if (categoryName == null || categoryName.equals("Cultura General") || categoryName.equals("Aleatoria")) {
            easy = questionRepository.findAllByDifficultyLevel(Difficulty.facil);
            medium = questionRepository.findAllByDifficultyLevel(Difficulty.intermedia);
            hard = questionRepository.findAllByDifficultyLevel(Difficulty.dificil);
        } else {
            Category category = categoryRepository.findByName(categoryName).orElse(null);
            if (category == null) {
                easy = questionRepository.findAllByDifficultyLevel(Difficulty.facil);
                medium = questionRepository.findAllByDifficultyLevel(Difficulty.intermedia);
                hard = questionRepository.findAllByDifficultyLevel(Difficulty.dificil);
            } else {
                easy = questionRepository.findByCategoryAndDifficultyLevel(category, Difficulty.facil);
                medium = questionRepository.findByCategoryAndDifficultyLevel(category, Difficulty.intermedia);
                hard = questionRepository.findByCategoryAndDifficultyLevel(category, Difficulty.dificil);
            }
        }

        if (easy.isEmpty() && medium.isEmpty() && hard.isEmpty()) {
            throw new RuntimeException("CRÍTICO: No hay preguntas en la base de datos.");
        }

        Collections.shuffle(easy);
        Collections.shuffle(medium);
        Collections.shuffle(hard);

        return Stream.concat(
                easy.stream().limit(5),
                Stream.concat(medium.stream().limit(5), hard.stream().limit(5))
        ).collect(Collectors.toList());
    }
}