package com.geniusroyale.api.models;

import jakarta.persistence.*;
import java.time.Instant;

// --- Imports Añadidos ---
import com.geniusroyale.api.models.Category;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
// --- Fin Imports ---

@Entity
@Table(name = "game_invites")
public class GameInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "sender_username")
    private User sender;

    @ManyToOne
    @JoinColumn(name = "receiver_username")
    private User receiver;

    private String status; // "PENDING", "ACCEPTED", "DECLINED"

    @Column(columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private Instant createdAt;

    // --- CAMPO NUEVO ---
    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;
    // --- FIN CAMPO NUEVO ---

    public GameInvite() {
        this.createdAt = Instant.now();
        this.status = "PENDING";
    }

    // Getters y Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public User getReceiver() { return receiver; }
    public void setReceiver(User receiver) { this.receiver = receiver; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    // --- MÉTODOS NUEVOS ---
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    // --- FIN MÉTODOS NUEVOS ---
}