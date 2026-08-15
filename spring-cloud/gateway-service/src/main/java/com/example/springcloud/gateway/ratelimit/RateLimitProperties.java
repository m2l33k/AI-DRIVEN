package com.example.springcloud.gateway.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Configuration for the gateway's rate-limit enforcement filter ({@code protection.enforcement.*}).
 */
@ConfigurationProperties(prefix = "protection.enforcement")
public class RateLimitProperties {

	/** Master switch — when false the gateway forwards everything without consulting the limiter. */
	private boolean enabled = true;

	/**
	 * When the limiter is unreachable or errors, allow the request through (true) rather than
	 * blocking it (false). Fail-open by default so the limiter can never take the platform down.
	 */
	private boolean failOpen = true;

	/** How many tokens each request consumes. */
	private int tokensPerRequest = 1;

	/**
	 * Path prefixes never subjected to rate limiting (infra, docs, auth and the limiter's own API).
	 * Any request whose path starts with one of these — or contains {@code /v3/api-docs} — is skipped.
	 */
	private List<String> excludedPaths = List.of(
			"/api/protection", "/internal", "/actuator", "/swagger-ui", "/eureka");

	public boolean isEnabled() { return enabled; }
	public void setEnabled(boolean enabled) { this.enabled = enabled; }

	public boolean isFailOpen() { return failOpen; }
	public void setFailOpen(boolean failOpen) { this.failOpen = failOpen; }

	public int getTokensPerRequest() { return tokensPerRequest; }
	public void setTokensPerRequest(int tokensPerRequest) { this.tokensPerRequest = tokensPerRequest; }

	public List<String> getExcludedPaths() { return excludedPaths; }
	public void setExcludedPaths(List<String> excludedPaths) { this.excludedPaths = excludedPaths; }
}
