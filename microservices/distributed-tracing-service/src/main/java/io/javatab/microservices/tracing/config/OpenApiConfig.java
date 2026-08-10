package io.javatab.microservices.tracing.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
		info = @Info(title = "Distributed Tracing Service API", version = "1.0",
				description = "Distributed tracing facade (Jaeger) for the 5G Core (placeholder)"),
		servers = @Server(url = "/", description = "Same origin (gateway or direct)"))
public class OpenApiConfig {
}
