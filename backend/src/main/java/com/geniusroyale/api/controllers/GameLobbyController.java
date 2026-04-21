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
import java.util.concurrent.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Controller
public class GameLobbyController {

    @Autowired 
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired 
    private GameRepository gameRepository;
    
    @Autowired 
    private UserRepository userRepository;
    
    @Autowired 
    private CategoryRepository categoryRepository;
    
    @Autowired 
    private QuestionRepository questionRepository;
    
    @Autowired 
    private GameInviteRepository inviteRepository;

    // Mapas en memoria para gestionar las salas y su estado sin saturar la Base de Datos
    private static final Map<Integer, Game> SALAS_EN_VIVO = new ConcurrentHashMap<>();
    private static final Map<String, Game> SALAS_PUBLICAS = new ConcurrentHashMap<>();
    private static final Map<String, Map<String, String>> ESTADOS_SALA = new ConcurrentHashMap<>();
    private static final Map<String, Map<String, String>> AJUSTES_SALA = new ConcurrentHashMap<>();

    // Variables exclusivas para el control de Votación Pública
    private static final Map<String, Map<String, Integer>> VOTOS_SALA = new ConcurrentHashMap<>();
    private static final Map<String, ScheduledFuture<?>> TIMERS_VOTACION = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(5);

    @PostConstruct
    public void limpiarBD() {
        try { 
            gameRepository.deleteAll(); 
        } catch (Exception e) {
            System.out.println("No se pudo limpiar la BD al inicio.");
        }
    }

    // ==========================================
    // SISTEMA DE MATCHMAKING PÚBLICO
    // ==========================================
    @MessageMapping("/game.public.join")
    @Transactional
    public void joinPublicGame(Principal principal, @Payload Map<String, String> payload) {
        String mode = payload.get("gameMode");
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();

        // 1. Buscamos una sala pública disponible
        Game sala = SALAS_PUBLICAS.values().stream()
                .filter(g -> g.getGameMode().equals(mode) && g.getPlayers().size() < 10 && "WAITING_FOR_PLAYER".equals(g.getGameState()))
                .findFirst()
                .orElse(null);

        // 2. Si no hay sala, creamos una nueva y este usuario será el Host
        if (sala == null) {
            sala = new Game();
            sala.setId(UUID.randomUUID().toString());
            sala.setGameMode(mode);
            sala.setGameState("WAITING_FOR_PLAYER");
            sala.setPlayers(new ArrayList<>());
            sala.setScores(new HashMap<>());
            SALAS_PUBLICAS.put(sala.getId(), sala);
        }

        // 3. Añadimos al jugador a la sala pública
        if (!sala.getPlayers().stream().anyMatch(p -> p.getUsername().equals(user.getUsername()))) {
            sala.getPlayers().add(user);
            sala.getScores().put(user.getUsername(), 0);
        }

        // 4. Actualizamos el estado del jugador a "Listo"
        ESTADOS_SALA.computeIfAbsent(sala.getId(), k -> new ConcurrentHashMap<>());
        ESTADOS_SALA.get(sala.getId()).put(user.getUsername(), "Listo");

        broadcastLobbyUpdate(sala);
    }

    // ==========================================
    // SISTEMA DE INVITACIONES (PRIVADA)
    // ==========================================
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

            Game oldRoom = buscarSalaPorIdEnCualquierLado(guest.getId()); 

            if (oldRoom != null) {
                if (oldRoom.getPlayers().get(0).getUsername().equals(guest.getUsername())) {
                    Map<String, Object> closeMsg = new HashMap<>();
                    closeMsg.put("type", "ROOM_CLOSED");
                    closeMsg.put("hostName", guest.getUsername());
                    
                    for (User p : oldRoom.getPlayers()) {
                        if (!p.getUsername().equals(guest.getUsername())) {
                            messagingTemplate.convertAndSend("/topic/lobby.guest.joined." + p.getUsername(), closeMsg);
                        }
                    }
                    SALAS_EN_VIVO.remove(host.getId());
                    ESTADOS_SALA.remove(oldRoom.getId());
                } else {
                    oldRoom.getPlayers().removeIf(p -> p.getUsername().equals(guest.getUsername()));
                    oldRoom.getScores().remove(guest.getUsername());
                    if (ESTADOS_SALA.containsKey(oldRoom.getId())) {
                        ESTADOS_SALA.get(oldRoom.getId()).remove(guest.getUsername());
                    }
                    broadcastLobbyUpdate(oldRoom);
                }
            }

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
            
            boolean existe = sala.getPlayers().stream().anyMatch(p -> p.getUsername().equals(guest.getUsername()));
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

