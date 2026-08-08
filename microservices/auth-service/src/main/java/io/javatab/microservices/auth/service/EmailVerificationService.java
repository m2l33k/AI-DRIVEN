package io.javatab.microservices.auth.service;

import io.javatab.microservices.auth.keycloak.KeycloakService;
import io.javatab.microservices.auth.mail.MailService;
import io.javatab.microservices.auth.otp.EmailVerificationTokenService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Our own email-verification flow (no Keycloak UI): on account creation we email a link containing
 * a single-use token; when opened, {@link #verify(String)} marks the email verified in Keycloak.
 */
@Service
public class EmailVerificationService {

	private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);

	private final KeycloakService keycloak;
	private final EmailVerificationTokenService tokens;
	private final MailService mail;
	private final String verifyEmailUrl;

	public EmailVerificationService(KeycloakService keycloak, EmailVerificationTokenService tokens,
									MailService mail, @Value("${app.verify-email-url}") String verifyEmailUrl) {
		this.keycloak = keycloak;
		this.tokens = tokens;
		this.mail = mail;
		this.verifyEmailUrl = verifyEmailUrl;
	}

	/** Generate a token and email the verification link. Mail failures are logged, not thrown. */
	public void sendVerificationEmail(String username, String email) {
		String token = tokens.issue(username);
		String link = UriComponentsBuilder.fromUriString(verifyEmailUrl)
				.queryParam("token", token).toUriString();
		try {
			mail.sendVerificationLink(email, username, link);
		} catch (MailException e) {
			log.error("Failed to send verification email to {}", email, e);
		}
	}

	/** Redeem a verification token and mark the account's email verified in Keycloak. */
	public void verify(String token) {
		String username = tokens.consume(token);
		keycloak.markEmailVerified(username);
	}
}
