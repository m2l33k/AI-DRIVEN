package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.SessionQos;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SessionQosRepository extends JpaRepository<SessionQos, String> {

	/** Sessions started in the half-open window {@code [start, end)}, all partners. */
	@Query("select s from SessionQos s where s.sessionStartDatetime >= :start and s.sessionStartDatetime < :end")
	List<SessionQos> findInWindow(@Param("start") Instant start, @Param("end") Instant end);

	/** Sessions in {@code [start, end)} for one visited operator (case-insensitive). */
	@Query("select s from SessionQos s where lower(s.visitedOperatorId) = lower(:partner) "
			+ "and s.sessionStartDatetime >= :start and s.sessionStartDatetime < :end")
	List<SessionQos> findInWindowForPartner(@Param("partner") String partner,
											@Param("start") Instant start, @Param("end") Instant end);

	/** Most recent session-start timestamp, or {@code null} when the table is empty. */
	@Query("select max(s.sessionStartDatetime) from SessionQos s")
	Instant findMaxSessionStartDatetime();
}
