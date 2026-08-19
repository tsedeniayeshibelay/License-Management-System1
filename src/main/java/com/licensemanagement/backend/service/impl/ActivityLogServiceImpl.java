package com.licensemanagement.backend.service.impl;

import com.licensemanagement.backend.entity.ActivityLog;
import com.licensemanagement.backend.repository.ActivityLogRepository;
import com.licensemanagement.backend.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityLogServiceImpl implements ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    @Override
    public ActivityLog logAction(Long companyId, String action, String description, Long userId, Long licenseId) {
        ActivityLog log = new ActivityLog();
        log.setCompanyId(companyId);
        log.setAction(action);
        log.setDescription(description);
        log.setUserId(userId);
        log.setLicenseId(licenseId);
        return activityLogRepository.save(log);
    }

    @Override
    public List<ActivityLog> getCompanyActivity(Long companyId) {
        return activityLogRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
    }
}
