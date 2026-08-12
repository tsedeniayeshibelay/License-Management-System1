package com.licensemanagement.backend.repository;
import com.licensemanagement.backend.entity.UsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface UsageLogRepository extends JpaRepository<UsageLog, Long> {
    List<UsageLog> findByLicenseId(Long licenseId);
    List<UsageLog> findByUserId(Long userId);
    List<UsageLog> findByDeviceId(Long deviceId);

    @org.springframework.data.jpa.repository.Query("SELECT u FROM UsageLog u LEFT JOIN FETCH u.user LEFT JOIN FETCH u.device LEFT JOIN FETCH u.license l LEFT JOIN FETCH l.product ORDER BY COALESCE(u.sessionStart, u.createdAt) DESC")
    List<UsageLog> findAllWithDetails();
}