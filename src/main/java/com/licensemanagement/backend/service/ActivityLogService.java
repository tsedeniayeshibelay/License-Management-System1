package com.licensemanagement.backend.service;

import com.licensemanagement.backend.entity.ActivityLog;
import java.util.List;

public interface ActivityLogService {
    ActivityLog logAction(Long companyId, String action, String description, Long userId, Long licenseId);
    List<ActivityLog> getCompanyActivity(Long companyId);
    // FR-09: Verify the hash-chained audit trail for tamper detection
    boolean verifyAuditChain();
}
