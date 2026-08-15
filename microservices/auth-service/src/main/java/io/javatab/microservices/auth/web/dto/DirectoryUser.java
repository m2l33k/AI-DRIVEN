package io.javatab.microservices.auth.web.dto;

/**
 * Minimal user-directory entry — username + display name only, no sensitive fields. Exposed to any
 * authenticated user so features like messaging can offer a recipient picker without needing the
 * {@code users:read} admin permission.
 */
public record DirectoryUser(String username, String name) {
}
