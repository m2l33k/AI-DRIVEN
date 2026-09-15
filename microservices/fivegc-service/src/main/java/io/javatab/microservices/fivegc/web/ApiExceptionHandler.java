package io.javatab.microservices.fivegc.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientResponseException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Turns request and integration failures into structured JSON so Swagger and the frontend
 * can surface a readable reason instead of a bare HTTP status code.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<Object> handleValidation(MethodArgumentNotValidException ex) {
		Map<String, String> fields = new LinkedHashMap<>();
		ex.getBindingResult().getFieldErrors()
				.forEach(fe -> fields.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
		return ResponseEntity.badRequest().body(Map.of("error", "Validation failed", "fields", fields));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<Object> handleUnreadable(HttpMessageNotReadableException ex) {
		String detail = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
		return ResponseEntity.badRequest().body(Map.of(
				"error", "Malformed request body",
				"details", detail == null ? "Could not read JSON" : detail));
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<Object> handleBadRequest(IllegalArgumentException ex) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
	}

	@ExceptionHandler(AuthenticationException.class)
	public ResponseEntity<Object> handleUnauthenticated(AuthenticationException ex) {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required", "details", ex.getMessage()));
	}

	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<Object> handleAccessDenied(AccessDeniedException ex) {
		return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied — check your role", "details", ex.getMessage()));
	}

	/** free5GC WebConsole returned a 4xx/5xx — surface the upstream body so the UI can show it. */
	@ExceptionHandler(RestClientResponseException.class)
	public ResponseEntity<Object> handleWebConsoleError(RestClientResponseException ex) {
		String body = ex.getResponseBodyAsString();
		return ResponseEntity.status(ex.getStatusCode()).body(Map.of(
				"error", "WebConsole returned " + ex.getStatusCode().value(),
				"details", body.isBlank() ? ex.getMessage() : body));
	}

	/** Docker daemon or WebConsole unreachable / operation failed. */
	@ExceptionHandler(RuntimeException.class)
	public ResponseEntity<Object> handleUpstreamError(RuntimeException ex) {
		return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
				"error", "5GC operation failed",
				"details", ex.getMessage() != null ? ex.getMessage() : "Unknown error"));
	}
}
