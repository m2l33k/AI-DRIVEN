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

	@SuppressWarnings("unchecked")
	public List<Map<String, Object>> getSubscribers() {
		try {
			ResponseEntity<String> raw = rest.exchange(
					baseUrl + "/api/subscriber", HttpMethod.GET, tokenHeaders(resolveToken()), String.class);
			String body = raw.getBody();
			log.info("GET /api/subscriber → status={} body={}", raw.getStatusCode(), body);
			if (body == null || body.isBlank() || body.equals("null")) return List.of();
			com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
			com.fasterxml.jackson.databind.JsonNode node = om.readTree(body);
			if (!node.isArray()) return List.of();
			List<Map<String, Object>> result = new java.util.ArrayList<>();
			for (com.fasterxml.jackson.databind.JsonNode item : node) {
				result.add(om.convertValue(item, Map.class));
			}
			return result;
		} catch (Exception e) {
			log.warn("Could not fetch subscribers from WebConsole: {}", e.getMessage());
			return List.of();
		}
	}

	@SuppressWarnings("unchecked")
	public List<Map<String, Object>> getRegisteredUeContexts() {
		try {
			// free5GC returns the literal string "null" (4 bytes) when no UEs are registered
			ResponseEntity<String> raw = rest.exchange(
					baseUrl + "/api/registered-ue-context",
					HttpMethod.GET, tokenHeaders(resolveToken()), String.class);
			String body = raw.getBody();
			log.info("GET /api/registered-ue-context → status={} body={}", raw.getStatusCode(), body);
			if (body == null || body.isBlank() || body.equals("null")) return List.of();
			com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
			com.fasterxml.jackson.databind.JsonNode node = om.readTree(body);
			if (!node.isArray()) return List.of();
			List<Map<String, Object>> result = new java.util.ArrayList<>();
			for (com.fasterxml.jackson.databind.JsonNode item : node) {
				result.add(om.convertValue(item, Map.class));
			}
			return result;
		} catch (Exception e) {
			log.warn("Could not fetch UE contexts from WebConsole: {}", e.getMessage());
			return List.of();
		}
	}

	@SuppressWarnings("unchecked")
	public Map<String, Object> getSubscriberDetails(String ueId, String plmnId) {
		try {
			ResponseEntity<String> raw = rest.exchange(
					baseUrl + "/api/subscriber/" + ueId + "/" + plmnId,
					HttpMethod.GET, tokenHeaders(resolveToken()), String.class);
			String body = raw.getBody();
			if (body == null || body.isBlank() || body.equals("null")) return Map.of();
			com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
			return om.readValue(body, Map.class);
		} catch (Exception e) {
			log.warn("Could not fetch subscriber details for {} / {}: {}", ueId, plmnId, e.getMessage());
			return Map.of();
		}
	}

	@SuppressWarnings("unchecked")
	public List<Map<String, Object>> getChargingRecords() {
		List<Map<String, Object>> subs = getSubscribers();
		List<Map<String, Object>> all = new java.util.ArrayList<>();
		com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
		for (Map<String, Object> sub : subs) {
			String ueId   = (String) sub.getOrDefault("ueId", "");
			String plmnId = (String) sub.getOrDefault("plmnID", "20893");
			if (ueId.isBlank()) continue;
			Map<String, Object> details = getSubscriberDetails(ueId, plmnId);
			Object raw = details.get("ChargingDatas");
			if (raw == null) continue;
			try {
				com.fasterxml.jackson.databind.JsonNode node = om.valueToTree(raw);
				if (!node.isArray()) continue;
				for (com.fasterxml.jackson.databind.JsonNode item : node) {
					Map<String, Object> rec = om.convertValue(item, Map.class);
					rec.put("_ueId", ueId);
					all.add(rec);
				}
			} catch (Exception ex) {
				log.warn("Could not parse ChargingDatas for {}: {}", ueId, ex.getMessage());
			}
		}
		return all;
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

	// ── network config (aggregate from UDR) ─────────────────────────────────────

	@SuppressWarnings("unchecked")
	public java.util.Map<String, Object> getNetworkConfig() {
		List<java.util.Map<String, Object>> subs = getSubscribers();
		com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();

		String mcc = "", mnc = "";
		java.util.Map<String, java.util.Map<String, Object>> sliceMap = new java.util.LinkedHashMap<>();
		java.util.Map<String, java.util.Map<String, Object>> qosMap  = new java.util.LinkedHashMap<>();

		for (java.util.Map<String, Object> sub : subs) {
			String ueId   = (String) sub.getOrDefault("ueId",   "");
			String plmnId = (String) sub.getOrDefault("plmnID", "");
			if (ueId.isBlank()) continue;

			if (mcc.isEmpty() && plmnId.length() >= 5) {
				mcc = plmnId.substring(0, 3);
				mnc = plmnId.substring(3);
			}

			java.util.Map<String, Object> details = getSubscriberDetails(ueId, plmnId);

			// ── slices from AccessAndMobilitySubscriptionData ──────────────────────
			try {
				com.fasterxml.jackson.databind.JsonNode amData =
						om.valueToTree(details.get("AccessAndMobilitySubscriptionData"));
				com.fasterxml.jackson.databind.JsonNode defaultSlices =
						amData.path("nssai").path("defaultSingleNssais");
				if (defaultSlices.isArray()) {
					for (com.fasterxml.jackson.databind.JsonNode s : defaultSlices) {
						int    sst = s.path("sst").asInt();
						String sd  = s.path("sd").asText("");
						sliceMap.computeIfAbsent(sst + "-" + sd, k -> {
							java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
							m.put("sst",    sst);
							m.put("sd",     sd);
							m.put("snssai", String.format("%02d-%s", sst, sd));
							m.put("active", true);
							m.put("_dnns",  new java.util.ArrayList<String>());
							return m;
						});
					}
				}
			} catch (Exception e) {
				log.warn("Could not parse AM subscription for {}: {}", ueId, e.getMessage());
			}

			// ── QoS + DNN from SessionManagementSubscriptionData ──────────────────
			try {
				com.fasterxml.jackson.databind.JsonNode smData =
						om.valueToTree(details.get("SessionManagementSubscriptionData"));
				if (smData != null && smData.isArray()) {
					for (com.fasterxml.jackson.databind.JsonNode session : smData) {
						int    sst      = session.path("singleNssai").path("sst").asInt();
						String sd       = session.path("singleNssai").path("sd").asText("");
						String sliceKey = sst + "-" + sd;

						java.util.Iterator<java.util.Map.Entry<String, com.fasterxml.jackson.databind.JsonNode>> it =
								session.path("dnnConfigurations").fields();
						while (it.hasNext()) {
							java.util.Map.Entry<String, com.fasterxml.jackson.databind.JsonNode> e = it.next();
							String dnn     = e.getKey();
							com.fasterxml.jackson.databind.JsonNode dnnCfg = e.getValue();

							// attach DNN to slice
							java.util.Map<String, Object> sliceEntry = sliceMap.get(sliceKey);
							if (sliceEntry != null) {
								@SuppressWarnings("unchecked")
								java.util.List<String> dnns = (java.util.List<String>) sliceEntry.get("_dnns");
								if (!dnns.contains(dnn)) dnns.add(dnn);
							}

							int    fiveqi  = dnnCfg.path("5gQosProfile").path("5qi").asInt(9);
							String uplink  = dnnCfg.path("sessionAmbr").path("uplink").asText("1 Gbps");
							String downlink = dnnCfg.path("sessionAmbr").path("downlink").asText("2 Gbps");
							String qosKey  = fiveqi + "-" + dnn;
							qosMap.computeIfAbsent(qosKey, k -> {
								java.util.Map<String, Object> q = new java.util.LinkedHashMap<>();
								q.put("name",     dnn + " (5QI-" + fiveqi + ")");
								q.put("dnn",      dnn);
								q.put("fiveqi",   fiveqi);
								q.put("type",     fiveqi <= 4 ? "GBR" : "Non-GBR");
								q.put("uplink",   uplink);
								q.put("downlink", downlink);
								return q;
							});
						}
					}
				}
			} catch (Exception e) {
				log.warn("Could not parse SM subscription for {}: {}", ueId, e.getMessage());
			}
		}

		// flatten _dnns → dnn string
		java.util.List<java.util.Map<String, Object>> slices = new java.util.ArrayList<>();
		for (java.util.Map<String, Object> s : sliceMap.values()) {
			@SuppressWarnings("unchecked")
			java.util.List<String> dnns = (java.util.List<String>) s.remove("_dnns");
			s.put("dnn", String.join(", ", dnns));
			slices.add(s);
		}

		java.util.Map<String, Object> plmn = new java.util.LinkedHashMap<>();
		plmn.put("mcc",         mcc.isEmpty() ? "208" : mcc);
		plmn.put("mnc",         mnc.isEmpty() ? "93"  : mnc);
		plmn.put("tac",         "0x0001");
		plmn.put("amfRegionId", "128");
		plmn.put("amfSetId",    "1");
		plmn.put("nrfEndpoint", "https://nrf.5gc.svc:8443");

		java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
		result.put("plmn",        plmn);
		result.put("slices",      slices);
		result.put("qosProfiles", new java.util.ArrayList<>(qosMap.values()));
		return result;
	}

	@SuppressWarnings("unchecked")
	public java.util.Map<String, Object> applyNetworkConfig(java.util.Map<String, Object> patch) {
		com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
		List<java.util.Map<String, Object>> subs = getSubscribers();
		int updated = 0;
		java.util.List<String> errors = new java.util.ArrayList<>();

		// build dnn → qos-patch lookup
		java.util.List<java.util.Map<String, Object>> qosPatches =
				(java.util.List<java.util.Map<String, Object>>) patch.getOrDefault("qosProfiles", List.of());
		java.util.Map<String, java.util.Map<String, Object>> qosByDnn = new java.util.LinkedHashMap<>();
		for (java.util.Map<String, Object> q : qosPatches) {
			String dnn = (String) q.getOrDefault("dnn", "");
			if (!dnn.isBlank()) qosByDnn.put(dnn, q);
		}

		for (java.util.Map<String, Object> sub : subs) {
			String ueId   = (String) sub.getOrDefault("ueId",   "");
			String plmnId = (String) sub.getOrDefault("plmnID", "20893");
			if (ueId.isBlank()) continue;
			try {
				java.util.Map<String, Object> details = getSubscriberDetails(ueId, plmnId);
				boolean dirty = false;

				com.fasterxml.jackson.databind.JsonNode smRaw =
						om.valueToTree(details.get("SessionManagementSubscriptionData"));
				if (smRaw != null && smRaw.isArray()) {
					com.fasterxml.jackson.databind.node.ArrayNode smArr =
							(com.fasterxml.jackson.databind.node.ArrayNode) smRaw.deepCopy();
					for (com.fasterxml.jackson.databind.JsonNode session : smArr) {
						java.util.Iterator<java.util.Map.Entry<String, com.fasterxml.jackson.databind.JsonNode>> it =
								session.path("dnnConfigurations").fields();
						while (it.hasNext()) {
							java.util.Map.Entry<String, com.fasterxml.jackson.databind.JsonNode> entry = it.next();
							String dnn = entry.getKey();
							if (!qosByDnn.containsKey(dnn)) continue;
							java.util.Map<String, Object> qp = qosByDnn.get(dnn);
							com.fasterxml.jackson.databind.node.ObjectNode dnnNode =
									(com.fasterxml.jackson.databind.node.ObjectNode) entry.getValue();

							com.fasterxml.jackson.databind.JsonNode ambrNode = dnnNode.path("sessionAmbr");
							if (!ambrNode.isMissingNode()) {
								com.fasterxml.jackson.databind.node.ObjectNode ambr =
										(com.fasterxml.jackson.databind.node.ObjectNode) ambrNode;
								if (qp.containsKey("uplink"))
									ambr.put("uplink",   (String) qp.get("uplink"));
								if (qp.containsKey("downlink"))
									ambr.put("downlink", (String) qp.get("downlink"));
								dirty = true;
							}
							com.fasterxml.jackson.databind.JsonNode qosNode = dnnNode.path("5gQosProfile");
							if (!qosNode.isMissingNode() && qp.containsKey("fiveqi")) {
								((com.fasterxml.jackson.databind.node.ObjectNode) qosNode)
										.put("5qi", ((Number) qp.get("fiveqi")).intValue());
								dirty = true;
							}
						}
					}
					if (dirty) {
						details.put("SessionManagementSubscriptionData",
								om.convertValue(smArr, java.util.List.class));
					}
				}

				if (dirty) {
					putSubscriber(ueId, plmnId, details);
					updated++;
				}
			} catch (Exception e) {
				log.warn("Could not apply config to {}: {}", ueId, e.getMessage());
				errors.add(ueId + ": " + e.getMessage());
			}
		}

		java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
		result.put("updated", updated);
		result.put("total",   subs.size());
		result.put("status",  errors.isEmpty() ? "ok" : "partial");
		if (!errors.isEmpty()) result.put("errors", errors);
		return result;
	}

	private void putSubscriber(String ueId, String plmnId, java.util.Map<String, Object> body) {
		String token = resolveToken();
		HttpHeaders h = new HttpHeaders();
		h.set("Token", token);
		h.set("Content-Type", "application/json");
		String url = baseUrl + "/api/subscriber/" + ueId + "/" + plmnId;
		log.info("PUT {} ueId={}", url, ueId);
		rest.exchange(url, HttpMethod.PUT, new HttpEntity<>(body, h), String.class);
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
