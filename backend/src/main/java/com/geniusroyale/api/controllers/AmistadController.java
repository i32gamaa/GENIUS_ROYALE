package com.geniusroyale.api.controllers;

import com.geniusroyale.api.dto.UserProfileDTO;
import com.geniusroyale.api.models.Amistad;
import com.geniusroyale.api.models.ApiResponse;
import com.geniusroyale.api.models.User;
import com.geniusroyale.api.repositories.AmistadRepository;
import com.geniusroyale.api.repositories.UserRepository;
import com.geniusroyale.api.services.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/amistad")
public class AmistadController {

    @Autowired private UserRepository userRepository;
    @Autowired private AmistadRepository amistadRepository;
    @Autowired private JwtService jwtService;
    @Autowired private SimpMessagingTemplate messagingTemplate;

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
    public ResponseEntity<List<UserProfileDTO>> listarAmigos(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token).trim().toLowerCase();

        List<Amistad> todas = amistadRepository.findAll();
        List<UserProfileDTO> amigos = todas.stream()
                .filter(a -> "ACEPTADA".equals(a.getEstado()) && 
                            (a.getUsuario1().getEmail().trim().toLowerCase().equals(email) || 
                             a.getUsuario2().getEmail().trim().toLowerCase().equals(email)))
                .map(a -> a.getUsuario1().getEmail().trim().toLowerCase().equals(email) ? a.getUsuario2() : a.getUsuario1())
                .collect(Collectors.toMap(User::getEmail, u -> u, (u1, u2) -> u1)) 
                .values().stream()
                .map(UserProfileDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(amigos);
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

    // 🔥 NUEVO: Consultar estadísticas de un amigo
    @GetMapping("/amigo/{username}/stats")
    public ResponseEntity<?> getAmigoStats(@RequestHeader("Authorization") String authHeader, @PathVariable String username) {
        User amigo = userRepository.findByUsername(username).orElse(null);
        if(amigo == null) return ResponseEntity.badRequest().body(new ApiResponse(false, "Usuario no encontrado"));
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("username", amigo.getUsername());
        stats.put("partidasGanadas", amigo.getPartidasGanadas());
        stats.put("preguntasAcertadas", amigo.getPreguntasAcertadas());
        stats.put("createdAt", amigo.getCreatedAt());
        stats.put("fotoPerfil", amigo.getFotoPerfil());
        
        return ResponseEntity.ok(stats);
    }
}