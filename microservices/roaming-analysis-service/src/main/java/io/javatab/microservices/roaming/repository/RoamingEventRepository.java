package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.RoamingEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * JPA-backed store of roaming events (MySQL). Sample data is loaded by
 * {@link io.javatab.microservices.roaming.repository.RoamingDataSeeder} when the table is empty.
 */
@Repository
public interface RoamingEventRepository extends JpaRepository<RoamingEvent, String> {
}
