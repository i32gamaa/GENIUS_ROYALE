package com.geniusroyale.api.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import java.security.Principal;

@Component
public class WebSocketEventListener {

    @Autowired
    private ActiveUserManager activeUserManager;

    // Se ejecuta automáticamente cuando un usuario cierra la pestaña, pierde el internet o sale del juego
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = headerAccessor.getUser();
        
        if (user != null) {
            String email = user.getName(); // Nuestro Principal guarda el email
            activeUserManager.removeUser(email);
            System.out.println("🔴 WebSocket Cortado: Usuario liberado (" + email + ")");
        }
    }
}