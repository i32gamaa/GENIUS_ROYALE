package com.geniusroyale.api.dto;

import com.geniusroyale.api.models.Question;

public class QuestionDTO {

    // Solo los datos que la app necesita para jugar
    private Integer id;
    private String questionText;
    private String difficultyLevel;
    private String correctAnswer;
    private String wrongAnswer1;
    private String wrongAnswer2;
    private String wrongAnswer3;

    // Constructor para convertir una 'Question' (de BBDD) a un 'QuestionDTO' (para la app)
    public QuestionDTO(Question question) {
        this.id = question.getId();
        this.questionText = question.getQuestionText();
        this.difficultyLevel = question.getDifficultyLevel().toString(); // Convierte el Enum a String
        this.correctAnswer = question.getCorrectAnswer();
        this.wrongAnswer1 = question.getWrongAnswer1();
        this.wrongAnswer2 = question.getWrongAnswer2();
        this.wrongAnswer3 = question.getWrongAnswer3();
    }

    // Getters y Setters (necesarios para que Spring lo convierta a JSON)
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }
    public String getDifficultyLevel() { return difficultyLevel; }
    public void setDifficultyLevel(String difficultyLevel) { this.difficultyLevel = difficultyLevel; }
    public String getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }
    public String getWrongAnswer1() { return wrongAnswer1; }
    public void setWrongAnswer1(String wrongAnswer1) { this.wrongAnswer1 = wrongAnswer1; }
    public String getWrongAnswer2() { return wrongAnswer2; }
    public void setWrongAnswer2(String wrongAnswer2) { this.wrongAnswer2 = wrongAnswer2; }
    public String getWrongAnswer3() { return wrongAnswer3; }
    public void setWrongAnswer3(String wrongAnswer3) { this.wrongAnswer3 = wrongAnswer3; }
}