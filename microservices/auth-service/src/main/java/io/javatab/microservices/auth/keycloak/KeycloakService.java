package io.javatab.microservices.auth.keycloak;

import io.javatab.microservices.auth.config.KeycloakProperties;
import io.javatab.microservices.auth.web.dto.CreateUserRequest;
import io.javatab.microservices.auth.web.dto.UserSummary;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;

/**
 * Thin wrapper over Keycloak's token endpoint (end-user login) and Admin REST API
 * (user management). Admin operations use a master-realm admin-cli token.
 */
@Service
public class KeycloakService {

	private final KeycloakProperties props;
	private final RestClient rest = RestClient.create();

	public KeycloakService(KeycloakProperties props) {
		this.props = props;
	}

	/** Authenticate an end user (password grant via platform-client). Returns the token response. */
	public Map<String, Object> login(String username, String password) {
		return token(props.realm(), form -> {
			form.add("grant_type", "password");
			form.add("client_id", props.clientId());
			form.add("client_secret", props.clientSecret());
			form.add("username", username);
			form.add("password", password);
			form.add("scope", "openid roles");
		});
	}

	/**
	 * Create a user, assign a realm role, and set a generated temporary password. The account is
	 * left with two required actions — {@code VERIFY_EMAIL} then {@code UPDATE_PASSWORD} — and
	 * Keycloak is asked to send its verification email. Returns the temporary password so the
	 * caller can email it. Admin-only (enforced at controller/gateway).
	 */
	public String createUser(CreateUserRequest r) {
		String admin = adminToken();
		// Validate the role first so we never leave a half-created user if it is invalid.
		Map<String, Object> roleRep = findRealmRole(r.role(), admin);

		rest.post().uri(adminBase() + "/users")
				.header("Authorization", "Bearer " + admin)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of(
						"username", r.username(),
						"email", r.email(),
						"firstName", r.firstName() == null ? "" : r.firstName(),
						"lastName", r.lastName() == null ? "" : r.lastName(),
						"enabled", true,
						"emailVerified", false))
				.retrieve().toBodilessEntity();

