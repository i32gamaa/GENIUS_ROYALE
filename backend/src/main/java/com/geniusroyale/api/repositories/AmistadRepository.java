package com.geniusroyale.api.repositories;

import com.geniusroyale.api.models.Amistad;
import com.geniusroyale.api.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AmistadRepository extends JpaRepository<Amistad, Integer> {
    // Buscar amigos de un usuario donde el estado sea ACEPTADA
    List<Amistad> findByUsuario1AndEstadoOrUsuario2AndEstado(User u1, String estado1, User u2, String estado2);
}