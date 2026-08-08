package io.javatab.microservices.auth.otp;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Short-lived, single-use reset tokens issued once an OTP has been verified.
 *
 * <p>A token maps to the email it was issued for. It is consumed (removed) on first use and
 * expires after {@link #TTL}. In-memory only — swap for Redis if this needs to survive restarts
 * or run across multiple instances.</p>
 */
@Service
public class ResetTokenService {

	private static final Duration TTL = Duration.ofMinutes(10);

	private final SecureRandom random = new SecureRandom();
	private final Map<String, Entry> store = new ConcurrentHashMap<>();

	private record Entry(String email, Instant expiresAt) {
	}

	/** Issue a fresh opaque token bound to {@code email}. */
	public String issue(String email) {
		byte[] bytes = new byte[32];
		random.nextBytes(bytes);
		String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
		store.put(token, new Entry(email.trim().toLowerCase(), Instant.now().plus(TTL)));
		return token;
	}

	/** Return the email the token was issued for, consuming it. Throws if invalid/expired. */
	public String consume(String token) {
		Entry entry = store.remove(token);
		if (entry == null || Instant.now().isAfter(entry.expiresAt())) {
			throw new IllegalArgumentException("Reset token is invalid or has expired. Please start over.");
		}
		return entry.email();
	}
}
