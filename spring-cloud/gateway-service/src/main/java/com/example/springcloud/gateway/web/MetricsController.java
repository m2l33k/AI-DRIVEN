package com.example.springcloud.gateway.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Aggregates the platform's request/JVM metrics from Prometheus (the same data Grafana renders)
 * into a single JSON payload for the admin console. Read-only; gated on platform-config:read.
 */
@RestController
@RequestMapping("/api/metrics")
public class MetricsController {

	private static final String COUNT = "http_server_requests_seconds_count";
	private static final String SUM = "http_server_requests_seconds_sum";

	private final WebClient prometheus;

	public MetricsController(@Value("${prometheus.base-url:http://localhost:9090}") String baseUrl) {
		this.prometheus = WebClient.create(baseUrl);
	}

	/** Curated overview across all scraped services (optionally narrowed later by application label). */
	@GetMapping("/overview")
	public Mono<Map<String, Object>> overview() {
		List<Mono<?>> parts = List.of(
				scalar("sum(" + COUNT + ")"),                                   // 0 total requests
				scalar("sum(rate(" + COUNT + "[1m]))"),                         // 1 requests/sec
				scalar("sum(" + COUNT + "{exception!=\"none\"})"),             // 2 exceptions
				scalar("sum(" + COUNT + "{status=~\"2..\"})/sum(" + COUNT + ")"), // 3 %2xx (0..1)
				scalar("sum(" + COUNT + "{status=~\"5..\"})/sum(" + COUNT + ")"), // 4 %5xx (0..1)
				scalar("avg(process_cpu_usage)"),                              // 5 cpu (0..1)
				scalar("sum(jvm_memory_used_bytes{area=\"heap\"})"),          // 6 heap bytes
				scalar("max(jvm_threads_live_threads)"),                      // 7 threads
				scalar("max(process_uptime_seconds)"),                        // 8 uptime s
				vector("sum by (uri)(" + COUNT + ")", "uri", "count"),        // 9 by uri
				vector("sum by (uri)(" + SUM + ")/sum by (uri)(" + COUNT + ")", "uri", "seconds") // 10 avg dur
		);

		return Mono.zip(parts, arr -> {
			Map<String, Object> m = new LinkedHashMap<>();
			m.put("totalRequests", ((Double) arr[0]).longValue());
			m.put("requestsPerSecond", round((Double) arr[1], 2));
			m.put("totalExceptions", ((Double) arr[2]).longValue());
			m.put("percent2xx", round((Double) arr[3] * 100, 1));
			m.put("percent5xx", round((Double) arr[4] * 100, 1));
			m.put("processCpuPercent", round((Double) arr[5] * 100, 1));
			m.put("heapUsedBytes", ((Double) arr[6]).longValue());
			m.put("liveThreads", ((Double) arr[7]).longValue());
			m.put("uptimeSeconds", ((Double) arr[8]).longValue());
			m.put("requestsByUri", arr[9]);
			m.put("avgDurationByUri", toMillis((List<?>) arr[10]));
			return m;
		});
	}

	// ---- Prometheus helpers ----

	private Mono<Map<String, Object>> query(String promql) {
		return prometheus.get()
				.uri(b -> b.path("/api/v1/query").queryParam("query", promql).build())
				.retrieve()
				.bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
	}

	/** Single scalar result (first series' value), 0 on empty/NaN/error. */
	private Mono<Double> scalar(String promql) {
		return query(promql).map(resp -> {
			List<?> result = results(resp);
			if (result.isEmpty()) return 0.0;
			return value(((Map<?, ?>) result.get(0)).get("value"));
		}).onErrorReturn(0.0);
	}

	/** One entry per label value: {labelKey: <label>, valueName: <number>}. */
	private Mono<List<Map<String, Object>>> vector(String promql, String labelKey, String valueName) {
		return query(promql).map(resp -> results(resp).stream().map(r -> {
			Map<?, ?> row = (Map<?, ?>) r;
			Map<?, ?> metric = (Map<?, ?>) row.get("metric");
			Map<String, Object> o = new LinkedHashMap<>();
			Object label = metric == null ? null : metric.get(labelKey);
			o.put(labelKey, label == null ? "UNKNOWN" : label);
			o.put(valueName, value(row.get("value")));
			return o;
		}).toList()).onErrorReturn(List.of());
	}

	@SuppressWarnings("unchecked")
	private static List<?> results(Map<String, Object> resp) {
		Object data = resp.get("data");
		if (!(data instanceof Map<?, ?> d) || !(d.get("result") instanceof List<?> r)) {
			return List.of();
		}
		return r;
	}

	/** Prometheus value tuple is [timestamp, "stringValue"]. */
	private static double value(Object valueTuple) {
		if (valueTuple instanceof List<?> v && v.size() == 2) {
			try {
				double d = Double.parseDouble(String.valueOf(v.get(1)));
				return Double.isFinite(d) ? d : 0.0;
			} catch (NumberFormatException ignored) {
				return 0.0;
			}
		}
		return 0.0;
	}

	private static List<Map<String, Object>> toMillis(List<?> seconds) {
		return seconds.stream().map(o -> {
			Map<?, ?> row = (Map<?, ?>) o;
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
}
