package com.geniusroyale.api.controllers;

import com.geniusroyale.api.dto.LoginRequest;
import com.geniusroyale.api.dto.RegisterRequest;
import com.geniusroyale.api.dto.UserProfileDTO;
import com.geniusroyale.api.models.ApiResponse;
import com.geniusroyale.api.models.User;
import com.geniusroyale.api.repositories.UserRepository;
import com.geniusroyale.api.services.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(RegisterRequest registerRequest) {
        System.out.println("Recibido registro para: " + registerRequest.getEmail());

        if (userRepository.findByEmail(registerRequest.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "El email ya está registrado"));
        }
        if (userRepository.findByUsername(registerRequest.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "El nombre de usuario ya existe"));
        }

        User newUser = new User();
        newUser.setUsername(registerRequest.getUsername());
        newUser.setEmail(registerRequest.getEmail());
        newUser.setPassword(passwordEncoder.encode(registerRequest.getPassword()));

        userRepository.save(newUser);

        System.out.println("Usuario guardado con username: " + newUser.getUsername());
        return ResponseEntity.ok(new ApiResponse(true, "¡Usuario registrado con éxito!"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(LoginRequest loginRequest) {
        System.out.println("Recibido login para: " + loginRequest.getEmail());

        Optional<User> userOptional = userRepository.findByEmail(loginRequest.getEmail());
        if (userOptional.isEmpty()) {
            return ResponseEntity.status(401).body(new ApiResponse(false, "Credenciales inválidas"));
        }

        User user = userOptional.get();

        if (passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            String token = jwtService.generateToken(user);
            System.out.println("Login exitoso. Token generado.");

            // --- CAMBIO AQUÍ ---
            // Devolver el objeto User en la respuesta
            return ResponseEntity.ok(new ApiResponse(true, "Login exitoso", token, user));

        } else {
            return ResponseEntity.status(401).body(new ApiResponse(false, "Credenciales inválidas"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        String email = "";

        try {
            email = jwtService.extractEmail(token);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(new ApiResponse(false, "Token inválido"));
        }

        System.out.println("Petición de perfil recibida para: " + email);
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            return ResponseEntity.status(404).body(new ApiResponse(false, "Usuario no encontrado"));
        }

        User user = userOptional.get();

        if (jwtService.isTokenValid(token, user)) {
            return ResponseEntity.ok(new UserProfileDTO(user));
        } else {
            return ResponseEntity.status(401).body(new ApiResponse(false, "Token inválido"));
        }
    }
}