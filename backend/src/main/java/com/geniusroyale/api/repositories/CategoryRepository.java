package com.geniusroyale.api.repositories;

import com.geniusroyale.api.models.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// JpaRepository<TipoDeModelo, TipoDeID>
public interface CategoryRepository extends JpaRepository<Category, Integer> {

    // Spring Boot entenderá esto y creará el SQL:
    // "SELECT * FROM categories WHERE name = ?"
    Optional<Category> findByName(String name);
}