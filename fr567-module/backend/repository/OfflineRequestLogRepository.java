package com.licensemanagement.backend.fr567.repository;

import com.licensemanagement.backend.fr567.entity.OfflineRequestLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OfflineRequestLogRepository extends JpaRepository<OfflineRequestLog, Long> {

    boolean existsByRequestDigest(String requestDigest);

    @Query("SELECT MAX(o.sequenceNumber) FROM OfflineRequestLog o WHERE o.licenseKey = :licenseKey")
    Long findMaxSequenceNumberByLicenseKey(@Param("licenseKey") String licenseKey);

    Optional<OfflineRequestLog> findByReceiptNonce(String receiptNonce);
}
