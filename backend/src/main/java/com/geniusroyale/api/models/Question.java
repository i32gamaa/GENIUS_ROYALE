package com.geniusroyale.api.models;

import jakarta.persistence.*;

@Entity
@Table(name = "questions") // El nombre exacto de tu tabla
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String questionText;

    @Enumerated(EnumType.STRING) // Le dice a JPA que guarde el texto ('Fácil')
    @Column(name = "difficulty_level", nullable = false)
    private Difficulty difficultyLevel;

    @Column(nullable = false)
    private String correctAnswer;
    @Column(nullable = false)
    private String wrongAnswer1;
    @Column(nullable = false)
    private String wrongAnswer2;
    @Column(nullable = false)
    private String wrongAnswer3;

    // Relación: Muchas preguntas pertenecen a una categoría
    @ManyToOne
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    // --- Getters y Setters (puedes generarlos con Alt+Insert) ---
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }
    public Difficulty getDifficultyLevel() { return difficultyLevel; }
    public void setDifficultyLevel(Difficulty difficultyLevel) { this.difficultyLevel = difficultyLevel; }
    public String getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }
    public String getWrongAnswer1() { return wrongAnswer1; }
    public void setWrongAnswer1(String wrongAnswer1) { this.wrongAnswer1 = wrongAnswer1; }
    public String getWrongAnswer2() { return wrongAnswer2; }
    public void setWrongAnswer2(String wrongAnswer2) { this.wrongAnswer2 = wrongAnswer2; }
    public String getWrongAnswer3() { return wrongAnswer3; }
    public void setWrongAnswer3(String wrongAnswer3) { this.wrongAnswer3 = wrongAnswer3; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
}