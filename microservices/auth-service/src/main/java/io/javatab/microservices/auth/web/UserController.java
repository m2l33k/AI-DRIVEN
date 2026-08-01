package io.javatab.microservices.auth.web;

import io.javatab.microservices.auth.keycloak.KeycloakService;
import io.javatab.microservices.auth.web.dto.CreateUserRequest;
import io.javatab.microservices.auth.web.dto.UserSummary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

	private final KeycloakService keycloak;

	public UserController(KeycloakService keycloak) {
		this.keycloak = keycloak;
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
			description = "Creates a Keycloak user and assigns a realm role. Requires the users:write permission (PLATFORM_ADMIN).",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_users:write')")
	@PostMapping
	public ResponseEntity<Map<String, String>> createUser(@Valid @RequestBody CreateUserRequest request) {
		keycloak.createUser(request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(Map.of("message", "User created", "username", request.username()));
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
