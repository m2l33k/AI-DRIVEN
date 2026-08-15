package io.javatab.microservices.messaging.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for sending a message. The sender is taken from the caller's JWT, not the body. */
public record SendMessageRequest(
		@NotBlank String recipient,
		@NotBlank @Size(max = 4000) String content
) {
}
