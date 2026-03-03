package com.geniusroyale.api.dto;

public class InviteRequestDTO {
    private String receiverUsername; // El 'username' del amigo a invitar
    private String categoryName;     // La categoría elegida

    // Getters y Setters
    public String getReceiverUsername() { return receiverUsername; }
    public void setReceiverUsername(String receiverUsername) { this.receiverUsername = receiverUsername; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
}