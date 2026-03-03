package com.geniusroyale.api.models;

// Importar User si no está
import com.geniusroyale.api.models.User;

public class ApiResponse {
    private boolean success;
    private String message;
    private String token;
    private User user; // Asegurarse de que este campo existe

    public ApiResponse() {}

    // Constructor para ERRORES
    public ApiResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    // Constructor para ÉXITO (con token) - (Lo dejamos por si acaso)
    public ApiResponse(boolean success, String message, String token) {
        this.success = success;
        this.message = message;
        this.token = token;
    }

    // Constructor para ÉXITO (con token Y usuario)
    public ApiResponse(boolean success, String message, String token, User user) {
        this.success = success;
        this.message = message;
        this.token = token;
        // Limpiamos la contraseña antes de enviarla (Buena práctica)
        if (user != null) {
            user.setPassword(null);
        }
        this.user = user;
    }

    // Getters y Setters
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}