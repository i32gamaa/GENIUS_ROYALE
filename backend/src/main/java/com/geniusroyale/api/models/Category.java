package com.geniusroyale.api.models;

import jakarta.persistence.*; // Importante que sea jakarta.persistence
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "categories") // El nombre exacto de tu tabla en PostgreSQL
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Autoincremental
    private Integer id;

    @Column(nullable = false, unique = true) // No puede ser nulo y es único
    private String name;

    private String description;

    // Relación: Una categoría puede tener muchas preguntas
    @OneToMany(mappedBy = "category")
    @JsonIgnore
    private List<Question> questions;

    // Constructor vacío (requerido por JPA)
    public Category() {}

    // Constructor para crear una nueva categoría fácilmente
    public Category(String name) {
        this.name = name;
    }

    // --- Getters y Setters (necesarios) ---
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}