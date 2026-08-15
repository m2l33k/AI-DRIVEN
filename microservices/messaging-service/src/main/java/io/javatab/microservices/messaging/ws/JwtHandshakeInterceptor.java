package io.javatab.microservices.messaging.ws;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.util.Map;

/**
 * Authenticates the WebSocket handshake. The browser's native WebSocket can't set an Authorization
 * header, so the JWT is passed as a {@code ?token=...} query param; we validate it with the same
 * {@link JwtDecoder} the REST resource server uses and stash {@code preferred_username} in the
 * session attributes for {@link NotificationSocketHandler}. An invalid/missing token → 401 (handshake
 * rejected).
 */
@Component
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

	private static final Logger log = LoggerFactory.getLogger(JwtHandshakeInterceptor.class);

	private final JwtDecoder jwtDecoder;

	public JwtHandshakeInterceptor(JwtDecoder jwtDecoder) {
		this.jwtDecoder = jwtDecoder;
	}

	@Override
	public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
			WebSocketHandler wsHandler, Map<String, Object> attributes) {
		String token = tokenParam(request.getURI());
		if (token == null) {
			response.setStatusCode(org.springframework.http.HttpStatus.UNAUTHORIZED);
			return false;
		}
		try {
			Jwt jwt = jwtDecoder.decode(token);
			String username = jwt.getClaimAsString("preferred_username");
			attributes.put(NotificationSocketHandler.USERNAME_ATTR,
					username != null ? username : jwt.getSubject());
			return true;
		} catch (Exception e) {
			log.debug("Rejected WS handshake: invalid token ({})", e.getMessage());
			response.setStatusCode(org.springframework.http.HttpStatus.UNAUTHORIZED);
			return false;
		}
	}

	@Override
	public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
			WebSocketHandler wsHandler, Exception exception) {
		// no-op
	}

	private static String tokenParam(URI uri) {
		String query = uri.getQuery();
		if (query == null) {
			return null;
		}
		for (String pair : query.split("&")) {
			int eq = pair.indexOf('=');
			if (eq > 0 && "token".equals(pair.substring(0, eq))) {
				return pair.substring(eq + 1);
			}
		}
		return null;
	}
}
