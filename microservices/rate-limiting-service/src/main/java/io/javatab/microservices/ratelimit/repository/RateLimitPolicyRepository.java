package io.javatab.microservices.ratelimit.repository;

import io.javatab.microservices.ratelimit.domain.RateLimitPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateLimitPolicyRepository extends JpaRepository<RateLimitPolicy, String> {
}
