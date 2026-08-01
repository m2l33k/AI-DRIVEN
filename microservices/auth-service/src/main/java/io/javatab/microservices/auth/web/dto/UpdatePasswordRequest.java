package io.javatab.microservices.auth.web.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdatePasswordRequest(
		@NotBlank String currentPassword,
		@NotBlank String newPassword
) {
}
