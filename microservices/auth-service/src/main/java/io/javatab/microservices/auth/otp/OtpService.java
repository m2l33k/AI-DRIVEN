package io.javatab.microservices.auth.otp;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * In-memory store of one-time codes, keyed by (lower-cased) email.
 *
 * <p>Codes are 6 digits, expire after {@link #TTL}, and allow a limited number of verification
 * attempts before being discarded. Placeholder for a real store (Redis/DB) if this needs to
 * survive restarts or scale horizontally.</p>
 */
@Service
public class OtpService {

	private static final Duration TTL = Duration.ofMinutes(10);
	private static final int MAX_ATTEMPTS = 5;

	private final SecureRandom random = new SecureRandom();
	private final Map<String, Otp> store = new ConcurrentHashMap<>();

	private record Otp(String code, Instant expiresAt, AtomicInteger attempts) {
	}

	/** Generate a fresh code for the email (replacing any previous one) and return it. */
	public String generate(String email) {
		String code = String.format("%06d", random.nextInt(1_000_000));
		store.put(key(email), new Otp(code, Instant.now().plus(TTL), new AtomicInteger()));
		return code;
	}

	/** Throws {@link IllegalArgumentException} unless {@code code} is the current, unexpired OTP. */
	public void verify(String email, String code) {
		String key = key(email);
		Otp otp = store.get(key);
		if (otp == null || Instant.now().isAfter(otp.expiresAt())) {
			store.remove(key);
			throw new IllegalArgumentException("OTP is invalid or has expired. Please request a new one.");
		}
		if (otp.attempts().incrementAndGet() > MAX_ATTEMPTS) {
			store.remove(key);
			throw new IllegalArgumentException("Too many invalid attempts. Please request a new OTP.");
		}
		if (!otp.code().equals(code)) {
			throw new IllegalArgumentException("Incorrect OTP.");
		}
	}

	/** Drop the code once it has been successfully used. */
	public void invalidate(String email) {
		store.remove(key(email));
	}

	private static String key(String email) {
		return email.trim().toLowerCase();
	}
}
