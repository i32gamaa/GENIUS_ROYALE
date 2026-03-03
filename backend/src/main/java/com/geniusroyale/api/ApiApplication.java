package com.geniusroyale.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement; // <-- ASEGÚRATE DE TENER ESTO

@SpringBootApplication
@EnableTransactionManagement // <-- Y ESTO
public class ApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiApplication.class, args);
    }
}