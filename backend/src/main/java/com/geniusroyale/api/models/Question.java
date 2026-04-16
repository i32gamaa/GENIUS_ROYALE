package com.geniusroyale.api.models;

import jakarta.persistence.*;

@Entity
@Table(name = "pregunta") // Ajustado de 'questions' a 'pregunta'
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pregunta") // Nombre exacto en PGAdmin
    private Integer id;

    @Column(name = "texto_pregunta", nullable = false)
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(name = "dificultad", nullable = false) // Antes era 'difficulty_level'
    private Difficulty difficultyLevel;

    @Column(name = "respuesta_correcta", nullable = false)
    private String correctAnswer;

    @Column(name = "respuesta2", nullable = false) // Mapeado a tu columna real
    private String wrongAnswer1;

    @Column(name = "respuesta3", nullable = false) // Mapeado a tu columna real
    private String wrongAnswer2;

    @Column(name = "respuesta4", nullable = false) // Mapeado a tu columna real
    private String wrongAnswer3;

    @ManyToOne
    @JoinColumn(name = "id_categoria", nullable = false) // Antes era 'category_id'
    private Category category;

    // Getters y Setters
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