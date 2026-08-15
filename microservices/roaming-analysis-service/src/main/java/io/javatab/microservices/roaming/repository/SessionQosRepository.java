package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.SessionQos;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SessionQosRepository extends JpaRepository<SessionQos, String> {
}
