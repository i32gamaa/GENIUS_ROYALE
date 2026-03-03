package com.geniusroyale.api.config;

import org.springframework.beans.factory.annotation.Autowired; // <-- AÑADIDO
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration; // <-- AÑADIDO
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // --- INICIO DE CÓDIGO NUEVO ---
    @Autowired
    private AuthChannelInterceptor authChannelInterceptor; // Inyectamos nuestro interceptor

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Registramos el interceptor para que se ejecute en cada mensaje
        registration.interceptors(authChannelInterceptor);
    }
    // --- FIN DE CÓDIGO NUEVO ---

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // La app se conecta a /ws
        registry.addEndpoint("/ws").withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // App envía a /app/...
        registry.setApplicationDestinationPrefixes("/app");
        // App se suscribe a /topic/...
        registry.enableSimpleBroker("/topic");
    }
}