package io.javatab.microservices.messaging.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Resource-server security for messaging-service.
 *
 * <p>Public: docs and actuator. Everything under {@code /api/messages/**} needs a valid JWT — any
 * authenticated user may message any other (no special permission required; the sender is taken from
 * the token). Realm roles become {@code ROLE_<NAME>}; {@code platform-client} permissions become
 * {@code PERM_<permission>} (kept for consistency with the other services).</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

	private static final String PLATFORM_CLIENT_ID = "platform-client";

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
				.csrf(csrf -> csrf.disable())
				.authorizeHttpRequests(auth -> auth
						.requestMatchers("/actuator/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
						.anyRequest().authenticated())
				.oauth2ResourceServer(oauth2 -> oauth2
						.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
		return http.build();
	}

	private JwtAuthenticationConverter jwtAuthenticationConverter() {
		JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(jwt -> {
			Collection<GrantedAuthority> authorities = new ArrayList<>();

			Object realmAccess = jwt.getClaim("realm_access");
			if (realmAccess instanceof Map<?, ?> rm && rm.get("roles") instanceof List<?> roles) {
				roles.forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r.toString().toUpperCase())));
			}

			Object resourceAccess = jwt.getClaim("resource_access");
			if (resourceAccess instanceof Map<?, ?> res
					&& res.get(PLATFORM_CLIENT_ID) instanceof Map<?, ?> client
					&& client.get("roles") instanceof List<?> perms) {
				perms.forEach(p -> authorities.add(new SimpleGrantedAuthority("PERM_" + p.toString())));
			}
			return authorities;
		});
		return converter;
	}
}
