package com.example.springcloud.gateway.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Adds a global HTTP bearer (JWT) security scheme so the gateway's Swagger UI shows an
 * "Authorize" button — needed to call secured endpoints like {@code /api/metrics/**}.
 */
@Configuration
public class OpenApiConfig {

	@Bean
	public OpenAPI gatewayOpenApi() {
		final String scheme = "bearerAuth";
		return new OpenAPI()
				.info(new Info().title("5GC Platform Gateway").version("v1"))
				.addSecurityItem(new SecurityRequirement().addList(scheme))
				.components(new Components().addSecuritySchemes(scheme,
						new SecurityScheme()
								.type(SecurityScheme.Type.HTTP)
								.scheme("bearer")
								.bearerFormat("JWT")));
	}
}
