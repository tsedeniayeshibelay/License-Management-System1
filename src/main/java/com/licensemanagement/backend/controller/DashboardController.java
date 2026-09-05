package com.licensemanagement.backend.controller;
import com.licensemanagement.backend.dto.DashboardStats;
import com.licensemanagement.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboardService;
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardStats> getDashboardStats() {
        return ResponseEntity.ok(dashboardService.getDashboardStats());
    }
    @GetMapping("/license-overview")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPANY')")
    public ResponseEntity<Map<String, Object>> getLicenseOverview() {
        return ResponseEntity.ok(dashboardService.getLicenseOverview());
    }
    @GetMapping("/activity")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> getActivitySummary() {
        return ResponseEntity.ok(dashboardService.getActivitySummary());
    }
}