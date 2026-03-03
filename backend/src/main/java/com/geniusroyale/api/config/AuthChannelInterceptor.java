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
import org.springframework.security.core.context.SecurityContextHolder;
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

        // 1. Interceptar solo el mensaje de CONEXIÓN
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            // 2. Coger el token de la cabecera "Authorization"
            // (La app ya lo envía gracias a nuestro ApiClient/WebSocketManager)
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);

                try {
                    // 3. Validar el token
                    String email = jwtService.extractEmail(token);

                    if (email != null) {
                        User user = userRepository.findByEmail(email).orElseThrow();

                        if (jwtService.isTokenValid(token, user)) {
                            // 4. ¡ÉXITO! Autenticar al usuario en el contexto de seguridad
                            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                    email, // Esto será lo que devuelva principal.getName()
                                    null,
                                    new ArrayList<>() // Roles (vacío por ahora)
                            );
                            accessor.setUser(authToken);
                            System.out.println("WebSocket Interceptor: Usuario " + email + " autenticado.");
                        }
                    }
                } catch (Exception e) {
                    // Si el token es inválido o está caducado
                    System.err.println("WebSocket Interceptor: Error de autenticación - " + e.getMessage());
                }
            }
        }
        return message;
    }
}