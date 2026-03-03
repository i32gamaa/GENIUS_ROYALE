package com.geniusroyale.api.repositories;

import com.geniusroyale.api.models.Game;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRepository extends JpaRepository<Game, String> {
    // Aquí añadiremos métodos para buscar partidas públicas, etc.
}