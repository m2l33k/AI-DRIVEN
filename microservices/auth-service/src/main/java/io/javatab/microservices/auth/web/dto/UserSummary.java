package io.javatab.microservices.auth.web.dto;

public record UserSummary(
		String id,
		String username,
		String email,
		String firstName,
		String lastName,
		boolean enabled
) {
}
