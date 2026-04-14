package com.geniusroyale.api.controllers;

import com.geniusroyale.api.dto.LoginRequest;
import com.geniusroyale.api.dto.RegisterRequest;
import com.geniusroyale.api.models.ApiResponse;
import com.geniusroyale.api.models.User;
import com.geniusroyale.api.repositories.UserRepository;
import com.geniusroyale.api.services.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    // 1. REGISTRO
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest registerRequest) {
        System.out.println("Intentando registrar: " + registerRequest.getEmail());

        // Verificar si el email ya existe
        if (userRepository.findByEmail(registerRequest.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "El email ya está registrado"));
        }
        
        // Verificar si el username ya existe
        if (userRepository.findByUsername(registerRequest.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "El nombre de usuario ya existe"));
        }

        User newUser = new User();
        newUser.setUsername(registerRequest.getUsername());
        newUser.setEmail(registerRequest.getEmail());
        // Guardamos la contraseña tal cual (SIN encriptar) porque usas NoOpPasswordEncoder
        newUser.setPassword(registerRequest.getPassword());

        userRepository.save(newUser);
        return ResponseEntity.ok(new ApiResponse(true, "¡Registro completado con éxito!"));
    }

    // 2. LOGIN
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest loginRequest) {
        // Tu frontend en app.js envía 'username', así que buscamos por ese campo
        System.out.println("Intento de login para: " + loginRequest.getEmail());

        // IMPORTANTE: Si en el login pones el email, usa findByEmail. 
        // Si pones el nombre de usuario, usa findByUsername.
        Optional<User> userOptional = userRepository.findByEmail(loginRequest.getEmail());

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            // Comparación directa de texto (sin encriptar)
            if (loginRequest.getPassword().equals(user.getPassword())) {
                String token = jwtService.generateToken(user);
                return ResponseEntity.ok(new ApiResponse(true, "Login correcto", token, user));
            }
        }
        
        return ResponseEntity.status(401).body(new ApiResponse(false, "Credenciales inválidas"));
    }
}