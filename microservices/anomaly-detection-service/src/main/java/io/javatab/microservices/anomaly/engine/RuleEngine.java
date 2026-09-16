package io.javatab.microservices.anomaly.engine;

import io.javatab.microservices.anomaly.model.AnomalyEvent;
import io.javatab.microservices.anomaly.model.Severity;
import io.javatab.microservices.anomaly.store.AnomalyStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

@Component
public class RuleEngine {

    private final AnomalyStore store;

    @Value("${anomaly.reg-flood-threshold:20.0}")
    private double regFloodThreshold;

    // deduplicate: don't re-fire the same alert within this many seconds
    private static final long DEDUP_SECONDS = 30;
    private long lastFloodAlertEpoch = 0;
    private long lastEnumAlertEpoch  = 0;

    private final Deque<Long> recentFailureImsis = new ArrayDeque<>();

    public RuleEngine(AnomalyStore store) {
        this.store = store;
    }

    public void evaluate(double regRate, double authFailRate, long latestFailImsi) {
        checkRegistrationFlood(regRate);
        if (latestFailImsi > 0) {
            trackImsi(latestFailImsi);
            checkImsiEnumeration(authFailRate);
        }
    }

    private void checkRegistrationFlood(double regRate) {
        long now = System.currentTimeMillis() / 1000;
        if (regRate > regFloodThreshold && (now - lastFloodAlertEpoch) > DEDUP_SECONDS) {
            lastFloodAlertEpoch = now;
            store.add(AnomalyEvent.builder()
                    .type("REGISTRATION_FLOOD")
                    .severity(Severity.CRITICAL)
                    .targetNf("AMF")
                    .metric("amf_reg_requests_total")
                    .observedRate(regRate)
                    .threshold(regFloodThreshold)
                    .message("Registration flood: %.1f req/s (threshold %.0f/s)".formatted(regRate, regFloodThreshold))
                    .build());
        }
    }

    private void trackImsi(long imsi) {
        recentFailureImsis.addLast(imsi);
        while (recentFailureImsis.size() > 60) recentFailureImsis.removeFirst();
    }

    private void checkImsiEnumeration(double authFailRate) {
        long now = System.currentTimeMillis() / 1000;
        if (recentFailureImsis.size() >= 5
                && isSequential(new ArrayList<>(recentFailureImsis), 2, 5)
                && (now - lastEnumAlertEpoch) > DEDUP_SECONDS) {
            lastEnumAlertEpoch = now;
            store.add(AnomalyEvent.builder()
                    .type("IMSI_ENUMERATION")
                    .severity(Severity.HIGH)
                    .targetNf("AMF/UDM")
                    .metric("amf_auth_failure_total")
                    .observedRate(authFailRate)
                    .message("Sequential IMSI probe: %d attempts in window".formatted(recentFailureImsis.size()))
                    .build());
        }
    }

    private boolean isSequential(List<Long> imsis, int maxGap, int minRun) {
        int run = 1;
        for (int i = 1; i < imsis.size(); i++) {
            long diff = Math.abs(imsis.get(i) - imsis.get(i - 1));
            if (diff <= maxGap) {
                if (++run >= minRun) return true;
            } else {
                run = 1;
            }
        }
        return false;
    }
}
