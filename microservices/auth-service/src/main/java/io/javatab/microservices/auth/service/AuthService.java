package io.javatab.microservices.auth.service;

import io.javatab.microservices.auth.keycloak.KeycloakService;
import io.javatab.microservices.auth.keycloak.UserState;
import io.javatab.microservices.auth.otp.FirstLoginTokenService;
import io.javatab.microservices.auth.web.dto.LoginResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

/**
 * Turns Keycloak's password-grant result into a state-aware {@link LoginResponse}.
 *
 * <p>Keycloak stays the source of truth: it validates the password, enforces required actions,
 * and issues tokens. When the grant fails with "Account is not fully set up" (which only happens
 * <em>after</em> the password is accepted), we inspect the account to decide whether the user must
 * verify their email or change their password first.</p>
 */
@Service
public class AuthService {

	private static final String VERIFY_EMAIL = "VERIFY_EMAIL";
	private static final String UPDATE_PASSWORD = "UPDATE_PASSWORD";

	private final KeycloakService keycloak;
	private final FirstLoginTokenService firstLoginTokens;

	public AuthService(KeycloakService keycloak, FirstLoginTokenService firstLoginTokens) {
		this.keycloak = keycloak;
		this.firstLoginTokens = firstLoginTokens;
	}

	public LoginResponse login(String username, String password) {
		try {
			Map<String, Object> tokens = keycloak.login(username, password);
			return LoginResponse.success(
					(String) tokens.get("access_token"),
					(String) tokens.get("refresh_token"),
					asLong(tokens.get("expires_in")));
		} catch (RestClientResponseException e) {
			// Only "Account is not fully set up" implies valid credentials + pending actions.
			if (!accountNotFullySetUp(e.getResponseBodyAsString())) {
				throw e; // genuine failure (bad credentials, disabled, etc.) -> surfaced as-is
			}
			UserState state = keycloak.getUserState(username);
			if (!state.emailVerified() || state.requiredActions().contains(VERIFY_EMAIL)) {
				return LoginResponse.emailVerificationRequired();
			}
			if (state.requiredActions().contains(UPDATE_PASSWORD)) {
				return LoginResponse.passwordChangeRequired(firstLoginTokens.issue(username));
			}
			throw e; // some other required action we don't model -> surface the original error
		}
	}

	/** Redeem a first-login token and set the new password, clearing UPDATE_PASSWORD in Keycloak. */
	public void completeFirstLogin(String firstLoginToken, String newPassword) {
		String username = firstLoginTokens.consume(firstLoginToken);
		keycloak.completeFirstLoginPasswordChange(username, newPassword);
	}

	private static boolean accountNotFullySetUp(String body) {
		return body != null && body.contains("not fully set up");
	}

	private static Long asLong(Object value) {
		return value instanceof Number n ? n.longValue() : null;
	}
}
