package com.example.springcloud.gateway.ratelimit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

/**
 * Enforces the rate-limiting-service's policies on <b>all</b> traffic the gateway forwards to
 * downstream 5GC services. This is the one choke point every request passes through, so a policy
 * edit in the console (e.g. lowering the {@code ip} bucket) immediately protects roaming, anomaly,
 * audit, etc. without touching those services.
 *
 * <p>For each request it derives a {@code (keyType, key)} — by subscriber IMSI or operator id when
 * those headers are present, otherwise by client IP — asks the limiter, and short-circuits with
 * {@code 429 Too Many Requests} + {@code Retry-After} when denied. Infra/docs/auth and the limiter's
 * own endpoints are skipped, and any limiter error is <b>fail-open</b> by default so the limiter can
 * never take the platform down.</p>
 */
@Component
public class RateLimitGlobalFilter implements GlobalFilter, Ordered {

	private static final Logger log = LoggerFactory.getLogger(RateLimitGlobalFilter.class);

	private static final String HDR_IMSI = "X-Subscriber-Imsi";
	private static final String HDR_OPERATOR = "X-Operator-Id";

	private final RateLimitClient client;
	private final RateLimitProperties props;

	public RateLimitGlobalFilter(RateLimitClient client, RateLimitProperties props) {
		this.client = client;
		this.props = props;
	}

	@Override
	public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
		ServerHttpRequest request = exchange.getRequest();
		String path = request.getPath().value();

		if (!props.isEnabled() || isExcluded(path)) {
			return chain.filter(exchange);
		}

		String[] key = resolveKey(request);
		return client.check(key[0], key[1], props.getTokensPerRequest())
				.flatMap(decision -> decision.allowed()
						? chain.filter(exchange)
						: reject(exchange, decision))
				.onErrorResume(err -> {
					// Limiter unreachable / errored — fail open (or hard-fail) per config.
					if (props.isFailOpen()) {
						log.warn("Rate limiter unavailable ({}), failing open for {}", err.toString(), path);
						return chain.filter(exchange);
					}
					log.warn("Rate limiter unavailable ({}), failing closed for {}", err.toString(), path);
					return writeStatus(exchange, HttpStatus.SERVICE_UNAVAILABLE, 0, 0, "limiter_unavailable");
				});
	}

	/** IMSI → operator → client IP, mapping onto the seeded policy key types (imsi/operator/ip). */
	private String[] resolveKey(ServerHttpRequest request) {
		String imsi = request.getHeaders().getFirst(HDR_IMSI);
		if (imsi != null && !imsi.isBlank()) {
			return new String[]{"imsi", imsi.trim()};
		}
		String operator = request.getHeaders().getFirst(HDR_OPERATOR);
		if (operator != null && !operator.isBlank()) {
			return new String[]{"operator", operator.trim()};
		}
		return new String[]{"ip", clientIp(request)};
	}

	private static String clientIp(ServerHttpRequest request) {
		String xff = request.getHeaders().getFirst("X-Forwarded-For");
		if (xff != null && !xff.isBlank()) {
			return xff.split(",")[0].trim();
		}
		return request.getRemoteAddress() != null
				? request.getRemoteAddress().getAddress().getHostAddress()
				: "unknown";
	}

	private boolean isExcluded(String path) {
		if (path.contains("/v3/api-docs")) {
			return true;
		}
		for (String prefix : props.getExcludedPaths()) {
			if (path.startsWith(prefix)) {
				return true;
			}
		}
		return false;
	}

	private Mono<Void> reject(ServerWebExchange exchange, RateLimitClient.Decision d) {
		return writeStatus(exchange, HttpStatus.TOO_MANY_REQUESTS, d.remaining(), d.retryAfterMs(), "rate_limited");
	}

	private Mono<Void> writeStatus(ServerWebExchange exchange, HttpStatus status, long remaining,
								   long retryAfterMs, String error) {
		ServerHttpResponse response = exchange.getResponse();
		response.setStatusCode(status);
		response.getHeaders().set("X-RateLimit-Remaining", Long.toString(Math.max(0, remaining)));
		response.getHeaders().set("Retry-After", Long.toString(Math.max(0, retryAfterMs / 1000)));
		response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
		String body = "{\"error\":\"" + error + "\",\"retryAfterMs\":" + Math.max(0, retryAfterMs) + "}";
		DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
		return response.writeWith(Mono.just(buffer));
	}

	@Override
	public int getOrder() {
		// Run early, before the routing/forward filters, so a denied request is never proxied.
		return Ordered.HIGHEST_PRECEDENCE + 100;
	}
}
