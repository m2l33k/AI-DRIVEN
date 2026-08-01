package io.javatab.microservices.auth.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

/**
 * Translates Keycloak/REST failures and bad input into clean JSON responses.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(RestClientResponseException.class)
	public ResponseEntity<Object> handleKeycloak(RestClientResponseException ex) {
		return ResponseEntity.status(ex.getStatusCode())
				.body(Map.of(
						"error", ex.getStatusText(),
						"details", ex.getResponseBodyAsString()));
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<Object> handleBadRequest(IllegalArgumentException ex) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(Map.of("error", ex.getMessage()));
	}
}
