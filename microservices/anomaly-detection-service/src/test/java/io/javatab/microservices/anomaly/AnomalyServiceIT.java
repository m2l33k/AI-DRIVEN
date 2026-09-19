package io.javatab.microservices.anomaly;

import io.javatab.microservices.anomaly.model.AnomalyEvent;
import io.javatab.microservices.anomaly.model.Severity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AnomalyServiceIT {

    @Autowired
    private TestRestTemplate rest;

    @Test
    void healthEndpointIsUp() {
        ResponseEntity<Map> resp = rest.getForEntity("/api/anomaly/health", Map.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).containsEntry("status", "UP");
    }

    @Test
    void injectEventAppearsInEventList() {
        AnomalyEvent event = AnomalyEvent.builder()
                .type("AUTH_FLOOD")
                .severity(Severity.HIGH)
                .targetNf("AMF")
                .metric("amf_auth_failure_total")
                .observedRate(250.0)
                .threshold(100.0)
                .zScore(3.5)
                .message("IT: auth flood detected")
                .build();

        ResponseEntity<AnomalyEvent> inject = rest.postForEntity(
                "/api/anomaly/inject", event, AnomalyEvent.class);
        assertThat(inject.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(inject.getBody()).isNotNull();
        assertThat(inject.getBody().type()).isEqualTo("AUTH_FLOOD");
        assertThat(inject.getBody().severity()).isEqualTo(Severity.HIGH);

        String injectedId = inject.getBody().id();

        ResponseEntity<AnomalyEvent[]> events = rest.getForEntity(
                "/api/anomaly/events?limit=200", AnomalyEvent[].class);
        assertThat(events.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(events.getBody()).extracting(AnomalyEvent::id).contains(injectedId);
    }

    @Test
    void clearEventsReturnsNoContent() {
        rest.postForEntity("/api/anomaly/inject",
                AnomalyEvent.builder().type("NOISE").message("clear-test").build(),
                AnomalyEvent.class);

        ResponseEntity<Void> clear = rest.exchange(
                "/api/anomaly/events", HttpMethod.DELETE, null, Void.class);
        assertThat(clear.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<AnomalyEvent[]> after = rest.getForEntity(
                "/api/anomaly/events", AnomalyEvent[].class);
        assertThat(after.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(after.getBody()).isEmpty();
    }
}
