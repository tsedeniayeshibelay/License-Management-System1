package com.licensemanagement.backend.service;
import com.licensemanagement.backend.exception.*;
import com.licensemanagement.backend.dto.UsageLogRequest;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.UsageLog;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.UsageLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
@Service
@RequiredArgsConstructor
public class UsageLogService {
    private final UsageLogRepository usageLogRepository;
    private final LicenseRepository licenseRepository;
    @Transactional
    public UsageLog logUsage(UsageLogRequest request, User user) {
        License license = licenseRepository.findByLicenseKey(request.getLicenseKey())
                .orElseThrow(() -> new ResourceNotFoundException("License not found"));
        if (!license.getUserId().equals(user.getId())) {
            throw new ForbiddenException("You can only log usage for your own licenses");
        }
        if (!"ACTIVE".equals(license.getStatus())) {
            throw new BusinessValidationException("License is not active");
        }
        UsageLog usageLog = new UsageLog();
        usageLog.setLicenseId(license.getId());
        usageLog.setUserId(user.getId());
        usageLog.setFeaturesUsed(request.getFeaturesUsed());
        usageLog.setActivationMethod(request.getActivationMethod() != null ? request.getActivationMethod() : "Online");
        usageLog.setIpAddress(request.getIpAddress());
        usageLog.setDurationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 0);
        usageLog.setSessionStart(LocalDateTime.now());
        return usageLogRepository.save(usageLog);
    }
    public List<UsageLog> getAllUsageLogs() {
        return usageLogRepository.findAllWithDetails();
    }
    public List<UsageLog> getUsageLogsByLicense(Long licenseId) {
        return usageLogRepository.findByLicenseId(licenseId);
    }
    public List<UsageLog> getUsageLogsByUser(Long userId) {
        Set<Long> seenIds = new HashSet<>();
        List<UsageLog> result = new ArrayList<>();

        // 1. Direct logs
        List<UsageLog> userLogs = usageLogRepository.findByUserId(userId);
        for (UsageLog log : userLogs) {
            if (seenIds.add(log.getId())) {
                result.add(log);
            }
        }

        // 2. Logs for licenses owned by user
        List<License> userLicenses = licenseRepository.findByUserId(userId);
        for (License lic : userLicenses) {
            List<UsageLog> licLogs = usageLogRepository.findByLicenseId(lic.getId());
            for (UsageLog log : licLogs) {
                if (seenIds.add(log.getId())) {
                    result.add(log);
                }
            }
        }

        // Sort descending by createdAt or sessionStart
        result.sort((a, b) -> {
            LocalDateTime ta = a.getCreatedAt() != null ? a.getCreatedAt() : a.getSessionStart();
            LocalDateTime tb = b.getCreatedAt() != null ? b.getCreatedAt() : b.getSessionStart();
            if (ta == null && tb == null) return 0;
            if (ta == null) return 1;
            if (tb == null) return -1;
            return tb.compareTo(ta);
        });

        return result;
    }
    @Transactional
    public void endSession(Long logId) {
        UsageLog usageLog = usageLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("Usage log not found"));
        usageLog.setSessionEnd(LocalDateTime.now());
        usageLogRepository.save(usageLog);
    }
}