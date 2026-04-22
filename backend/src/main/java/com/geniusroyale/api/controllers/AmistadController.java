package com.geniusroyale.api.controllers;

import com.geniusroyale.api.models.Amistad;
import com.geniusroyale.api.models.ApiResponse;
import com.geniusroyale.api.models.User;
import com.geniusroyale.api.repositories.AmistadRepository;
import com.geniusroyale.api.repositories.UserRepository;
import com.geniusroyale.api.services.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/amistad")
public class AmistadController {

    @Autowired private UserRepository userRepository;
    @Autowired private AmistadRepository amistadRepository;
    @Autowired private JwtService jwtService;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    // 🔥 MEMORIA PARA EL WHATSAPP 🔥
    private static final Map<String, List<Map<String, Object>>> privateChats = new ConcurrentHashMap<>();
    public static final Map<String, Long> LAST_PING = new ConcurrentHashMap<>();

    private String getChatKey(String u1, String u2) {
        return (u1.compareTo(u2) < 0) ? u1 + "_" + u2 : u2 + "_" + u1;
    }

    // 🔥 PING CADA 5 SEGUNDOS PARA EL ESTADO EN LÍNEA 🔥
    @MessageMapping("/user.ping")
    public void handlePing(Principal principal) {
        String username = userRepository.findByEmail(principal.getName()).orElseThrow().getUsername();
        LAST_PING.put(username, System.currentTimeMillis());
    }

    // 🔥 AVISO DE "ESCRIBIENDO..." 🔥
    @MessageMapping("/chat.typing")
    public void handleTyping(Principal principal, @Payload Map<String, Object> payload) {
        String sender = userRepository.findByEmail(principal.getName()).orElseThrow().getUsername();
        String to = (String) payload.get("to");
        boolean isTyping = (Boolean) payload.get("isTyping");
        
        Map<String, Object> msg = new HashMap<>();
        msg.put("sender", sender);
        msg.put("isTyping", isTyping);
        messagingTemplate.convertAndSend("/topic/chat.typing." + to, msg);
    }

    // 🔥 EL DOBLE TICK AZUL CUANDO ABRES EL CHAT 🔥
    @MessageMapping("/chat.read")
    public void handleRead(Principal principal, @Payload Map<String, String> payload) {
        String reader = userRepository.findByEmail(principal.getName()).orElseThrow().getUsername();
        String sender = payload.get("sender");
        
        String key = getChatKey(sender, reader);
        List<Map<String, Object>> msgs = privateChats.get(key);
        if(msgs != null) {
            for(Map<String, Object> m : msgs) {
                if(m.get("sender").equals(sender)) {
                    m.put("isRead", true);
                }
            }
        }
        
        Map<String, Object> msg = new HashMap<>();
        msg.put("reader", reader);
        messagingTemplate.convertAndSend("/topic/chat.read." + sender, msg);
    }

