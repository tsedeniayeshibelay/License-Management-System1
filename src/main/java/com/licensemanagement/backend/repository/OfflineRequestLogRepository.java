package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.OfflineRequestLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OfflineRequestLogRepository extends JpaRepository<OfflineRequestLog, Long> {
    boolean existsByRequestDigest(String requestDigest);

    // FR-05: Get the highest sequence number for a given license key
    @org.springframework.data.jpa.repository.Query(
        "SELECT MAX(o.sequenceNumber) FROM OfflineRequestLog o WHERE o.licenseKey = :licenseKey")
    Long findMaxSequenceNumberByLicenseKey(@org.springframework.data.repository.query.Param("licenseKey") String licenseKey);

    // FR-05: Find by receipt nonce for closing the loop
    java.util.Optional<OfflineRequestLog> findByReceiptNonce(String receiptNonce);
}
