package io.javatab.microservices.ratelimit.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
		info = @Info(title = "Rate Limiting / Protection Service API", version = "1.0",
				description = "Rate limiting and abuse protection for the 5G Core (placeholder)"),
		servers = @Server(url = "/", description = "Same origin (gateway or direct)"))
public class OpenApiConfig {
}
