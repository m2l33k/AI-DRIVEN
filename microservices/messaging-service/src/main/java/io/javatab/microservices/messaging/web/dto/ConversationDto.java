package io.javatab.microservices.messaging.web.dto;

import java.time.Instant;

/** One row of the inbox: the peer, a preview of the last message, and unread count. */
public record ConversationDto(
		String peer,
		String lastMessage,
		Instant lastAt,
		boolean lastFromMe,
		long unread
) {
}
