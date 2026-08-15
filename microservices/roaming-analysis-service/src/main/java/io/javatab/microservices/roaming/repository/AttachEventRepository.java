package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.AttachEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachEventRepository extends JpaRepository<AttachEvent, String> {

	List<AttachEvent> findByAuthFailureFlagTrue();

	List<AttachEvent> findByAttachStatus(String attachStatus);
}
