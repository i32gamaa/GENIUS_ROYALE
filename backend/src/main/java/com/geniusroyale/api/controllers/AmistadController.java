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

    // 1. Enviar solicitud de amistad por Email
    @PostMapping("/solicitar")
    public ResponseEntity<?> enviarSolicitud(@RequestHeader("Authorization") String authHeader, @RequestBody Map<String, String> payload) {
        try {
            String token = authHeader.substring(7);
            String senderEmail = jwtService.extractEmail(token);
            String receiverEmail = payload.get("email");

            if (senderEmail.equalsIgnoreCase(receiverEmail)) {
                return ResponseEntity.badRequest().body(new ApiResponse(false, "No puedes enviarte una solicitud a ti mismo"));
            }

            User sender = userRepository.findByEmail(senderEmail).orElseThrow();
            User receiver = userRepository.findByEmail(receiverEmail).orElse(null);

            if (receiver == null) {
                return ResponseEntity.badRequest().body(new ApiResponse(false, "Usuario no encontrado con ese email"));
            }

            Amistad nuevaAmistad = new Amistad();
            nuevaAmistad.setUsuario1(sender);
            nuevaAmistad.setUsuario2(receiver);
            nuevaAmistad.setEstado("PENDIENTE");
            amistadRepository.save(nuevaAmistad);

            return ResponseEntity.ok(new ApiResponse(true, "Solicitud de amistad enviada a " + receiver.getUsername()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new ApiResponse(false, "Error en el servidor: " + e.getMessage()));
        }
    }

    // 2. Obtener la lista de amigos aceptados
    @GetMapping("/lista")
    public ResponseEntity<List<UserProfileDTO>> listarAmigos(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token);
        User currentUser = userRepository.findByEmail(email).orElseThrow();

        List<Amistad> amistades = amistadRepository.findByUsuario1AndEstadoOrUsuario2AndEstado(
                currentUser, "ACEPTADA", currentUser, "ACEPTADA"
        );

        List<UserProfileDTO> amigos = amistades.stream()
                .map(a -> {
                    User amigo = a.getUsuario1().getId().equals(currentUser.getId()) ? a.getUsuario2() : a.getUsuario1();
                    return new UserProfileDTO(amigo);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(amigos);
    }

    // 3. Aceptar una solicitud de amistad pendiente
    @PostMapping("/aceptar/{idAmistad}")
    public ResponseEntity<?> aceptarSolicitud(@RequestHeader("Authorization") String authHeader, @PathVariable Integer idAmistad) {
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token);

        Amistad amistad = amistadRepository.findById(idAmistad).orElse(null);
        if (amistad == null) return ResponseEntity.badRequest().body(new ApiResponse(false, "Solicitud no encontrada"));

        if (!amistad.getUsuario2().getEmail().equals(email)) {
            return ResponseEntity.status(403).body(new ApiResponse(false, "No tienes permiso para aceptar esta solicitud"));
        }

        amistad.setEstado("ACEPTADA");
        amistadRepository.save(amistad);

        return ResponseEntity.ok(new ApiResponse(true, "Solicitud de amistad aceptada"));
    }

    // 4. Obtener solicitudes PENDIENTES recibidas
    @GetMapping("/pendientes")
    public ResponseEntity<List<Map<String, Object>>> listarPendientes(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token);

        List<Amistad> todas = amistadRepository.findAll();
        List<Map<String, Object>> pendientes = todas.stream()
                .filter(a -> a.getUsuario2().getEmail().equals(email) && "PENDIENTE".equals(a.getEstado()))
                .map(a -> {
                    // SOLUCIÓN AL ERROR: Forzamos un HashMap<String, Object> tradicional
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
        String email = jwtService.extractEmail(token);

        Amistad amistad = amistadRepository.findById(idAmistad).orElse(null);
        if (amistad == null) return ResponseEntity.badRequest().body(new ApiResponse(false, "Solicitud no encontrada"));

        if (!amistad.getUsuario2().getEmail().equals(email)) {
            return ResponseEntity.status(403).body(new ApiResponse(false, "No tienes permiso"));
        }

        amistadRepository.delete(amistad);
        return ResponseEntity.ok(new ApiResponse(true, "Solicitud rechazada"));
    }
}