package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.HandoverEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HandoverEventRepository extends JpaRepository<HandoverEvent, String> {
}
