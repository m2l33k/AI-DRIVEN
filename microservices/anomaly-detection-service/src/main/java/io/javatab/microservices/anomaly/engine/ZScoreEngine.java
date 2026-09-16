package io.javatab.microservices.anomaly.engine;

import io.javatab.microservices.anomaly.model.AnomalyEvent;
import io.javatab.microservices.anomaly.model.Severity;
import io.javatab.microservices.anomaly.store.AnomalyStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ZScoreEngine {

    private final AnomalyStore store;

    @Value("${anomaly.zscore-threshold:3.0}")
    private double zThreshold;

    @Value("${anomaly.window-size:30}")
    private int windowSize;

    private SlidingWindow regRateWindow;
    private SlidingWindow authFailWindow;

    // dedup: don't re-fire within 60s
    private long lastZAlertEpoch = 0;
    private static final long DEDUP_SECONDS = 60;

    public ZScoreEngine(AnomalyStore store) {
        this.store = store;
    }

    // lazy-init so @Value fields are available
    private SlidingWindow regWindow() {
        if (regRateWindow == null) regRateWindow = new SlidingWindow(windowSize);
        return regRateWindow;
    }

    private SlidingWindow authWindow() {
        if (authFailWindow == null) authFailWindow = new SlidingWindow(windowSize);
        return authFailWindow;
    }

    public void evaluate(double regRate, double authFailRate) {
        regWindow().add(regRate);
        authWindow().add(authFailRate);

        check("AMF", "amf_reg_requests_total", regRate, regWindow());
        check("AMF/UDM", "amf_auth_failure_total", authFailRate, authWindow());
    }

    private void check(String nf, String metric, double current, SlidingWindow window) {
        if (window.size() < 10) return;
        double stddev = window.stddev();
        if (stddev == 0) return;
        double z = (current - window.mean()) / stddev;
        long now = System.currentTimeMillis() / 1000;
        if (z > zThreshold && (now - lastZAlertEpoch) > DEDUP_SECONDS) {
            lastZAlertEpoch = now;
            store.add(AnomalyEvent.builder()
                    .type("AUTH_FAILURE_SPIKE")
                    .severity(Severity.MEDIUM)
                    .targetNf(nf)
                    .metric(metric)
                    .observedRate(current)
                    .zScore(z)
                    .message("%s rate %.2fσ above baseline".formatted(metric, z))
                    .build());
        }
    }
}
