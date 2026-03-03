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
        System.out.println("LOBBY: " + joiningPlayer.getUsername() + " quiere unirse a [" + categoryName + "]");

        Map<String, User> waitingPool = categoryWaitingPools.computeIfAbsent(categoryName, k -> new ConcurrentHashMap<>());

        synchronized (waitingPool) {
            if (waitingPool.isEmpty()) {
                waitingPool.put(joiningPlayer.getUsername(), joiningPlayer);
                System.out.println("LOBBY: " + joiningPlayer.getUsername() + " puesto en espera en [" + categoryName + "]");
            } else {
                User playerOne = waitingPool.remove(waitingPool.keySet().iterator().next());
                User playerTwo = joiningPlayer;

                System.out.println("LOBBY: ¡Match encontrado en [" + categoryName + "]! " + playerOne.getUsername() + " vs " + playerTwo.getUsername());

                List<Question> gameQuestions = generateGameQuestions(categoryName); // <-- ¡Vienen ordenadas!
                String questionIdList = gameQuestions.stream()
                        .map(q -> String.valueOf(q.getId()))
                        .collect(Collectors.joining(","));

                Game newGame = new Game();
                newGame.setId(UUID.randomUUID().toString());
                newGame.setPlayerOne(playerOne);
                newGame.setPlayerTwo(playerTwo);
                newGame.setGameState("IN_PROGRESS");
                newGame.setQuestionIds(questionIdList);

                if (!categoryName.equals("Cultura General")) {
                    categoryRepository.findByName(categoryName).ifPresent(newGame::setCategory);
                }

                gameRepository.save(newGame);

                String gameId = newGame.getId();
                String p1Username = playerOne.getUsername();
                String p2Username = playerTwo.getUsername();

                // --- ¡ESTE ES EL CÓDIGO QUE GENERA EL JSON CORRECTO! ---
                messagingTemplate.convertAndSend("/topic/game.start." + p1Username,
                        new GameStartMessage(gameId, p1Username, p2Username, p2Username));

                messagingTemplate.convertAndSend("/topic/game.start." + p2Username,
                        new GameStartMessage(gameId, p1Username, p2Username, p1Username));
            }
        }
    }


    @MessageMapping("/game.invite")
    @Transactional
    public void invitePlayer(Principal principal, @Payload InviteRequestDTO request) {
        User sender = userRepository.findByEmail(principal.getName()).orElseThrow();
        User receiver = userRepository.findByUsername(request.getReceiverUsername()).orElseThrow();

        System.out.println("INVITE: " + sender.getUsername() + " está invitando a " + receiver.getUsername());

        GameInvite invite = new GameInvite();
        invite.setSender(sender);
        invite.setReceiver(receiver);

        if (!request.getCategoryName().equals("Cultura General")) {
            Category category = categoryRepository.findByName(request.getCategoryName()).orElseThrow();
            invite.setCategory(category);
        }

        GameInvite savedInvite = inviteRepository.save(invite);

        String receiverTopic = "/topic/invites." + receiver.getUsername();
        messagingTemplate.convertAndSend(receiverTopic, new InviteNotificationDTO(savedInvite));
    }

    @MessageMapping("/invite.accept")
    @Transactional
    public void acceptInvite(Principal principal, @Payload InviteAcceptDTO request) {
        User receiver = userRepository.findByEmail(principal.getName()).orElseThrow();
        GameInvite invite = inviteRepository.findById(request.getInviteId()).orElseThrow();

        if (!invite.getReceiver().getUsername().equals(receiver.getUsername()) || !invite.getStatus().equals("PENDING")) {
            System.err.println("INVITE_ACCEPT: ¡Intento de aceptar invitación fallido!");
            return;
        }

        invite.setStatus("ACCEPTED");
        inviteRepository.save(invite);

        User sender = invite.getSender();
        String categoryName = (invite.getCategory() != null) ? invite.getCategory().getName() : "Cultura General";

        System.out.println("INVITE_ACCEPT: " + receiver.getUsername() + " aceptó la invitación de " + sender.getUsername());

        List<Question> gameQuestions = generateGameQuestions(categoryName); // <-- ¡Vienen ordenadas!
        String questionIdList = gameQuestions.stream()
                .map(q -> String.valueOf(q.getId()))
                .collect(Collectors.joining(","));

        Game newGame = new Game();
        newGame.setId(UUID.randomUUID().toString());
        newGame.setPlayerOne(sender);
        newGame.setPlayerTwo(receiver);
        newGame.setGameState("IN_PROGRESS");
        newGame.setQuestionIds(questionIdList);
        newGame.setCategory(invite.getCategory());
        gameRepository.save(newGame);

        String gameId = newGame.getId();
        String p1Username = sender.getUsername();
        String p2Username = receiver.getUsername();

        messagingTemplate.convertAndSend("/topic/game.start." + p1Username,
                new GameStartMessage(gameId, p1Username, p2Username, p2Username));

        messagingTemplate.convertAndSend("/topic/game.start." + p2Username,
                new GameStartMessage(gameId, p1Username, p2Username, p1Username));
    }

    private List<Question> generateGameQuestions(String categoryName) {

        List<Question> easy, medium, hard;

        if (categoryName.equals("Cultura General")) {
            easy = questionRepository.findAllByDifficultyLevel(Difficulty.Fácil);
            medium = questionRepository.findAllByDifficultyLevel(Difficulty.Intermedia);
            hard = questionRepository.findAllByDifficultyLevel(Difficulty.Difícil);
        } else {
            Category category = categoryRepository.findByName(categoryName)
                    .orElseThrow(() -> new RuntimeException("Categoría no encontrada: " + categoryName));
            easy = questionRepository.findByCategoryAndDifficultyLevel(category, Difficulty.Fácil);
            medium = questionRepository.findByCategoryAndDifficultyLevel(category, Difficulty.Intermedia);
            hard = questionRepository.findByCategoryAndDifficultyLevel(category, Difficulty.Difícil);
        }

        Collections.shuffle(easy);
        Collections.shuffle(medium);
        Collections.shuffle(hard);

        List<Question> gameQuestions = Stream.concat(
                easy.stream().limit(5),
                Stream.concat(
                        medium.stream().limit(5),
                        hard.stream().limit(5)
                )
        ).collect(Collectors.toList());

        // ¡NO BARREJAMOS LA LISTA FINAL!

        return gameQuestions;
    }
}