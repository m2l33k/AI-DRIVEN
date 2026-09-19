package io.javatab.microservices.anomaly;

import io.javatab.microservices.anomaly.model.AnomalyEvent;
import io.javatab.microservices.anomaly.model.Severity;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class AnomalyServiceIT {

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private ObjectMapper mapper;

    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(wac).build();
    }

    @Test
    void healthEndpointIsUp() throws Exception {
        mvc.perform(get("/api/anomaly/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void injectEventAppearsInEventList() throws Exception {
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

        String body = mvc.perform(post("/api/anomaly/inject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(event)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("AUTH_FLOOD"))
                .andReturn().getResponse().getContentAsString();

        String id = mapper.readTree(body).get("id").asText();

        mvc.perform(get("/api/anomaly/events?limit=200"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(id)));
    }

    @Test
    void clearEventsReturnsNoContent() throws Exception {
        mvc.perform(post("/api/anomaly/inject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(
                                AnomalyEvent.builder().type("NOISE").message("clear-test").build())))
                .andExpect(status().isOk());

        mvc.perform(delete("/api/anomaly/events"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/anomaly/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
