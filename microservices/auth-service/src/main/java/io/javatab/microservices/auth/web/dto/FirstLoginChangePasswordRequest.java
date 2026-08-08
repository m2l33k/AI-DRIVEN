package io.javatab.microservices.auth.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Completes the first-login password change using the token returned by /login. */
public record FirstLoginChangePasswordRequest(
		@NotBlank String firstLoginToken,
		@NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String newPassword
) {
}
