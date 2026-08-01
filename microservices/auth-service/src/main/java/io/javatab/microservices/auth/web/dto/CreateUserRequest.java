package io.javatab.microservices.auth.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateUserRequest(
		@NotBlank String username,
		@Email @NotBlank String email,
		String firstName,
		String lastName,
		@NotBlank String password,
		@NotBlank String role
) {
}
