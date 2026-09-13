package io.javatab.microservices.roaming.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

/** Status response from the Django ML training endpoint. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MlTrainStatusDto(
        String status,
        @JsonProperty("started_at")  String startedAt,
        @JsonProperty("finished_at") String finishedAt,
        @JsonProperty("data_points") int dataPoints,
        @JsonProperty("train_points") int trainPoints,
        @JsonProperty("test_points")  int testPoints,
        Map<String, Object> metrics,
        String error
) {}
