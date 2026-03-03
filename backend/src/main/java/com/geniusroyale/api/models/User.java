package com.geniusroyale.api.models;

import jakarta.persistence.*;

@Entity
@Table(name = "users") // El nombre exacto de tu tabla en PostgreSQL
public class User {

    @Id // <-- ¡CAMBIO IMPORTANTE!
    @Column(unique = true)
    private String username;

    @Column(unique = true)
    private String email;

    @Column(name = "password")
    private String password;

    // Constructor vacío (requerido)
    public User() {
        // Ya no inicializamos 'createdAt' ni 'totalScore'
    }

    // --- Getters y Setters ---
    // (Hemos quitado los de id, totalScore y createdAt)

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}