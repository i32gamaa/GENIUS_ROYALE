package com.geniusroyale.api.models;

import jakarta.persistence.*;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "categoria") // Ajustado de 'categories' a 'categoria'
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_categoria") // Coincide con tu PK en PGAdmin
    private Integer id;

    @Column(name = "nombre", nullable = false, unique = true)
    private String name;

    @Column(name = "descripcion")
    private String description;

    @OneToMany(mappedBy = "category")
    @JsonIgnore
    private List<Question> questions;

    public Category() {}

    public Category(String name) {
        this.name = name;
    }

    // Getters y Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}