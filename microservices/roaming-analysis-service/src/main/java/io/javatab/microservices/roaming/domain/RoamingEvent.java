package io.javatab.microservices.roaming.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A single roaming event observed at the network edge (e.g. from GRX/IPX signalling), persisted
 * in MySQL. Carries both the raw risk signals and the measured QoS / commercial metrics.
 *
 * <p>Accessor methods keep the record-style names ({@code id()}, {@code subscribers()}, …) so the
 * analysis/service layers read the same as before. JPA uses field access.</p>
 */
@Entity
@Table(name = "roaming_events")
public class RoamingEvent {

	@Id
	private String id;
	private Instant timestamp;
	@Enumerated(EnumType.STRING)
	private Direction direction;
	@Column(name = "partner_plmn")
	private String partnerPlmn;
	private String country;
	private int subscribers;
	@Column(name = "signaling_errors")
	private int signalingErrors;
	@Column(name = "new_device_ratio")
	private double newDeviceRatio;
	@Column(name = "impossible_travel")
	private boolean impossibleTravel;

	// ---- QoS / customer-experience metrics ----
	@Column(name = "data_volume_gb")
	private double dataVolumeGb;
	@Column(name = "avg_latency_ms")
	private double avgLatencyMs;
	@Column(name = "throughput_mbps")
	private double throughputMbps;
	@Column(name = "dropped_session_ratio")
	private double droppedSessionRatio;

	// ---- Commercial metrics ----
	@Column(name = "revenue_eur")
	private double revenueEur;
	@Column(name = "cost_eur")
	private double costEur;

	protected RoamingEvent() {
	}

	public RoamingEvent(String id, Instant timestamp, Direction direction, String partnerPlmn, String country,
						int subscribers, int signalingErrors, double newDeviceRatio, boolean impossibleTravel,
						double dataVolumeGb, double avgLatencyMs, double throughputMbps, double droppedSessionRatio,
						double revenueEur, double costEur) {
		this.id = id;
		this.timestamp = timestamp;
		this.direction = direction;
		this.partnerPlmn = partnerPlmn;
		this.country = country;
		this.subscribers = subscribers;
		this.signalingErrors = signalingErrors;
		this.newDeviceRatio = newDeviceRatio;
		this.impossibleTravel = impossibleTravel;
		this.dataVolumeGb = dataVolumeGb;
		this.avgLatencyMs = avgLatencyMs;
		this.throughputMbps = throughputMbps;
		this.droppedSessionRatio = droppedSessionRatio;
		this.revenueEur = revenueEur;
		this.costEur = costEur;
	}

	public String id() { return id; }
	public Instant timestamp() { return timestamp; }
	public Direction direction() { return direction; }
	public String partnerPlmn() { return partnerPlmn; }
	public String country() { return country; }
	public int subscribers() { return subscribers; }
	public int signalingErrors() { return signalingErrors; }
	public double newDeviceRatio() { return newDeviceRatio; }
	public boolean impossibleTravel() { return impossibleTravel; }
	public double dataVolumeGb() { return dataVolumeGb; }
	public double avgLatencyMs() { return avgLatencyMs; }
	public double throughputMbps() { return throughputMbps; }
	public double droppedSessionRatio() { return droppedSessionRatio; }
	public double revenueEur() { return revenueEur; }
	public double costEur() { return costEur; }
	public double marginEur() { return revenueEur - costEur; }
}
