package com.licensemanagement.backend.controller;
import com.licensemanagement.backend.dto.UsageLogRequest;
import com.licensemanagement.backend.entity.UsageLog;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.service.UsageLogService;
import com.licensemanagement.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import com.licensemanagement.backend.util.CurrentUserProvider;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
@RestController
@RequestMapping("/api/usage-logs")
@RequiredArgsConstructor
public class UsageLogController {
    private final UsageLogService usageLogService;
    private final UserService userService;
    private final CurrentUserProvider currentUserProvider;
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<UsageLog> logUsage(@Valid @RequestBody UsageLogRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        return new ResponseEntity<>(usageLogService.logUsage(request, currentUser), HttpStatus.CREATED);
    }
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UsageLog>> getAllUsageLogs() {
        return ResponseEntity.ok(usageLogService.getAllUsageLogs());
    }
    @GetMapping("/license/{licenseId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UsageLog>> getUsageLogsByLicense(@PathVariable Long licenseId) {
        return ResponseEntity.ok(usageLogService.getUsageLogsByLicense(licenseId));
    }
    @GetMapping("/my-logs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<UsageLog>> getMyUsageLogs() {
        User currentUser = currentUserProvider.getCurrentUser();
        return ResponseEntity.ok(usageLogService.getUsageLogsByUser(currentUser.getId()));
    }
}