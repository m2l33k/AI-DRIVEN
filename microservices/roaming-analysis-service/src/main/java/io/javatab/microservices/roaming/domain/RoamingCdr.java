package io.javatab.microservices.roaming.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;

/**
 * A roaming Call Detail Record from {@code roaming-cdr-and-tap-rap-file-processing.csv} — the core
 * fact table. Carries TAP/NRTRDE file processing, the charged/wholesale amounts (for margin and
 * settlement analytics) and the ground-truth {@code fraudFlag}/{@code fraudDetectionReason}.
 *
 * <p>Nullable numeric/date fields ({@code durationSeconds}, {@code dataVolumeMb},
 * {@code callEndDatetime}, {@code settlementDate}) are {@code null} when the CSV cell is blank.</p>
 */
@Entity
@Table(name = "roaming_cdrs", indexes = {
		@Index(name = "idx_cdr_visited", columnList = "visited_operator_id"),
		@Index(name = "idx_cdr_home", columnList = "home_operator_id"),
		@Index(name = "idx_cdr_imsi", columnList = "subscriber_imsi"),
		@Index(name = "idx_cdr_fraud", columnList = "fraud_flag")
})
public class RoamingCdr {

	@Id
	@Column(name = "cdr_id")
	private String cdrId;
	@Column(name = "tap_file_id")
	private String tapFileId;
	@Column(name = "tap_file_type")
	private String tapFileType;
	@Column(name = "file_received_datetime")
	private Instant fileReceivedDatetime;
	@Column(name = "home_operator_id")
	private String homeOperatorId;
	@Column(name = "visited_operator_id")
	private String visitedOperatorId;
	@Column(name = "subscriber_imsi")
	private String subscriberImsi;
	@Column(name = "subscriber_msisdn")
	private String subscriberMsisdn;
	@Column(name = "device_id")
	private String deviceId;
	@Column(name = "serving_cell_id")
	private String servingCellId;
	@Column(name = "call_type")
	private String callType;
	@Column(name = "call_start_datetime")
	private Instant callStartDatetime;
	@Column(name = "call_end_datetime")
	private Instant callEndDatetime;
	@Column(name = "duration_seconds")
	private Integer durationSeconds;
	@Column(name = "data_volume_mb")
	private Double dataVolumeMb;
	@Column(name = "charged_amount")
	private Double chargedAmount;
	@Column(name = "wholesale_cost")
	private Double wholesaleCost;
	private String currency;
	@Column(name = "iot_tariff_id")
	private String iotTariffId;
	@Column(name = "fraud_flag")
	private boolean fraudFlag;
	@Column(name = "fraud_detection_reason", length = 512)
	private String fraudDetectionReason;
	@Column(name = "settlement_status")
	private String settlementStatus;
	@Column(name = "settlement_date")
	private LocalDate settlementDate;
	@Column(name = "nrtrde_flag")
	private boolean nrtrdeFlag;
	@Column(name = "record_creation_datetime")
	private Instant recordCreationDatetime;

	protected RoamingCdr() {
	}

	public RoamingCdr(String cdrId, String tapFileId, String tapFileType, Instant fileReceivedDatetime,
					  String homeOperatorId, String visitedOperatorId, String subscriberImsi,
					  String subscriberMsisdn, String deviceId, String servingCellId, String callType,
					  Instant callStartDatetime, Instant callEndDatetime, Integer durationSeconds,
					  Double dataVolumeMb, Double chargedAmount, Double wholesaleCost, String currency,
					  String iotTariffId, boolean fraudFlag, String fraudDetectionReason,
					  String settlementStatus, LocalDate settlementDate, boolean nrtrdeFlag,
					  Instant recordCreationDatetime) {
		this.cdrId = cdrId;
		this.tapFileId = tapFileId;
		this.tapFileType = tapFileType;
		this.fileReceivedDatetime = fileReceivedDatetime;
		this.homeOperatorId = homeOperatorId;
		this.visitedOperatorId = visitedOperatorId;
		this.subscriberImsi = subscriberImsi;
		this.subscriberMsisdn = subscriberMsisdn;
		this.deviceId = deviceId;
		this.servingCellId = servingCellId;
		this.callType = callType;
		this.callStartDatetime = callStartDatetime;
		this.callEndDatetime = callEndDatetime;
		this.durationSeconds = durationSeconds;
		this.dataVolumeMb = dataVolumeMb;
		this.chargedAmount = chargedAmount;
		this.wholesaleCost = wholesaleCost;
		this.currency = currency;
		this.iotTariffId = iotTariffId;
		this.fraudFlag = fraudFlag;
		this.fraudDetectionReason = fraudDetectionReason;
		this.settlementStatus = settlementStatus;
		this.settlementDate = settlementDate;
		this.nrtrdeFlag = nrtrdeFlag;
		this.recordCreationDatetime = recordCreationDatetime;
	}

	public String cdrId() { return cdrId; }
	public String tapFileId() { return tapFileId; }
	public String tapFileType() { return tapFileType; }
	public Instant fileReceivedDatetime() { return fileReceivedDatetime; }
	public String homeOperatorId() { return homeOperatorId; }
	public String visitedOperatorId() { return visitedOperatorId; }
	public String subscriberImsi() { return subscriberImsi; }
	public String subscriberMsisdn() { return subscriberMsisdn; }
	public String deviceId() { return deviceId; }
	public String servingCellId() { return servingCellId; }
	public String callType() { return callType; }
	public Instant callStartDatetime() { return callStartDatetime; }
	public Instant callEndDatetime() { return callEndDatetime; }
	public Integer durationSeconds() { return durationSeconds; }
	public Double dataVolumeMb() { return dataVolumeMb; }
	public Double chargedAmount() { return chargedAmount; }
	public Double wholesaleCost() { return wholesaleCost; }
	public String currency() { return currency; }
	public String iotTariffId() { return iotTariffId; }
	public boolean fraudFlag() { return fraudFlag; }
	public String fraudDetectionReason() { return fraudDetectionReason; }
	public String settlementStatus() { return settlementStatus; }
	public LocalDate settlementDate() { return settlementDate; }
	public boolean nrtrdeFlag() { return nrtrdeFlag; }
	public Instant recordCreationDatetime() { return recordCreationDatetime; }

	/** Wholesale margin (what we bill the roamer minus the visited-network cost), 0 if unknown. */
	public double margin() {
		double charged = chargedAmount == null ? 0 : chargedAmount;
		double cost = wholesaleCost == null ? 0 : wholesaleCost;
		return charged - cost;
	}
}
