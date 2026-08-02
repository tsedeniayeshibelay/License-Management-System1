package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.SoftwareRelease;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SoftwareReleaseRepository extends JpaRepository<SoftwareRelease, Long> {
    Optional<SoftwareRelease> findFirstByProductIdOrderByReleaseDateDesc(Long productId);
}
