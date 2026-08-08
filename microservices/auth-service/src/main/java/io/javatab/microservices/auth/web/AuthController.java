package io.javatab.microservices.auth.web;

import io.javatab.microservices.auth.keycloak.KeycloakService;
import io.javatab.microservices.auth.service.PasswordResetService;
import io.javatab.microservices.auth.web.dto.ForgotPasswordRequest;
import io.javatab.microservices.auth.web.dto.LoginRequest;
import io.javatab.microservices.auth.web.dto.ResetPasswordRequest;
import io.javatab.microservices.auth.web.dto.UpdatePasswordRequest;
import io.javatab.microservices.auth.web.dto.VerifyOtpRequest;
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
	private final PasswordResetService passwordReset;

	public AuthController(KeycloakService keycloak, PasswordResetService passwordReset) {
		this.keycloak = keycloak;
		this.passwordReset = passwordReset;
	}

	@Operation(summary = "Log in", description = "Exchange email/password for Keycloak tokens.")
	@PostMapping("/login")
	public Map<String, Object> login(@Valid @RequestBody LoginRequest request) {
		return keycloak.login(request.email(), request.password());
	}

	@Operation(summary = "Forgot password (request OTP)",
			description = "If a user exists for the given email, emails a one-time code. Always returns the same "
					+ "response so registered addresses cannot be enumerated.")
	@PostMapping("/forgot-password")
	public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
		passwordReset.requestReset(request.email());
		return ResponseEntity.accepted().body(Map.of(
				"message", "If an account exists for that email, a one-time code has been sent."));
	}

	@Operation(summary = "Verify OTP",
			description = "Verifies the one-time code emailed by /forgot-password and returns a short-lived, "
					+ "single-use reset token to be presented to /reset-password.")
	@PostMapping("/verify-otp")
	public ResponseEntity<Map<String, String>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
		String resetToken = passwordReset.verifyOtp(request.email(), request.otp());
		return ResponseEntity.ok(Map.of(
				"message", "OTP verified. Use the reset token to set a new password.",
				"resetToken", resetToken));
	}

	@Operation(summary = "Reset password",
			description = "Redeems the reset token from /verify-otp and sets the new password.")
	@PostMapping("/reset-password")
	public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
		passwordReset.resetPassword(request.resetToken(), request.newPassword());
		return ResponseEntity.ok(Map.of(
				"message", "Password has been reset. You can now log in with your new password."));
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
