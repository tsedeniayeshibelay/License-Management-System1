package com.licensemanagement.backend.repository;
import com.licensemanagement.backend.entity.AdminLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface AdminLogRepository extends JpaRepository<AdminLog, Long> {
    List<AdminLog> findByAdminId(Long adminId);
    List<AdminLog> findByAction(String action);
}