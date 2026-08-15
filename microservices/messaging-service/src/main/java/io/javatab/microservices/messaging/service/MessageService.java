package io.javatab.microservices.messaging.service;

import io.javatab.microservices.messaging.domain.Message;
import io.javatab.microservices.messaging.repository.MessageRepository;
import io.javatab.microservices.messaging.web.dto.ConversationDto;
import io.javatab.microservices.messaging.web.dto.MessageDto;
import io.javatab.microservices.messaging.ws.NotificationDto;
import io.javatab.microservices.messaging.ws.NotificationSocketHandler;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Messaging use-cases over {@link MessageRepository}. The current user (from the JWT) is always
 * passed in as {@code me}; a user can only ever see threads they are part of.
 */
@Service
public class MessageService {

	private final MessageRepository repository;
	private final NotificationSocketHandler notifications;

	public MessageService(MessageRepository repository, NotificationSocketHandler notifications) {
		this.repository = repository;
		this.notifications = notifications;
	}

	/** Persist a new message from {@code me} to {@code recipient} and push a live notification. */
	public MessageDto send(String me, String recipient, String content) {
		if (recipient.equals(me)) {
			throw new IllegalArgumentException("You cannot message yourself");
		}
		Message saved = repository.save(new Message(me, recipient, content.trim(), Instant.now()));
		// Real-time push to the recipient's open sessions (no-op if they're offline).
		notifications.sendToUser(recipient, NotificationDto.message(me, saved.content()));
		return MessageDto.of(saved, me);
	}

	/** The inbox: one entry per peer with the last message + unread count, newest first. */
	public List<ConversationDto> conversations(String me) {
		Map<String, ConversationDto> byPeer = new LinkedHashMap<>();
		for (Message m : repository.findAllForUser(me)) { // already newest-first
			String peer = m.sender().equals(me) ? m.recipient() : m.sender();
			if (!byPeer.containsKey(peer)) {
				// first (newest) message seen for this peer becomes the preview
				byPeer.put(peer, new ConversationDto(peer, m.content(), m.sentAt(),
						m.sender().equals(me), 0));
			}
		}
		List<ConversationDto> out = new ArrayList<>();
		for (ConversationDto c : byPeer.values()) {
			long unread = repository.findConversation(me, c.peer()).stream()
					.filter(m -> m.recipient().equals(me) && !m.read())
					.count();
			out.add(new ConversationDto(c.peer(), c.lastMessage(), c.lastAt(), c.lastFromMe(), unread));
		}
		out.sort(Comparator.comparing(ConversationDto::lastAt).reversed());
		return out;
	}

	/** Full thread with {@code peer}, oldest first. Opening it marks the peer's messages read. */
	public List<MessageDto> conversation(String me, String peer) {
		repository.markConversationRead(me, peer);
		return repository.findConversation(me, peer).stream().map(m -> MessageDto.of(m, me)).toList();
	}

	public int markRead(String me, String peer) {
		return repository.markConversationRead(me, peer);
	}

	public long unreadCount(String me) {
		return repository.countByRecipientAndReadFalse(me);
	}
}