    // ==========================================
    // ABANDONAR LA SALA (CONTROL DE PRIVADA/PÚBLICA)
    // ==========================================
    @MessageMapping("/lobby.leave")
    @Transactional
    public void leaveLobby(Principal principal, @Payload Map<String, String> payload) {
        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        String gameId = payload.get("gameId");
        
        if (user == null || gameId == null) return;

        Game sala = buscarSalaPorId(gameId);
        if (sala != null) {
            // Si el que se va es el Host, cierra la sala
            if (sala.getPlayers().get(0).getUsername().equals(user.getUsername())) {
                Map<String, Object> closeMsg = new HashMap<>();
                closeMsg.put("type", "ROOM_CLOSED");
                closeMsg.put("hostName", user.getUsername());
                
                for (User p : sala.getPlayers()) {
                    if (!p.getUsername().equals(user.getUsername())) {
                        messagingTemplate.convertAndSend("/topic/lobby.guest.joined." + p.getUsername(), closeMsg);
                    }
                }
                
                SALAS_PUBLICAS.remove(gameId);
                
                Integer hostKey = null;
                for (Map.Entry<Integer, Game> entry : SALAS_EN_VIVO.entrySet()) {
                    if (entry.getValue().getId().equals(gameId)) { 
                        hostKey = entry.getKey(); 
                        break; 
                    }
                }
                if (hostKey != null) {
                    SALAS_EN_VIVO.remove(hostKey);
                }
                
                ESTADOS_SALA.remove(sala.getId());
                
            } else {
                // Si es un invitado el que se va
                if (SALAS_PUBLICAS.containsKey(gameId)) {
                    // En Pública, el jugador desaparece de la sala completamente
                    sala.getPlayers().removeIf(p -> p.getUsername().equals(user.getUsername()));
                    sala.getScores().remove(user.getUsername());
                    if (ESTADOS_SALA.containsKey(sala.getId())) {
                        ESTADOS_SALA.get(sala.getId()).remove(user.getUsername());
                    }
                } else {
                    // En Privada, el jugador NO desaparece, se queda en estado "Ausente"
                    ESTADOS_SALA.computeIfAbsent(sala.getId(), k -> new ConcurrentHashMap<>());
                    ESTADOS_SALA.get(sala.getId()).put(user.getUsername(), "Ausente");
                }
                broadcastLobbyUpdate(sala);
            }
        }
    }

