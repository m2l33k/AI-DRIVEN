package io.javatab.microservices.auth.service;

import io.javatab.microservices.auth.keycloak.KeycloakService;
import io.javatab.microservices.auth.mail.MailService;
import io.javatab.microservices.auth.otp.OtpService;
import io.javatab.microservices.auth.otp.ResetTokenService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;

/**
 * Orchestrates the self-service (OTP-by-email) password reset:
 * <ol>
 *   <li>{@link #requestReset(String)} — email an OTP if the address maps to a user;</li>
 *   <li>{@link #verifyOtp(String, String)} — check the OTP and hand back a short-lived reset token;</li>
 *   <li>{@link #resetPassword(String, String)} — redeem that token and set the new password.</li>
 * </ol>
 */
@Service
public class PasswordResetService {

	private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

	private final KeycloakService keycloak;
	private final OtpService otp;
	private final ResetTokenService resetTokens;
	private final MailService mail;

	public PasswordResetService(KeycloakService keycloak, OtpService otp,
								ResetTokenService resetTokens, MailService mail) {
		this.keycloak = keycloak;
		this.otp = otp;
		this.resetTokens = resetTokens;
		this.mail = mail;
	}

	/**
	 * Generate and email an OTP if a user exists for {@code email}. Deliberately silent about
	 * whether it did, so the endpoint cannot be used to enumerate registered addresses.
	 */
	public void requestReset(String email) {
		keycloak.findUserIdByEmail(email).ifPresentOrElse(
				id -> {
					String code = otp.generate(email);
					try {
						mail.sendOtp(email, code);
					} catch (MailException e) {
						log.error("Failed to send password-reset OTP to {}", email, e);
					}
				},
				() -> log.info("Password reset requested for unknown email {}", email));
	}

	/** Verify the OTP and, on success, issue a short-lived reset token. Throws on a bad/expired code. */
	public String verifyOtp(String email, String code) {
		otp.verify(email, code);
		otp.invalidate(email);
		return resetTokens.issue(email);
	}

	/** Redeem a reset token and set a new permanent password. Throws on an invalid/expired token. */
	public void resetPassword(String resetToken, String newPassword) {
		String email = resetTokens.consume(resetToken);
		keycloak.resetPasswordByEmail(email, newPassword);
	}
}
