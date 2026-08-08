package io.javatab.microservices.auth.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Result of {@code POST /api/auth/login}. The {@code status} tells the frontend which flow to
 * enter; only {@code SUCCESS} carries tokens. Null fields are omitted from the JSON.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginResponse(
		String status,
		String message,
		String accessToken,
		String refreshToken,
		Long expiresIn,
		String firstLoginToken
) {

	public static LoginResponse success(String accessToken, String refreshToken, Long expiresIn) {
		return new LoginResponse("SUCCESS", null, accessToken, refreshToken, expiresIn, null);
	}

	public static LoginResponse emailVerificationRequired() {
		return new LoginResponse("EMAIL_VERIFICATION_REQUIRED",
				"Please verify your email address before logging in.", null, null, null, null);
	}

	public static LoginResponse passwordChangeRequired(String firstLoginToken) {
		return new LoginResponse("PASSWORD_CHANGE_REQUIRED",
				"You must change your password before accessing the application.",
				null, null, null, firstLoginToken);
	}
}
