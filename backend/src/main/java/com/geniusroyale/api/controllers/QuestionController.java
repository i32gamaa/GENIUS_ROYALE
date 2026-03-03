package com.geniusroyale.api.controllers;

import com.geniusroyale.api.dto.QuestionFormDTO;
import com.geniusroyale.api.models.Category;
import com.geniusroyale.api.models.Difficulty;
import com.geniusroyale.api.models.Question;
import com.geniusroyale.api.repositories.CategoryRepository;
import com.geniusroyale.api.repositories.QuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController // Le dice a Spring que esta clase es un Controlador API
@RequestMapping("/api/questions") // Todas las rutas aquí empiezan con /api/questions
public class QuestionController {

    // Inyección de dependencias: Spring nos da las herramientas
    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    /**
     * Endpoint para añadir una pregunta desde Google Forms.
     * Recibe un POST en /api/questions/add
     */
    @PostMapping("/add")
    public ResponseEntity<?> addQuestionFromForm(@RequestBody QuestionFormDTO dto) {

        System.out.println("Recibida pregunta: " + dto.getQuestionText());

        try {
            //Buscar la categoría por nombre, o crearla si no existe.
            Category category = categoryRepository.findByName(dto.getCategoryName())
                    .orElseGet(() -> {
                        System.out.println("Creando nueva categoría: " + dto.getCategoryName());
                        return categoryRepository.save(new Category(dto.getCategoryName()));
                    });

            // Convertir el texto de dificultad al tipo Enum
            Difficulty difficulty = Difficulty.valueOf(dto.getDifficultyLevel());

            // Crear la nueva entidad Pregunta
            Question newQuestion = new Question();
            newQuestion.setQuestionText(dto.getQuestionText());
            newQuestion.setDifficultyLevel(difficulty);
            newQuestion.setCorrectAnswer(dto.getCorrectAnswer());
            newQuestion.setWrongAnswer1(dto.getWrongAnswer1());
            newQuestion.setWrongAnswer2(dto.getWrongAnswer2());
            newQuestion.setWrongAnswer3(dto.getWrongAnswer3());
            newQuestion.setCategory(category); // Asignar la categoría (ya sea encontrada o creada)

            // Guardar la pregunta en la base de datos
            questionRepository.save(newQuestion);

            System.out.println("Pregunta guardada con ID: " + newQuestion.getId());

            // Devolver una respuesta OK (HTTP 200)
            return ResponseEntity.ok().body("{\"success\": true, \"message\": \"Pregunta añadida\"}");

        } catch (Exception e) {
            e.printStackTrace();
            // Devolver un error (HTTP 500) si algo falla
            return ResponseEntity.internalServerError().body("{\"success\": false, \"message\": \"" + e.getMessage() + "\"}");
        }
    }
}