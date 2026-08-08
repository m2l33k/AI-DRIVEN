package io.javatab.microservices.auth.otp;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Short-lived, single-use tokens proving a user just passed the password check during a
 * first login (Keycloak reported {@code PASSWORD_CHANGE_REQUIRED}). Presented to
 * {@code /api/auth/first-login/change-password} in exchange for setting a new password.
 *
 * <p>In-memory only — swap for Redis if this must survive restarts or scale horizontally.</p>
 */
@Service
public class FirstLoginTokenService {

	private static final Duration TTL = Duration.ofMinutes(10);

	private final SecureRandom random = new SecureRandom();
	private final Map<String, Entry> store = new ConcurrentHashMap<>();

	private record Entry(String username, Instant expiresAt) {
	}

	/** Issue a fresh opaque token bound to {@code username}. */
	public String issue(String username) {
		byte[] bytes = new byte[32];
		random.nextBytes(bytes);
		String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
		store.put(token, new Entry(username, Instant.now().plus(TTL)));
		return token;
	}

	/** Return the username the token was issued for, consuming it. Throws if invalid/expired. */
	public String consume(String token) {
		Entry entry = store.remove(token);
		if (entry == null || Instant.now().isAfter(entry.expiresAt())) {
			throw new IllegalArgumentException("First-login token is invalid or has expired. Please log in again.");
		}
		return entry.username();
	}
}
