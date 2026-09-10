package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.AttachEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AttachEventRepository extends JpaRepository<AttachEvent, String> {

	List<AttachEvent> findByAuthFailureFlagTrue();

	List<AttachEvent> findByAttachStatus(String attachStatus);

	/** Attaches in the half-open window {@code [start, end)}, all partners. */
	@Query("select a from AttachEvent a where a.attachDatetime >= :start and a.attachDatetime < :end")
	List<AttachEvent> findInWindow(@Param("start") Instant start, @Param("end") Instant end);

	/** Attaches in {@code [start, end)} for one visited operator (case-insensitive). */
	@Query("select a from AttachEvent a where lower(a.visitedOperatorId) = lower(:partner) "
			+ "and a.attachDatetime >= :start and a.attachDatetime < :end")
	List<AttachEvent> findInWindowForPartner(@Param("partner") String partner,
											 @Param("start") Instant start, @Param("end") Instant end);

	/** Most recent attach timestamp, or {@code null} when the table is empty. */
	@Query("select max(a.attachDatetime) from AttachEvent a")
	Instant findMaxAttachDatetime();
}
