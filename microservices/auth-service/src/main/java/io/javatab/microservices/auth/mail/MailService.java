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
		SimpleMailMessage msg = new SimpleMailMessage();
		if (from != null && !from.isBlank()) {
			msg.setFrom(from);
		}
		msg.setTo(to);
		msg.setSubject("Your password reset code");
		msg.setText("""
				Use the following one-time code to reset your password:

				    %s

				This code expires in 10 minutes. If you did not request a password reset, you can safely ignore this email.
				""".formatted(code));
		mailSender.send(msg);
	}
}
