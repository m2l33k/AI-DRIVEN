package io.javatab.microservices.ratelimit.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Turns request failures into detailed JSON so a caller (Swagger, the frontend) can see exactly why a
 * policy write was rejected instead of a bare 400.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

	/** Bean-validation failures (e.g. capacity &lt; 1, missing action) → 400 with per-field messages. */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<Object> handleValidation(MethodArgumentNotValidException ex) {
		Map<String, String> fields = new LinkedHashMap<>();
		ex.getBindingResult().getFieldErrors()
				.forEach(fe -> fields.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
		return ResponseEntity.badRequest().body(Map.of(
				"error", "Validation failed",
				"fields", fields));
	}

	/** Malformed / unparsable JSON body (e.g. bad enum value, wrong type) → 400 with the cause. */
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
}
