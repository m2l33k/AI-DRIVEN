package io.javatab.microservices.auth.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Step 2 of the self-service reset: email + the OTP that was emailed. Returns a reset token. */
public record VerifyOtpRequest(
		@NotBlank @Email String email,
		@NotBlank String otp
) {
}
