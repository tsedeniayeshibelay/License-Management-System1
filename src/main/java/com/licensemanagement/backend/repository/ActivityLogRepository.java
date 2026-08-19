package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
}
