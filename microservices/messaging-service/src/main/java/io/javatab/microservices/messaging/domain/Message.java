package io.javatab.microservices.messaging.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A direct message from one platform user to another, persisted in Postgres. {@code sender} and
 * {@code recipient} are Keycloak usernames; {@code read} flips when the recipient opens the thread.
 */
@Entity
@Table(name = "messages", indexes = {
		@Index(name = "idx_msg_recipient", columnList = "recipient"),
		@Index(name = "idx_msg_sender", columnList = "sender")
})
public class Message {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String sender;

	@Column(nullable = false)
	private String recipient;

	@Column(nullable = false, length = 4000)
	private String content;

	@Column(name = "sent_at", nullable = false)
	private Instant sentAt;

	@Column(name = "is_read", nullable = false)
	private boolean read;

	protected Message() {
	}

	public Message(String sender, String recipient, String content, Instant sentAt) {
		this.sender = sender;
		this.recipient = recipient;
		this.content = content;
		this.sentAt = sentAt;
		this.read = false;
	}

	public Long id() { return id; }
	public String sender() { return sender; }
	public String recipient() { return recipient; }
	public String content() { return content; }
	public Instant sentAt() { return sentAt; }
	public boolean read() { return read; }

	public void markRead() { this.read = true; }
}
