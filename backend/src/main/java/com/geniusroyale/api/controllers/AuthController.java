package com.geniusroyale.api.controllers;

import com.geniusroyale.api.dto.LoginRequest;
import com.geniusroyale.api.dto.RegisterRequest;
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

    // 1. REGISTRO (Ya tiene el @RequestBody que pusimos antes)
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest registerRequest) {
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
        // Usamos el passwordEncoder para cumplir con vuestra SecurityConfig
        newUser.setPassword(passwordEncoder.encode(registerRequest.getPassword()));

        userRepository.save(newUser);
        return ResponseEntity.ok(new ApiResponse(true, "¡Usuario registrado con éxito!"));
    }

    // 2. LOGIN (Corregido para usar getEmail() en lugar de getUsername())
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest loginRequest) {
        System.out.println("Intento de login para: " + loginRequest.getEmail());

        // Buscamos por EMAIL que es lo que tiene vuestro LoginRequest
        Optional<User> userOptional = userRepository.findByEmail(loginRequest.getEmail());

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            // Comprobamos la contraseña usando el encoder
            if (passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
                String token = jwtService.generateToken(user);
                return ResponseEntity.ok(new ApiResponse(true, "Login exitoso", token, user));
            }
        }
        
        return ResponseEntity.status(401).body(new ApiResponse(false, "Credenciales inválidas"));
    }
}