package com.geniusroyale.api.controllers;

import com.geniusroyale.api.models.Amistad;
import com.geniusroyale.api.models.ApiResponse;
import com.geniusroyale.api.models.ChatMessage;
import com.geniusroyale.api.models.User;
import com.geniusroyale.api.repositories.AmistadRepository;
import com.geniusroyale.api.repositories.ChatMessageRepository;
import com.geniusroyale.api.repositories.UserRepository;
import com.geniusroyale.api.services.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
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
    @Autowired private ChatMessageRepository chatMessageRepository;
    @Autowired private JwtService jwtService;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    public static final Map<String, Long> LAST_PING = new ConcurrentHashMap<>();

    @MessageMapping("/user.ping")
    public void handlePing(Principal principal) {
        String username = userRepository.findByEmail(principal.getName()).orElseThrow().getUsername();
        long now = System.currentTimeMillis();
        LAST_PING.put(username, now);
        userRepository.updateLastSeen(username, now); 
    }

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

    @MessageMapping("/chat.read")
    public void handleRead(Principal principal, @Payload Map<String, String> payload) {
        String reader = userRepository.findByEmail(principal.getName()).orElseThrow().getUsername();
        String sender = payload.get("sender");
        
        chatMessageRepository.markAsRead(sender, reader);
        
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

            List<ChatMessage> history = chatMessageRepository.findChatHistoryForUser(me.getUsername(), amigo.getUsername());
            
            String lastMsg = "Toca para chatear";
            int unread = 0;
            if (!history.isEmpty()) {
                ChatMessage last = history.get(history.size() - 1);
                lastMsg = "IMAGE".equals(last.getType()) ? "📷 Foto" : last.getMessage();
                
                for(ChatMessage m : history) {
                    if (m.getSender().equals(amigo.getUsername()) && !m.getIsRead()) {
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

    @GetMapping("/amigo/{username}/status")
    public ResponseEntity<?> getStatus(@PathVariable String username) {
        User amigo = userRepository.findByUsername(username).orElse(null);
        if (amigo == null) return ResponseEntity.badRequest().build();

        long lastPingRam = LAST_PING.getOrDefault(username, 0L);
        long lastPingDb = amigo.getLastSeen() != null ? amigo.getLastSeen() : 0L;
        long lastPing = Math.max(lastPingRam, lastPingDb);

        boolean isOnline = (System.currentTimeMillis() - lastPing) < 15000;
        Map<String, Object> res = new HashMap<>();
        res.put("online", isOnline);
        res.put("lastSeen", lastPing);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/chat/{amigo}")
    public ResponseEntity<?> sendPrivateMessage(@RequestHeader("Authorization") String authHeader, @PathVariable String amigo, @RequestBody Map<String, String> payload) {
        String email = jwtService.extractEmail(authHeader.substring(7)).trim().toLowerCase();
        User sender = userRepository.findByEmail(email).orElseThrow();
        String message = payload.get("message");
        String tempId = payload.get("tempId");
        String type = payload.getOrDefault("type", "TEXT");

        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        ChatMessage chatMsg = new ChatMessage();
        chatMsg.setSender(sender.getUsername());
        chatMsg.setReceiver(amigo);
        chatMsg.setMessage(message.trim());
        chatMsg.setTimestamp(System.currentTimeMillis());
        chatMsg.setIsRead(false);
        chatMsg.setTempId(tempId);
        chatMsg.setType(type);

        chatMessageRepository.save(chatMsg);
        
        ChatMessage wsMsg = new ChatMessage();
        wsMsg.setId(chatMsg.getId());
        wsMsg.setSender(chatMsg.getSender());
        wsMsg.setReceiver(chatMsg.getReceiver());
        wsMsg.setTimestamp(chatMsg.getTimestamp());
        wsMsg.setType(chatMsg.getType());
        wsMsg.setTempId(chatMsg.getTempId());
        if ("TEXT".equals(chatMsg.getType())) {
            wsMsg.setMessage(chatMsg.getMessage());
        } else {
            wsMsg.setMessage("[MULTIMEDIA_FETCH_REQUIRED]");
        }

        messagingTemplate.convertAndSend("/topic/chat.private." + amigo, wsMsg);
        
        return ResponseEntity.ok(chatMsg);
    }

    @GetMapping("/chat/{amigo}")
    public ResponseEntity<?> getChatHistory(@RequestHeader("Authorization") String authHeader, @PathVariable String amigo) {
        String email = jwtService.extractEmail(authHeader.substring(7)).trim().toLowerCase();
        User sender = userRepository.findByEmail(email).orElseThrow();
        
        List<ChatMessage> history = chatMessageRepository.findChatHistoryForUser(sender.getUsername(), amigo);
        return ResponseEntity.ok(history);
    }

    // 🔥 ENDPOINT PARA VACIAR EL CHAT 🔥
    @DeleteMapping("/chat/{amigo}")
    @Transactional
    public ResponseEntity<?> vaciarChat(@RequestHeader("Authorization") String authHeader, @PathVariable String amigo) {
        String email = jwtService.extractEmail(authHeader.substring(7)).trim().toLowerCase();
        User me = userRepository.findByEmail(email).orElseThrow();
        
        // Oculta los mensajes en las dos direcciones SOLO para este usuario
        chatMessageRepository.clearMySentMessages(me.getUsername(), amigo);
        chatMessageRepository.clearMyReceivedMessages(me.getUsername(), amigo);
        
        return ResponseEntity.ok(new ApiResponse(true, "Chat vaciado con éxito"));
    }
}