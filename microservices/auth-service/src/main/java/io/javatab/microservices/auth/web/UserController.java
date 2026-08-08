package io.javatab.microservices.auth.web;

import io.javatab.microservices.auth.keycloak.KeycloakService;
import io.javatab.microservices.auth.mail.MailService;
import io.javatab.microservices.auth.web.dto.CreateUserRequest;
import io.javatab.microservices.auth.web.dto.UserSummary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@Tag(name = "User Management", description = "Administer Keycloak users (admin only)")
public class UserController {

	private static final Logger log = LoggerFactory.getLogger(UserController.class);

	private final KeycloakService keycloak;
	private final MailService mail;

	public UserController(KeycloakService keycloak, MailService mail) {
		this.keycloak = keycloak;
		this.mail = mail;
	}

	@Operation(summary = "List users",
			description = "Lists all realm users. Requires the users:read permission (PLATFORM_ADMIN or AUDITOR).",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_users:read')")
	@GetMapping
	public List<UserSummary> listUsers() {
		return keycloak.listUsers();
	}

	@Operation(summary = "Create a user",
			description = "Creates a Keycloak user, assigns a realm role, and emails the user a generated "
					+ "temporary password to change at first login. Requires the users:write permission (PLATFORM_ADMIN).",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_users:write')")
	@PostMapping
	public ResponseEntity<Map<String, String>> createUser(@Valid @RequestBody CreateUserRequest request) {
		String tempPassword = keycloak.createUser(request);
		try {
			mail.sendTemporaryPassword(request.email(), request.username(), tempPassword);
		} catch (MailException e) {
			// The user exists; surface the temp password so the admin can relay it manually.
			log.error("Failed to email temporary password to {}", request.email(), e);
			return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
					"message", "User created, but the email could not be sent. Share the temporary password manually.",
					"username", request.username(),
					"temporaryPassword", tempPassword));
		}
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(Map.of("message", "User created; a temporary password has been emailed.",
						"username", request.username()));
	}

	@Operation(summary = "Reset a user's password (admin)",
			description = "Sets a temporary password and forces the user to change it at next login. "
					+ "Returns the temporary password. Requires the users:write permission (PLATFORM_ADMIN).",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_users:write')")
	@PostMapping("/{username}/reset-password")
	public ResponseEntity<Map<String, String>> resetUserPassword(@PathVariable String username) {
		String temp = keycloak.resetForgottenPassword(username);
		return ResponseEntity.ok(Map.of(
				"message", "Temporary password set; the user must change it at next login.",
				"temporaryPassword", temp));
	}

	@Operation(summary = "Delete a user",
			description = "Deletes a user by username. Requires the users:write permission (PLATFORM_ADMIN).",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_users:write')")
	@DeleteMapping("/{username}")
	public ResponseEntity<Void> deleteUser(@PathVariable String username) {
		keycloak.deleteUser(username);
		return ResponseEntity.noContent().build();
	}
}
