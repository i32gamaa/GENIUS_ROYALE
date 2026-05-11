package com.geniusroyale.api.controllers;

import com.geniusroyale.api.models.*;
import com.geniusroyale.api.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Controller
public class KahootController {

    @Autowired private SimpMessagingTemplate messagingTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private GameRepository gameRepository;
    @Autowired private QuestionRepository questionRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public static final Map<String, Game> PIN_ROOMS = new ConcurrentHashMap<>();
    public static final Map<String, String> PIN_HOSTS = new ConcurrentHashMap<>();
    public static final Map<String, String> GUEST_TO_PIN = new ConcurrentHashMap<>();
    
    public static final Map<String, List<Question>> PIN_QUESTIONS = new ConcurrentHashMap<>();
    public static final Map<String, Integer> PIN_CURRENT_Q = new ConcurrentHashMap<>();
    public static final Map<String, Map<String, Integer>> PIN_SCORES = new ConcurrentHashMap<>();
    public static final Map<String, Integer> PIN_CORRECT_INDEX = new ConcurrentHashMap<>();
    public static final Map<String, List<String>> PIN_CURRENT_OPTIONS = new ConcurrentHashMap<>();
    public static final Map<String, Map<String, Boolean>> PIN_ROUND_ANSWERS = new ConcurrentHashMap<>();
    public static final Map<String, Map<String, Integer>> PIN_ROUND_POINTS = new ConcurrentHashMap<>();
    public static final Map<String, Map<String, Integer>> PIN_STREAKS = new ConcurrentHashMap<>();
    public static final Map<String, String> PIN_PHASE = new ConcurrentHashMap<>();
    public static final Map<String, Map<String, Object>> PIN_LAST_RESULTS = new ConcurrentHashMap<>();
    
    // 🔥 BATTLE ROYALE: Registro inmutable de caídos en combate
    public static final Map<String, Set<String>> PIN_ELIMINADOS = new ConcurrentHashMap<>();

    private User resolveUserByUsername(String username) {
        if (username == null || username.trim().isEmpty()) return null;
        
        User user = KahootAuthController.GUEST_USERS.get(username);
        if (user == null) {
            try {
                user = userRepository.findByUsername(username).orElse(null);
                if (user == null) {
                    user = userRepository.findByEmail(username).orElse(null);
                }
            } catch (Exception e) {
                System.err.println("Aviso: Fallo de BD en websocket al buscar: " + username);
            }
        }
        
        if (user == null) {
            user = new User();
            user.setUsername(username);
            user.setFotoPerfil("images/invitado.jpg");
        }
        return user;
    }

    @MessageMapping("/kahoot.create")
    public void createRoom(@Payload Map<String, String> payload) {
        String pin = payload.get("gameId");
        String username = payload.get("username");
        User host = resolveUserByUsername(username);
        if (host == null || pin == null) return;
        
        PIN_ROOMS.entrySet().removeIf(entry -> !entry.getValue().getPlayers().isEmpty() && entry.getValue().getPlayers().get(0).getUsername().equalsIgnoreCase(host.getUsername()));
        
        Game sala = new Game();
        sala.setId(pin);
        sala.setGameState("WAITING_FOR_PLAYER");
        sala.setPlayers(new java.util.concurrent.CopyOnWriteArrayList<>(Collections.singletonList(host)));
        PIN_ROOMS.put(pin, sala);
        PIN_HOSTS.put(pin, username); 
        
        broadcastKahootUpdate(sala);
    }

