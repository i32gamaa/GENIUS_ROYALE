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

    // 1. Enviar solicitud de amistad (ESCUDO TOTAL)
    @PostMapping("/solicitar")
    public ResponseEntity<?> enviarSolicitud(@RequestHeader("Authorization") String authHeader, @RequestBody Map<String, String> payload) {
        try {
            String token = authHeader.substring(7);
            String senderEmail = jwtService.extractEmail(token).trim().toLowerCase();
            // Quitamos espacios invisibles que haya puesto el usuario sin querer
            String receiverEmail = payload.get("email").trim().toLowerCase();

            if (senderEmail.equals(receiverEmail)) {
                return ResponseEntity.badRequest().body(new ApiResponse(false, "No puedes enviarte una solicitud a ti mismo"));
            }

            User sender = userRepository.findByEmail(senderEmail).orElseThrow();
            User receiver = userRepository.findByEmail(receiverEmail).orElse(null);

            if (receiver == null) {
                return ResponseEntity.badRequest().body(new ApiResponse(false, "Usuario no encontrado con ese email"));
            }

            // ESCUDO: Revisamos TODA la base de datos
            List<Amistad> todas = amistadRepository.findAll();
            for (Amistad a : todas) {
                String u1Email = a.getUsuario1().getEmail().trim().toLowerCase();
                String u2Email = a.getUsuario2().getEmail().trim().toLowerCase();

                boolean esLaMismaRelacion = 
                    (u1Email.equals(senderEmail) && u2Email.equals(receiverEmail)) ||
                    (u1Email.equals(receiverEmail) && u2Email.equals(senderEmail));

                if (esLaMismaRelacion) {
                    if ("ACEPTADA".equals(a.getEstado())) {
                        return ResponseEntity.badRequest().body(new ApiResponse(false, "❌ Ya tienes a este usuario en tu lista de amigos."));
                    } else if ("PENDIENTE".equals(a.getEstado())) {
                        return ResponseEntity.badRequest().body(new ApiResponse(false, "⏳ Ya le has enviado una solicitud (o él a ti). Espera a que responda."));
                    }
                }
            }

            Amistad nuevaAmistad = new Amistad();
            nuevaAmistad.setUsuario1(sender);
            nuevaAmistad.setUsuario2(receiver);
            nuevaAmistad.setEstado("PENDIENTE");
            amistadRepository.save(nuevaAmistad);

            return ResponseEntity.ok(new ApiResponse(true, "✅ Solicitud enviada a " + receiver.getUsername()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new ApiResponse(false, "Error en el servidor: " + e.getMessage()));
        }
    }

    // 2. Obtener la lista de amigos (BIDIRECCIONAL Y SIN DUPLICADOS)
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
                .collect(Collectors.toMap(User::getEmail, u -> u, (u1, u2) -> u1)) // Elimina duplicados si la BD está sucia
                .values().stream()
                .map(UserProfileDTO::new)
                .collect(Collectors.toList());

        return ResponseEntity.ok(amigos);
    }

    // 3. Aceptar una solicitud
    @PostMapping("/aceptar/{idAmistad}")
    public ResponseEntity<?> aceptarSolicitud(@RequestHeader("Authorization") String authHeader, @PathVariable Integer idAmistad) {
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token).trim().toLowerCase();

        Amistad amistad = amistadRepository.findById(idAmistad).orElse(null);
        if (amistad == null) return ResponseEntity.badRequest().body(new ApiResponse(false, "Solicitud no encontrada"));

        if (!amistad.getUsuario2().getEmail().trim().toLowerCase().equals(email)) {
            return ResponseEntity.status(403).body(new ApiResponse(false, "No tienes permiso para aceptar esta solicitud"));
        }

        amistad.setEstado("ACEPTADA");
        amistadRepository.save(amistad);

        return ResponseEntity.ok(new ApiResponse(true, "Amistad aceptada."));
    }

    // 4. Obtener solicitudes PENDIENTES
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

    // 5. Rechazar una solicitud
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
}