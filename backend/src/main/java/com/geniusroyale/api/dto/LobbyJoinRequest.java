package com.geniusroyale.api.dto;

public class LobbyJoinRequest {
    private String categoryName; // "Cultura General", "Real Madrid", etc.

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
}