package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.UnbindRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UnbindRequestRepository extends JpaRepository<UnbindRequest, Long> {
    List<UnbindRequest> findByStatus(String status);
    List<UnbindRequest> findByUserId(Long userId);
    Optional<UnbindRequest> findByDeviceIdAndLicenseIdAndStatus(Long deviceId, Long licenseId, String status);
    
    long countByUserIdAndStatusAndResolvedAtAfter(Long userId, String status, java.time.LocalDateTime date);
}
