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

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest registerRequest) {
        // Verificamos si ya existe por email o username
        if (userRepository.findByEmail(registerRequest.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "El email ya está registrado"));
        }
        if (userRepository.findByUsername(registerRequest.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "El nombre de usuario ya existe"));
        }

        User newUser = new User();
        newUser.setUsername(registerRequest.getUsername());
        newUser.setEmail(registerRequest.getEmail());
        // Guardamos tal cual (sin encode) porque usas NoOpPasswordEncoder en SecurityConfig
        newUser.setPassword(registerRequest.getPassword());

        userRepository.save(newUser);
        return ResponseEntity.ok(new ApiResponse(true, "¡Usuario registrado con éxito!"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest loginRequest) {
        // Buscamos por EMAIL que es lo que envía el frontend
        Optional<User> userOptional = userRepository.findByEmail(loginRequest.getEmail());
        
        // Si no está por email, probamos por username (por si acaso el usuario puso el nombre)
        if (userOptional.isEmpty()) {
            userOptional = userRepository.findByUsername(loginRequest.getEmail());
        }

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            // Comparación directa de texto (sin matches) para ir a lo seguro con NoOp
            if (loginRequest.getPassword().equals(user.getPassword())) {
                String token = jwtService.generateToken(user);
                return ResponseEntity.ok(new ApiResponse(true, "Login exitoso", token, user));
            }
        }

        return ResponseEntity.status(401).body(new ApiResponse(false, "Credenciales inválidas"));
    }
}