    @MessageMapping("/kahoot.join")
    public void joinRoom(@Payload Map<String, String> payload) {
        String pin = payload.get("gameId");
        String username = payload.get("username");
        User guest = resolveUserByUsername(username);
        Game sala = PIN_ROOMS.get(pin);
        
        if (sala != null && guest != null) {
            if ("IN_PROGRESS".equals(sala.getGameState())) {
                boolean alreadyIn = sala.getPlayers().stream().anyMatch(p -> p.getUsername().equalsIgnoreCase(guest.getUsername()));
                if (alreadyIn) {
                    messagingTemplate.convertAndSend("/topic/kahoot.reconnect." + username, sala.getId());
                    return;
                } else {
                    messagingTemplate.convertAndSend("/topic/kahoot.error." + username, "¡La partida ya ha comenzado!");
                    return;
                }
            }
            synchronized (sala) {
                if (!sala.getPlayers().stream().anyMatch(p -> p.getUsername().equalsIgnoreCase(guest.getUsername()))) {
                    sala.getPlayers().add(guest);
                }
            }
            GUEST_TO_PIN.put(username, pin); 
            broadcastKahootUpdate(sala);
        } else {
            messagingTemplate.convertAndSend("/topic/kahoot.error." + username, "La sala " + pin + " no existe o está cerrada.");
        }
    }

    @MessageMapping("/kahoot.settings")
    public void updateSettings(@Payload Map<String, String> payload) {
        String pin = payload.get("gameId");
        String username = payload.get("username");
        Game sala = PIN_ROOMS.get(pin);
        if (sala != null && username != null && username.equalsIgnoreCase(PIN_HOSTS.get(pin))) {
            if (payload.containsKey("mode")) sala.setGameMode(payload.get("mode"));
            if (payload.containsKey("category")) {
                String catName = payload.get("category");
                if ("Cultura General".equals(catName)) sala.setCategory(null);
                else {
                    Category cat = categoryRepository.findByName(catName).orElse(null);
                    if (cat != null) sala.setCategory(cat);
                }
            }
            broadcastKahootUpdate(sala);
        }
    }

    @MessageMapping("/kahoot.sync")
    public void syncRoom(@Payload Map<String, String> payload) {
        String pin = payload.get("gameId");
        String username = payload.get("username");
        Game sala = PIN_ROOMS.get(pin);
        
        if (sala != null && username != null) {
            String trueHost = PIN_HOSTS.get(pin);
            boolean isHost = (trueHost != null && trueHost.equalsIgnoreCase(username));
            
            if (isHost && !sala.getPlayers().stream().anyMatch(p -> p.getUsername().equalsIgnoreCase(username))) {
                User hostUser = resolveUserByUsername(username);
                sala.getPlayers().add(0, hostUser);
            }

            if (sala.getPlayers().stream().anyMatch(p -> p.getUsername().equalsIgnoreCase(username))) {
                broadcastKahootUpdate(sala);
            } else {
                messagingTemplate.convertAndSend("/topic/kahoot.error." + username, "Te has desconectado de la sala.");
            }
        } else {
            messagingTemplate.convertAndSend("/topic/kahoot.error." + username, "Aviso: La sala ya no existe.");
        }
    }

