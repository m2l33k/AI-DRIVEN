package io.javatab.microservices.auth.otp;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Single-use tokens embedded in the verification link we email on account creation. Presented to
 * {@code GET /api/auth/verify-email} to mark the account's email verified in Keycloak.
 *
 * <p>Longer-lived than the reset/first-login tokens because it lives in an inbox. In-memory only —
 * swap for Redis to survive restarts or scale horizontally.</p>
 */
@Service
public class EmailVerificationTokenService {

	private static final Duration TTL = Duration.ofHours(24);

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
			throw new IllegalArgumentException("Verification link is invalid or has expired.");
		}
		return entry.username();
	}
}
