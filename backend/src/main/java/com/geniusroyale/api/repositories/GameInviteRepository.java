package com.geniusroyale.api.repositories;

import com.geniusroyale.api.models.GameInvite;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameInviteRepository extends JpaRepository<GameInvite, Integer> {
    // Aquí añadiremos métodos para buscar invitaciones pendientes
}