    @PostMapping("/solicitar")
    public ResponseEntity<?> enviarSolicitud(@RequestHeader("Authorization") String authHeader, @RequestBody Map<String, String> payload) {
        try {
            String token = authHeader.substring(7);
            String senderEmail = jwtService.extractEmail(token).trim().toLowerCase();
            String receiverUsername = payload.get("username");
            if (receiverUsername == null) receiverUsername = payload.get("email"); 

            if (receiverUsername == null || receiverUsername.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(new ApiResponse(false, "Falta el nombre de usuario."));
            }
            receiverUsername = receiverUsername.trim();

            User sender = userRepository.findByEmail(senderEmail).orElseThrow();
            if (sender.getUsername().equalsIgnoreCase(receiverUsername)) {
                return ResponseEntity.badRequest().body(new ApiResponse(false, "No puedes enviarte una solicitud a ti mismo."));
            }

            User receiver = userRepository.findByUsername(receiverUsername).orElse(null);
            if (receiver == null) return ResponseEntity.badRequest().body(new ApiResponse(false, "Usuario no encontrado."));

            List<Amistad> todas = amistadRepository.findAll();
            String receiverEmail = receiver.getEmail().trim().toLowerCase();

            for (Amistad a : todas) {
                String u1Email = a.getUsuario1().getEmail().trim().toLowerCase();
                String u2Email = a.getUsuario2().getEmail().trim().toLowerCase();

                boolean esLaMismaRelacion = (u1Email.equals(senderEmail) && u2Email.equals(receiverEmail)) || (u1Email.equals(receiverEmail) && u2Email.equals(senderEmail));
                if (esLaMismaRelacion) {
                    if ("ACEPTADA".equals(a.getEstado())) return ResponseEntity.badRequest().body(new ApiResponse(false, "❌ Ya es tu amigo."));
                    else if ("PENDIENTE".equals(a.getEstado())) return ResponseEntity.badRequest().body(new ApiResponse(false, "⏳ Ya hay una solicitud pendiente."));
                }
            }

            Amistad nuevaAmistad = new Amistad();
            nuevaAmistad.setUsuario1(sender);
            nuevaAmistad.setUsuario2(receiver);
            nuevaAmistad.setEstado("PENDIENTE");
            amistadRepository.save(nuevaAmistad);

            Map<String, Object> notificacion = new HashMap<>();
            notificacion.put("type", "FRIEND_REQUEST");
            notificacion.put("sender", sender.getUsername());
            messagingTemplate.convertAndSend("/topic/friends." + receiver.getUsername(), notificacion);

            return ResponseEntity.ok(new ApiResponse(true, "✅ Solicitud enviada a " + receiver.getUsername()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new ApiResponse(false, "Error: " + e.getMessage()));
        }
    }

    // 🔥 FIX: ARREGLADO PARA MANDAR FOTOS Y ÚLTIMO MENSAJE 🔥
    @GetMapping("/lista")
    public ResponseEntity<List<Map<String, Object>>> listarAmigos(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token).trim().toLowerCase();
        User me = userRepository.findByEmail(email).orElseThrow();

        List<Amistad> todas = amistadRepository.findAll();
        List<User> amigosUnicos = todas.stream()
                .filter(a -> "ACEPTADA".equals(a.getEstado()) && 
                            (a.getUsuario1().getEmail().trim().toLowerCase().equals(email) || 
                             a.getUsuario2().getEmail().trim().toLowerCase().equals(email)))
                .map(a -> a.getUsuario1().getEmail().trim().toLowerCase().equals(email) ? a.getUsuario2() : a.getUsuario1())
                .collect(Collectors.toMap(User::getEmail, u -> u, (u1, u2) -> u1)) 
                .values().stream().collect(Collectors.toList());

        List<Map<String, Object>> result = new ArrayList<>();
        for (User amigo : amigosUnicos) {
            Map<String, Object> map = new HashMap<>();
            map.put("username", amigo.getUsername());
            map.put("fotoPerfil", amigo.getFotoPerfil() != null ? amigo.getFotoPerfil() : "images/invitado.jpg");

            String chatKey = getChatKey(me.getUsername(), amigo.getUsername());
            List<Map<String, Object>> history = privateChats.getOrDefault(chatKey, new ArrayList<>());
            
            String lastMsg = "Toca para chatear";
            int unread = 0;
            if (!history.isEmpty()) {
                Map<String, Object> last = history.get(history.size() - 1);
                lastMsg = (String) last.get("message");
                
                for(Map<String, Object> m : history) {
                    if (!m.get("sender").equals(me.getUsername()) && !(Boolean)m.getOrDefault("isRead", false)) {
                        unread++;
                    }
                }
            }
            map.put("lastMessage", lastMsg);
            map.put("unreadCount", unread);
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/aceptar/{idAmistad}")
    public ResponseEntity<?> aceptarSolicitud(@RequestHeader("Authorization") String authHeader, @PathVariable Integer idAmistad) {
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token).trim().toLowerCase();

        Amistad amistad = amistadRepository.findById(idAmistad).orElse(null);
        if (amistad == null) return ResponseEntity.badRequest().body(new ApiResponse(false, "Solicitud no encontrada"));

        if (!amistad.getUsuario2().getEmail().trim().toLowerCase().equals(email)) {
            return ResponseEntity.status(403).body(new ApiResponse(false, "No tienes permiso"));
        }

        amistad.setEstado("ACEPTADA");
        amistadRepository.save(amistad);
        return ResponseEntity.ok(new ApiResponse(true, "Amistad aceptada."));
    }

    @GetMapping("/pendientes")
    public ResponseEntity<List<Map<String, Object>>> listarPendientes(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token).trim().toLowerCase();

        List<Amistad> todas = amistadRepository.findAll();
        List<Map<String, Object>> pendientes = todas.stream()
                .filter(a -> a.getUsuario2().getEmail().trim().toLowerCase().equals(email) && "PENDIENTE".equals(a.getEstado()))
                .map(a -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", a.getId());
                    map.put("senderUsername", a.getUsuario1().getUsername());
                    return map;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(pendientes);
    }

    @PostMapping("/rechazar/{idAmistad}")
    public ResponseEntity<?> rechazarSolicitud(@RequestHeader("Authorization") String authHeader, @PathVariable Integer idAmistad) {
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token).trim().toLowerCase();

        Amistad amistad = amistadRepository.findById(idAmistad).orElse(null);
        if (amistad == null) return ResponseEntity.badRequest().body(new ApiResponse(false, "Solicitud no encontrada"));

        if (!amistad.getUsuario2().getEmail().trim().toLowerCase().equals(email)) {
            return ResponseEntity.status(403).body(new ApiResponse(false, "No tienes permiso"));
        }
        amistadRepository.delete(amistad);
        return ResponseEntity.ok(new ApiResponse(true, "Solicitud rechazada"));
    }

