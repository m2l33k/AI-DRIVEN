package io.javatab.microservices.roaming.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A mobility (handover / TAU) event from {@code handover_events.csv}. Handover failure ratios and
 * {@code failureCause} per cell/operator feed the mobility-quality analytics.
 */
@Entity
@Table(name = "handover_events", indexes = {
		@Index(name = "idx_ho_visited", columnList = "visited_operator_id"),
		@Index(name = "idx_ho_status", columnList = "handover_status")
})
public class HandoverEvent {

	@Id
	@Column(name = "handover_id")
	private String handoverId;
	@Column(name = "subscriber_imsi")
	private String subscriberImsi;
	@Column(name = "visited_operator_id")
	private String visitedOperatorId;
	@Column(name = "source_cell_id")
	private String sourceCellId;
	@Column(name = "target_cell_id")
	private String targetCellId;
	@Column(name = "event_datetime")
	private Instant eventDatetime;
	@Column(name = "event_type")
	private String eventType;
	@Column(name = "handover_status")
	private String handoverStatus;
	@Column(name = "failure_cause")
	private String failureCause;

	protected HandoverEvent() {
	}

	public HandoverEvent(String handoverId, String subscriberImsi, String visitedOperatorId, String sourceCellId,
						 String targetCellId, Instant eventDatetime, String eventType, String handoverStatus,
						 String failureCause) {
		this.handoverId = handoverId;
		this.subscriberImsi = subscriberImsi;
		this.visitedOperatorId = visitedOperatorId;
		this.sourceCellId = sourceCellId;
		this.targetCellId = targetCellId;
		this.eventDatetime = eventDatetime;
		this.eventType = eventType;
		this.handoverStatus = handoverStatus;
		this.failureCause = failureCause;
	}

	public String handoverId() { return handoverId; }
	public String subscriberImsi() { return subscriberImsi; }
	public String visitedOperatorId() { return visitedOperatorId; }
	public String sourceCellId() { return sourceCellId; }
	public String targetCellId() { return targetCellId; }
	public Instant eventDatetime() { return eventDatetime; }
	public String eventType() { return eventType; }
	public String handoverStatus() { return handoverStatus; }
	public String failureCause() { return failureCause; }
}
