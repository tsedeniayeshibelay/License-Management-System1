package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.PendingQRActivation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PendingQRActivationRepository extends JpaRepository<PendingQRActivation, Long> {
    Optional<PendingQRActivation> findByPublicApprovalTokenHash(String publicApprovalTokenHash);
    Optional<PendingQRActivation> findByRequestId(String requestId);
}
