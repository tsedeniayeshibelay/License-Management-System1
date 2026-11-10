package com.licensemanagement.backend.repository;

import com.licensemanagement.backend.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    List<ActivityLog> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    // FR-09: fetch the latest entry to get its hash for chain continuation
    @Query("SELECT a FROM ActivityLog a ORDER BY a.id DESC LIMIT 1")
    Optional<ActivityLog> findLatestEntry();

    // FR-09: fetch all entries ordered by id for audit trail verification
    List<ActivityLog> findAllByOrderByIdAsc();
}
