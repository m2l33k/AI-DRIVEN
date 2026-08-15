package io.javatab.microservices.messaging.web.dto;

import io.javatab.microservices.messaging.domain.Message;

import java.time.Instant;

/** API view of a single message, with {@code mine} telling the UI which side to render it on. */
public record MessageDto(
		Long id,
		String sender,
		String recipient,
		String content,
		Instant sentAt,
		boolean read,
		boolean mine
) {
	public static MessageDto of(Message m, String me) {
		return new MessageDto(m.id(), m.sender(), m.recipient(), m.content(), m.sentAt(), m.read(),
				m.sender().equals(me));
	}
}
