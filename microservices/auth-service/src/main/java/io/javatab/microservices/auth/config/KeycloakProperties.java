package io.javatab.microservices.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Connection + credentials for talking to Keycloak.
 *
 * <p>{@code clientId}/{@code clientSecret} are used for the end-user login (password grant).
 * The {@code admin*} values are used to obtain an admin token (master realm, admin-cli) for
 * user-management operations against {@code realm}.</p>
 */
@ConfigurationProperties(prefix = "keycloak")
public record KeycloakProperties(
		String baseUrl,
		String realm,
		String clientId,
		String clientSecret,
		String adminRealm,
		String adminClientId,
		String adminUsername,
		String adminPassword
) {
}
