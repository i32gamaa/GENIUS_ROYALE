package com.geniusroyale.api.repositories;

import com.geniusroyale.api.models.Category;
import com.geniusroyale.api.models.Difficulty;
import com.geniusroyale.api.models.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Integer> {

    // Método nuevo: "Encuentra todas por Categoría Y Nivel de Dificultad"
    List<Question> findByCategoryAndDifficultyLevel(Category category, Difficulty difficultyLevel);

    // Método de 'fallback' (para Cultura General): "Encuentra todas por Nivel de Dificultad"
    List<Question> findAllByDifficultyLevel(Difficulty difficultyLevel);
}