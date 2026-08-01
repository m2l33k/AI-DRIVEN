package io.javatab.microservices.auth.web.dto;

import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
		@NotBlank String username
) {
}