    @PostMapping("/api/kahoot/force-leave")
    @ResponseBody
    public ResponseEntity<?> forceLeaveRoomRest(@RequestBody Map<String, String> payload) {
        try {
            this.leaveRoom(payload); 
            return ResponseEntity.ok(Collections.singletonMap("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @MessageMapping("/kahoot.leave")
    public void leaveRoom(@Payload Map<String, String> payload) {
        try {
            String pin = payload.get("gameId");
            String username = payload.get("username");
            String role = payload.get("role"); 
            boolean intentional = "true".equals(payload.get("intentional"));
            
            if (pin == null || username == null) return;
            
            String trueHost = PIN_HOSTS.get(pin);
            boolean isHost = "HOST".equalsIgnoreCase(role) || (trueHost != null && trueHost.equalsIgnoreCase(username));
            
            if (isHost && intentional) {
                Game sala;
                synchronized (PIN_ROOMS) {
                    sala = PIN_ROOMS.remove(pin); 
                    PIN_HOSTS.remove(pin);
                }
                
                if (sala == null) return; 

                Map<String, Object> closeMsg = new HashMap<>();
                closeMsg.put("type", "KAHOOT_CLOSED");
                
                Set<String> usersToNotify = new HashSet<>();
                usersToNotify.add(username); 
                
                if (sala != null) {
                    for (User p : sala.getPlayers()) {
                        if (p != null && p.getUsername() != null) usersToNotify.add(p.getUsername());
                    }
                }
                
                for (Map.Entry<String, String> entry : GUEST_TO_PIN.entrySet()) {
                    if (pin.equals(entry.getValue())) usersToNotify.add(entry.getKey());
                }
                
                for (String targetUser : usersToNotify) {
                    try {
                        messagingTemplate.convertAndSend("/topic/kahoot." + targetUser, closeMsg);
                        KahootAuthController.GUEST_USERS.remove(targetUser);
                    } catch (Exception e) {}
                }
                
                GUEST_TO_PIN.entrySet().removeIf(e -> pin.equals(e.getValue()));
                PIN_ELIMINADOS.remove(pin);
                
            } else if (!isHost && intentional) {
                Game sala = PIN_ROOMS.get(pin);
                if (sala != null) {
                    sala.getPlayers().removeIf(p -> p != null && p.getUsername() != null && p.getUsername().equalsIgnoreCase(username));
                    broadcastKahootUpdate(sala);
                }
                KahootAuthController.GUEST_USERS.remove(username);
                GUEST_TO_PIN.remove(username);
            }
        } catch (Exception e) {
            System.err.println("Error en leaveRoom: " + e.getMessage());
        }
    }

    @MessageMapping("/kahoot.backToLobby")
    public void backToLobby(@Payload Map<String, String> payload) {
        String pin = payload.get("gameId");
        if (pin != null) {
            Game sala = PIN_ROOMS.get(pin);
            if (sala != null) {
                sala.setGameState("WAITING_FOR_PLAYER");
                PIN_QUESTIONS.remove(pin);
                PIN_CURRENT_Q.remove(pin);
                PIN_SCORES.remove(pin);
                PIN_CORRECT_INDEX.remove(pin);
                PIN_CURRENT_OPTIONS.remove(pin);
                PIN_ROUND_ANSWERS.remove(pin);
                PIN_ROUND_POINTS.remove(pin);
                PIN_STREAKS.remove(pin);
                PIN_PHASE.remove(pin);
                PIN_ELIMINADOS.remove(pin);
                PIN_LAST_RESULTS.entrySet().removeIf(e -> e.getKey().startsWith(pin + "_"));

                Map<String, Object> msg = new HashMap<>();
                msg.put("type", "KAHOOT_BACK_TO_LOBBY");
                msg.put("forced", false);
                
                for (User p : sala.getPlayers()) {
                    try {
                        messagingTemplate.convertAndSend("/topic/kahoot." + p.getUsername(), msg);
                    } catch(Exception e) {}
                }
            }
        }
    }

    private void broadcastKahootUpdate(Game sala) {
        if(sala == null || sala.getPlayers().isEmpty()) return;
        Map<String, Object> update = new HashMap<>();
        update.put("type", "KAHOOT_UPDATE");
        update.put("pin", sala.getId());
        update.put("mode", sala.getGameMode() != null ? sala.getGameMode() : "Quizziz Clásico");
        update.put("category", sala.getCategory() != null ? sala.getCategory().getName() : "Cultura General");
        List<Map<String, Object>> playersInfo = new ArrayList<>();
        
        String trueHost = PIN_HOSTS.get(sala.getId());
        
        for (User p : sala.getPlayers()) {
            Map<String, Object> info = new HashMap<>();
            info.put("username", p.getUsername());
            info.put("fotoPerfil", p.getFotoPerfil() != null ? p.getFotoPerfil() : "images/invitado.jpg");
            info.put("isHost", p.getUsername().equalsIgnoreCase(trueHost));
            playersInfo.add(info);
        }
        update.put("players", playersInfo);
        for (User p : sala.getPlayers()) {
            messagingTemplate.convertAndSend("/topic/kahoot." + p.getUsername(), update);
        }
    }

    private List<Question> getRandomQuestions(Difficulty diff, Category cat, int limit) {
        String sql = "SELECT * FROM pregunta WHERE dificultad = :diff ";
        if (cat != null) sql += "AND id_categoria = :catId ";
        sql += "ORDER BY RANDOM() LIMIT :limit";
        Query query = entityManager.createNativeQuery(sql, Question.class);
        query.setParameter("diff", diff.name());
        if (cat != null) query.setParameter("catId", cat.getId());
        query.setParameter("limit", limit);
        return query.getResultList();
    }

    private List<Question> getBalancedQuestions(String categoryName, String gameMode) {
        Category cat = null;
        if (categoryName != null && !categoryName.equals("Cultura General")) {
            cat = categoryRepository.findByName(categoryName).orElse(null);
        }
        int questionsPerDifficulty = 5;
        List<Question> easy = getRandomQuestions(Difficulty.facil, cat, questionsPerDifficulty);
        List<Question> medium = getRandomQuestions(Difficulty.intermedia, cat, questionsPerDifficulty);
        List<Question> hard = getRandomQuestions(Difficulty.dificil, cat, questionsPerDifficulty);
        List<Question> finalQuestions = new ArrayList<>();
        finalQuestions.addAll(easy);
        finalQuestions.addAll(medium);
        finalQuestions.addAll(hard);
        Collections.shuffle(finalQuestions);
        return finalQuestions; 
    }

    @MessageMapping("/kahoot.start")
    public void startGame(@Payload Map<String, String> payload) {
        String pin = payload.get("gameId");
        String username = payload.get("username");
        String modePayload = payload.get("mode");
        String catPayload = payload.get("category");
        Game partyRoom = PIN_ROOMS.get(pin);
        
        if (partyRoom != null && username != null && username.equalsIgnoreCase(PIN_HOSTS.get(pin))) {
            try {
                String gameMode = modePayload != null ? modePayload : (partyRoom.getGameMode() != null ? partyRoom.getGameMode() : "Quizziz");
                String catName = catPayload != null ? catPayload : (partyRoom.getCategory() != null ? partyRoom.getCategory().getName() : "Cultura General");
                partyRoom.setGameMode(gameMode);
                if (!catName.equals("Cultura General")) {
                    partyRoom.setCategory(categoryRepository.findByName(catName).orElse(null));
                } else {
                    partyRoom.setCategory(null);
                }
                List<Question> questions = getBalancedQuestions(catName, gameMode);
                if (questions.isEmpty()) throw new Exception("No hay preguntas disponibles.");
                partyRoom.setGameState("IN_PROGRESS"); 
                PIN_QUESTIONS.put(pin, questions);
                PIN_CURRENT_Q.put(pin, 0);
                PIN_PHASE.put(pin, "QUESTION"); 
                PIN_ELIMINADOS.put(pin, ConcurrentHashMap.newKeySet()); // 🔥 Reiniciamos lista de caídos

                Map<String, Integer> initialScores = new ConcurrentHashMap<>();
                Map<String, Integer> initialStreaks = new ConcurrentHashMap<>();
                for (User p : partyRoom.getPlayers()) {
                    initialScores.put(p.getUsername(), 0);
                    initialStreaks.put(p.getUsername(), 0); 
                }
                PIN_SCORES.put(pin, initialScores);
                PIN_STREAKS.put(pin, initialStreaks);
                PIN_ROUND_POINTS.put(pin, new ConcurrentHashMap<>());
                PIN_LAST_RESULTS.entrySet().removeIf(e -> e.getKey().startsWith(pin + "_"));
                Map<String, Object> startSignal = new HashMap<>();
                startSignal.put("gameId", pin);
                startSignal.put("category", catName);
                startSignal.put("gameMode", gameMode);
                startSignal.put("players", partyRoom.getPlayers().stream().map(User::getUsername).collect(Collectors.toList()));
                for (User p : partyRoom.getPlayers()) {
                    messagingTemplate.convertAndSend("/topic/kahoot.start." + p.getUsername(), startSignal);
                }
            } catch (Exception e) { 
                messagingTemplate.convertAndSend("/topic/kahoot.error." + username, "Fallo al iniciar: " + e.getMessage());
                partyRoom.setGameState("WAITING_FOR_PLAYER");
            }
        }
    }

    @MessageMapping("/kahoot.getGameState")
    public void getGameState(@Payload Map<String, String> payload) {
        String pin = payload.get("gameId");
        String username = payload.get("username");
        Game sala = PIN_ROOMS.get(pin);
        if (sala != null && "IN_PROGRESS".equals(sala.getGameState())) {
            String phase = PIN_PHASE.getOrDefault(pin, "QUESTION");
            if ("RESULTS".equals(phase)) {
                Map<String, Object> lastRes = PIN_LAST_RESULTS.get(pin + "_" + username);
                if (lastRes != null) {
                    Map<String, Object> resMsg = new HashMap<>(lastRes);
                    resMsg.put("isReconnect", true);
                    messagingTemplate.convertAndSend("/topic/kahoot.game." + username, resMsg);
                }
            } else {
                int qIndex = PIN_CURRENT_Q.getOrDefault(pin, 0);
                List<Question> questions = PIN_QUESTIONS.get(pin);
                if (questions != null && qIndex < questions.size()) {
                    Question q = questions.get(qIndex);
                    List<String> options = PIN_CURRENT_OPTIONS.get(pin);
                    if (options == null) {
                        options = Arrays.asList(q.getCorrectAnswer(), q.getWrongAnswer1(), q.getWrongAnswer2(), q.getWrongAnswer3());
                    }
                    Map<String, Object> qMsg = new HashMap<>();
                    qMsg.put("type", "QUESTION");
                    qMsg.put("text", q.getQuestionText());
                    qMsg.put("options", options);
                    qMsg.put("qNumber", qIndex + 1);
                    qMsg.put("totalQ", questions.size());
                    qMsg.put("isReconnect", true); 
                    boolean answered = PIN_ROUND_ANSWERS.getOrDefault(pin, new ConcurrentHashMap<>()).containsKey(username);
                    qMsg.put("alreadyAnswered", answered);
                    
                    // Aseguramos decirle al usuario reconectado si estaba muerto
                    Set<String> eliminados = PIN_ELIMINADOS.getOrDefault(pin, Collections.emptySet());
                    qMsg.put("eliminated", eliminados.contains(username));

                    messagingTemplate.convertAndSend("/topic/kahoot.game." + username, qMsg);
                }
            }
        }
    }

    @MessageMapping("/kahoot.nextQuestion")
    public void sendNextQuestion(@Payload Map<String, String> payload) {
        String pin = payload.get("gameId");
        int qIndex = PIN_CURRENT_Q.getOrDefault(pin, 0);
        List<Question> questions = PIN_QUESTIONS.get(pin);
        if (questions != null && qIndex < questions.size()) {
            PIN_PHASE.put(pin, "QUESTION"); 
            PIN_ROUND_ANSWERS.put(pin, new ConcurrentHashMap<>()); 
            PIN_ROUND_POINTS.put(pin, new ConcurrentHashMap<>()); 
            Question q = questions.get(qIndex);
            List<String> options = Arrays.asList(q.getCorrectAnswer(), q.getWrongAnswer1(), q.getWrongAnswer2(), q.getWrongAnswer3());
            Collections.shuffle(options);
            PIN_CURRENT_OPTIONS.put(pin, options);
            PIN_CORRECT_INDEX.put(pin, options.indexOf(q.getCorrectAnswer()));
            
            Map<String, Object> qMsg = new HashMap<>();
            qMsg.put("type", "QUESTION");
            qMsg.put("text", q.getQuestionText()); 
            qMsg.put("options", options);
            qMsg.put("qNumber", qIndex + 1);
            qMsg.put("totalQ", questions.size());
            
            Set<String> eliminados = PIN_ELIMINADOS.getOrDefault(pin, Collections.emptySet());

            for (User p : PIN_ROOMS.get(pin).getPlayers()) {
                Map<String, Object> personalMsg = new HashMap<>(qMsg);
                personalMsg.put("eliminated", eliminados.contains(p.getUsername())); // Enviamos estado vital
                messagingTemplate.convertAndSend("/topic/kahoot.game." + p.getUsername(), personalMsg);
            }
        }
    }

    @MessageMapping("/kahoot.answer")
    public void submitAnswer(@Payload Map<String, String> payload) {
        String pin = payload.get("gameId");
        String username = payload.get("username");
        
        // 🛡️ BATTLE ROYALE: Si está eliminado, no puede hackear la red para mandar respuestas
        Set<String> eliminados = PIN_ELIMINADOS.getOrDefault(pin, Collections.emptySet());
        if (eliminados.contains(username)) return;

        int selected = Integer.parseInt(payload.get("answerIndex"));
        int timeRemaining = Integer.parseInt(payload.get("timeRemaining")); 
        int correctIndex = PIN_CORRECT_INDEX.getOrDefault(pin, 0);
        
        Map<String, Integer> scores = PIN_SCORES.computeIfAbsent(pin, k -> new ConcurrentHashMap<>());
        Map<String, Boolean> roundAnswers = PIN_ROUND_ANSWERS.computeIfAbsent(pin, k -> new ConcurrentHashMap<>());
        Map<String, Integer> roundPoints = PIN_ROUND_POINTS.computeIfAbsent(pin, k -> new ConcurrentHashMap<>());
        Map<String, Integer> streaks = PIN_STREAKS.computeIfAbsent(pin, k -> new ConcurrentHashMap<>());
        
        int pointsGained = 0;
        int currentStreak = streaks.getOrDefault(username, 0);
        
        if (selected == correctIndex && !roundAnswers.containsKey(username)) {
            int timeTaken = 15 - timeRemaining;
            double speedMultiplier = 1.0 - ((timeTaken / 15.0) / 2.0); 
            int basePoints = (int) Math.round(1000.0 * speedMultiplier);
            currentStreak++; 
            int streakBonus = (currentStreak >= 5) ? 500 : (currentStreak > 1 ? (currentStreak - 1) * 100 : 0);
            pointsGained = basePoints + streakBonus;
            scores.put(username, scores.getOrDefault(username, 0) + pointsGained);
        } else if (!roundAnswers.containsKey(username)) {
            currentStreak = 0; 
        }
        
        streaks.put(username, currentStreak);
        roundAnswers.put(username, true);
        roundPoints.put(username, pointsGained);
        
        String trueHost = PIN_HOSTS.get(pin);
        Map<String, Object> ack = new HashMap<>();
        ack.put("type", "ANSWER_ACK");
        ack.put("totalAnswers", roundAnswers.size());
        if (trueHost != null) {
            messagingTemplate.convertAndSend("/topic/kahoot.game." + trueHost, ack);
        }
    }

    @MessageMapping("/kahoot.showResults")
    public void showResults(@Payload Map<String, String> payload) {
        String pin = payload.get("gameId");
        PIN_PHASE.put(pin, "RESULTS"); 
        
        Map<String, Integer> scores = PIN_SCORES.computeIfAbsent(pin, k -> new ConcurrentHashMap<>());
        Map<String, Integer> roundPoints = PIN_ROUND_POINTS.computeIfAbsent(pin, k -> new ConcurrentHashMap<>());
        Map<String, Integer> streaks = PIN_STREAKS.computeIfAbsent(pin, k -> new ConcurrentHashMap<>());
        Game sala = PIN_ROOMS.get(pin);
        if(sala == null) return;
        
        String trueHost = PIN_HOSTS.get(pin);
        
        // 🔥 LOGICA BATTLE ROYALE (MUERTE SÚBITA) 🔥
        boolean isBattleRoyale = "Battle Royale".equalsIgnoreCase(sala.getGameMode());
        Set<String> eliminados = PIN_ELIMINADOS.computeIfAbsent(pin, k -> ConcurrentHashMap.newKeySet());
        
        if (isBattleRoyale) {
            for (User p : sala.getPlayers()) {
                if (trueHost == null || !trueHost.equalsIgnoreCase(p.getUsername())) {
                    if (!eliminados.contains(p.getUsername())) {
                        int gained = roundPoints.getOrDefault(p.getUsername(), 0);
                        // Si no ganó puntos (falló o se le acabó el tiempo), queda ELIMINADO
                        if (gained == 0) { 
                            eliminados.add(p.getUsername());
                        }
                    }
                }
            }
        }
        
        int qIndex = PIN_CURRENT_Q.getOrDefault(pin, 0);
        List<Question> questions = PIN_QUESTIONS.get(pin);
        boolean isFinal = questions != null && (qIndex + 1) >= questions.size(); 
        
        if (isBattleRoyale) {
            long aliveCount = sala.getPlayers().stream()
                .filter(p -> (trueHost == null || !trueHost.equalsIgnoreCase(p.getUsername())) && !eliminados.contains(p.getUsername()))
                .count();
            // Si solo queda 1 jugador vivo o ninguno, forzamos el fin de la partida para coronar al campeón
            if (aliveCount <= 1) {
                isFinal = true;
            }
        }
        
        List<Map.Entry<String, Integer>> sorted = scores.entrySet().stream()
                .filter(e -> trueHost == null || !e.getKey().equalsIgnoreCase(trueHost))
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .collect(Collectors.toList());
                
        List<Map<String, Object>> leaderboard = new ArrayList<>();
        for (int i = 0; i < Math.min(10, sorted.size()); i++) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("rank", i + 1);
            entry.put("username", sorted.get(i).getKey());
            entry.put("score", sorted.get(i).getValue());
            int gained = roundPoints.getOrDefault(sorted.get(i).getKey(), 0);
            entry.put("prevScore", sorted.get(i).getValue() - gained);
            entry.put("gained", gained);
            leaderboard.add(entry);
        }
        
        Map<String, Object> baseResMsg = new HashMap<>();
        baseResMsg.put("type", isFinal ? "FINAL_RESULTS" : "RESULTS"); 
        baseResMsg.put("correctIndex", PIN_CORRECT_INDEX.getOrDefault(pin, 0));
        baseResMsg.put("leaderboard", leaderboard);
        PIN_CURRENT_Q.put(pin, qIndex + 1); 
        
        for (User p : sala.getPlayers()) {
            Map<String, Object> userMsg = new HashMap<>(baseResMsg); 
            userMsg.put("eliminated", eliminados.contains(p.getUsername())); // Chivamos al frontend si está muerto
            
            int myRank = 0;
            int diff = 0;
            String aheadUser = "";
            Optional<Map.Entry<String, Integer>> myEntry = sorted.stream().filter(e -> e.getKey().equalsIgnoreCase(p.getUsername())).findFirst();
            if (myEntry.isPresent()) {
                myRank = sorted.indexOf(myEntry.get()) + 1;
                if (myRank == 1 && sorted.size() > 1) {
                    diff = scores.get(p.getUsername()) - sorted.get(1).getValue(); 
                    aheadUser = "Nadie";
                } else if (myRank > 1) {
                    diff = sorted.get(myRank - 2).getValue() - scores.get(p.getUsername()); 
                    aheadUser = sorted.get(myRank - 2).getKey();
                }
            }
            userMsg.put("myRank", myRank);
            userMsg.put("pointsBehind", diff);
            userMsg.put("aheadUser", aheadUser);
            userMsg.put("myScore", scores.getOrDefault(p.getUsername(), 0));
            userMsg.put("myStreak", streaks.getOrDefault(p.getUsername(), 0)); 
            PIN_LAST_RESULTS.put(pin + "_" + p.getUsername(), userMsg);
            messagingTemplate.convertAndSend("/topic/kahoot.game." + p.getUsername(), userMsg);
        }
    }

    @MessageMapping("/kahoot.emoji")
    public void sendEmoji(@Payload Map<String, String> payload) {
        String pin = payload.get("gameId");
        String emoji = payload.get("emoji");
        Game sala = PIN_ROOMS.get(pin);
        if (sala != null) {
            Map<String, Object> msg = new HashMap<>();
            msg.put("type", "EMOJI");
            msg.put("emoji", emoji);
            for (User p : sala.getPlayers()) {
                messagingTemplate.convertAndSend("/topic/kahoot.game." + p.getUsername(), msg);
            }
        }
    }

    @org.springframework.context.event.EventListener
    public void handleWebSocketDisconnectListener(org.springframework.web.socket.messaging.SessionDisconnectEvent event) {
        // 🔥 VACÍO INTENCIONADAMENTE PARA KAHOOT.
    }
}