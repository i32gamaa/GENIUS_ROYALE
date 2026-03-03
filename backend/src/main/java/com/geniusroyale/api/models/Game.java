package com.geniusroyale.api.models;

import jakarta.persistence.*;

@Entity
@Table(name = "games")
public class Game {

    @Id
    private String id; // UUID que generaremos

    @ManyToOne
    @JoinColumn(name = "player_one_username")
    private User playerOne;

    @ManyToOne
    @JoinColumn(name = "player_two_username")
    private User playerTwo;

    private int playerOneScore;
    private int playerTwoScore;

    @Column(name = "game_state")
    private String gameState; // "WAITING_FOR_PLAYER", "IN_PROGRESS", "FINISHED"

    private int currentQuestionIndex;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "question_ids")
    private String questionIds; // <-- CAMPO NUEVO

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public User getPlayerOne() { return playerOne; }
    public void setPlayerOne(User playerOne) { this.playerOne = playerOne; }
    public User getPlayerTwo() { return playerTwo; }
    public void setPlayerTwo(User playerTwo) { this.playerTwo = playerTwo; }
    public int getPlayerOneScore() { return playerOneScore; }
    public void setPlayerOneScore(int playerOneScore) { this.playerOneScore = playerOneScore; }
    public int getPlayerTwoScore() { return playerTwoScore; }
    public void setPlayerTwoScore(int playerTwoScore) { this.playerTwoScore = playerTwoScore; }
    public String getGameState() { return gameState; }
    public void setGameState(String gameState) { this.gameState = gameState; }
    public int getCurrentQuestionIndex() { return currentQuestionIndex; }
    public void setCurrentQuestionIndex(int currentQuestionIndex) { this.currentQuestionIndex = currentQuestionIndex; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    // --- GETTER Y SETTER NUEVO ---
    public String getQuestionIds() { return questionIds; }
    public void setQuestionIds(String questionIds) { this.questionIds = questionIds; }

    // ... (después de currentQuestionIndex)

    @Column(name = "player_one_current_answer")
    private String playerOneCurrentAnswer; // Qué ha respondido J1

    @Column(name = "player_two_current_answer")
    private String playerTwoCurrentAnswer; // Qué ha respondido J2

// ... (getters/setters existentes) ...

    // --- AÑADIR GETTERS Y SETTERS NUEVOS ---
    public String getPlayerOneCurrentAnswer() { return playerOneCurrentAnswer; }
    public void setPlayerOneCurrentAnswer(String playerOneCurrentAnswer) { this.playerOneCurrentAnswer = playerOneCurrentAnswer; }
    public String getPlayerTwoCurrentAnswer() { return playerTwoCurrentAnswer; }
    public void setPlayerTwoCurrentAnswer(String playerTwoCurrentAnswer) { this.playerTwoCurrentAnswer = playerTwoCurrentAnswer; }
}