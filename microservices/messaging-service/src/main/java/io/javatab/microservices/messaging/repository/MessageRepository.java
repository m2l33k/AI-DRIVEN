package io.javatab.microservices.messaging.repository;

import io.javatab.microservices.messaging.domain.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

	/** Every message involving {@code me} (either side), newest first — used to build the inbox. */
	@Query("select m from Message m where m.sender = :me or m.recipient = :me order by m.sentAt desc")
	List<Message> findAllForUser(@Param("me") String me);

	/** The full thread between {@code me} and {@code peer}, oldest first. */
	@Query("select m from Message m where (m.sender = :me and m.recipient = :peer) "
			+ "or (m.sender = :peer and m.recipient = :me) order by m.sentAt asc")
	List<Message> findConversation(@Param("me") String me, @Param("peer") String peer);

	/** Unread messages addressed to {@code me}. */
	long countByRecipientAndReadFalse(String recipient);

	/** Mark every message from {@code peer} to {@code me} as read; returns how many were updated. */
	@Modifying
	@Transactional
	@Query("update Message m set m.read = true where m.recipient = :me and m.sender = :peer and m.read = false")
	int markConversationRead(@Param("me") String me, @Param("peer") String peer);
}
