package com.licensemanagement.backend.config;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.List;
@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI licenseManagementOpenAPI() {
        Server localServer = new Server();
        localServer.setUrl("http://localhost:8080");
        localServer.setDescription("Local Development Server");
        Contact contact = new Contact();
        contact.setName("License Management Team");
        contact.setEmail("support@licensemanagement.com");
        License mitLicense = new License()
                .name("MIT License")
                .url("https://opensource.org/licenses/MIT");
        Info info = new Info()
                .title("License Management System API")
                .version("1.0.0")
                .contact(contact)
                .description("REST API for License Management System")
                .license(mitLicense);
        return new OpenAPI()
                .info(info)
                .servers(List.of(localServer))
                .addSecurityItem(new SecurityRequirement().addList("Bearer Authentication"))
                .components(new io.swagger.v3.oas.models.Components()
                        .addSecuritySchemes("Bearer Authentication", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter JWT Token here")));
    }
}