		String id = userId(r.username(), admin);
		String temp = generateTempPassword();
		setPassword(id, temp, true, admin);
		setRequiredActions(id, List.of("VERIFY_EMAIL", "UPDATE_PASSWORD"), admin);
		assignRealmRole(id, roleRep, admin);
		return temp;
	}

	/**
	 * Mark the account's email verified and clear the {@code VERIFY_EMAIL} required action.
	 * Called by our own verification endpoint, so Keycloak's UI is never involved.
	 */
	public void markEmailVerified(String username) {
		String admin = adminToken();
		String id = userId(username, admin);

		Map<String, Object> rep = getUserRep(id, admin);
		@SuppressWarnings("unchecked")
		List<String> current = (List<String>) rep.getOrDefault("requiredActions", List.of());
		List<String> remaining = new ArrayList<>(current);
		remaining.remove("VERIFY_EMAIL");

		rest.put().uri(adminBase() + "/users/" + id)
				.header("Authorization", "Bearer " + admin)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("emailVerified", true, "requiredActions", remaining))
				.retrieve().toBodilessEntity();
	}

	/** Current account state used by the login flow to decide EMAIL_VERIFICATION vs PASSWORD_CHANGE. */
	public UserState getUserState(String username) {
		String admin = adminToken();
		Map<String, Object> rep = getUserRep(userId(username, admin), admin);
		boolean emailVerified = Boolean.TRUE.equals(rep.get("emailVerified"));
		@SuppressWarnings("unchecked")
		List<String> actions = (List<String>) rep.getOrDefault("requiredActions", List.of());
		return new UserState(emailVerified, List.copyOf(actions));
	}

	/**
	 * Complete the first-login password change: set a permanent password and clear the
	 * {@code UPDATE_PASSWORD} required action, leaving any others (e.g. VERIFY_EMAIL) untouched.
	 */
	public void completeFirstLoginPasswordChange(String username, String newPassword) {
		String admin = adminToken();
		String id = userId(username, admin);
		setPassword(id, newPassword, false, admin);

		Map<String, Object> rep = getUserRep(id, admin);
		@SuppressWarnings("unchecked")
		List<String> current = (List<String>) rep.getOrDefault("requiredActions", List.of());
		List<String> remaining = new ArrayList<>(current);
		remaining.remove("UPDATE_PASSWORD");
		setRequiredActions(id, remaining, admin);
	}

	/** List users (brief representation). Requires users:read. */
	public List<UserSummary> listUsers() {
		String admin = adminToken();
		List<Map<String, Object>> raw = rest.get()
				.uri(adminBase() + "/users?briefRepresentation=true&max=200")
				.header("Authorization", "Bearer " + admin)
				.retrieve()
				.body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});
		if (raw == null) {
			return List.of();
		}
		return raw.stream().map(m -> new UserSummary(
				(String) m.get("id"),
				(String) m.get("username"),
				(String) m.get("email"),
				(String) m.get("firstName"),
				(String) m.get("lastName"),
				Boolean.TRUE.equals(m.get("enabled")))).toList();
	}

	/** Delete a user by username. Requires users:write. */
	public void deleteUser(String username) {
		String admin = adminToken();
		String id = userId(username, admin);
		rest.delete().uri(adminBase() + "/users/" + id)
				.header("Authorization", "Bearer " + admin)
				.retrieve().toBodilessEntity();
	}

	/** Set a temporary password + force change at next login. Returns the temp password. */
	public String resetForgottenPassword(String username) {
		String admin = adminToken();
		String id = userId(username, admin);
		String temp = generateTempPassword();
		setPassword(id, temp, true, admin);
		setRequiredActions(id, List.of("UPDATE_PASSWORD"), admin);
		return temp;
	}

	/** Generate a random temporary password that satisfies typical complexity policies. */
	private String generateTempPassword() {
		return "Temp-" + UUID.randomUUID().toString().substring(0, 8) + "!";
	}

	/** Find a user's id by exact email match, if one exists. Used by the OTP reset flow. */
	public Optional<String> findUserIdByEmail(String email) {
		return userIdByEmail(email, adminToken());
	}

	/** Set a new permanent password for the user with the given email (OTP flow, post-verification). */
	public void resetPasswordByEmail(String email, String newPassword) {
		String admin = adminToken();
		String id = userIdByEmail(email, admin)
				.orElseThrow(() -> new IllegalArgumentException("User not found for email: " + email));
		setPassword(id, newPassword, false, admin);
	}

	/** Change the caller's own password after verifying the current one. */
	public void updatePassword(String username, String currentPassword, String newPassword) {
		try {
			login(username, currentPassword);
		} catch (RestClientResponseException e) {
			throw new IllegalArgumentException("Current password is incorrect");
		}
		String admin = adminToken();
		String id = userId(username, admin);
		setPassword(id, newPassword, false, admin);
	}

	// ---- internals ----------------------------------------------------------

	private String adminToken() {
		Map<String, Object> t = token(props.adminRealm(), form -> {
			form.add("grant_type", "password");
			form.add("client_id", props.adminClientId());
			form.add("username", props.adminUsername());
			form.add("password", props.adminPassword());
		});
		return (String) t.get("access_token");
	}

	private Map<String, Object> token(String realm, Consumer<MultiValueMap<String, String>> fill) {
		MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
		fill.accept(form);
		return rest.post()
				.uri(props.baseUrl() + "/realms/" + realm + "/protocol/openid-connect/token")
				.contentType(MediaType.APPLICATION_FORM_URLENCODED)
				.body(form)
				.retrieve()
				.body(new ParameterizedTypeReference<Map<String, Object>>() {});
	}

	private String adminBase() {
		return props.baseUrl() + "/admin/realms/" + props.realm();
	}

	private String userId(String username, String admin) {
		List<Map<String, Object>> users = rest.get()
				.uri(adminBase() + "/users?username={u}&exact=true", username)
				.header("Authorization", "Bearer " + admin)
				.retrieve()
				.body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});
		if (users == null || users.isEmpty()) {
			throw new IllegalArgumentException("User not found: " + username);
		}
		return (String) users.get(0).get("id");
	}

	private Optional<String> userIdByEmail(String email, String admin) {
		List<Map<String, Object>> users = rest.get()
				.uri(adminBase() + "/users?email={e}&exact=true", email)
				.header("Authorization", "Bearer " + admin)
				.retrieve()
				.body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});
		if (users == null || users.isEmpty()) {
			return Optional.empty();
		}
		return Optional.ofNullable((String) users.get(0).get("id"));
	}

	private Map<String, Object> getUserRep(String id, String admin) {
		return rest.get().uri(adminBase() + "/users/" + id)
				.header("Authorization", "Bearer " + admin)
				.retrieve()
				.body(new ParameterizedTypeReference<Map<String, Object>>() {});
	}

	private void setPassword(String id, String value, boolean temporary, String admin) {
		rest.put().uri(adminBase() + "/users/" + id + "/reset-password")
				.header("Authorization", "Bearer " + admin)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("type", "password", "value", value, "temporary", temporary))
				.retrieve().toBodilessEntity();
	}

	private void setRequiredActions(String id, List<String> actions, String admin) {
		rest.put().uri(adminBase() + "/users/" + id)
				.header("Authorization", "Bearer " + admin)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("requiredActions", actions))
				.retrieve().toBodilessEntity();
	}

	/** Look up a realm role, returning a clear 400 (not a raw 404) when it does not exist. */
	private Map<String, Object> findRealmRole(String role, String admin) {
		try {
			return rest.get().uri(adminBase() + "/roles/{r}", role)
					.header("Authorization", "Bearer " + admin)
					.retrieve()
					.body(new ParameterizedTypeReference<Map<String, Object>>() {});
		} catch (RestClientResponseException e) {
			if (e.getStatusCode().value() == 404) {
				throw new IllegalArgumentException("Unknown role '" + role
						+ "'. Valid roles: PLATFORM_ADMIN, NETWORK_OPERATOR, SECURITY_ANALYST, AUDITOR");
			}
			throw e;
		}
	}

	private void assignRealmRole(String id, Map<String, Object> roleRep, String admin) {
		rest.post().uri(adminBase() + "/users/" + id + "/role-mappings/realm")
				.header("Authorization", "Bearer " + admin)
				.contentType(MediaType.APPLICATION_JSON)
				.body(List.of(roleRep))
				.retrieve().toBodilessEntity();
	}
}
