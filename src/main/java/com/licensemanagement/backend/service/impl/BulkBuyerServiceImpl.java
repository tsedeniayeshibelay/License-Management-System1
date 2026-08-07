package com.licensemanagement.backend.service.impl;

import com.licensemanagement.backend.dto.AssignLicenseRequest;
import com.licensemanagement.backend.dto.RegisterRequest;
import com.licensemanagement.backend.entity.ActivityLog;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.LicenseAssignment;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.exception.ForbiddenException;
import com.licensemanagement.backend.exception.ResourceNotFoundException;
import com.licensemanagement.backend.repository.LicenseAssignmentRepository;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.UserRepository;
import com.licensemanagement.backend.repository.CompanyRepository;
import com.licensemanagement.backend.repository.DeviceRepository;
import com.licensemanagement.backend.repository.OrderRepository;
import com.licensemanagement.backend.repository.ActivationRepository;
import com.licensemanagement.backend.dto.CompanySettingsDto;
import com.licensemanagement.backend.entity.Company;
import com.licensemanagement.backend.entity.Device;
import com.licensemanagement.backend.entity.Order;
import com.licensemanagement.backend.service.ActivityLogService;
import com.licensemanagement.backend.service.BulkBuyerService;
import com.licensemanagement.backend.service.EmailService;
import com.licensemanagement.backend.service.NotificationService;
import com.licensemanagement.backend.service.UserService;
import com.licensemanagement.backend.util.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.licensemanagement.backend.repository.EmailLogRepository;
import com.licensemanagement.backend.entity.Activation;
import com.licensemanagement.backend.entity.Product;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BulkBuyerServiceImpl implements BulkBuyerService {

    private final UserRepository userRepository;
    private final LicenseRepository licenseRepository;
    private final LicenseAssignmentRepository assignmentRepository;
    private final ActivityLogService activityLogService;
    private final UserService userService;
    private final CurrentUserProvider currentUserProvider;
    private final DeviceRepository deviceRepository;
    private final CompanyRepository companyRepository;
    private final OrderRepository orderRepository;
    private final ActivationRepository activationRepository;
    private final EmailLogRepository emailLogRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    private com.fasterxml.jackson.databind.JsonNode getTeamPreferences(User bulkBuyer) {
        if (bulkBuyer == null || bulkBuyer.getPreferences() == null || bulkBuyer.getPreferences().isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(bulkBuyer.getPreferences()).path("teamPreferences");
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isAllowInvitations(User bulkBuyer) {
        com.fasterxml.jackson.databind.JsonNode node = getTeamPreferences(bulkBuyer);
        if (node != null && node.has("allowInvitations")) {
            return node.get("allowInvitations").asBoolean(true);
        }
        return true;
    }

    private boolean isRequireApproval(User bulkBuyer) {
        com.fasterxml.jackson.databind.JsonNode node = getTeamPreferences(bulkBuyer);
        if (node != null && node.has("requireApproval")) {
            return node.get("requireApproval").asBoolean(false);
        }
        return false;
    }

    private boolean isAutoReleaseLicenses(User bulkBuyer) {
        com.fasterxml.jackson.databind.JsonNode node = getTeamPreferences(bulkBuyer);
        if (node != null && node.has("autoRelease")) {
            return node.get("autoRelease").asBoolean(true);
        }
        return true;
    }

    private com.fasterxml.jackson.databind.JsonNode getLicenseManagementPreferences(User bulkBuyer) {
        if (bulkBuyer == null || bulkBuyer.getPreferences() == null || bulkBuyer.getPreferences().isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(bulkBuyer.getPreferences()).path("licenseManagement");
        } catch (Exception e) {
            return null;
        }
    }

    private String getDefaultAssignmentMode(User bulkBuyer) {
        com.fasterxml.jackson.databind.JsonNode node = getLicenseManagementPreferences(bulkBuyer);
        if (node != null && node.has("defaultAssignment") && !node.get("defaultAssignment").asText().isBlank()) {
            return node.get("defaultAssignment").asText("Employee + Device");
        }
        return "Employee + Device";
    }

    private boolean isExpirationThresholdEnabled(User bulkBuyer, int days) {
        com.fasterxml.jackson.databind.JsonNode node = getLicenseManagementPreferences(bulkBuyer);
        if (node == null) return true; // default true
        String key = "exp" + days;
        if (node.has(key)) {
            return node.get(key).asBoolean(true);
        }
        return true;
    }

    private boolean isAutoReleaseExpiredEnabled(User bulkBuyer) {
        com.fasterxml.jackson.databind.JsonNode node = getLicenseManagementPreferences(bulkBuyer);
        if (node != null && node.has("autoRelease")) {
            return node.get("autoRelease").asBoolean(false);
        }
        return false;
    }

    private boolean isAutoNotifyEmployeeEnabled(User bulkBuyer) {
        com.fasterxml.jackson.databind.JsonNode node = getLicenseManagementPreferences(bulkBuyer);
        if (node != null && node.has("autoNotify")) {
            return node.get("autoNotify").asBoolean(false);
        }
        return false;
    }

    private User getBulkBuyer() {
        User currentUser = currentUserProvider.getCurrentUser();
        if (!"BULK_BUYER".equals(currentUser.getRole())) {
            throw new ForbiddenException("Access denied. Only Bulk Buyers can perform this action.");
        }
        User user = userRepository.findById(currentUser.getId()).orElse(currentUser);
        if (user.getCompanyId() == null) {
            final String userEmail = user.getEmail();
            final String userComp = user.getCompany();
            final String userFullName = user.getFullName();
            Company company = companyRepository.findByEmail(userEmail)
                .orElseGet(() -> {
                    Company newComp = new Company();
                    String compName = (userComp != null && !userComp.trim().isEmpty()) 
                        ? userComp 
                        : (userFullName != null && !userFullName.trim().isEmpty() 
                            ? userFullName + "'s Organization" 
                            : "Bulk Buyer Organization");
                    newComp.setName(compName);
                    newComp.setEmail(userEmail);
                    newComp.setStatus("ACTIVE");
                    return companyRepository.save(newComp);
                });
            user.setCompanyId(company.getId());
            return userRepository.save(user);
        }
        return user;
    }

    @Override
    public List<User> getCompanyEmployees() {
        User bulkBuyer = getBulkBuyer();
        Set<Long> employeeIds = new LinkedHashSet<>();
        List<User> result = new ArrayList<>();

        // 1. Employees belonging to bulk buyer's company
        if (bulkBuyer.getCompanyId() != null) {
            List<User> companyEmployees = userRepository.findByCompanyId(bulkBuyer.getCompanyId());
            for (User u : companyEmployees) {
                if (!u.getId().equals(bulkBuyer.getId()) && !"ADMIN".equalsIgnoreCase(u.getRole()) && !"BULK_BUYER".equalsIgnoreCase(u.getRole()) && !"DELETED".equalsIgnoreCase(u.getStatus()) && !"INACTIVE".equalsIgnoreCase(u.getStatus())) {
                    if (employeeIds.add(u.getId())) {
                        result.add(u);
                    }
                }
            }
        }

        // 2. Employees who have an assignment for a license owned by this bulk buyer
        List<License> buyerLicenses = licenseRepository.findByUserId(bulkBuyer.getId());
        if (!buyerLicenses.isEmpty()) {
            List<Long> licenseIds = buyerLicenses.stream().map(License::getId).collect(Collectors.toList());
            List<LicenseAssignment> assignments = assignmentRepository.findByLicenseIdInOrderByAssignedAtDesc(licenseIds);
            for (LicenseAssignment assignment : assignments) {
                if (assignment.getUserId() != null && employeeIds.add(assignment.getUserId())) {
                    userRepository.findById(assignment.getUserId()).ifPresent(u -> {
                        if (!u.getId().equals(bulkBuyer.getId()) && !"ADMIN".equalsIgnoreCase(u.getRole()) && !"DELETED".equalsIgnoreCase(u.getStatus()) && !"INACTIVE".equalsIgnoreCase(u.getStatus())) {
                            result.add(u);
                        }
                    });
                }
            }
        }

        return result;
    }

    @Override
    @Transactional
    public User addEmployee(RegisterRequest request) {
        User bulkBuyer = getBulkBuyer();
        
        User employee = new User();
        employee.setUsername(request.getUsername());
        employee.setEmail(request.getEmail());
        employee.setPassword(request.getPassword());
        employee.setFullName(request.getFullName());
        employee.setCompanyId(bulkBuyer.getCompanyId());
        employee.setRole("CUSTOMER"); // Employees are customer-level users
        employee.setMustChangePassword(true); // Force password change on first login

        User savedUser = userService.registerUser(employee);

        activityLogService.logAction(bulkBuyer.getCompanyId(), "EMPLOYEE_ADDED", 
            "Added new employee: " + savedUser.getFullName(), savedUser.getId(), null);

        String companyName = companyRepository.findById(bulkBuyer.getCompanyId())
                .map(Company::getName)
                .orElse("Your Company");

        if (isAllowInvitations(bulkBuyer)) {
            try {
                emailService.sendEmployeeInvitationEmail(savedUser, companyName, request.getPassword());
            } catch (Exception e) {
                // Non-blocking
            }
        } else {
            activityLogService.logAction(bulkBuyer.getCompanyId(), "INVITATION_EMAIL_SKIPPED", 
                "Employee " + savedUser.getFullName() + " created (invitation email disabled by team preferences)", savedUser.getId(), null);
        }

        try {
            notificationService.sendNotification(
                bulkBuyer,
                "activity",
                "EMPLOYEE_ADDED",
                "New Employee Added",
                "Added new employee " + savedUser.getFullName() + " (" + savedUser.getEmail() + ") to your organization.",
                "/bulk-buyer/employees",
                null
            );
        } catch (Exception e) {
            // Non-blocking
        }

        return savedUser;
    }

    @Override
    @Transactional
    public LicenseAssignment assignLicense(AssignLicenseRequest request) {
        User bulkBuyer = getBulkBuyer();

        License license = licenseRepository.findById(request.getLicenseId())
                .orElseThrow(() -> new ResourceNotFoundException("License not found"));

        if (!license.getUserId().equals(bulkBuyer.getId())) {
            throw new ForbiddenException("You do not own this license.");
        }

        if (license.getExpiryDate() != null && license.getExpiryDate().isBefore(LocalDate.now())) {
            throw new IllegalStateException("Cannot assign an expired license.");
        }

        int currentUsed = license.getUsedSeats() != null ? license.getUsedSeats() : 0;
        int total = license.getTotalSeats() != null ? license.getTotalSeats() : (license.getMaxActivations() != null ? license.getMaxActivations() : 1);

        if (currentUsed >= total) {
            throw new IllegalStateException("No available seats for this license.");
        }

        String mode = request.getAssignmentType();
        if (mode == null || mode.isBlank()) {
            mode = getDefaultAssignmentMode(bulkBuyer);
        }
        if ("Employee".equalsIgnoreCase(mode)) {
            mode = "Employee";
        } else if ("Device".equalsIgnoreCase(mode)) {
            mode = "Device";
        } else {
            mode = "Employee + Device";
        }

        User employee = null;
        Device device = null;

        if ("Device".equals(mode)) {
            if (request.getDeviceId() == null) {
                throw new IllegalArgumentException("Device selection is required for Device assignment mode.");
            }
            device = deviceRepository.findById(request.getDeviceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
            employee = userRepository.findById(device.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Device owner not found"));
            
            boolean isSameCompany = bulkBuyer.getCompanyId() != null && bulkBuyer.getCompanyId().equals(employee.getCompanyId());
            if (!isSameCompany) {
                throw new ForbiddenException("Device does not belong to your company.");
            }
            if (request.getEmployeeId() != null && !device.getUserId().equals(request.getEmployeeId())) {
                throw new IllegalArgumentException("Device does not belong to the selected employee.");
            }
        } else {
            // Employee or Employee + Device
            if (request.getEmployeeId() == null) {
                throw new IllegalArgumentException("Employee selection is required.");
            }
            employee = userRepository.findById(request.getEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

            boolean isSameCompany = bulkBuyer.getCompanyId() != null && bulkBuyer.getCompanyId().equals(employee.getCompanyId());
            if (!isSameCompany) {
                if (employee.getCompanyId() == null && bulkBuyer.getCompanyId() != null) {
                    employee.setCompanyId(bulkBuyer.getCompanyId());
                    userRepository.save(employee);
                } else {
                    throw new ForbiddenException("Employee does not belong to your company.");
                }
            }

            if ("Employee + Device".equals(mode) && request.getDeviceId() != null) {
                device = deviceRepository.findById(request.getDeviceId())
                        .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
                if (!device.getUserId().equals(employee.getId())) {
                    throw new IllegalArgumentException("Selected device does not belong to this employee.");
                }
            }
        }

        boolean requireApproval = isRequireApproval(bulkBuyer);

        // Create assignment
        LicenseAssignment assignment = new LicenseAssignment();
        assignment.setLicenseId(license.getId());
        assignment.setUserId(employee.getId());
        assignment.setDeviceId(device != null ? device.getId() : null);
        assignment.setAssignmentType(mode);

        if (requireApproval) {
            assignment.setStatus("PENDING_APPROVAL");
            assignment = assignmentRepository.save(assignment);

            activityLogService.logAction(bulkBuyer.getCompanyId(), "ASSIGNMENT_PENDING_APPROVAL", 
                "License assignment " + license.getLicenseKey() + " for " + employee.getFullName() + " submitted for manager approval", 
                employee.getId(), license.getId());

            return assignment;
        }

        assignment.setStatus("ACTIVE");
        assignment = assignmentRepository.save(assignment);

        // Update license used seats and ensure status is ACTIVE
        license.setStatus("ACTIVE");
        license.setUsedSeats(currentUsed + 1);
        licenseRepository.save(license);

        activityLogService.logAction(bulkBuyer.getCompanyId(), "LICENSE_ASSIGNED", 
            "Assigned license " + license.getLicenseKey() + " to " + employee.getFullName(), employee.getId(), license.getId());

        String companyName = companyRepository.findById(bulkBuyer.getCompanyId())
                .map(Company::getName)
                .orElse("Your Company");
        String productName = license.getProduct() != null ? license.getProduct().getName() : "Software License";
        String expiry = license.getExpiryDate() != null ? license.getExpiryDate().toString() : "Perpetual";

        try {
            emailService.sendLicenseAssignedEmail(employee, companyName, productName, expiry, license.getId());
        } catch (Exception e) {
            // Non-blocking
        }

        try {
            if (license.getCompanyId() != null) {
                notificationService.notifyCompany(
                    license.getCompanyId(),
                    "buyerActivity",
                    "BUYER_SEAT_ASSIGNED",
                    "Buyer Assigned Seat",
                    "Bulk buyer assigned 1 seat of " + productName + " to " + employee.getFullName() + " (" + employee.getEmail() + ").",
                    "/company-licenses"
                );
            }
        } catch (Exception e) {
            // Non-blocking
        }

        try {
            notificationService.sendNotification(
                bulkBuyer,
                "assignment",
                "LICENSE_ASSIGNED",
                "License Seat Assigned",
                "Assigned 1 seat of " + productName + " to " + employee.getFullName() + " (" + employee.getEmail() + ").",
                "/bulk-buyer/licenses",
                null
            );
        } catch (Exception e) {
            // Non-blocking
        }

        return assignment;
    }

    @Override
    @Transactional
    public void revokeAssignment(Long assignmentId) {
        User bulkBuyer = getBulkBuyer();

        LicenseAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));

        License license = licenseRepository.findById(assignment.getLicenseId())
                .orElseThrow(() -> new ResourceNotFoundException("License not found"));

        if (!license.getUserId().equals(bulkBuyer.getId())) {
            throw new ForbiddenException("You do not own this license.");
        }

        if (!"ACTIVE".equals(assignment.getStatus())) {
            throw new IllegalStateException("Assignment is already revoked.");
        }

        assignment.setStatus("REVOKED");
        assignment.setRevokedAt(LocalDateTime.now());
        assignmentRepository.save(assignment);

        // Update license used seats
        license.setUsedSeats(Math.max(0, license.getUsedSeats() - 1));
        licenseRepository.save(license);

        activityLogService.logAction(bulkBuyer.getCompanyId(), "LICENSE_REVOKED", 
            "Revoked license " + license.getLicenseKey() + " from user ID " + assignment.getUserId(), assignment.getUserId(), license.getId());

        try {
            if (license.getCompanyId() != null) {
                notificationService.notifyCompany(
                    license.getCompanyId(),
                    "buyerActivity",
                    "BUYER_SEAT_REVOKED",
                    "Buyer Revoked Seat",
                    "Bulk buyer revoked a seat of license " + NotificationService.maskLicenseKey(license.getLicenseKey()) + ".",
                    "/company-licenses"
                );
            }
        } catch (Exception e) {
            // Non-blocking
        }

        try {
            notificationService.sendNotification(
                bulkBuyer,
                "revocation",
                "LICENSE_REVOKED",
                "License Seat Revoked",
                "Revoked 1 seat of license " + NotificationService.maskLicenseKey(license.getLicenseKey()) + ".",
                "/bulk-buyer/licenses",
                null
            );
        } catch (Exception e) {
            // Non-blocking
        }
    }

    @Override
    @Transactional
    public void reassignLicense(Long assignmentId, Long newEmployeeId) {
        revokeAssignment(assignmentId);
        
        LicenseAssignment oldAssignment = assignmentRepository.findById(assignmentId).orElseThrow();
        
        AssignLicenseRequest request = new AssignLicenseRequest();
        request.setLicenseId(oldAssignment.getLicenseId());
        request.setEmployeeId(newEmployeeId);
        
        assignLicense(request);
    }

    @Override
    @Transactional
    public LicenseAssignment approveAssignment(Long assignmentId) {
        User bulkBuyer = getBulkBuyer();

        LicenseAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));

        License license = licenseRepository.findById(assignment.getLicenseId())
                .orElseThrow(() -> new ResourceNotFoundException("License not found"));

        if (!license.getUserId().equals(bulkBuyer.getId())) {
            throw new ForbiddenException("You do not own this license.");
        }

        if (!"PENDING_APPROVAL".equalsIgnoreCase(assignment.getStatus())) {
            throw new IllegalStateException("Assignment is not pending approval.");
        }

        int currentUsed = license.getUsedSeats() != null ? license.getUsedSeats() : 0;
        int total = license.getTotalSeats() != null ? license.getTotalSeats() : (license.getMaxActivations() != null ? license.getMaxActivations() : 1);

        if (currentUsed >= total) {
            throw new IllegalStateException("No available seats left in this license pool to approve.");
        }

        assignment.setStatus("ACTIVE");
        assignment = assignmentRepository.save(assignment);

        license.setStatus("ACTIVE");
        license.setUsedSeats(currentUsed + 1);
        licenseRepository.save(license);

        User employee = userRepository.findById(assignment.getUserId()).orElse(null);
        String empName = employee != null ? employee.getFullName() : "Employee #" + assignment.getUserId();

        activityLogService.logAction(bulkBuyer.getCompanyId(), "ASSIGNMENT_APPROVED", 
            "Approved license " + license.getLicenseKey() + " assignment for " + empName, assignment.getUserId(), license.getId());

        if (employee != null) {
            String companyName = companyRepository.findById(bulkBuyer.getCompanyId())
                    .map(Company::getName)
                    .orElse("Your Company");
            String productName = license.getProduct() != null ? license.getProduct().getName() : "Software License";
            String expiry = license.getExpiryDate() != null ? license.getExpiryDate().toString() : "Perpetual";
            try {
                emailService.sendLicenseAssignedEmail(employee, companyName, productName, expiry, license.getId());
            } catch (Exception e) {
                // Non-blocking
            }
        }

        try {
            notificationService.sendNotification(
                bulkBuyer,
                "assignment",
                "ASSIGNMENT_APPROVED",
                "License Assignment Approved",
                "Approved license seat assignment for " + empName + ".",
                "/bulk-buyer/employees",
                null
            );
        } catch (Exception e) {
            // Non-blocking
        }

        return assignment;
    }

    @Override
    @Transactional
    public void removeEmployee(Long employeeId) {
        User bulkBuyer = getBulkBuyer();

        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        if (employee.getId().equals(bulkBuyer.getId())) {
            throw new IllegalArgumentException("Cannot remove your own bulk buyer account.");
        }

        boolean belongsToCompany = bulkBuyer.getCompanyId() != null && bulkBuyer.getCompanyId().equals(employee.getCompanyId());
        if (!belongsToCompany) {
            throw new ForbiddenException("Employee does not belong to your company.");
        }

        boolean autoRelease = isAutoReleaseLicenses(bulkBuyer);
        int releasedCount = 0;

        if (autoRelease) {
            List<LicenseAssignment> employeeAssignments = assignmentRepository.findByUserId(employeeId);
            for (LicenseAssignment assignment : employeeAssignments) {
                if ("ACTIVE".equalsIgnoreCase(assignment.getStatus()) || "PENDING_APPROVAL".equalsIgnoreCase(assignment.getStatus())) {
                    boolean wasActive = "ACTIVE".equalsIgnoreCase(assignment.getStatus());
                    assignment.setStatus("REVOKED");
                    assignment.setRevokedAt(LocalDateTime.now());
                    assignmentRepository.save(assignment);

                    if (wasActive) {
                        licenseRepository.findById(assignment.getLicenseId()).ifPresent(lic -> {
                            lic.setUsedSeats(Math.max(0, (lic.getUsedSeats() != null ? lic.getUsedSeats() : 1) - 1));
                            licenseRepository.save(lic);
                        });
                        releasedCount++;
                    }
                }
            }

            List<Device> activeDevices = deviceRepository.findByUserIdAndIsActiveTrue(employeeId);
            for (Device dev : activeDevices) {
                dev.setIsActive(false);
                deviceRepository.save(dev);
            }
        }

        employee.setCompanyId(null);
        employee.setStatus("INACTIVE");
        userRepository.save(employee);

        activityLogService.logAction(bulkBuyer.getCompanyId(), "EMPLOYEE_REMOVED", 
            "Removed employee: " + employee.getFullName() + (autoRelease ? " (Auto-released " + releasedCount + " license seats to pool)" : " (Licenses preserved)"),
            employee.getId(), null);

        try {
            notificationService.sendNotification(
                bulkBuyer,
                "activity",
                "EMPLOYEE_REMOVED",
                "Employee Removed",
                "Removed employee " + employee.getFullName() + (autoRelease ? " and auto-released " + releasedCount + " license seat(s) to pool." : "."),
                "/bulk-buyer/employees",
                null
            );
        } catch (Exception e) {
            // Non-blocking
        }
    }

    @Override
    public List<LicenseAssignment> getRecentAssignments() {
        User bulkBuyer = getBulkBuyer();
        List<License> buyerLicenses = licenseRepository.findByUserId(bulkBuyer.getId());
        if (buyerLicenses.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> licenseIds = buyerLicenses.stream().map(License::getId).collect(Collectors.toList());
        return assignmentRepository.findByLicenseIdInOrderByAssignedAtDesc(licenseIds);
    }

    @Override
    public List<LicenseAssignment> getEmployeeAssignments(Long employeeId) {
        User bulkBuyer = getBulkBuyer();
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        boolean isCompanyEmployee = bulkBuyer.getCompanyId() != null && bulkBuyer.getCompanyId().equals(employee.getCompanyId());
        
        List<License> buyerLicenses = licenseRepository.findByUserId(bulkBuyer.getId());
        List<Long> licenseIds = buyerLicenses.stream().map(License::getId).collect(Collectors.toList());
        boolean hasAssignmentFromBuyer = !licenseIds.isEmpty() && 
            assignmentRepository.findByLicenseIdIn(licenseIds).stream().anyMatch(a -> a.getUserId().equals(employeeId));

        if (!isCompanyEmployee && !hasAssignmentFromBuyer) {
            throw new ForbiddenException("Employee does not belong to your company.");
        }
        return assignmentRepository.findByUserIdAndStatus(employeeId, "ACTIVE");
    }

    @Override
    public List<ActivityLog> getActivityFeed() {
        User bulkBuyer = getBulkBuyer();
        return activityLogService.getCompanyActivity(bulkBuyer.getCompanyId());
    }

    @Override
    public Map<String, Object> getDashboardStats() {
        User bulkBuyer = getBulkBuyer();
        List<License> licenses = licenseRepository.findByUserId(bulkBuyer.getId());

        int totalSeats = 0;
        int usedSeats = 0;
        int activeProducts = 0;
        int expiringSoon = 0;
        int expired = 0;

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime thirtyDaysFromNow = now.plusDays(30);

        List<Long> licenseIds = new java.util.ArrayList<>();
        for (License l : licenses) {
            totalSeats += (l.getTotalSeats() != null ? l.getTotalSeats() : 1);
            usedSeats += (l.getUsedSeats() != null ? l.getUsedSeats() : 0);
            if ("ACTIVE".equalsIgnoreCase(l.getStatus()) || "NOT_ACTIVATED".equalsIgnoreCase(l.getStatus())) activeProducts++;
            licenseIds.add(l.getId());

            if (l.getExpiryDate() != null) {
                LocalDateTime expiry = l.getExpiryDate().atStartOfDay();
                if (expiry.isAfter(now) && expiry.isBefore(thirtyDaysFromNow)) {
                    expiringSoon++;
                }
                if (expiry.isBefore(now)) {
                    expired++;
                }
            }
        }

        // Count real active activation records across all purchased licenses
        int activatedCount = licenseIds.isEmpty() ? 0 :
            activationRepository.findByLicenseIdInAndIsActiveTrue(licenseIds).size();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalPurchased", totalSeats);
        stats.put("assigned", usedSeats);
        stats.put("available", totalSeats - usedSeats);
        stats.put("expiringSoon", expiringSoon);
        stats.put("expired", expired);
        stats.put("activeProducts", activeProducts);
        stats.put("activated", activatedCount);

        return stats;
    }

    @Override
    public List<com.licensemanagement.backend.entity.Device> getEmployeeDevices(Long employeeId) {
        User bulkBuyer = getBulkBuyer();
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        boolean isCompanyEmployee = bulkBuyer.getCompanyId() != null && bulkBuyer.getCompanyId().equals(employee.getCompanyId());
        List<License> buyerLicenses = licenseRepository.findByUserId(bulkBuyer.getId());
        List<Long> licenseIds = buyerLicenses.stream().map(License::getId).collect(Collectors.toList());
        boolean hasAssignmentFromBuyer = !licenseIds.isEmpty() && 
            assignmentRepository.findByLicenseIdIn(licenseIds).stream().anyMatch(a -> a.getUserId().equals(employeeId));

        if (!isCompanyEmployee && !hasAssignmentFromBuyer) {
            throw new ForbiddenException("Employee does not belong to your company.");
        }

        return deviceRepository.findByUserId(employeeId);
    }

    @Override
    public CompanySettingsDto getCompanySettings() {
        User bulkBuyer = getBulkBuyer();
        Company company = companyRepository.findById(bulkBuyer.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
        
        return CompanySettingsDto.builder()
                .name(company.getName())
                .email(company.getEmail())
                .phone(company.getPhone())
                .address(company.getAddress())
                .industry(company.getIndustry())
                .website(company.getWebsite())
                .webhookUrl(company.getWebhookUrl())
                .build();
    }

    @Override
    @Transactional
    public CompanySettingsDto updateCompanySettings(CompanySettingsDto request) {
        User bulkBuyer = getBulkBuyer();
        Company company = companyRepository.findById(bulkBuyer.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
        
        company.setName(request.getName());
        company.setEmail(request.getEmail());
        company.setPhone(request.getPhone());
        company.setAddress(request.getAddress());
        company.setIndustry(request.getIndustry());
        company.setWebsite(request.getWebsite());
        company.setWebhookUrl(request.getWebhookUrl());
        
        companyRepository.save(company);
        
        activityLogService.logAction(bulkBuyer.getCompanyId(), "SETTINGS_UPDATED", 
            "Company profile and settings updated", null, null);
            
        return request;
    }

    @Override
    public List<Order> getCompanyOrders() {
        User bulkBuyer = getBulkBuyer();
        if (bulkBuyer.getCompanyId() != null) {
            return orderRepository.findByCompanyIdOrderByOrderDateDesc(bulkBuyer.getCompanyId());
        } else {
            return orderRepository.findByUserIdOrderByOrderDateDesc(bulkBuyer.getId());
        }
    }

    @Override
    public com.licensemanagement.backend.dto.AnalyticsDto getCompanyAnalytics() {
        User bulkBuyer = getBulkBuyer();
        List<User> employees = getCompanyEmployees();
        List<Long> employeeIds = employees.stream().map(User::getId).collect(Collectors.toList());
        
        if (employeeIds.isEmpty()) {
            return com.licensemanagement.backend.dto.AnalyticsDto.builder()
                .totalActiveDevices(0)
                .totalEmployees(0)
                .osDistribution(new java.util.HashMap<>())
                .topUsers(new java.util.ArrayList<>())
                .recentActivations(new java.util.ArrayList<>())
                .build();
        }
        
        List<Device> activeDevices = deviceRepository.findByUserIdInAndIsActiveTrue(employeeIds);
        List<Device> allDevices = deviceRepository.findByUserIdIn(employeeIds);
        List<LicenseAssignment> activeAssignments = assignmentRepository.findByUserIdInAndStatus(employeeIds, "ACTIVE");
        
        java.util.Map<String, Long> osDistribution = activeDevices.stream()
            .filter(d -> d.getOs() != null)
            .collect(java.util.stream.Collectors.groupingBy(Device::getOs, java.util.stream.Collectors.counting()));
            
        List<com.licensemanagement.backend.dto.AnalyticsUserDto> topUsers = employees.stream()
            .map(emp -> {
                long devCount = activeDevices.stream().filter(d -> d.getUserId().equals(emp.getId())).count();
                long licCount = activeAssignments.stream().filter(a -> a.getUserId().equals(emp.getId())).count();
                return com.licensemanagement.backend.dto.AnalyticsUserDto.builder()
                    .id(emp.getId())
                    .fullName(emp.getFullName())
                    .email(emp.getEmail())
                    .activeDevicesCount(devCount)
                    .activeLicensesCount(licCount)
                    .build();
            })
            .sorted(java.util.Comparator.<com.licensemanagement.backend.dto.AnalyticsUserDto>comparingLong(u -> u.getActiveLicensesCount() + u.getActiveDevicesCount())
                .thenComparingLong(com.licensemanagement.backend.dto.AnalyticsUserDto::getActiveLicensesCount)
                .thenComparingLong(com.licensemanagement.backend.dto.AnalyticsUserDto::getActiveDevicesCount)
                .reversed())
            .limit(5)
            .collect(java.util.stream.Collectors.toList());
            
        List<Device> recentActivations = allDevices.stream()
            .filter(d -> d.getActivatedAt() != null)
            .sorted(java.util.Comparator.comparing(Device::getActivatedAt).reversed())
            .limit(5)
            .collect(java.util.stream.Collectors.toList());
            
        return com.licensemanagement.backend.dto.AnalyticsDto.builder()
            .totalActiveDevices(activeDevices.size())
            .totalActiveLicenses(activeAssignments.size())
            .totalEmployees(employees.size())
            .osDistribution(osDistribution)
            .topUsers(topUsers)
            .recentActivations(recentActivations)
            .build();
    }

    @Override
    @Transactional
    public Map<String, Object> processExpirations() {
        User bulkBuyer = getBulkBuyer();
        return processBulkBuyerExpirations(bulkBuyer);
    }

    @Override
    @Transactional
    public void processAllBulkBuyerExpirations() {
        List<User> bulkBuyers = userRepository.findByRole("BULK_BUYER");
        for (User buyer : bulkBuyers) {
            try {
                processBulkBuyerExpirations(buyer);
            } catch (Exception e) {
                System.err.println("Error processing expirations for bulk buyer " + buyer.getEmail() + ": " + e.getMessage());
            }
        }
    }

    private Map<String, Object> processBulkBuyerExpirations(User bulkBuyer) {
        Map<String, Object> summary = new HashMap<>();
        int checkedLicenses = 0;
        int autoReleasedLicenses = 0;
        int autoReleasedAssignments = 0;
        int buyerAlertsSent = 0;
        int employeeAlertsSent = 0;

        List<License> buyerLicenses = licenseRepository.findByUserId(bulkBuyer.getId());
        checkedLicenses = buyerLicenses.size();

        boolean autoReleaseEnabled = isAutoReleaseExpiredEnabled(bulkBuyer);
        boolean autoNotifyEnabled = isAutoNotifyEmployeeEnabled(bulkBuyer);
        LocalDate today = LocalDate.now();

        int[] thresholdDays = {30, 14, 7, 1};

        for (License license : buyerLicenses) {
            if (license.getExpiryDate() == null) continue;

            Product product = license.getProduct();
            String productName = product != null ? product.getName() : "Software License";

            // 1. AUTO-RELEASE EXPIRED LICENSES
            if (license.getExpiryDate().isBefore(today)) {
                if (autoReleaseEnabled) {
                    List<LicenseAssignment> activeAssignments = assignmentRepository.findByLicenseIdAndStatus(license.getId(), "ACTIVE");
                    List<Activation> activeActivations = activationRepository.findByLicenseIdAndIsActiveTrue(license.getId());

                    boolean needsUpdate = !activeAssignments.isEmpty() || !activeActivations.isEmpty() || !"EXPIRED".equalsIgnoreCase(license.getStatus());

                    if (needsUpdate) {
                        // Revoke active assignments
                        for (LicenseAssignment assignment : activeAssignments) {
                            assignment.setStatus("REVOKED");
                            assignment.setRevokedAt(LocalDateTime.now());
                            assignmentRepository.save(assignment);
                            autoReleasedAssignments++;

                            // If autoNotify is enabled, notify employee of expiration & seat release
                            if (autoNotifyEnabled && assignment.getUserId() != null) {
                                User emp = userRepository.findById(assignment.getUserId()).orElse(null);
                                if (emp != null) {
                                    try {
                                        emailService.sendExpiredEmail(emp, license, product);
                                    } catch (Exception e) {
                                        System.err.println("Failed to send expired email to employee " + emp.getEmail() + ": " + e.getMessage());
                                    }
                                    try {
                                        notificationService.sendNotification(
                                            emp,
                                            "expiration",
                                            "LICENSE_EXPIRED",
                                            "License Expired & Seat Released",
                                            "Your assigned seat for " + productName + " (" + NotificationService.maskLicenseKey(license.getLicenseKey()) + ") has expired and was automatically released.",
                                            "/employee-dashboard",
                                            null
                                        );
                                    } catch (Exception e) {
                                        System.err.println("Failed to send in-app expired notification to employee: " + e.getMessage());
                                    }
                                }
                            }
                        }

                        // Deactivate active device activations
                        for (Activation act : activeActivations) {
                            act.setIsActive(false);
                            activationRepository.save(act);
                        }

                        // Recalculate usedSeats from actual database state
                        long remainingActiveAssignments = assignmentRepository.findByLicenseIdAndStatus(license.getId(), "ACTIVE").size();
                        long remainingActiveActivations = activationRepository.countByLicenseIdAndIsActiveTrue(license.getId());
                        int recalculatedSeats = (int) Math.max(remainingActiveAssignments, remainingActiveActivations);
                        license.setUsedSeats(recalculatedSeats);
                        license.setStatus("EXPIRED");
                        licenseRepository.save(license);
                        autoReleasedLicenses++;

                        // Log activity
                        activityLogService.logAction(
                            bulkBuyer.getCompanyId(),
                            "EXPIRED_LICENSES_AUTO_RELEASED",
                            "Automatically released " + activeAssignments.size() + " assigned seat(s) for expired license " + license.getLicenseKey(),
                            bulkBuyer.getId(),
                            license.getId()
                        );

                        // Notify bulk buyer
                        try {
                            notificationService.sendNotification(
                                bulkBuyer,
                                "expiration",
                                "LICENSE_EXPIRED",
                                "Expired License Seats Auto-Released",
                                "License " + productName + " (" + NotificationService.maskLicenseKey(license.getLicenseKey()) + ") expired. All assigned seats have been automatically released.",
                                "/bulk-buyer/licenses",
                                null
                            );
                        } catch (Exception e) {
                            System.err.println("Failed to notify bulk buyer of auto-release: " + e.getMessage());
                        }
                    }
                }
            }

            // 2. EXPIRATION ALERT THRESHOLDS (30, 14, 7, 1 days)
            if ("ACTIVE".equalsIgnoreCase(license.getStatus())) {
                for (int days : thresholdDays) {
                    if (isExpirationThresholdEnabled(bulkBuyer, days)) {
                        LocalDate thresholdDate = today.plusDays(days);
                        if (license.getExpiryDate().isEqual(thresholdDate)) {
                            // Cycle cutoff: prevent duplicate notifications for this license and threshold in this cycle
                            LocalDateTime cycleCutoff = license.getExpiryDate().minusDays(days + 2).atStartOfDay();
                            String emailType = "EXPIRY_REMINDER_" + days;

                            boolean buyerAlreadyNotified = emailLogRepository.hasNotificationBeenSent(
                                license.getId(), bulkBuyer.getId(), emailType, cycleCutoff
                            );

                            if (!buyerAlreadyNotified) {
                                try {
                                    emailService.sendExpiryEmail(bulkBuyer, license, product, days);
                                    buyerAlertsSent++;
                                } catch (Exception e) {
                                    System.err.println("Failed to send expiry email to buyer: " + e.getMessage());
                                }
                                try {
                                    notificationService.sendNotification(
                                        bulkBuyer,
                                        "expiration",
                                        "LICENSE_EXPIRING",
                                        "License Expiring Soon",
                                        "License " + productName + " (" + NotificationService.maskLicenseKey(license.getLicenseKey()) + ") expires in " + days + " days.",
                                        "/bulk-buyer/licenses",
                                        null
                                    );
                                } catch (Exception e) {
                                    System.err.println("Failed to notify buyer of upcoming expiry: " + e.getMessage());
                                }
                            }

                            // If autoNotify is enabled, also notify each assigned employee
                            if (autoNotifyEnabled) {
                                List<LicenseAssignment> assignments = assignmentRepository.findByLicenseIdAndStatus(license.getId(), "ACTIVE");
                                for (LicenseAssignment assignment : assignments) {
                                    if (assignment.getUserId() != null) {
                                        String empEmailType = "EXPIRY_REMINDER_" + days + "_EMP";
                                        boolean empAlreadyNotified = emailLogRepository.hasNotificationBeenSent(
                                            license.getId(), assignment.getUserId(), empEmailType, cycleCutoff
                                        );

                                        if (!empAlreadyNotified) {
                                            User emp = userRepository.findById(assignment.getUserId()).orElse(null);
                                            if (emp != null) {
                                                try {
                                                    emailService.sendExpiryEmail(emp, license, product, days);
                                                    employeeAlertsSent++;
                                                } catch (Exception e) {
                                                    System.err.println("Failed to send expiry email to employee: " + e.getMessage());
                                                }
                                                try {
                                                    notificationService.sendNotification(
                                                        emp,
                                                        "expiration",
                                                        "LICENSE_EXPIRING",
                                                        "Assigned License Expiring Soon",
                                                        "Your assigned license for " + productName + " expires in " + days + " days. Contact your company administrator to renew.",
                                                        "/employee-dashboard",
                                                        null
                                                    );
                                                } catch (Exception e) {
                                                    System.err.println("Failed to notify employee of upcoming expiry: " + e.getMessage());
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        summary.put("checkedLicenses", checkedLicenses);
        summary.put("autoReleasedLicenses", autoReleasedLicenses);
        summary.put("autoReleasedAssignments", autoReleasedAssignments);
        summary.put("buyerAlertsSent", buyerAlertsSent);
        summary.put("employeeAlertsSent", employeeAlertsSent);
        summary.put("autoReleaseEnabled", autoReleaseEnabled);
        summary.put("autoNotifyEnabled", autoNotifyEnabled);
        return summary;
    }
}
