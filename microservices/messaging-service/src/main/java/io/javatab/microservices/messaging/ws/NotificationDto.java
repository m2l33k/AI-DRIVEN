package io.javatab.microservices.messaging.ws;

import java.time.Instant;

/**
 * A real-time notification pushed to a user's WebSocket session(s). {@code type} lets the frontend
 * route/render it (currently only {@code MESSAGE}); {@code from} is the peer, {@code preview} a short
 * excerpt of the message.
 */
public record NotificationDto(
		String type,
		String from,
		String preview,
		Instant at
) {
	public static NotificationDto message(String from, String content) {
		String preview = content == null ? "" : (content.length() > 120 ? content.substring(0, 117) + "…" : content);
		return new NotificationDto("MESSAGE", from, preview, Instant.now());
	}
}
