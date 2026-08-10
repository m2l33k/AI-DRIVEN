package io.javatab.microservices.anomaly.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
		info = @Info(title = "Anomaly Detection Service API", version = "1.0",
				description = "Detects anomalies in 5G Core signalling and roaming traffic (placeholder)"),
		servers = @Server(url = "/", description = "Same origin (gateway or direct)"))
public class OpenApiConfig {
}
