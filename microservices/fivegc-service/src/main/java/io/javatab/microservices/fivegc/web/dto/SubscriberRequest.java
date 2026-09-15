package io.javatab.microservices.fivegc.web.dto;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.LinkedHashMap;
import java.util.Map;

@Schema(description = "Full subscriber provisioning request sent to free5GC UDR")
public class SubscriberRequest {

    @Schema(example = "imsi-208930000000001", required = true)
    public String ueId;

    @Schema(example = "20893", description = "MCC+MNC of the PLMN (5 or 6 digits)")
    public String plmnID;

    @Schema(example = "1")
    public Integer userNumber;

    @Schema(description = "Authentication credentials — K, OPc, SeqNum, AMF")
    public Map<String, Object> AuthenticationSubscription;

    @Schema(description = "Mobility subscription — AMBR, NSSAI, GPSIs")
    public Map<String, Object> AccessAndMobilitySubscriptionData;

    @Schema(description = "Per-slice session configuration (DNN, QoS, session AMBR)")
    public Object SessionManagementSubscriptionData;

    @Schema(description = "SMF slice selection data")
    public Map<String, Object> SmfSelectionSubscriptionData;

    @Schema(description = "AM policy subscription categories")
    public Map<String, Object> AmPolicyData;

    @Schema(description = "SM policy per-SNSSAI data")
    public Map<String, Object> SmPolicyData;

    @Schema(description = "Packet-filter based flow rules for QoS enforcement")
    public Object FlowRules;

    @Schema(description = "GBR/MBR QoS flow descriptors")
    public Object QosFlows;

    @Schema(description = "Offline/Online charging entries per flow")
    public Object ChargingDatas;

    private final Map<String, Object> extra = new LinkedHashMap<>();

    @JsonAnySetter
    public void set(String key, Object value) { extra.put(key, value); }

    @JsonAnyGetter
    public Map<String, Object> getExtra() { return extra; }
}
