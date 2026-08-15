package io.javatab.microservices.messaging.web;

import io.javatab.microservices.messaging.service.MessageService;
import io.javatab.microservices.messaging.web.dto.ConversationDto;
import io.javatab.microservices.messaging.web.dto.MessageDto;
import io.javatab.microservices.messaging.web.dto.SendMessageRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Direct-messaging API. The sender is always the authenticated caller (JWT
 * {@code preferred_username}); a user can only read threads they are part of. Any authenticated user
 * may message any other — no special permission required.
 */
@RestController
@RequestMapping("/api/messages")
@Tag(name = "Messaging", description = "Direct messages between platform users")
public class MessageController {

	private final MessageService service;

	public MessageController(MessageService service) {
		this.service = service;
	}

	@Operation(summary = "Send a message", security = @SecurityRequirement(name = "bearerAuth"))
	@PostMapping
	public ResponseEntity<MessageDto> send(@AuthenticationPrincipal Jwt jwt,
			@Valid @RequestBody SendMessageRequest req) {
		MessageDto sent = service.send(username(jwt), req.recipient(), req.content());
		return ResponseEntity.status(HttpStatus.CREATED).body(sent);
	}

	@Operation(summary = "List conversations (inbox)", security = @SecurityRequirement(name = "bearerAuth"))
	@GetMapping("/conversations")
	public List<ConversationDto> conversations(@AuthenticationPrincipal Jwt jwt) {
		return service.conversations(username(jwt));
	}

	@Operation(summary = "Get a conversation thread (marks it read)",
			security = @SecurityRequirement(name = "bearerAuth"))
	@GetMapping("/conversation/{peer}")
	public List<MessageDto> conversation(@AuthenticationPrincipal Jwt jwt, @PathVariable String peer) {
		return service.conversation(username(jwt), peer);
	}

	@Operation(summary = "Mark a conversation read", security = @SecurityRequirement(name = "bearerAuth"))
	@PostMapping("/conversation/{peer}/read")
	public Map<String, Integer> markRead(@AuthenticationPrincipal Jwt jwt, @PathVariable String peer) {
		return Map.of("marked", service.markRead(username(jwt), peer));
	}

	@Operation(summary = "Total unread count (for the badge)",
			security = @SecurityRequirement(name = "bearerAuth"))
	@GetMapping("/unread-count")
	public Map<String, Long> unreadCount(@AuthenticationPrincipal Jwt jwt) {
		return Map.of("unread", service.unreadCount(username(jwt)));
	}

	private static String username(Jwt jwt) {
		String name = jwt.getClaimAsString("preferred_username");
		return name != null ? name : jwt.getSubject();
	}
}
