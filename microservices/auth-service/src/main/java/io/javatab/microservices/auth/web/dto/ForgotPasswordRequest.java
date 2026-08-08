package io.javatab.microservices.auth.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Step 1 of the self-service reset: the user's email address. */
public record ForgotPasswordRequest(
		@NotBlank @Email String email
) {
}
