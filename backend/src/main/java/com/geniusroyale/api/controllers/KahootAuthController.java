package com.geniusroyale.api.controllers;

import com.geniusroyale.api.models.*;
import com.geniusroyale.api.repositories.*;
import com.geniusroyale.api.services.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/kahoot")
public class KahootAuthController {

    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository; 

    public static final Map<String, User> GUEST_USERS = new ConcurrentHashMap<>();

    @PostMapping("/guest")
    public ResponseEntity<?> loginGuest(@RequestBody Map<String, String> payload) {
        String pin = payload.get("pin");
        String username = payload.get("username");

        if (pin == null || username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Faltan datos."));
        }

        // 🔥 FIX: EL PORTERO DE LA DISCOTECA (Comprueba que el PIN existe) 🔥
        Game salaActiva = KahootController.PIN_ROOMS.get(pin);
        if (salaActiva == null) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "El PIN introducido no existe o la sala ha sido cerrada."));
        }
        
        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Ese apodo pertenece a un usuario registrado."));
        }

        // Lógica de Reconexión y Cazador de Zombis
        if (GUEST_USERS.containsKey(username)) {
            if ("IN_PROGRESS".equals(salaActiva.getGameState())) {
                boolean estabaJugando = salaActiva.getPlayers().stream().anyMatch(p -> p.getUsername().equals(username));
                if (estabaJugando) {
                    User existingGuest = GUEST_USERS.get(username);
                    String token = jwtService.generateToken(existingGuest);
                    return ResponseEntity.ok(new ApiResponse(true, "Reconexión exitosa", token, existingGuest));
                }
            }
            
            boolean estaEnOtraSala = KahootController.PIN_ROOMS.values().stream()
                    .anyMatch(sala -> sala.getPlayers().stream()
                            .anyMatch(p -> p.getUsername().equals(username)));

            if (estaEnOtraSala) {
                return ResponseEntity.badRequest().body(new ApiResponse(false, "Ese apodo ya está en uso. ¡Elige otro!"));
            } else {
                GUEST_USERS.remove(username); // Borra al zombi si la sala ya no existe
            }
        }

        // 🔥 FIX: Evitar que se unan nuevos invitados si el Host ya le dio a Iniciar Partida 🔥
        if ("IN_PROGRESS".equals(salaActiva.getGameState())) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "¡La partida ya ha comenzado! No puedes unirte."));
        }

        User guest = new User();
        guest.setUsername(username);
        guest.setEmail("guest_" + UUID.randomUUID().toString().substring(0,8) + "@guest.com");
        guest.setPassword("");
        guest.setFotoPerfil("images/invitado.jpg");

        GUEST_USERS.put(guest.getUsername(), guest);
        GUEST_USERS.put(guest.getEmail(), guest);

        String token = jwtService.generateToken(guest);
        return ResponseEntity.ok(new ApiResponse(true, "Entrada exitosa", token, guest));
    }
}