package com.example.springcloud.gateway.ratelimit;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Wires the rate-limit enforcement collaborators: a Eureka-aware ({@link LoadBalanced}) WebClient
 * builder so {@link RateLimitClient} can resolve {@code lb://rate-limiting-service}, and the
 * {@link RateLimitProperties} binding.
 */
@Configuration
@EnableConfigurationProperties(RateLimitProperties.class)
public class RateLimitConfig {

	@Bean
	@LoadBalanced
	public WebClient.Builder loadBalancedWebClientBuilder() {
		return WebClient.builder();
	}
}
