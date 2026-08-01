package io.javatab.microservices.auth.web;

import io.javatab.microservices.auth.keycloak.KeycloakService;
import io.javatab.microservices.auth.web.dto.ForgotPasswordRequest;
import io.javatab.microservices.auth.web.dto.LoginRequest;
import io.javatab.microservices.auth.web.dto.UpdatePasswordRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Login and password flows backed by Keycloak")
public class AuthController {

	private final KeycloakService keycloak;

	public AuthController(KeycloakService keycloak) {
		this.keycloak = keycloak;
	}

	@Operation(summary = "Log in", description = "Exchange email/password for Keycloak tokens.")
	@PostMapping("/login")
	public Map<String, Object> login(@Valid @RequestBody LoginRequest request) {
		return keycloak.login(request.email(), request.password());
	}

	@Operation(summary = "Forgot password",
			description = "Sets a temporary password and forces a change at next login. Returns the temporary password (dev only).")
	@PostMapping("/forgot-password")
	public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
		String temp = keycloak.resetForgottenPassword(request.username());
		return ResponseEntity.accepted().body(Map.of(
				"message", "Temporary password set; the user must change it at next login.",
				"temporaryPassword", temp));
	}

	@Operation(summary = "Update own password", security = @SecurityRequirement(name = "bearerAuth"))
	@PutMapping("/password")
	public ResponseEntity<Void> updatePassword(@AuthenticationPrincipal Jwt jwt,
											   @Valid @RequestBody UpdatePasswordRequest request) {
		String username = jwt.getClaimAsString("preferred_username");
		keycloak.updatePassword(username, request.currentPassword(), request.newPassword());
		return ResponseEntity.noContent().build();
	}
}