    // ==========================================
    // CAMBIOS EN TIEMPO REAL
    // ==========================================
    @MessageMapping("/lobby.settings.change")
    public void changeSettings(Principal principal, @Payload Map<String, String> payload) {
        String gameId = payload.get("gameId");
        Game sala = buscarSalaPorId(gameId);
        
        // 🔥 FIX: Buscamos al usuario real para comparar su nombre correctamente 🔥
        User hostUser = userRepository.findByEmail(principal.getName()).orElse(null);
        
        if (sala != null && hostUser != null && sala.getPlayers().get(0).getUsername().equals(hostUser.getUsername())) {
            AJUSTES_SALA.computeIfAbsent(gameId, k -> new ConcurrentHashMap<>());
            AJUSTES_SALA.get(gameId).put("gameMode", payload.get("gameMode"));
            AJUSTES_SALA.get(gameId).put("categoryName", payload.get("categoryName"));
            broadcastLobbyUpdate(sala);
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

    // ==========================================
    // INICIAR PARTIDA Y SISTEMA DE VOTACIÓN
    // ==========================================
    @MessageMapping("/game.start.private")
    @Transactional 
    public void startGame(Principal principal, @Payload Map<String, Object> payload) {
        String gameId = (String) payload.get("gameId");
        Game sala = buscarSalaPorId(gameId);
        
        if (sala == null) return;

        if (SALAS_PUBLICAS.containsKey(gameId)) {
            if (sala.getPlayers().size() < 2) return; 

            // Pasamos a fase de votación
            sala.setGameState("VOTING");
            VOTOS_SALA.put(gameId, new ConcurrentHashMap<>());

            List<String> categories = categoryRepository.findAll().stream().map(Category::getName).collect(Collectors.toList());
            if (categories.isEmpty()) {
                categories.add("Cultura General");
            }

            Map<String, Object> voteMsg = new HashMap<>();
            voteMsg.put("type", "START_VOTING");
            voteMsg.put("categories", categories);

            for (User p : sala.getPlayers()) {
                messagingTemplate.convertAndSend("/topic/game.voting." + p.getUsername(), voteMsg);
            }

            // Activa la cuenta atrás de 10 segundos
            ScheduledFuture<?> timer = scheduler.schedule(() -> cerrarVotacion(gameId), 10, TimeUnit.SECONDS);
            TIMERS_VOTACION.put(gameId, timer);
            
        } else {
            // Si es sala privada, inicia el juego directamente sin votar
            ejecutarInicioJuegoReal(sala, (String) payload.get("categoryName"), (String) payload.get("gameMode"));
        }
    }

    @MessageMapping("/game.vote")
    public void handleVote(Principal principal, @Payload Map<String, String> payload) {
        String gameId = payload.get("gameId");
        String category = payload.get("category");

        Map<String, Integer> votos = VOTOS_SALA.get(gameId);
        
        if (votos != null) {
            votos.put(category, votos.getOrDefault(category, 0) + 1);
            
            Map<String, Object> update = new HashMap<>();
            update.put("type", "VOTE_UPDATE");
            update.put("votes", votos);

            Game sala = SALAS_PUBLICAS.get(gameId);
            if (sala != null) {
                for (User p : sala.getPlayers()) {
                    messagingTemplate.convertAndSend("/topic/game.voting." + p.getUsername(), update);
                }
            }
        }
    }

    private void cerrarVotacion(String gameId) {
        Game sala = SALAS_PUBLICAS.get(gameId);
        Map<String, Integer> votos = VOTOS_SALA.remove(gameId);
        
        if (sala == null) return;

        String winner = "Cultura General";
        boolean isTie = false;
        List<String> tiedOptions = new ArrayList<>();

        // Revisamos quién tiene más votos
        if (votos != null && !votos.isEmpty()) {
            int maxVotes = Collections.max(votos.values());
            
            for (Map.Entry<String, Integer> entry : votos.entrySet()) {
                if (entry.getValue() == maxVotes) {
                    tiedOptions.add(entry.getKey());
                }
            }
            
            // Si hay varias empatadas, hacemos ruleta
            if (tiedOptions.size() > 1) {
                isTie = true;
                Collections.shuffle(tiedOptions); 
            }
            winner = tiedOptions.get(0);
            
        } else {
            // Si nadie ha votado, escoge una categoría al azar de la BD
            List<String> allCats = categoryRepository.findAll().stream().map(Category::getName).collect(Collectors.toList());
            if(!allCats.isEmpty()) {
                Collections.shuffle(allCats);
                winner = allCats.get(0);
            }
        }

        Map<String, Object> resultMsg = new HashMap<>();
        resultMsg.put("type", "VOTING_RESULT");
        resultMsg.put("winner", winner);
        resultMsg.put("isTie", isTie);
        resultMsg.put("tiedOptions", tiedOptions);

        for (User p : sala.getPlayers()) {
            messagingTemplate.convertAndSend("/topic/game.voting." + p.getUsername(), resultMsg);
        }

        final String finalWinner = winner;
        // Esperamos 3 segundos para que vean el resultado antes de que salte la cinemática de la partida
        scheduler.schedule(() -> ejecutarInicioJuegoReal(sala, finalWinner, sala.getGameMode()), 3, TimeUnit.SECONDS);
    }

    private void ejecutarInicioJuegoReal(Game partyRoom, String categoryName, String gameMode) {
        try {
            Game dbGame = new Game();
            dbGame.setId(UUID.randomUUID().toString()); 
            dbGame.setGameState("IN_PROGRESS");
            dbGame.setCurrentQuestionIndex(0);
            dbGame.setGameMode(gameMode);
            dbGame.setScores(new HashMap<>());
            dbGame.setEliminatedPlayers(new ArrayList<>());

            for (User ramUser : partyRoom.getPlayers()) {
                User realUser = userRepository.findById(ramUser.getId()).orElse(null);
                if (realUser != null) {
                    dbGame.getPlayers().add(realUser);
                    dbGame.getScores().put(realUser.getUsername(), 0);
                }
            }

            List<Question> questions = getBalancedQuestions(categoryName, gameMode);
            String questionIds = questions.stream()
                    .map(q -> String.valueOf(q.getId()))
                    .collect(Collectors.joining(","));
            
            dbGame.setQuestionIds(questionIds);

            if (categoryName != null && !categoryName.equals("Cultura General")) {
                categoryRepository.findByName(categoryName).ifPresent(dbGame::setCategory);
            }

            gameRepository.save(dbGame);

            // 🔥 Mantenemos la sala original activa para cuando vuelvan del juego 🔥
            partyRoom.setGameState("IN_PROGRESS");

            Map<String, String> estados = ESTADOS_SALA.getOrDefault(partyRoom.getId(), new ConcurrentHashMap<>());
            for (User p : partyRoom.getPlayers()) {
                estados.put(p.getUsername(), "Listo");
            }
            ESTADOS_SALA.put(partyRoom.getId(), estados);

            Map<String, Object> startSignal = new HashMap<>();
            startSignal.put("gameId", dbGame.getId()); 
            startSignal.put("category", categoryName);
            startSignal.put("gameMode", gameMode);
            startSignal.put("players", partyRoom.getPlayers().stream().map(User::getUsername).collect(Collectors.toList()));

            for (User p : partyRoom.getPlayers()) {
                messagingTemplate.convertAndSend("/topic/game.start." + p.getUsername(), startSignal);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ==========================================
    // SINCRONIZACIÓN AL CARGAR / F5
    // ==========================================
    @MessageMapping("/lobby.sync")
    @Transactional
    public void syncLobby(Principal principal) {
        try {
            User user = userRepository.findByEmail(principal.getName()).orElse(null);
            if (user == null) return;

            boolean inRoom = false;
            Game salaEncontrada = buscarSalaPorIdEnCualquierLado(user.getId());

            if (salaEncontrada != null) {
                ESTADOS_SALA.computeIfAbsent(salaEncontrada.getId(), k -> new ConcurrentHashMap<>());
                // 🔥 FIX: Si están jugando o reconectando desde menú, se queda "Ausente" hasta que pulse volver 🔥
                if ("IN_PROGRESS".equals(salaEncontrada.getGameState())) {
                    ESTADOS_SALA.get(salaEncontrada.getId()).put(user.getUsername(), "Ausente");
                } else {
                    ESTADOS_SALA.get(salaEncontrada.getId()).put(user.getUsername(), "Listo");
                }
                broadcastLobbyUpdate(salaEncontrada);
                inRoom = true;
            }

            if (!inRoom) {
                List<Map<String, Object>> playersInfo = new ArrayList<>();
                Map<String, Object> info = new HashMap<>();
                info.put("username", user.getUsername());
                info.put("isHost", true);
                info.put("status", "Listo");
                info.put("fotoPerfil", user.getFotoPerfil()); 
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

    private Game buscarSalaPorIdEnCualquierLado(Integer userId) {
        for (Game sala : SALAS_EN_VIVO.values()) {
            if (sala.getPlayers().stream().anyMatch(p -> p.getId().equals(userId))) return sala;
        }
        for (Game sala : SALAS_PUBLICAS.values()) {
            if (sala.getPlayers().stream().anyMatch(p -> p.getId().equals(userId))) return sala;
        }
        return null;
    }

    private void broadcastLobbyUpdate(Game sala) {
        if(sala.getPlayers().isEmpty()) return;
        
        String hostName = sala.getPlayers().get(0).getUsername();
        Map<String, String> estados = ESTADOS_SALA.getOrDefault(sala.getId(), new HashMap<>());
        Map<String, String> ajustes = AJUSTES_SALA.getOrDefault(sala.getId(), new HashMap<>());
        
        List<Map<String, Object>> playersInfo = new ArrayList<>();
        List<String> plainNames = new ArrayList<>(); 

        for (User p : sala.getPlayers()) {
            User realUser = userRepository.findById(p.getId()).orElse(p);
            
            Map<String, Object> info = new HashMap<>();
            info.put("username", realUser.getUsername());
            info.put("isHost", realUser.getUsername().equals(hostName));
            info.put("status", estados.getOrDefault(realUser.getUsername(), "Listo"));
            info.put("fotoPerfil", realUser.getFotoPerfil()); 
            
            playersInfo.add(info);
            plainNames.add(realUser.getUsername());
        }

        Map<String, Object> lobbyUpdate = new HashMap<>();
        lobbyUpdate.put("type", "LOBBY_UPDATE");
        lobbyUpdate.put("players", plainNames);
        lobbyUpdate.put("playersInfo", playersInfo);
        lobbyUpdate.put("gameId", sala.getId());
        lobbyUpdate.put("hostName", hostName);
        
        // Empaquetamos los ajustes en vivo para el invitado
        if (ajustes.containsKey("gameMode")) {
            lobbyUpdate.put("gameMode", ajustes.get("gameMode"));
        }
        if (ajustes.containsKey("categoryName")) {
            lobbyUpdate.put("categoryName", ajustes.get("categoryName"));
        }

        for (User p : sala.getPlayers()) {
            messagingTemplate.convertAndSend("/topic/lobby.guest.joined." + p.getUsername(), lobbyUpdate);
        }
    }

    private Game buscarSalaPorId(String gameId) {
        for (Game g : SALAS_EN_VIVO.values()) {
            if (g.getId().equals(gameId)) return g;
        }
        if (SALAS_PUBLICAS.containsKey(gameId)) {
            return SALAS_PUBLICAS.get(gameId);
        }
        return null;
    }

    private List<Question> getBalancedQuestions(String categoryName, String gameMode) {
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
        
        Collections.shuffle(easy); 
        Collections.shuffle(medium); 
        Collections.shuffle(hard);
        
        int limit = "Battle Royale".equals(gameMode) ? 15 : 5;
        
        return Stream.concat(
                easy.stream().limit(limit), 
                Stream.concat(medium.stream().limit(limit), hard.stream().limit(limit))
        ).collect(Collectors.toList());
    }
}