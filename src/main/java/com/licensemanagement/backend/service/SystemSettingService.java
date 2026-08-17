package com.licensemanagement.backend.service;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.LoggerContext;
import com.licensemanagement.backend.entity.SystemSetting;
import com.licensemanagement.backend.repository.SystemSettingRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemSettingService {

    private final SystemSettingRepository systemSettingRepository;
    private final NotificationService notificationService;
    private final AtomicReference<SystemSetting> cachedSettings = new AtomicReference<>();

    @PostConstruct
    public void init() {
        SystemSetting setting = systemSettingRepository.findFirstByOrderByIdAsc().orElseGet(() -> {
            SystemSetting defaultSetting = new SystemSetting();
            defaultSetting.setPlatformName("LockStrata Enterprise");
            defaultSetting.setSupportEmail("support@lockstrata.com");
            defaultSetting.setAdminPortalUrl("https://admin.lockstrata.com");
            defaultSetting.setMaintenanceMode(false);
            defaultSetting.setDebugLogging(false);
            defaultSetting.setUpdatedAt(LocalDateTime.now());
            return systemSettingRepository.save(defaultSetting);
        });
        cachedSettings.set(setting);
        applyLoggingLevel(Boolean.TRUE.equals(setting.getDebugLogging()));
        log.info("System settings initialized. Maintenance mode: {}, Debug logging: {}", 
                setting.getMaintenanceMode(), setting.getDebugLogging());
    }

    public SystemSetting getSettings() {
        SystemSetting current = cachedSettings.get();
        if (current == null) {
            current = systemSettingRepository.findFirstByOrderByIdAsc().orElseGet(() -> {
                SystemSetting s = new SystemSetting();
                return systemSettingRepository.save(s);
            });
            cachedSettings.set(current);
        }
        return current;
    }

    public boolean isMaintenanceMode() {
        SystemSetting current = cachedSettings.get();
        return current != null && Boolean.TRUE.equals(current.getMaintenanceMode());
    }

    public Map<String, Object> getPublicConfig() {
        SystemSetting s = getSettings();
        Map<String, Object> config = new HashMap<>();
        config.put("platformName", s.getPlatformName());
        config.put("supportEmail", s.getSupportEmail());
        config.put("adminPortalUrl", s.getAdminPortalUrl());
        config.put("maintenanceMode", Boolean.TRUE.equals(s.getMaintenanceMode()));
        return config;
    }

    @Transactional
    public SystemSetting updateSettings(SystemSetting request) {
        SystemSetting existing = systemSettingRepository.findFirstByOrderByIdAsc().orElseGet(SystemSetting::new);

        if (request.getPlatformName() != null && !request.getPlatformName().trim().isEmpty()) {
            existing.setPlatformName(request.getPlatformName().trim());
        }
        if (request.getSupportEmail() != null && !request.getSupportEmail().trim().isEmpty()) {
            existing.setSupportEmail(request.getSupportEmail().trim());
        }
        if (request.getAdminPortalUrl() != null && !request.getAdminPortalUrl().trim().isEmpty()) {
            existing.setAdminPortalUrl(request.getAdminPortalUrl().trim());
        }
        if (request.getMaintenanceMode() != null) {
            existing.setMaintenanceMode(request.getMaintenanceMode());
        }
        if (request.getDebugLogging() != null) {
            existing.setDebugLogging(request.getDebugLogging());
        }
        existing.setUpdatedAt(LocalDateTime.now());

        SystemSetting saved = systemSettingRepository.save(existing);
        // Immediate cache update - takes effect with zero delay
        cachedSettings.set(saved);

        // Dynamically apply logging level safely
        applyLoggingLevel(Boolean.TRUE.equals(saved.getDebugLogging()));

        log.info("Global platform settings updated. Maintenance mode: {}, Debug logging: {}", 
                saved.getMaintenanceMode(), saved.getDebugLogging());

        try {
            notificationService.notifyAdmins(
                    "systemNotifications",
                    "SYSTEM",
                    "Global Platform Settings Updated",
                    "Platform settings updated. Maintenance mode: " + (Boolean.TRUE.equals(saved.getMaintenanceMode()) ? "ACTIVE" : "INACTIVE"),
                    "/dashboard/settings"
            );
        } catch (Exception notifEx) {
            log.warn("Could not dispatch system notification: {}", notifEx.getMessage());
        }

        return saved;
    }

    private void applyLoggingLevel(boolean debugEnabled) {
        try {
            LoggerContext loggerContext = (LoggerContext) LoggerFactory.getILoggerFactory();
            ch.qos.logback.classic.Logger appLogger = loggerContext.getLogger("com.licensemanagement.backend");
            if (appLogger != null) {
                appLogger.setLevel(debugEnabled ? Level.DEBUG : Level.INFO);
                log.info("Backend logger level for com.licensemanagement.backend set to {}", 
                        debugEnabled ? "DEBUG" : "INFO");
            }
        } catch (Exception e) {
            log.warn("Could not dynamically set Logback log level: {}", e.getMessage());
        }
    }
}
