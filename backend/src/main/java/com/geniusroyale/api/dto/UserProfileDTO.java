package com.geniusroyale.api.dto;

import com.geniusroyale.api.models.User;

// Solo los datos que la app puede ver
public class UserProfileDTO {
    private String username;
    private String email;

    // Constructor para convertir de User a DTO
    public UserProfileDTO(User user) {
        this.username = user.getUsername();
        this.email = user.getEmail();
    }

    // Getters y Setters
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}