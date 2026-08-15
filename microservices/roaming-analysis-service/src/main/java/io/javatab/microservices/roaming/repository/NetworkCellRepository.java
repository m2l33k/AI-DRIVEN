package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.NetworkCell;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NetworkCellRepository extends JpaRepository<NetworkCell, String> {
}
