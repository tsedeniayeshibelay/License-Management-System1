package com.licensemanagement.backend.controller;

import com.licensemanagement.backend.entity.SystemSetting;
import com.licensemanagement.backend.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
public class SystemSettingController {

    private final SystemSettingService systemSettingService;
    private final com.licensemanagement.backend.service.WebhookService webhookService;

    @GetMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemSetting> getSettings() {
        return ResponseEntity.ok(systemSettingService.getSettings());
    }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemSetting> updateSettings(@RequestBody SystemSetting request) {
        SystemSetting updated = systemSettingService.updateSettings(request);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/settings/test-webhook")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<com.licensemanagement.backend.dto.WebhookTestResult> testWebhook(@RequestBody(required = false) Map<String, String> body) {
        String url = (body != null && body.get("webhookUrl") != null && !body.get("webhookUrl").isBlank())
                ? body.get("webhookUrl")
                : systemSettingService.getSettings().getWebhookUrl();
        return ResponseEntity.ok(webhookService.testWebhook(url));
    }

    @GetMapping("/public-config")
    public ResponseEntity<Map<String, Object>> getPublicConfig() {
        return ResponseEntity.ok(systemSettingService.getPublicConfig());
    }
}
