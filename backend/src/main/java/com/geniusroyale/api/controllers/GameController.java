package com.geniusroyale.api.controllers;

import com.geniusroyale.api.dto.QuestionDTO;
import com.geniusroyale.api.models.Category;
import com.geniusroyale.api.models.Game;
import com.geniusroyale.api.models.Question;
import com.geniusroyale.api.repositories.CategoryRepository;
import com.geniusroyale.api.repositories.GameRepository;
import com.geniusroyale.api.repositories.QuestionRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/game")
public class GameController {

    @Autowired private QuestionRepository questionRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private GameRepository gameRepository;

    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getCategories() {
        List<Category> categories = categoryRepository.findAll();
        return ResponseEntity.ok(categories);
    }

    // --- ¡ENDPOINT ACTUALIZADO! ---
    // Ahora es /api/game/{gameId}/questions
    @GetMapping("/{gameId}/questions")
    public ResponseEntity<List<QuestionDTO>> getGameQuestions(@PathVariable String gameId) {

        System.out.println("Petición recibida para /api/game/" + gameId + "/questions");

        // 1. Buscar la partida en la BBDD
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Partida no encontrada"));

        // 2. Coger el string de IDs (ej: "5,12,3,45")
        String idListString = game.getQuestionIds();

        // 3. Convertir el string a una Lista de Integers
        List<Integer> questionIdInts = Arrays.stream(idListString.split(","))
                .map(Integer::parseInt)
                .collect(Collectors.toList());

        // 4. Buscar todas esas preguntas en la BBDD
        List<Question> questions = questionRepository.findAllById(questionIdInts);

        // 5. RE-ORDENAR las preguntas para que coincidan con el orden guardado
        Map<Integer, Question> questionMap = questions.stream()
                .collect(Collectors.toMap(Question::getId, q -> q));

        List<QuestionDTO> sortedQuestions = questionIdInts.stream()
                .map(questionMap::get)
                .map(QuestionDTO::new)
                .collect(Collectors.toList());

        System.out.println("Enviando " + sortedQuestions.size() + " preguntas ORDENADAS.");

        return ResponseEntity.ok(sortedQuestions);
    }
}