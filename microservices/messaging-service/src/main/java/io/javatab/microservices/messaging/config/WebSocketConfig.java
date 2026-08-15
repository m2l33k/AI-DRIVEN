package io.javatab.microservices.messaging.config;

import io.javatab.microservices.messaging.ws.JwtHandshakeInterceptor;
import io.javatab.microservices.messaging.ws.NotificationSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * Registers the native WebSocket endpoint {@code /ws/notifications} for real-time notifications,
 * guarded by {@link JwtHandshakeInterceptor} (JWT via {@code ?token=} query param). Origins are open
 * because the browser connects through the gateway / dev-proxy same origin.
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

	private final NotificationSocketHandler handler;
	private final JwtHandshakeInterceptor handshakeInterceptor;

	public WebSocketConfig(NotificationSocketHandler handler, JwtHandshakeInterceptor handshakeInterceptor) {
		this.handler = handler;
		this.handshakeInterceptor = handshakeInterceptor;
	}

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		registry.addHandler(handler, "/ws/notifications")
				.addInterceptors(handshakeInterceptor)
				.setAllowedOriginPatterns("*");
	}
}
