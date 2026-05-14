package com.geniusroyale.api.repositories;

import com.geniusroyale.api.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);

    // 🔥 NUEVO: Actualización relámpago de última conexión 🔥
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.lastSeen = :time WHERE u.username = :username")
    void updateLastSeen(@Param("username") String username, @Param("time") Long time);
}