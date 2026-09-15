package io.javatab.microservices.fivegc.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Proxy to the free5GC WebConsole REST API.
 *
 * The WebConsole uses its own JWT (separate from Keycloak). This service logs in
 * with stored credentials once, caches the token, and re-auths on 401.
 * Platform users never see the free5GC credentials — they go through Keycloak.
 */
@Service
public class WebConsoleProxyService {

	private static final Logger log = LoggerFactory.getLogger(WebConsoleProxyService.class);

	private final RestTemplate rest;

	@Value("${free5gc.webconsole.url:http://localhost:5000}")
	private String baseUrl;

	@Value("${free5gc.webconsole.username:admin}")
	private String username;

	@Value("${free5gc.webconsole.password:free5gc}")
	private String password;

	private final AtomicReference<CachedToken> tokenCache = new AtomicReference<>();

	public WebConsoleProxyService(RestTemplate rest) {
		this.rest = rest;
	}

	// ── public API ──────────────────────────────────────────────────────────────

	public List<Map<String, Object>> getSubscribers() {
		try {
			@SuppressWarnings("unchecked")
			ResponseEntity<List> resp = get("/api/subscriber", List.class);
			return resp.getBody() != null ? resp.getBody() : List.of();
		} catch (Exception e) {
			log.warn("Could not fetch subscribers from WebConsole: {}", e.getMessage());
			return List.of();
		}
	}

	public List<Map<String, Object>> getRegisteredUeContexts() {
		try {
			// free5GC returns "null" (4 bytes) when no UEs are registered
			ResponseEntity<Object> resp = rest.exchange(
					baseUrl + "/api/registered-ue-context",
					HttpMethod.GET, tokenHeaders(resolveToken()), Object.class);
			Object body = resp.getBody();
			if (body == null) return List.of();
			if (body instanceof List<?> list) {
				@SuppressWarnings("unchecked")
				List<Map<String, Object>> result = (List<Map<String, Object>>) list;
				return result;
			}
			return List.of();
		} catch (Exception e) {
			log.warn("Could not fetch UE contexts from WebConsole: {}", e.getMessage());
			return List.of();
		}
	}

	// ── tenants ──────────────────────────────────────────────────────────────────

	public List<Map<String, Object>> getTenants() {
		try {
			@SuppressWarnings("unchecked")
			ResponseEntity<List> resp = get("/api/tenant", List.class);
			return resp.getBody() != null ? resp.getBody() : List.of();
		} catch (Exception e) {
			log.warn("Could not fetch tenants from WebConsole: {}", e.getMessage());
			return List.of();
		}
	}

