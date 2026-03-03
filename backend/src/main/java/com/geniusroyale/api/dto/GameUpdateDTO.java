package com.geniusroyale.api.dto;

import java.util.List;

public class GameUpdateDTO {
    private String type;
    private String message;
    private String correctAnswer;
    private int playerOneScore;
    private int playerTwoScore;
    private String winnerUsername;

    // Para el comodín 50:50
    private List<String> removedAnswers;

    public GameUpdateDTO() {}

    // Getters
    public String getType() { return type; }
    public String getMessage() { return message; }
    public String getCorrectAnswer() { return correctAnswer; }
    public int getPlayerOneScore() { return playerOneScore; }
    public int getPlayerTwoScore() { return playerTwoScore; }
    public String getWinnerUsername() { return winnerUsername; }
    public List<String> getRemovedAnswers() { return removedAnswers; }

    // Setters
    public void setType(String type) { this.type = type; }
    public void setMessage(String message) { this.message = message; }
    public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }
    public void setPlayerOneScore(int playerOneScore) { this.playerOneScore = playerOneScore; }
    public void setPlayerTwoScore(int playerTwoScore) { this.playerTwoScore = playerTwoScore; }
    public void setWinnerUsername(String winnerUsername) { this.winnerUsername = winnerUsername; }
    public void setRemovedAnswers(List<String> removedAnswers) { this.removedAnswers = removedAnswers; }
}