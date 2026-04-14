package com.geniusroyale.api.controllers; // (O el paquete exacto que tengas tú)


import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;


@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*") // Aquí podréis poner luego la URL de Vercel por seguridad
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
    }
}