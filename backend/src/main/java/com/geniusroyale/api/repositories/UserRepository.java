package com.geniusroyale.api.repositories;

import com.geniusroyale.api.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// ¡CAMBIO AQUÍ! El ID (la clave primaria) es ahora un String, no un Integer
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);
}