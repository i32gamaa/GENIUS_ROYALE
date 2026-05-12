package com.geniusroyale.api.controllers;

import com.geniusroyale.api.dto.QuestionDTO;
import com.geniusroyale.api.models.Category;
import com.geniusroyale.api.models.Difficulty;
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
import java.util.Collections;
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

    @GetMapping("/{gameId}/questions")
    public ResponseEntity<List<QuestionDTO>> getGameQuestions(@PathVariable String gameId) {
        Game game = gameRepository.findById(gameId).orElseThrow(() -> new RuntimeException("Partida no encontrada"));
        String idListString = game.getQuestionIds();
        List<Integer> questionIdInts = Arrays.stream(idListString.split(",")).map(Integer::parseInt).collect(Collectors.toList());
        List<Question> questions = questionRepository.findAllById(questionIdInts);
        Map<Integer, Question> questionMap = questions.stream().collect(Collectors.toMap(Question::getId, q -> q));
        List<QuestionDTO> sortedQuestions = questionIdInts.stream().map(questionMap::get).map(QuestionDTO::new).collect(Collectors.toList());
        return ResponseEntity.ok(sortedQuestions);
    }

    // 🔥 NUEVO: ENDPOINT PARA EL COMODÍN DE "CAMBIO DE PREGUNTA" 🔥
    @GetMapping("/random")
    public ResponseEntity<QuestionDTO> getRandomQuestion() {
        List<Question> list = questionRepository.findAllByDifficultyLevel(Difficulty.intermedia);
        if(list.isEmpty()) return ResponseEntity.notFound().build();
        Collections.shuffle(list);
        return ResponseEntity.ok(new QuestionDTO(list.get(0)));
    }
}