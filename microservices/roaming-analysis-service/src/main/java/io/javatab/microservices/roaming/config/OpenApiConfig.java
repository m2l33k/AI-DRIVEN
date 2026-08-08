package io.javatab.microservices.roaming.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the JWT bearer scheme (Swagger "Authorize" button) and a relative server URL
 * ("/"), so "Try it out" requests target the same origin the docs are served from — the
 * gateway when viewed through the aggregated UI — avoiding cross-origin/CORS failures.
 */
@Configuration
@OpenAPIDefinition(
		info = @Info(title = "Roaming Analysis Service API", version = "1.0",
				description = "Roaming events, risk scoring and partner-PLMN analytics for the 5G Core"),
		servers = @Server(url = "/", description = "Same origin (gateway or direct)"))
@SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig {
}
