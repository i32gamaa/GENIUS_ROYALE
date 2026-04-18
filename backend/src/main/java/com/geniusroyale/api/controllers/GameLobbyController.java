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

    private static final Map<Integer, Game> SALAS_EN_VIVO = new ConcurrentHashMap<>();
    private static final Map<String, Map<String, String>> ESTADOS_SALA = new ConcurrentHashMap<>();

    @PostConstruct
    public void limpiarBD() {
        try { gameRepository.deleteAll(); } catch (Exception e) {}
    }

    @MessageMapping("/game.invite")
    @Transactional
    public void handleInvite(Principal principal, @Payload Map<String, String> req) {
        try {
            User sender = userRepository.findByEmail(principal.getName()).orElseThrow();
            User receiver = userRepository.findByUsername(req.get("receiverUsername")).orElseThrow();
            Category category = categoryRepository.findByName(req.get("categoryName")).orElse(null);

            GameInvite invite = new GameInvite();
            invite.setSender(sender);
            invite.setReceiver(receiver);
            invite.setCategory(category);
            invite.setStatus("PENDING");
            invite = inviteRepository.save(invite);

            Map<String, Object> invMap = new HashMap<>();
            invMap.put("inviteId", invite.getId());
            invMap.put("senderUsername", sender.getUsername());
            
            messagingTemplate.convertAndSend("/topic/invites." + receiver.getUsername(), invMap);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @MessageMapping("/invite.accept")
    @Transactional
    public void acceptInvite(Principal principal, @Payload Map<String, Object> payload) {
        try {
            User guest = userRepository.findByEmail(principal.getName()).orElse(null);
            if (payload.get("inviteId") == null) return;
            
            Integer inviteId = Integer.parseInt(payload.get("inviteId").toString());
            GameInvite invite = inviteRepository.findById(inviteId).orElse(null);

            if (guest == null || invite == null) return;
            User host = invite.getSender();

            Game sala = SALAS_EN_VIVO.get(host.getId());

            // 🔥 NUEVO: GESTIÓN DE ABANDONO DE SALA ANTERIOR 🔥
            // 1. Buscamos si el que acepta la invitación ya estaba en otra sala
            Game oldRoom = null;
            for (Game g : SALAS_EN_VIVO.values()) {
                if (g.getPlayers().stream().anyMatch(p -> p.getId().equals(guest.getId()))) {
                    oldRoom = g;
                    break;
                }
            }

            // 2. Si estaba en una sala distinta a la que va a entrar...
            if (oldRoom != null && (sala == null || !oldRoom.getId().equals(sala.getId()))) {
                
                // ¿Era el Host de esa sala antigua?
                if (oldRoom.getPlayers().get(0).getId().equals(guest.getId())) {
                    // Sí. Entonces CERRAR SALA ANTIGUA y avisar a sus invitados
                    Map<String, Object> closeMsg = new HashMap<>();
                    closeMsg.put("type", "ROOM_CLOSED");
                    closeMsg.put("hostName", guest.getUsername());
                    
                    for (User p : oldRoom.getPlayers()) {
                        if (!p.getId().equals(guest.getId())) {
                            messagingTemplate.convertAndSend("/topic/lobby.guest.joined." + p.getUsername(), closeMsg);
                        }
                    }
                    
                    Integer hostKey = null;
                    for (Map.Entry<Integer, Game> entry : SALAS_EN_VIVO.entrySet()) {
                        if (entry.getValue().getId().equals(oldRoom.getId())) {
                            hostKey = entry.getKey();
                            break;
                        }
                    }
                    if (hostKey != null) SALAS_EN_VIVO.remove(hostKey);
                    ESTADOS_SALA.remove(oldRoom.getId());
                    
                } else {
                    // No, era solo un invitado. LO BORRAMOS POR COMPLETO de la sala antigua.
                    oldRoom.getPlayers().removeIf(p -> p.getId().equals(guest.getId()));
                    oldRoom.getScores().remove(guest.getUsername());
                    if (ESTADOS_SALA.containsKey(oldRoom.getId())) {
                        ESTADOS_SALA.get(oldRoom.getId()).remove(guest.getUsername());
                    }
                    // Avisamos a los que se quedan en la sala antigua de que este jugador se fue
                    broadcastLobbyUpdate(oldRoom);
                }
            }
            // 🔥 FIN DE LA GESTIÓN DE ABANDONO 🔥

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

            ESTADOS_SALA.computeIfAbsent(sala.getId(), k -> new ConcurrentHashMap<>());
            ESTADOS_SALA.get(sala.getId()).put(host.getUsername(), "Listo");
            ESTADOS_SALA.get(sala.getId()).put(guest.getUsername(), "Listo");

            broadcastLobbyUpdate(sala);

        } catch (Exception e) { 
            e.printStackTrace(); 
        }
    }

    @MessageMapping("/lobby.leave")
    @Transactional
    public void leaveLobby(Principal principal, @Payload Map<String, String> payload) {
        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        String gameId = payload.get("gameId");
        if (user == null || gameId == null) return;

        Game sala = buscarSalaPorId(gameId);
        if (sala != null) {
            if (sala.getPlayers().get(0).getUsername().equals(user.getUsername())) {
                Map<String, Object> closeMsg = new HashMap<>();
                closeMsg.put("type", "ROOM_CLOSED");
                closeMsg.put("hostName", user.getUsername());
                
                for (User p : sala.getPlayers()) {
                    if (!p.getUsername().equals(user.getUsername())) {
                        messagingTemplate.convertAndSend("/topic/lobby.guest.joined." + p.getUsername(), closeMsg);
                    }
                }
                
                Integer hostKey = null;
                for (Map.Entry<Integer, Game> entry : SALAS_EN_VIVO.entrySet()) {
                    if (entry.getValue().getId().equals(gameId)) {
                        hostKey = entry.getKey();
                        break;
                    }
                }
                if (hostKey != null) SALAS_EN_VIVO.remove(hostKey);
                ESTADOS_SALA.remove(sala.getId());
                
            } else {
                ESTADOS_SALA.computeIfAbsent(sala.getId(), k -> new ConcurrentHashMap<>());
                ESTADOS_SALA.get(sala.getId()).put(user.getUsername(), "Ausente");
                broadcastLobbyUpdate(sala);
            }
        }
    }

    @MessageMapping("/lobby.rejoin")
    public void rejoinLobby(Principal principal, @Payload Map<String, String> payload) {
        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        String gameId = payload.get("gameId");
        if (user == null || gameId == null) return;

        Game sala = buscarSalaPorId(gameId);
        if (sala != null) {
            boolean isStillInRoom = sala.getPlayers().stream().anyMatch(p -> p.getId().equals(user.getId()));
            if (isStillInRoom) {
                ESTADOS_SALA.computeIfAbsent(sala.getId(), k -> new ConcurrentHashMap<>());
                ESTADOS_SALA.get(sala.getId()).put(user.getUsername(), "Listo");
                broadcastLobbyUpdate(sala);
            } else {
                Map<String, Object> errorMsg = new HashMap<>();
                errorMsg.put("type", "ROOM_CLOSED");
                messagingTemplate.convertAndSend("/topic/lobby.guest.joined." + user.getUsername(), errorMsg);
            }
        } else {
            Map<String, Object> errorMsg = new HashMap<>();
            errorMsg.put("type", "ROOM_CLOSED");
            messagingTemplate.convertAndSend("/topic/lobby.guest.joined." + user.getUsername(), errorMsg);
        }
    }

    @MessageMapping("/lobby.kick")
    @Transactional
    public void kickPlayer(Principal principal, @Payload Map<String, String> payload) {
        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        String targetUsername = payload.get("usernameToKick");
        String gameId = payload.get("gameId");

        if (user == null || targetUsername == null || gameId == null) return;

        Game sala = buscarSalaPorId(gameId);
        if (sala == null) return;

        if (!sala.getPlayers().get(0).getUsername().equals(user.getUsername())) return;

        User target = sala.getPlayers().stream().filter(p -> p.getUsername().equals(targetUsername)).findFirst().orElse(null);

        if (target != null) {
            sala.getPlayers().remove(target);
            sala.getScores().remove(targetUsername);
            if(ESTADOS_SALA.containsKey(sala.getId())) {
                ESTADOS_SALA.get(sala.getId()).remove(targetUsername);
            }

            Map<String, Object> kickMsg = new HashMap<>();
            kickMsg.put("type", "KICKED");
            messagingTemplate.convertAndSend("/topic/lobby.guest.joined." + targetUsername, kickMsg);

            broadcastLobbyUpdate(sala);
        }
    }

    @MessageMapping("/game.start.private")
    @Transactional 
    public void startPrivateGame(Principal principal, @Payload Map<String, Object> payload) {
        String gameId = (String) payload.get("gameId");
        String categoryName = (String) payload.get("categoryName");

        Game partyRoom = null;

        for (Map.Entry<Integer, Game> entry : SALAS_EN_VIVO.entrySet()) {
            if (entry.getValue().getId().equals(gameId)) {
                partyRoom = entry.getValue();
                break;
            }
        }

        if (partyRoom == null) return;

        Map<String, String> estadosActuales = ESTADOS_SALA.get(partyRoom.getId());
        if (estadosActuales != null && estadosActuales.containsValue("Ausente")) {
            System.err.println("⚠️ Inicio bloqueado en el servidor: Hay jugadores ausentes en la sala " + gameId);
            return; 
        }

        try {
            Game dbGame = new Game();
            dbGame.setId(UUID.randomUUID().toString()); 
            dbGame.setGameState("IN_PROGRESS");
            dbGame.setCurrentQuestionIndex(0);
            dbGame.setScores(new HashMap<>());

            for (User ramUser : partyRoom.getPlayers()) {
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

            gameRepository.save(dbGame);

            Map<String, String> estados = ESTADOS_SALA.getOrDefault(partyRoom.getId(), new ConcurrentHashMap<>());
            for (User p : partyRoom.getPlayers()) {
                estados.put(p.getUsername(), "Listo");
            }
            ESTADOS_SALA.put(partyRoom.getId(), estados);

            Map<String, Object> startSignal = new HashMap<>();
            startSignal.put("gameId", dbGame.getId()); 
            startSignal.put("category", categoryName);
            startSignal.put("players", partyRoom.getPlayers().stream().map(User::getUsername).collect(Collectors.toList()));

            for (User p : partyRoom.getPlayers()) {
                messagingTemplate.convertAndSend("/topic/game.start." + p.getUsername(), startSignal);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @MessageMapping("/lobby.sync")
    @Transactional
    public void syncLobby(Principal principal) {
        try {
            User user = userRepository.findByEmail(principal.getName()).orElse(null);
            if (user == null) return;

            boolean inRoom = false;
            
            for (Game sala : SALAS_EN_VIVO.values()) {
                if (sala.getPlayers().stream().anyMatch(p -> p.getId().equals(user.getId()))) {
                    ESTADOS_SALA.computeIfAbsent(sala.getId(), k -> new ConcurrentHashMap<>());
                    ESTADOS_SALA.get(sala.getId()).put(user.getUsername(), "Listo");
                    
                    broadcastLobbyUpdate(sala);
                    inRoom = true;
                    break;
                }
            }

            if (!inRoom) {
                List<Map<String, Object>> playersInfo = new ArrayList<>();
                Map<String, Object> info = new HashMap<>();
                info.put("username", user.getUsername());
                info.put("isHost", true);
                info.put("status", "Listo");
                playersInfo.add(info);

                Map<String, Object> lobbyUpdate = new HashMap<>();
                lobbyUpdate.put("type", "LOBBY_UPDATE");
                lobbyUpdate.put("playersInfo", playersInfo);
                lobbyUpdate.put("players", Collections.singletonList(user.getUsername())); 
                lobbyUpdate.put("gameId", ""); 
                lobbyUpdate.put("hostName", user.getUsername());

                messagingTemplate.convertAndSend("/topic/lobby.guest.joined." + user.getUsername(), lobbyUpdate);
            }
            
        } catch (Exception e) { e.printStackTrace(); }
    }

    private void broadcastLobbyUpdate(Game sala) {
        String hostName = sala.getPlayers().get(0).getUsername();
        Map<String, String> estados = ESTADOS_SALA.getOrDefault(sala.getId(), new HashMap<>());
        
        List<Map<String, Object>> playersInfo = new ArrayList<>();
        List<String> plainNames = new ArrayList<>(); 

        for (User p : sala.getPlayers()) {
            Map<String, Object> info = new HashMap<>();
            info.put("username", p.getUsername());
            info.put("isHost", p.getUsername().equals(hostName));
            info.put("status", estados.getOrDefault(p.getUsername(), "Listo"));
            playersInfo.add(info);
            plainNames.add(p.getUsername());
        }

        Map<String, Object> lobbyUpdate = new HashMap<>();
        lobbyUpdate.put("type", "LOBBY_UPDATE");
        lobbyUpdate.put("players", plainNames);
        lobbyUpdate.put("playersInfo", playersInfo);
        lobbyUpdate.put("gameId", sala.getId());
        lobbyUpdate.put("hostName", hostName);

        for (User p : sala.getPlayers()) {
            messagingTemplate.convertAndSend("/topic/lobby.guest.joined." + p.getUsername(), lobbyUpdate);
        }
    }

    private Game buscarSalaPorId(String gameId) {
        for (Game g : SALAS_EN_VIVO.values()) {
            if (g.getId().equals(gameId)) return g;
        }
        return null;
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
        
        return Stream.concat(
                easy.stream().limit(1), 
                Stream.concat(medium.stream().limit(1), hard.stream().limit(0))
        ).collect(Collectors.toList());
    }
}