	@SuppressWarnings("unchecked")
	public Map<String, Object> createTenant(String tenantName) {
		String token = resolveToken();
		HttpHeaders h = new HttpHeaders();
		h.set("Token", token);
		h.set("Content-Type", "application/json");
		Map<String, Object> body = Map.of("tenantName", tenantName);
		log.info("POST /api/tenant tenantName={}", tenantName);
		try {
			Object resp = rest.postForObject(baseUrl + "/api/tenant", new HttpEntity<>(body, h), Object.class);
			if (resp instanceof Map<?, ?> m) return (Map<String, Object>) m;
			return Map.of("result", "ok");
		} catch (org.springframework.web.client.RestClientResponseException e) {
			log.error("WebConsole tenant create failed — status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
			throw e;
		}
	}

	public void deleteTenant(String tenantId) {
		String token = resolveToken();
		HttpHeaders h = new HttpHeaders();
		h.set("Token", token);
		rest.exchange(baseUrl + "/api/tenant/" + tenantId, HttpMethod.DELETE, new HttpEntity<>(h), Void.class);
	}

	@SuppressWarnings("unchecked")
	public Map<String, Object> createSubscriber(Map<String, Object> body) {
		String ueId   = (String) body.getOrDefault("ueId", "imsi-0");
		String plmnId = (String) body.getOrDefault("plmnID", "20893");
		String url = baseUrl + "/api/subscriber/" + ueId + "/" + plmnId;
		String token = resolveToken();
		HttpHeaders h = new HttpHeaders();
		h.set("Token", token);
		h.set("Content-Type", "application/json");
		log.info("POST {} ueId={}", url, ueId);
		try {
			return rest.postForObject(url, new HttpEntity<>(body, h), Map.class);
		} catch (org.springframework.web.client.RestClientResponseException e) {
			log.error("WebConsole subscriber create failed — status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
			throw e;
		} catch (Exception e) {
			log.error("WebConsole subscriber create unexpected error — type={} msg={}", e.getClass().getSimpleName(), e.getMessage());
			throw e;
		}
	}

	public void deleteSubscriber(String imsi) {
		String token = resolveToken();
		HttpHeaders h = new HttpHeaders();
		h.set("Token", token);
		rest.exchange(baseUrl + "/api/subscriber/" + imsi + "/20893", HttpMethod.DELETE, new HttpEntity<>(h), Void.class);
	}

	// ── subscription profiles ────────────────────────────────────────────────────

	@SuppressWarnings("unchecked")
	public List<Map<String, Object>> getProfiles() {
		try {
			// Step 1: GET /api/profile → ["profile-1", "profile-2", ...]  (array of name strings)
			ResponseEntity<String> raw = rest.exchange(
					baseUrl + "/api/profile", HttpMethod.GET, tokenHeaders(resolveToken()), String.class);
			String rawBody = raw.getBody();
			log.info("GET /api/profile → status={} rawBody={}", raw.getStatusCode(), rawBody);
			if (rawBody == null || rawBody.isBlank() || rawBody.equals("null")) return List.of();

			com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
			com.fasterxml.jackson.databind.JsonNode node = om.readTree(rawBody);
			if (!node.isArray()) return List.of();

			// Step 2: fetch full data for each profile name
			List<Map<String, Object>> result = new java.util.ArrayList<>();
			for (com.fasterxml.jackson.databind.JsonNode item : node) {
				String profileName = item.isTextual() ? item.asText() : item.path("profileName").asText();
				if (profileName.isBlank()) continue;
				try {
					ResponseEntity<String> detail = rest.exchange(
							baseUrl + "/api/profile/" + profileName,
							HttpMethod.GET, tokenHeaders(resolveToken()), String.class);
					String detailBody = detail.getBody();
					log.info("GET /api/profile/{} → {}", profileName, detailBody);
					if (detailBody != null && !detailBody.isBlank() && !detailBody.equals("null")) {
						result.add(om.readValue(detailBody, Map.class));
					}
				} catch (Exception ex) {
					log.warn("Could not fetch profile detail for '{}': {}", profileName, ex.getMessage());
				}
			}
			return result;
		} catch (Exception e) {
			log.warn("Could not fetch profiles from WebConsole: {} — {}", e.getClass().getSimpleName(), e.getMessage());
			return List.of();
		}
	}

	@SuppressWarnings("unchecked")
	public Map<String, Object> createProfile(String name, Map<String, Object> body) {
		String token = resolveToken();
		HttpHeaders h = new HttpHeaders();
		h.set("Token", token);
		h.set("Content-Type", "application/json");
		// free5GC WebConsole: POST /api/profile (name must be in body as profileName)
		Map<String, Object> payload = new java.util.LinkedHashMap<>(body);
		if (!payload.containsKey("profileName")) payload.put("profileName", name);
		String url = baseUrl + "/api/profile";
		log.info("POST profile {} profileName={}", url, name);
		try {
			Object resp = rest.postForObject(url, new HttpEntity<>(payload, h), Object.class);
			if (resp instanceof Map<?, ?> m) return (Map<String, Object>) m;
			return Map.of("result", "ok");
		} catch (org.springframework.web.client.RestClientResponseException e) {
			log.error("WebConsole profile create failed — status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
			throw e;
		}
	}

	public void deleteProfile(String name) {
		String token = resolveToken();
		HttpHeaders h = new HttpHeaders();
		h.set("Token", token);
		// free5GC WebConsole: DELETE /api/profile/:profileName
		rest.exchange(baseUrl + "/api/profile/" + name, HttpMethod.DELETE, new HttpEntity<>(h), Void.class);
	}

	public boolean isReachable() {
		try {
			rest.headForHeaders(baseUrl + "/api/login");
			return true;
		} catch (Exception e) {
			return false;
		}
	}

	// ── helpers ─────────────────────────────────────────────────────────────────

	private <T> ResponseEntity<T> get(String path, Class<T> type) {
		String token = resolveToken();
		try {
			return rest.exchange(baseUrl + path, HttpMethod.GET, tokenHeaders(token), type);
		} catch (Exception ex) {
			if (ex.getMessage() != null && ex.getMessage().contains("401")) {
				tokenCache.set(null);
				token = resolveToken();
				return rest.exchange(baseUrl + path, HttpMethod.GET, tokenHeaders(token), type);
			}
			throw ex;
		}
	}

	private String resolveToken() {
		CachedToken cached = tokenCache.get();
		if (cached != null && cached.expiresAt().isAfter(Instant.now())) {
			return cached.token();
		}
		return login();
	}

	private String login() {
		Map<String, String> body = Map.of("username", username, "password", password);
		HttpHeaders h = new HttpHeaders();
		h.set("Content-Type", "application/json");
		@SuppressWarnings("unchecked")
		Map<String, Object> resp = rest.postForObject(
				baseUrl + "/api/login", new HttpEntity<>(body, h), Map.class);
		if (resp == null || !resp.containsKey("access_token")) {
			throw new IllegalStateException("free5GC WebConsole login failed");
		}
		String token = (String) resp.get("access_token");
		tokenCache.set(new CachedToken(token, Instant.now().plusSeconds(3300)));
		log.info("Authenticated to free5GC WebConsole");
		return token;
	}

	private static HttpEntity<Void> tokenHeaders(String token) {
		HttpHeaders h = new HttpHeaders();
		h.set("Token", token);
		return new HttpEntity<>(h);
	}

	private record CachedToken(String token, Instant expiresAt) {}
}
