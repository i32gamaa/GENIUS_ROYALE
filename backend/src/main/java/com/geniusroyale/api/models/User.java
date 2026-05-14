package com.geniusroyale.api.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Usuario")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer id;

    @Column(name = "nombre", nullable = false, unique = true)
    private String username;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "fecha_registro")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "puntos_totales")
    private Integer totalScore = 0;

    @Column(name = "partidas_ganadas")
    private Integer partidasGanadas = 0;

    @Column(name = "preguntas_acertadas")
    private Integer preguntasAcertadas = 0;

    @Column(name = "foto_perfil", columnDefinition="TEXT")
    private String fotoPerfil;

    // 🔥 NUEVO: Persistencia de última conexión 🔥
    @Column(name = "ultimo_visto")
    private Long lastSeen = 0L;

    public User() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Integer getTotalScore() { return totalScore; }
    public void setTotalScore(Integer totalScore) { this.totalScore = totalScore; }

    public Integer getPartidasGanadas() { return partidasGanadas; }
    public void setPartidasGanadas(Integer partidasGanadas) { this.partidasGanadas = partidasGanadas; }
    public Integer getPreguntasAcertadas() { return preguntasAcertadas; }
    public void setPreguntasAcertadas(Integer preguntasAcertadas) { this.preguntasAcertadas = preguntasAcertadas; }
    public String getFotoPerfil() { return fotoPerfil; }
    public void setFotoPerfil(String fotoPerfil) { this.fotoPerfil = fotoPerfil; }
    
    public Long getLastSeen() { return lastSeen; }
    public void setLastSeen(Long lastSeen) { this.lastSeen = lastSeen; }
}