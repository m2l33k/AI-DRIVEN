package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.RoamingAgreement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoamingAgreementRepository extends JpaRepository<RoamingAgreement, String> {
}
