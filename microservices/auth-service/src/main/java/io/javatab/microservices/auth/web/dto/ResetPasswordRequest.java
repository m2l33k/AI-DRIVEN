package io.javatab.microservices.auth.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Step 3 of the self-service reset: the reset token from /verify-otp + the new password. */
public record ResetPasswordRequest(
		@NotBlank String resetToken,
		@NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String newPassword
) {
}
