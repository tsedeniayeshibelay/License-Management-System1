package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.OfflineRequestLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OfflineRequestLogRepository extends JpaRepository<OfflineRequestLog, Long> {
    boolean existsByRequestDigest(String requestDigest);
}
