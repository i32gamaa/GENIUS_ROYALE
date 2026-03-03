package com.geniusroyale.api.dto;

// Esta clase DEBE tener los nombres de variables
// idénticos a los del JSON de Google Apps Script.
public class QuestionFormDTO {
    private String questionText;
    private String difficultyLevel; // Recibimos "Fácil" como texto
    private String categoryName;    // Recibimos "Ciencia" como texto
    private String correctAnswer;
    private String wrongAnswer1;
    private String wrongAnswer2;
    private String wrongAnswer3;

    // Getters y Setters (Alt+Insert > Getter and Setter > seleccionar todos)
    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }
    public String getDifficultyLevel() { return difficultyLevel; }
    public void setDifficultyLevel(String difficultyLevel) { this.difficultyLevel = difficultyLevel; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public String getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }
    public String getWrongAnswer1() { return wrongAnswer1; }
    public void setWrongAnswer1(String wrongAnswer1) { this.wrongAnswer1 = wrongAnswer1; }
    public String getWrongAnswer2() { return wrongAnswer2; }
    public void setWrongAnswer2(String wrongAnswer2) { this.wrongAnswer2 = wrongAnswer2; }
    public String getWrongAnswer3() { return wrongAnswer3; }
    public void setWrongAnswer3(String wrongAnswer3) { this.wrongAnswer3 = wrongAnswer3; }
}