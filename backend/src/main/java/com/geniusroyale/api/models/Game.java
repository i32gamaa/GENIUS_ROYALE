package com.geniusroyale.api.models;

import jakarta.persistence.*;
import java.util.*;

@Entity
@Table(name = "games")
public class Game {

    @Id
    private String id; // UUID

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "jugador_partida",
        joinColumns = @JoinColumn(name = "id_partida"),
        inverseJoinColumns = @JoinColumn(name = "id_usuario")
    )
    private List<User> players = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "game_scores", joinColumns = @JoinColumn(name = "game_id"))
    @MapKeyColumn(name = "username")
    @Column(name = "score")
    private Map<String, Integer> scores = new HashMap<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "game_answers", joinColumns = @JoinColumn(name = "game_id"))
    @MapKeyColumn(name = "username")
    @Column(name = "answer")
    private Map<String, String> currentAnswers = new HashMap<>();

    @Column(name = "game_state")
    private String gameState; // "WAITING_FOR_PLAYER", "IN_PROGRESS", "FINISHED"

    private int currentQuestionIndex;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "question_ids")
    private String questionIds;

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public List<User> getPlayers() { return players; }
    public void setPlayers(List<User> players) { this.players = players; }
    public Map<String, Integer> getScores() { return scores; }
    public void setScores(Map<String, Integer> scores) { this.scores = scores; }
    public Map<String, String> getCurrentAnswers() { return currentAnswers; }
    public void setCurrentAnswers(Map<String, String> currentAnswers) { this.currentAnswers = currentAnswers; }
    public String getGameState() { return gameState; }
    public void setGameState(String gameState) { this.gameState = gameState; }
    public int getCurrentQuestionIndex() { return currentQuestionIndex; }
    public void setCurrentQuestionIndex(int currentQuestionIndex) { this.currentQuestionIndex = currentQuestionIndex; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getQuestionIds() { return questionIds; }
    public void setQuestionIds(String questionIds) { this.questionIds = questionIds; }
}