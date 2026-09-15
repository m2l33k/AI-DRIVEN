package io.javatab.microservices.fivegc.web.dto;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.LinkedHashMap;
import java.util.Map;

@Schema(description = "Subscription profile stored in free5GC WebConsole — reusable template for subscriber provisioning")
public class ProfileRequest {

    @Schema(example = "default", required = true, description = "Unique profile name")
    public String profileName;

    @Schema(description = "Mobility subscription defaults — AMBR, NSSAI, GPSIs")
    public Map<String, Object> AccessAndMobilitySubscriptionData;

    @Schema(description = "Per-slice session configuration (DNN, QoS, session AMBR)")
    public Object SessionManagementSubscriptionData;

    @Schema(description = "SMF slice selection data")
    public Map<String, Object> SmfSelectionSubscriptionData;

    @Schema(description = "AM policy subscription categories")
    public Map<String, Object> AmPolicyData;

    @Schema(description = "SM policy per-SNSSAI data")
    public Map<String, Object> SmPolicyData;

    @Schema(description = "Packet-filter based flow rules")
    public Object FlowRules;

    @Schema(description = "GBR/MBR QoS flow descriptors")
    public Object QosFlows;

    @Schema(description = "Offline/Online charging entries")
    public Object ChargingDatas;

    private final Map<String, Object> extra = new LinkedHashMap<>();

    @JsonAnySetter
    public void set(String key, Object value) { extra.put(key, value); }

    @JsonAnyGetter
    public Map<String, Object> getExtra() { return extra; }
}
