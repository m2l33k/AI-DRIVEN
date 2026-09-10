package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.RoamingAgreement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Seeds one {@link RoamingAgreement} (with default SLA thresholds) per distinct partner
 * (visited operator) found in the loaded CDR / attach data. Runs after the CSV loader
 * ({@code @Order} higher number = later) and only when the agreements table is empty.
 */
@Component
@Order(100)
public class RoamingAgreementSeeder implements CommandLineRunner {

	private static final Logger log = LoggerFactory.getLogger(RoamingAgreementSeeder.class);

	private final RoamingAgreementRepository agreements;
	private final RoamingCdrRepository cdrs;
	private final AttachEventRepository attaches;

	public RoamingAgreementSeeder(RoamingAgreementRepository agreements, RoamingCdrRepository cdrs,
								  AttachEventRepository attaches) {
		this.agreements = agreements;
		this.cdrs = cdrs;
		this.attaches = attaches;
	}

	@Override
	public void run(String... args) {
		if (agreements.count() > 0) {
			log.info("roaming_agreements already populated ({} rows) — skipping seed", agreements.count());
			return;
		}
		Set<String> partners = new LinkedHashSet<>();
		cdrs.findAll().forEach(c -> { if (c.visitedOperatorId() != null) partners.add(c.visitedOperatorId()); });
		attaches.findAll().forEach(a -> { if (a.visitedOperatorId() != null) partners.add(a.visitedOperatorId()); });

		if (partners.isEmpty()) {
			log.warn("No partners found in CDR/attach data — no roaming agreements seeded");
			return;
		}
		int i = 0;
		for (String partner : partners) {
			// Default SLA_KPIs — tightened slightly for a couple of partners so breaches are demonstrable.
			double regMin = 95.0, asrMin = 60.0, sessMin = 97.0, p95Max = 120.0, dropMax = 3.0, thrMin = 5.0;
			if (i % 4 == 0) { p95Max = 90.0; dropMax = 2.0; } // stricter tier
			agreements.save(new RoamingAgreement(
					partner, "Partner " + partner, "IR21-" + partner,
					regMin, asrMin, sessMin, p95Max, dropMax, thrMin));
			i++;
		}
		log.info("Seeded {} roaming agreements (one per partner operator)", partners.size());
	}
}
