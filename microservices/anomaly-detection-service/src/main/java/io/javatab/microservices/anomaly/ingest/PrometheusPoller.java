package io.javatab.microservices.anomaly.ingest;

import io.javatab.microservices.anomaly.engine.RuleEngine;
import io.javatab.microservices.anomaly.engine.ZScoreEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Component
public class PrometheusPoller {

    private static final Logger log = LoggerFactory.getLogger(PrometheusPoller.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final RuleEngine rules;
    private final ZScoreEngine zscore;

    @Value("${anomaly.prometheus-url:http://localhost:9090}")
    private String prometheusUrl;

    public PrometheusPoller(RuleEngine rules, ZScoreEngine zscore) {
        this.rules = rules;
        this.zscore = zscore;
    }

    @Scheduled(fixedDelayString = "${anomaly.poll-interval-ms:10000}")
    public void poll() {
        double regRate      = query("rate(amf_reg_requests_total[30s])");
        double authFailRate = query("rate(amf_auth_failure_total[30s])");

        log.debug("poll regRate={} authFailRate={}", regRate, authFailRate);

        rules.evaluate(regRate, authFailRate, 0);
        zscore.evaluate(regRate, authFailRate);
    }

    @SuppressWarnings("unchecked")
    private double query(String promql) {
        try {
            String encoded = URLEncoder.encode(promql, StandardCharsets.UTF_8);
            String url = prometheusUrl + "/api/v1/query?query=" + encoded;
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null) return 0;
            Map<String, Object> data = (Map<String, Object>) response.get("data");
            if (data == null) return 0;
            List<Object> result = (List<Object>) data.get("result");
            if (result == null || result.isEmpty()) return 0;
            Map<String, Object> first = (Map<String, Object>) result.get(0);
            List<Object> value = (List<Object>) first.get("value");
            if (value == null || value.size() < 2) return 0;
            return Double.parseDouble(value.get(1).toString());
        } catch (Exception e) {
            log.debug("Prometheus query failed ({}): {}", promql, e.getMessage());
            return 0;
        }
    }
}
