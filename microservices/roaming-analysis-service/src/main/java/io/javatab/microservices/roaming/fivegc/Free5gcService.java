package io.javatab.microservices.roaming.fivegc;

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
 * Authentication: the WebConsole uses its own JWT (separate from Keycloak).
 * We log in with the stored credentials once, cache the token, and re-auth on 401.
 * Platform users never see the free5GC credentials — they authenticate through Keycloak
 * to reach these endpoints.
 */
@Service
public class Free5gcService {

    private static final Logger log = LoggerFactory.getLogger(Free5gcService.class);

    private final RestTemplate rest;

    @Value("${free5gc.webconsole.url:http://localhost:5000}")
    private String baseUrl;

    @Value("${free5gc.webconsole.username:admin}")
    private String username;

    @Value("${free5gc.webconsole.password:free5gc}")
    private String password;

    private final AtomicReference<CachedToken> tokenCache = new AtomicReference<>();

    public Free5gcService(RestTemplate rest) {
        this.rest = rest;
    }

    // ── public API ──────────────────────────────────────────────────────────

    /** All provisioned subscribers (IMSI + GPSI list). */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getSubscribers() {
        ResponseEntity<List> resp = get("/api/subscriber", List.class);
        return resp.getBody() != null ? resp.getBody() : List.of();
    }

    /** Currently registered UE contexts (active connections via AMF). */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getRegisteredUeContexts() {
        ResponseEntity<List> resp = get("/api/registered-ue-context", List.class);
        return resp.getBody() != null ? resp.getBody() : List.of();
    }

    /** NF status derived from known container names + whether WebConsole itself responds. */
    public List<NfStatusDto> getNfStatus() {
        boolean consoleUp = isConsoleReachable();
        return List.of(
            nf("NRF", "Network Repository Function",  consoleUp),
            nf("AMF", "Access and Mobility Function", consoleUp),
            nf("SMF", "Session Management Function",  consoleUp),
            nf("AUSF","Authentication Server Function",consoleUp),
            nf("UDM", "Unified Data Management",      consoleUp),
            nf("UDR", "Unified Data Repository",      consoleUp),
            nf("PCF", "Policy Control Function",      consoleUp),
            nf("NSSF","Network Slice Selection Function", consoleUp),
            nf("UPF", "User Plane Function",          false) // never on Windows
        );
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private boolean isConsoleReachable() {
        try {
            rest.headForHeaders(baseUrl + "/api/login");
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private <T> ResponseEntity<T> get(String path, Class<T> type) {
        return executeWithRetry(path, type);
    }

    private <T> ResponseEntity<T> executeWithRetry(String path, Class<T> type) {
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
        if (cached != null && cached.expiresAt.isAfter(Instant.now())) {
            return cached.token;
        }
        return login();
    }

    private String login() {
        Map<String, String> body = Map.of("username", username, "password", password);
        HttpHeaders h = new HttpHeaders();
        h.set("Content-Type", "application/json");
        @SuppressWarnings("unchecked")
        Map<String, Object> resp = rest.postForObject(baseUrl + "/api/login", new HttpEntity<>(body, h), Map.class);
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

    private static NfStatusDto nf(String type, String desc, boolean up) {
        return new NfStatusDto(type, type.toLowerCase() + "-01", desc, up ? "Up" : "Down", up);
    }

    // ── inner types ─────────────────────────────────────────────────────────

    private record CachedToken(String token, Instant expiresAt) {}
}
