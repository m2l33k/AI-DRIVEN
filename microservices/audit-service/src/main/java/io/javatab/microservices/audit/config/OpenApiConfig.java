package io.javatab.microservices.audit.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(title = "Audit Service API", version = "1.0",
                description = "Immutable platform audit log — records every write action across all services"),
        servers = @Server(url = "/", description = "Same origin (gateway or direct)"))
public class OpenApiConfig {
}
