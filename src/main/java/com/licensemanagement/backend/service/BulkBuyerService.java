package com.licensemanagement.backend.service;

import com.licensemanagement.backend.dto.AssignLicenseRequest;
import com.licensemanagement.backend.dto.RegisterRequest;
import com.licensemanagement.backend.entity.ActivityLog;
import com.licensemanagement.backend.entity.LicenseAssignment;
import com.licensemanagement.backend.entity.User;

import java.util.List;
import java.util.Map;

import com.licensemanagement.backend.dto.CompanySettingsDto;

public interface BulkBuyerService {
    List<User> getCompanyEmployees();
    User addEmployee(RegisterRequest request);
    LicenseAssignment assignLicense(AssignLicenseRequest request);
    void revokeAssignment(Long assignmentId);
    void reassignLicense(Long assignmentId, Long newEmployeeId);
    List<LicenseAssignment> getRecentAssignments();
    List<LicenseAssignment> getEmployeeAssignments(Long employeeId);
    List<ActivityLog> getActivityFeed();
    Map<String, Object> getDashboardStats();
    List<com.licensemanagement.backend.entity.Device> getEmployeeDevices(Long employeeId);
    CompanySettingsDto getCompanySettings();
    CompanySettingsDto updateCompanySettings(CompanySettingsDto request);
    LicenseAssignment approveAssignment(Long assignmentId);
    void removeEmployee(Long employeeId);
    List<com.licensemanagement.backend.entity.Order> getCompanyOrders();
    com.licensemanagement.backend.dto.AnalyticsDto getCompanyAnalytics();
    Map<String, Object> processExpirations();
    void processAllBulkBuyerExpirations();
}

