package io.javatab.microservices.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.javatab.microservices.audit.model.AuditEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.Instant;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class AuditServiceIT {

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
        mvc.perform(get("/api/audit/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")))
                .andExpect(jsonPath("$.timestamp", notNullValue()));
    }

    @Test
    void appendLogEntryAndQueryByActor() throws Exception {
        AuditEntry entry = new AuditEntry(
                null, Instant.now(),
                "it-test-actor", "SECURITY_ANALYST",
                "rules:create", "/api/rules",
                "Allowed", "10.0.0.1", "Integration test entry");

        mvc.perform(post("/api/audit/logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(entry)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.actor", is("it-test-actor")))
                .andExpect(jsonPath("$.action", is("rules:create")));

        mvc.perform(get("/api/audit/logs?actor=it-test-actor&limit=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$[0].actor", is("it-test-actor")));
    }

    @Test
    void queryByOutcomeFilterWorks() throws Exception {
        AuditEntry denied = new AuditEntry(null, Instant.now(), "filter-actor", "AUDITOR",
                "resource:read", "/api/roaming", "Denied", "10.0.0.2", null);

        mvc.perform(post("/api/audit/logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(denied)))
                .andExpect(status().isOk());

        mvc.perform(get("/api/audit/logs?outcome=Denied&limit=50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(1)));
    }

    @Test
    void statsReturns7DayBuckets() throws Exception {
        mvc.perform(get("/api/audit/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perDay").isArray())
                .andExpect(jsonPath("$.dayLabels").isArray())
                .andExpect(jsonPath("$.total", greaterThanOrEqualTo(0)));
    }
}
