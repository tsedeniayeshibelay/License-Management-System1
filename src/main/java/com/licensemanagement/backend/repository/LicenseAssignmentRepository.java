package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.LicenseAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LicenseAssignmentRepository extends JpaRepository<LicenseAssignment, Long> {
    List<LicenseAssignment> findByLicenseId(Long licenseId);
    List<LicenseAssignment> findByUserId(Long userId);
    List<LicenseAssignment> findByLicenseCompanyIdOrderByAssignedAtDesc(Long companyId);
    List<LicenseAssignment> findByLicenseIdAndStatus(Long licenseId, String status);
    List<LicenseAssignment> findByUserIdAndStatus(Long userId, String status);
    boolean existsByLicenseIdAndUserIdAndStatus(Long licenseId, Long userId, String status);
    List<LicenseAssignment> findByLicenseIdIn(List<Long> licenseIds);
    List<LicenseAssignment> findByLicenseIdInOrderByAssignedAtDesc(List<Long> licenseIds);
    List<LicenseAssignment> findByUserIdInAndStatus(List<Long> userIds, String status);
}

