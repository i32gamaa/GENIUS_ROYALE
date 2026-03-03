package com.geniusroyale.api.dto;

public class PlayerAnswerDTO {
    private String gameId;
    private String selectedAnswer;

    // Getters y Setters
    public String getGameId() { return gameId; }
    public void setGameId(String gameId) { this.gameId = gameId; }
    public String getSelectedAnswer() { return selectedAnswer; }
    public void setSelectedAnswer(String selectedAnswer) { this.selectedAnswer = selectedAnswer; }
}