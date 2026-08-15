package io.javatab.microservices.roaming.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Per-data-session QoS measurements from {@code session_qos.csv}, linked to a {@link RoamingCdr} via
 * {@code cdrId}. Feeds the QoS / customer-experience analytics (throughput, latency, packet loss,
 * drop reasons) per visited operator.
 */
@Entity
@Table(name = "session_qos", indexes = {
		@Index(name = "idx_qos_visited", columnList = "visited_operator_id"),
		@Index(name = "idx_qos_cdr", columnList = "cdr_id")
})
public class SessionQos {

	@Id
	@Column(name = "session_id")
	private String sessionId;
	@Column(name = "cdr_id")
	private String cdrId;
	@Column(name = "subscriber_imsi")
	private String subscriberImsi;
	@Column(name = "home_operator_id")
	private String homeOperatorId;
	@Column(name = "visited_operator_id")
	private String visitedOperatorId;
	@Column(name = "serving_cell_id")
	private String servingCellId;
	@Column(name = "session_start_datetime")
	private Instant sessionStartDatetime;
	@Column(name = "session_end_datetime")
	private Instant sessionEndDatetime;
	@Column(name = "download_mb")
	private Double downloadMb;
	@Column(name = "upload_mb")
	private Double uploadMb;
	@Column(name = "avg_throughput_mbps")
	private Double avgThroughputMbps;
	@Column(name = "latency_ms")
	private Double latencyMs;
	@Column(name = "packet_loss_pct")
	private Double packetLossPct;
	@Column(name = "session_status")
	private String sessionStatus;
	@Column(name = "drop_reason")
	private String dropReason;

	protected SessionQos() {
	}

	public SessionQos(String sessionId, String cdrId, String subscriberImsi, String homeOperatorId,
					  String visitedOperatorId, String servingCellId, Instant sessionStartDatetime,
					  Instant sessionEndDatetime, Double downloadMb, Double uploadMb, Double avgThroughputMbps,
					  Double latencyMs, Double packetLossPct, String sessionStatus, String dropReason) {
		this.sessionId = sessionId;
		this.cdrId = cdrId;
		this.subscriberImsi = subscriberImsi;
		this.homeOperatorId = homeOperatorId;
		this.visitedOperatorId = visitedOperatorId;
		this.servingCellId = servingCellId;
		this.sessionStartDatetime = sessionStartDatetime;
		this.sessionEndDatetime = sessionEndDatetime;
		this.downloadMb = downloadMb;
		this.uploadMb = uploadMb;
		this.avgThroughputMbps = avgThroughputMbps;
		this.latencyMs = latencyMs;
		this.packetLossPct = packetLossPct;
		this.sessionStatus = sessionStatus;
		this.dropReason = dropReason;
	}

	public String sessionId() { return sessionId; }
	public String cdrId() { return cdrId; }
	public String subscriberImsi() { return subscriberImsi; }
	public String homeOperatorId() { return homeOperatorId; }
	public String visitedOperatorId() { return visitedOperatorId; }
	public String servingCellId() { return servingCellId; }
	public Instant sessionStartDatetime() { return sessionStartDatetime; }
	public Instant sessionEndDatetime() { return sessionEndDatetime; }
	public Double downloadMb() { return downloadMb; }
	public Double uploadMb() { return uploadMb; }
	public Double avgThroughputMbps() { return avgThroughputMbps; }
	public Double latencyMs() { return latencyMs; }
	public Double packetLossPct() { return packetLossPct; }
	public String sessionStatus() { return sessionStatus; }
	public String dropReason() { return dropReason; }
}
