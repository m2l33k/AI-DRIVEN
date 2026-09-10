package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.RoamingCdr;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface RoamingCdrRepository extends JpaRepository<RoamingCdr, String> {

	List<RoamingCdr> findByFraudFlagTrue();

	List<RoamingCdr> findByVisitedOperatorId(String visitedOperatorId);

	/** CDRs whose call started in the half-open window {@code [start, end)}, all partners. */
	@Query("select c from RoamingCdr c where c.callStartDatetime >= :start and c.callStartDatetime < :end")
	List<RoamingCdr> findInWindow(@Param("start") Instant start, @Param("end") Instant end);

	/** CDRs in {@code [start, end)} for one visited operator (case-insensitive). */
	@Query("select c from RoamingCdr c where lower(c.visitedOperatorId) = lower(:partner) "
			+ "and c.callStartDatetime >= :start and c.callStartDatetime < :end")
	List<RoamingCdr> findInWindowForPartner(@Param("partner") String partner,
											@Param("start") Instant start, @Param("end") Instant end);

	/** Most recent call-start timestamp, or {@code null} when the table is empty. */
	@Query("select max(c.callStartDatetime) from RoamingCdr c")
	Instant findMaxCallStartDatetime();
}
