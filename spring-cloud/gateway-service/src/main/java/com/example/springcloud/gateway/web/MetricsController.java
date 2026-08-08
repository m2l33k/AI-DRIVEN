package com.example.springcloud.gateway.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.DoubleFunction;

/**
 * Aggregates the platform's request/JVM metrics from Prometheus (the same data Grafana renders)
 * into a single JSON payload for the admin console. Read-only.
 */
@RestController
@RequestMapping("/api/metrics")
public class MetricsController {

	private static final Logger log = LoggerFactory.getLogger(MetricsController.class);
	private static final String COUNT = "http_server_requests_seconds_count";
	private static final String SUM = "http_server_requests_seconds_sum";

	private final WebClient prometheus;

	public MetricsController(@Value("${prometheus.base-url:http://localhost:9090}") String baseUrl) {
		this.prometheus = WebClient.create(baseUrl);
	}

	/** A scalar metric: PromQL + how to shape the resulting number into the JSON value. */
	private record Scalar(String key, String promql, DoubleFunction<Object> shape) {}

	@GetMapping("/overview")
	public Mono<Map<String, Object>> overview() {
		List<Scalar> scalars = List.of(
				new Scalar("totalRequests", "sum(" + COUNT + ")", d -> (long) d),
				new Scalar("requestsPerSecond", "sum(rate(" + COUNT + "[1m]))", d -> round(d, 2)),
				new Scalar("totalExceptions", "sum(" + COUNT + "{exception!=\"none\"})", d -> (long) d),
				new Scalar("percent2xx", "sum(" + COUNT + "{status=~\"2..\"})/sum(" + COUNT + ")", d -> round(d * 100, 1)),
				new Scalar("percent5xx", "sum(" + COUNT + "{status=~\"5..\"})/sum(" + COUNT + ")", d -> round(d * 100, 1)),
				new Scalar("processCpuPercent", "avg(process_cpu_usage)", d -> round(d * 100, 1)),
				new Scalar("heapUsedBytes", "sum(jvm_memory_used_bytes{area=\"heap\"})", d -> (long) d),
				new Scalar("liveThreads", "max(jvm_threads_live_threads)", d -> (long) d),
				new Scalar("uptimeSeconds", "max(process_uptime_seconds)", d -> (long) d)
		);

		Mono<Map<String, Object>> scalarValues = Flux.fromIterable(scalars)
				.flatMap(s -> scalar(s.promql()).map(v -> Map.entry(s.key(), s.shape().apply(v))))
				.collectMap(Map.Entry::getKey, Map.Entry::getValue);

		Mono<List<Map<String, Object>>> byUri = vector("sum by (uri)(" + COUNT + ")", "count");
		Mono<List<Map<String, Object>>> avgDuration =
				vector("sum by (uri)(" + SUM + ")/sum by (uri)(" + COUNT + ")", "seconds").map(this::toMillis);

		return Mono.zip(scalarValues, byUri, avgDuration)
				.map(t -> {
					Map<String, Object> m = new LinkedHashMap<>(t.getT1());
					m.put("requestsByUri", t.getT2());
					m.put("avgDurationByUri", t.getT3());
					return m;
				})
				.onErrorResume(e -> {
					log.error("Failed to build metrics overview from Prometheus", e);
					return Mono.just(empty());
				});
	}

	// ---- Prometheus helpers ----

	private Mono<Map<String, Object>> query(String promql) {
		// Pass PromQL as a template variable so its specials ({ } " spaces =~) are URL-encoded.
		return prometheus.get()
				.uri("/api/v1/query?query={q}", promql)
				.retrieve()
				.bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
				.doOnError(e -> log.warn("Prometheus query failed [{}]: {}", promql, e.toString()));
	}

	private Mono<Double> scalar(String promql) {
		return query(promql).map(resp -> {
			List<?> result = results(resp);
			return result.isEmpty() ? 0.0 : value(((Map<?, ?>) result.get(0)).get("value"));
		}).onErrorReturn(0.0);
	}

	private Mono<List<Map<String, Object>>> vector(String promql, String valueName) {
		return query(promql).map(resp -> results(resp).stream().map(r -> {
			Map<?, ?> row = (Map<?, ?>) r;
			Object uri = row.get("metric") instanceof Map<?, ?> metric ? metric.get("uri") : null;
			Map<String, Object> o = new LinkedHashMap<>();
			o.put("uri", uri == null ? "UNKNOWN" : uri);
			o.put(valueName, value(row.get("value")));
			return o;
		}).toList()).onErrorReturn(List.of());
	}

	@SuppressWarnings("unchecked")
	private static List<?> results(Map<String, Object> resp) {
		if (resp != null && resp.get("data") instanceof Map<?, ?> d && d.get("result") instanceof List<?> r) {
			return r;
		}
		return List.of();
	}

	/** Prometheus value tuple is [timestamp, "stringValue"]. */
	private static double value(Object tuple) {
		if (tuple instanceof List<?> v && v.size() == 2) {
			try {
				double d = Double.parseDouble(String.valueOf(v.get(1)));
				return Double.isFinite(d) ? d : 0.0;
			} catch (NumberFormatException ignored) {
				return 0.0;
			}
		}
		return 0.0;
	}

	private List<Map<String, Object>> toMillis(List<Map<String, Object>> rows) {
		return rows.stream().map(row -> {
			Map<String, Object> out = new LinkedHashMap<>();
			out.put("uri", row.get("uri"));
			out.put("ms", round(((Number) row.get("seconds")).doubleValue() * 1000, 1));
			return out;
		}).toList();
	}

	private static double round(double v, int places) {
		double f = Math.pow(10, places);
		return Math.round(v * f) / f;
	}

	private static Map<String, Object> empty() {
		Map<String, Object> m = new LinkedHashMap<>();
		m.put("totalRequests", 0L);
		m.put("requestsPerSecond", 0.0);
		m.put("totalExceptions", 0L);
		m.put("percent2xx", 0.0);
		m.put("percent5xx", 0.0);
		m.put("processCpuPercent", 0.0);
		m.put("heapUsedBytes", 0L);
		m.put("liveThreads", 0L);
		m.put("uptimeSeconds", 0L);
		m.put("requestsByUri", List.of());
		m.put("avgDurationByUri", List.of());
		return m;
	}
}
