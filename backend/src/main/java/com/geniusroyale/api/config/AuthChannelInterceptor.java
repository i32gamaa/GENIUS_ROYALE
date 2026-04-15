package com.geniusroyale.api.config;

import com.geniusroyale.api.models.User;
import com.geniusroyale.api.repositories.UserRepository;
import com.geniusroyale.api.services.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.ArrayList;

@Component
public class AuthChannelInterceptor implements ChannelInterceptor {

    @Autowired
    private JwtService jwtService;
    @Autowired
    private UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    String email = jwtService.extractEmail(token);
                    if (email != null) {
                        // Buscamos al usuario para validar que existe
                        User user = userRepository.findByEmail(email).orElse(null);
                        
                        if (user != null && jwtService.isTokenValid(token, user)) {
                            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                    email, null, new ArrayList<>()
                            );
                            accessor.setUser(authToken);
                            System.out.println("✅ WebSocket: " + email + " conectado con éxito.");
                        }
                    }
                } catch (Exception e) {
                    System.err.println("❌ Error Auth WebSocket: " + e.getMessage());
                    // No bloqueamos el mensaje para evitar que el cliente pierda la conexión abruptamente
                }
            }
        }
        return message;
    }
}