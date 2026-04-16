package com.geniusroyale.api.controllers;

import com.geniusroyale.api.dto.*;
import com.geniusroyale.api.models.*;
import com.geniusroyale.api.repositories.*;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.util.*;
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

    // SALAS EN RAM 
    private static final Map<Integer, Game> SALAS_EN_VIVO = new ConcurrentHashMap<>();

    @PostConstruct
    public void limpiarBD() {
        try { gameRepository.deleteAll(); } catch (Exception e) {}
    }

    @MessageMapping("/game.invite")
    @Transactional
    public void handleInvite(Principal principal, @Payload InviteRequestDTO req) {
        User sender = userRepository.findByEmail(principal.getName()).orElseThrow();
        User receiver = userRepository.findByUsername(req.getReceiverUsername()).orElseThrow();
        Category category = categoryRepository.findByName(req.getCategoryName()).orElse(null);

        GameInvite invite = new GameInvite();
        invite.setSender(sender);
        invite.setReceiver(receiver);
        invite.setCategory(category);
        invite.setStatus("PENDING");
        inviteRepository.save(invite);

        messagingTemplate.convertAndSend("/topic/invites." + receiver.getUsername(), new InviteNotificationDTO(invite));
    }

    @MessageMapping("/invite.accept")
    public void acceptInvite(Principal principal, @Payload InviteAcceptDTO adto) {
        try {
            User guest = userRepository.findByEmail(principal.getName()).orElse(null);
            GameInvite invite = inviteRepository.findById(adto.getInviteId()).orElse(null);

            if (guest == null || invite == null) return;
            User host = invite.getSender();

            Game sala = SALAS_EN_VIVO.get(host.getId());

            if (sala == null) {
                sala = new Game();
                sala.setId(UUID.randomUUID().toString());
                sala.setGameState("WAITING_FOR_PLAYER");
                sala.setPlayers(new ArrayList<>());
                sala.setScores(new HashMap<>());
                
                sala.getPlayers().add(host);
                sala.getScores().put(host.getUsername(), 0);
                
                SALAS_EN_VIVO.put(host.getId(), sala);
            }

            if (sala.getPlayers().size() >= 10) return;
            boolean existe = sala.getPlayers().stream().anyMatch(p -> p.getId().equals(guest.getId()));
            if (!existe) {
                sala.getPlayers().add(guest);
                sala.getScores().put(guest.getUsername(), 0);
            }

            invite.setStatus("ACCEPTED");
            inviteRepository.save(invite);

            List<String> names = sala.getPlayers().stream().map(User::getUsername).collect(Collectors.toList());

            Map<String, Object> lobbyUpdate = new HashMap<>();
            lobbyUpdate.put("type", "LOBBY_UPDATE");
            lobbyUpdate.put("players", names);
            lobbyUpdate.put("gameId", sala.getId());
            lobbyUpdate.put("hostName", host.getUsername());

            for (User p : sala.getPlayers()) {
                messagingTemplate.convertAndSend("/topic/lobby.guest.joined." + p.getUsername(), lobbyUpdate);
            }

        } catch (Exception e) { e.printStackTrace(); }
    }

    // 🔥 ¡AQUÍ ESTÁ LA MAGIA! El @Transactional obliga a la BD a guardar todo perfecto sin cancelar a medias.
    @MessageMapping("/game.start.private")
    @Transactional 
    public void startPrivateGame(Principal principal, @Payload Map<String, Object> payload) {
        String gameId = (String) payload.get("gameId");
        String categoryName = (String) payload.get("categoryName");

        Game gameInRam = null;
        Integer hostIdKey = null;

        for (Map.Entry<Integer, Game> entry : SALAS_EN_VIVO.entrySet()) {
            if (entry.getValue().getId().equals(gameId)) {
                gameInRam = entry.getValue();
                hostIdKey = entry.getKey();
                break;
            }
        }

        if (gameInRam == null) return;

        try {
            Game dbGame = new Game();
            dbGame.setId(gameInRam.getId());
            dbGame.setGameState("IN_PROGRESS");
            dbGame.setCurrentQuestionIndex(0);
            dbGame.setScores(new HashMap<>());

            for (User ramUser : gameInRam.getPlayers()) {
                User realUser = userRepository.findById(ramUser.getId()).orElse(null);
                if (realUser != null) {
                    dbGame.getPlayers().add(realUser);
                    dbGame.getScores().put(realUser.getUsername(), 0);
                }
            }

            List<Question> questions = getBalancedQuestions(categoryName);
            String questionIds = questions.stream().map(q -> String.valueOf(q.getId())).collect(Collectors.joining(","));
            dbGame.setQuestionIds(questionIds);

            if (categoryName != null && !categoryName.equals("Cultura General")) {
                categoryRepository.findByName(categoryName).ifPresent(dbGame::setCategory);
            }

            // Al estar dentro de @Transactional, esto es un bloque inquebrantable
            gameRepository.save(dbGame);

        } catch (Exception e) {
            System.err.println("❌ ERROR FATAL AL GUARDAR LA PARTIDA A LA BD.");
            e.printStackTrace();
            return; 
        }

        SALAS_EN_VIVO.remove(hostIdKey);

        Map<String, Object> startSignal = new HashMap<>();
        startSignal.put("gameId", gameInRam.getId());
        startSignal.put("category", categoryName);
        startSignal.put("players", gameInRam.getPlayers().stream().map(User::getUsername).collect(Collectors.toList()));

        for (User p : gameInRam.getPlayers()) {
            messagingTemplate.convertAndSend("/topic/game.start." + p.getUsername(), startSignal);
        }
    }

    private List<Question> getBalancedQuestions(String categoryName) {
        List<Question> easy, medium, hard;
        if (categoryName == null || categoryName.equals("Cultura General")) {
            easy = questionRepository.findAllByDifficultyLevel(Difficulty.facil);
            medium = questionRepository.findAllByDifficultyLevel(Difficulty.intermedia);
            hard = questionRepository.findAllByDifficultyLevel(Difficulty.dificil);
        } else {
            Category cat = categoryRepository.findByName(categoryName).orElseThrow();
            easy = questionRepository.findByCategoryAndDifficultyLevel(cat, Difficulty.facil);
            medium = questionRepository.findByCategoryAndDifficultyLevel(cat, Difficulty.intermedia);
            hard = questionRepository.findByCategoryAndDifficultyLevel(cat, Difficulty.dificil);
        }
        Collections.shuffle(easy); Collections.shuffle(medium); Collections.shuffle(hard);
        return Stream.concat(easy.stream().limit(1), Stream.concat(medium.stream().limit(1), hard.stream().limit(1))).collect(Collectors.toList());
    }
}