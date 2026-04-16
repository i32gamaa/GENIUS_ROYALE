package com.geniusroyale.api.config;

import org.springframework.stereotype.Component;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ActiveUserManager {
    // Guarda los emails de los usuarios conectados de forma segura (Thread-safe)
    private final Set<String> activeUsers = ConcurrentHashMap.newKeySet();

    public void addUser(String email) {
        activeUsers.add(email);
    }

    public void removeUser(String email) {
        activeUsers.remove(email);
    }

    public boolean isUserActive(String email) {
        return activeUsers.contains(email);
    }
}