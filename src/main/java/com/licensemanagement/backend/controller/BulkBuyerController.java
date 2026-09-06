package com.licensemanagement.backend.controller;

import com.licensemanagement.backend.dto.AssignLicenseRequest;
import com.licensemanagement.backend.dto.RegisterRequest;
import com.licensemanagement.backend.dto.CompanySettingsDto;
import com.licensemanagement.backend.entity.ActivityLog;
import com.licensemanagement.backend.entity.Device;
import com.licensemanagement.backend.entity.LicenseAssignment;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.service.BulkBuyerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bulk-buyer")
@RequiredArgsConstructor
@PreAuthorize("hasRole('BULK_BUYER')")
public class BulkBuyerController {

    private final BulkBuyerService bulkBuyerService;
    private final com.licensemanagement.backend.service.WebhookService webhookService;

    @GetMapping("/employees")
    public ResponseEntity<List<User>> getEmployees() {
        return ResponseEntity.ok(bulkBuyerService.getCompanyEmployees());
    }

    @PostMapping("/employees")
    public ResponseEntity<User> addEmployee(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(bulkBuyerService.addEmployee(request));
    }

    @PostMapping("/assignments/assign")
    public ResponseEntity<LicenseAssignment> assignLicense(@Valid @RequestBody AssignLicenseRequest request) {
        return ResponseEntity.ok(bulkBuyerService.assignLicense(request));
    }

    @PostMapping("/assignments/{id}/revoke")
    public ResponseEntity<Void> revokeAssignment(@PathVariable Long id) {
        bulkBuyerService.revokeAssignment(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/assignments/{id}/approve")
    public ResponseEntity<LicenseAssignment> approveAssignment(@PathVariable Long id) {
        return ResponseEntity.ok(bulkBuyerService.approveAssignment(id));
    }

    @DeleteMapping("/employees/{id}")
    public ResponseEntity<Void> removeEmployee(@PathVariable Long id) {
        bulkBuyerService.removeEmployee(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/assignments/{id}/reassign")
    public ResponseEntity<Void> reassignLicense(@PathVariable Long id, @RequestParam Long newEmployeeId) {
        bulkBuyerService.reassignLicense(id, newEmployeeId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/assignments/recent")
    public ResponseEntity<List<LicenseAssignment>> getRecentAssignments() {
        return ResponseEntity.ok(bulkBuyerService.getRecentAssignments());
    }

    @GetMapping("/activity")
    public ResponseEntity<List<ActivityLog>> getActivityFeed() {
        return ResponseEntity.ok(bulkBuyerService.getActivityFeed());
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        return ResponseEntity.ok(bulkBuyerService.getDashboardStats());
    }

    @GetMapping("/employees/{id}/devices")
    public ResponseEntity<List<Device>> getEmployeeDevices(@PathVariable Long id) {
        return ResponseEntity.ok(bulkBuyerService.getEmployeeDevices(id));
    }

    @GetMapping("/employees/{id}/assignments")
    public ResponseEntity<List<LicenseAssignment>> getEmployeeAssignments(@PathVariable Long id) {
        return ResponseEntity.ok(bulkBuyerService.getEmployeeAssignments(id));
    }

    @GetMapping("/settings")
    public ResponseEntity<CompanySettingsDto> getSettings() {
        return ResponseEntity.ok(bulkBuyerService.getCompanySettings());
    }

    @PutMapping("/settings")
    public ResponseEntity<CompanySettingsDto> updateSettings(@Valid @RequestBody CompanySettingsDto request) {
        return ResponseEntity.ok(bulkBuyerService.updateCompanySettings(request));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<com.licensemanagement.backend.entity.Order>> getOrders() {
        return ResponseEntity.ok(bulkBuyerService.getCompanyOrders());
    }

    @GetMapping("/analytics")
    public ResponseEntity<com.licensemanagement.backend.dto.AnalyticsDto> getAnalytics() {
        return ResponseEntity.ok(bulkBuyerService.getCompanyAnalytics());
    }

    @PostMapping("/webhook/test")
    public ResponseEntity<com.licensemanagement.backend.dto.WebhookTestResult> testWebhook(@RequestBody(required = false) Map<String, String> body) {
        String url = (body != null && body.get("webhookUrl") != null && !body.get("webhookUrl").isBlank())
                ? body.get("webhookUrl")
                : bulkBuyerService.getCompanySettings().getWebhookUrl();
        return ResponseEntity.ok(webhookService.testWebhook(url));
    }

    @PostMapping("/licenses/check-expirations")
    public ResponseEntity<Map<String, Object>> checkExpirations() {
        return ResponseEntity.ok(bulkBuyerService.processExpirations());
    }
}