    // 🔥 ESTADÍSTICAS DEL AMIGO (CON RANGO/TÍTULO) 🔥
    @GetMapping("/amigo/{username}/stats")
    public ResponseEntity<?> getAmigoStats(@RequestHeader("Authorization") String authHeader, @PathVariable String username) {
        User amigo = userRepository.findByUsername(username).orElse(null);
        if(amigo == null) return ResponseEntity.badRequest().body(new ApiResponse(false, "Usuario no encontrado"));
        
        int ganadas = amigo.getPartidasGanadas() == null ? 0 : amigo.getPartidasGanadas();
        
        String rango = "Novato";
        if(ganadas >= 5) rango = "Competidor";
        if(ganadas >= 20) rango = "Maestro";
        if(ganadas >= 50) rango = "GENIO ROYALE";

        Map<String, Object> stats = new HashMap<>();
        stats.put("username", amigo.getUsername());
        stats.put("partidasGanadas", ganadas);
        stats.put("preguntasAcertadas", amigo.getPreguntasAcertadas() == null ? 0 : amigo.getPreguntasAcertadas());
        stats.put("createdAt", amigo.getCreatedAt());
        stats.put("fotoPerfil", amigo.getFotoPerfil() != null ? amigo.getFotoPerfil() : "images/invitado.jpg");
        stats.put("rango", rango);
        
        return ResponseEntity.ok(stats);
    }

    // 🔥 ESTADO DE CONEXIÓN (EN LÍNEA / ÚLTIMA VEZ) 🔥
    @GetMapping("/amigo/{username}/status")
    public ResponseEntity<?> getStatus(@PathVariable String username) {
        long lastPing = LAST_PING.getOrDefault(username, 0L);
        boolean isOnline = (System.currentTimeMillis() - lastPing) < 15000; // 15 segundos
        Map<String, Object> res = new HashMap<>();
        res.put("online", isOnline);
        res.put("lastSeen", lastPing);
        return ResponseEntity.ok(res);
    }

    // 🔥 ENDPOINTS DE CHAT PRIVADO (WHATSAPP) 🔥
    @PostMapping("/chat/{amigo}")
    public ResponseEntity<?> sendPrivateMessage(@RequestHeader("Authorization") String authHeader, @PathVariable String amigo, @RequestBody Map<String, String> payload) {
        String email = jwtService.extractEmail(authHeader.substring(7)).trim().toLowerCase();
        User sender = userRepository.findByEmail(email).orElseThrow();
        String message = payload.get("message");
        String tempId = payload.get("tempId");

        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Map<String, Object> chatMsg = new HashMap<>();
        chatMsg.put("id", UUID.randomUUID().toString());
        chatMsg.put("sender", sender.getUsername());
        chatMsg.put("message", message.trim());
        chatMsg.put("timestamp", System.currentTimeMillis());
        chatMsg.put("isRead", false);
        chatMsg.put("tempId", tempId); // Para el frontend

        String key = getChatKey(sender.getUsername(), amigo);
        privateChats.computeIfAbsent(key, k -> new ArrayList<>()).add(chatMsg);

        messagingTemplate.convertAndSend("/topic/chat.private." + amigo, chatMsg);
        
        return ResponseEntity.ok(chatMsg); // Devuelve al emisor que se ha guardado (Doble Tick Gris)
    }

    @GetMapping("/chat/{amigo}")
    public ResponseEntity<?> getChatHistory(@RequestHeader("Authorization") String authHeader, @PathVariable String amigo) {
        String email = jwtService.extractEmail(authHeader.substring(7)).trim().toLowerCase();
        User sender = userRepository.findByEmail(email).orElseThrow();
        
        String key = getChatKey(sender.getUsername(), amigo);
        List<Map<String, Object>> history = privateChats.getOrDefault(key, new ArrayList<>());
        
        return ResponseEntity.ok(history);
    }
}