package io.javatab.microservices.messaging.ws;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks live WebSocket sessions per username (set on the handshake by {@link JwtHandshakeInterceptor})
 * and pushes {@link NotificationDto}s to a user's open sessions. A user may have several sessions
 * (multiple tabs); each gets the push. Best-effort — a dead session is dropped, never fatal.
 */
@Component
public class NotificationSocketHandler extends TextWebSocketHandler {

	private static final Logger log = LoggerFactory.getLogger(NotificationSocketHandler.class);
	public static final String USERNAME_ATTR = "username";

	private final ObjectMapper mapper;
	private final ConcurrentHashMap<String, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

	public NotificationSocketHandler(ObjectMapper mapper) {
		this.mapper = mapper;
	}

	@Override
	public void afterConnectionEstablished(WebSocketSession session) {
		String user = username(session);
		if (user == null) {
			close(session);
			return;
		}
		sessionsByUser.computeIfAbsent(user, k -> ConcurrentHashMap.newKeySet()).add(session);
		log.debug("WS connected: {} ({} sessions)", user, sessionsByUser.get(user).size());
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
		String user = username(session);
		if (user != null) {
			Set<WebSocketSession> set = sessionsByUser.get(user);
			if (set != null) {
				set.remove(session);
				if (set.isEmpty()) {
					sessionsByUser.remove(user);
				}
			}
		}
	}

	/** Push a notification to every open session of {@code username}. No-op if the user is offline. */
	public void sendToUser(String username, NotificationDto notification) {
		Set<WebSocketSession> sessions = sessionsByUser.get(username);
		if (sessions == null || sessions.isEmpty()) {
			return;
		}
		String payload;
		try {
			payload = mapper.writeValueAsString(notification);
		} catch (Exception e) {
			log.warn("Failed to serialise notification for {}: {}", username, e.getMessage());
			return;
		}
		for (WebSocketSession session : sessions) {
			try {
				if (session.isOpen()) {
					session.sendMessage(new TextMessage(payload));
				}
			} catch (Exception e) {
				log.debug("Failed to push to a session of {}: {}", username, e.getMessage());
			}
		}
	}

	private static String username(WebSocketSession session) {
		Object u = session.getAttributes().get(USERNAME_ATTR);
		return u == null ? null : u.toString();
	}

	private static void close(WebSocketSession session) {
		try {
			session.close(CloseStatus.POLICY_VIOLATION);
		} catch (Exception ignored) {
			// nothing to do
		}
	}
}
