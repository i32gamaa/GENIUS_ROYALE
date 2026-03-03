package com.geniusroyale.api.dto;

public class GameStartMessage {
    private String gameId;
    private String playerOneUsername;
    private String playerTwoUsername;
    private String opponentUsername;

    // Constructor que usa el GameLobbyController
    public GameStartMessage(String gameId, String p1Username, String p2Username, String opponent) {
        this.gameId = gameId;
        this.playerOneUsername = p1Username;
        this.playerTwoUsername = p2Username;
        this.opponentUsername = opponent;
    }

    // Getters (Jackson los usa para crear el JSON)
    public String getGameId() { return gameId; }
    public String getPlayerOneUsername() { return playerOneUsername; }
    public String getPlayerTwoUsername() { return playerTwoUsername; }
    public String getOpponentUsername() { return opponentUsername; }
}