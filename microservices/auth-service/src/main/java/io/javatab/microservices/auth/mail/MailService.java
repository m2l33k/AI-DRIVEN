package io.javatab.microservices.auth.mail;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/** Sends transactional emails (currently just the password-reset OTP) via the configured SMTP server. */
@Service
public class MailService {

	private final JavaMailSender mailSender;
	private final String from;

	public MailService(JavaMailSender mailSender,
					   @Value("${spring.mail.username:}") String from) {
		this.mailSender = mailSender;
		this.from = from;
	}

	public void sendOtp(String to, String code) {
		send(to, "Your password reset code", """
				Use the following one-time code to reset your password:

				    %s

				This code expires in 10 minutes. If you did not request a password reset, you can safely ignore this email.
				""".formatted(code));
	}

	public void sendTemporaryPassword(String to, String username, String tempPassword) {
		send(to, "Your account has been created", """
				An account has been created for you.

				    Username:            %s
				    Temporary password:  %s

				First, verify your email using the separate verification link we just sent.
				Then log in with the credentials above — you will be asked to set a new password before
				you can access the application.
				""".formatted(username, tempPassword));
	}

	private void send(String to, String subject, String body) {
		SimpleMailMessage msg = new SimpleMailMessage();
		if (from != null && !from.isBlank()) {
			msg.setFrom(from);
		}
		msg.setTo(to);
		msg.setSubject(subject);
		msg.setText(body);
		mailSender.send(msg);
	}
}
