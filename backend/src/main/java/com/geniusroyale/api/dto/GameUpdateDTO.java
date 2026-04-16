package com.geniusroyale.api.dto;

import java.util.Map;

public class GameUpdateDTO {
    private String type;
    private String message;
    private String correctAnswer;
    private String winnerUsername;
    private Map<String, Integer> scores;

    public GameUpdateDTO() {}

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }
    public String getWinnerUsername() { return winnerUsername; }
    public void setWinnerUsername(String winnerUsername) { this.winnerUsername = winnerUsername; }
    public Map<String, Integer> getScores() { return scores; }
    public void setScores(Map<String, Integer> scores) { this.scores = scores; }
}