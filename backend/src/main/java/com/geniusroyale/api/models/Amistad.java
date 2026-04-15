package com.geniusroyale.api.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Amistad")
public class Amistad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_amistad")
    private Integer id;

    // Relación con el usuario que envía la solicitud
    @ManyToOne
    @JoinColumn(name = "id_usuario1", nullable = false)
    private User usuario1;

    // Relación con el usuario que recibe la solicitud
    @ManyToOne
    @JoinColumn(name = "id_usuario2", nullable = false)
    private User usuario2;

    // Puede ser "PENDIENTE" o "ACEPTADA"
    @Column(name = "estado", nullable = false)
    private String estado = "PENDIENTE";

    @Column(name = "fecha")
    private LocalDateTime fecha = LocalDateTime.now();

    public Amistad() {}

    // Getters y Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public User getUsuario1() { return usuario1; }
    public void setUsuario1(User usuario1) { this.usuario1 = usuario1; }
    public User getUsuario2() { return usuario2; }
    public void setUsuario2(User usuario2) { this.usuario2 = usuario2; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}