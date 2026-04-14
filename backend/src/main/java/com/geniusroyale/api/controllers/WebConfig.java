@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*") // Aquí podréis poner luego la URL de Vercel por seguridad
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
    }
}
