package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.RoamingCdr;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoamingCdrRepository extends JpaRepository<RoamingCdr, String> {

	List<RoamingCdr> findByFraudFlagTrue();

	List<RoamingCdr> findByVisitedOperatorId(String visitedOperatorId);
}
