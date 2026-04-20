package com.geniusroyale.api.controllers;

import com.geniusroyale.api.config.ActiveUserManager;
import com.geniusroyale.api.dto.LoginRequest;
import com.geniusroyale.api.dto.RegisterRequest;
import com.geniusroyale.api.models.ApiResponse;
import com.geniusroyale.api.models.User;
import com.geniusroyale.api.repositories.UserRepository;
import com.geniusroyale.api.services.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private ActiveUserManager activeUserManager; 

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest registerRequest) {
        if (userRepository.findByEmail(registerRequest.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "El email ya está registrado"));
        }
        if (userRepository.findByUsername(registerRequest.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "El nombre de usuario ya existe"));
        }

        User newUser = new User();
        newUser.setUsername(registerRequest.getUsername());
        newUser.setEmail(registerRequest.getEmail());
        newUser.setPassword(registerRequest.getPassword());

        userRepository.save(newUser);
        return ResponseEntity.ok(new ApiResponse(true, "¡Usuario registrado con éxito!"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest loginRequest) {
        Optional<User> userOptional = userRepository.findByEmail(loginRequest.getEmail());
        
        if (userOptional.isEmpty()) {
            userOptional = userRepository.findByUsername(loginRequest.getEmail());
        }

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            if (loginRequest.getPassword().equals(user.getPassword())) {
                if (activeUserManager.isUserActive(user.getEmail())) {
                    return ResponseEntity.status(403).body(new ApiResponse(false, "Ya tienes una sesión iniciada. Ciérrala primero."));
                }
                String token = jwtService.generateToken(user);
                return ResponseEntity.ok(new ApiResponse(true, "Login exitoso", token, user));
            }
        }
        return ResponseEntity.status(401).body(new ApiResponse(false, "Credenciales inválidas"));
    }

    // 🔥 NUEVO: Obtener mi perfil completo
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token);
        User user = userRepository.findByEmail(email).orElseThrow();
        return ResponseEntity.ok(user);
    }

    // 🔥 NUEVO: Subir foto de perfil en Base64
    @PostMapping("/photo")
    public ResponseEntity<?> uploadPhoto(@RequestHeader("Authorization") String authHeader, @RequestBody Map<String, String> payload) {
        try {
            String token = authHeader.substring(7);
            String email = jwtService.extractEmail(token);
            User user = userRepository.findByEmail(email).orElseThrow();
            
            user.setFotoPerfil(payload.get("foto"));
            userRepository.save(user);
            return ResponseEntity.ok(new ApiResponse(true, "Foto actualizada correctamente."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new ApiResponse(false, "Error al guardar la foto."));
        }
    }
}