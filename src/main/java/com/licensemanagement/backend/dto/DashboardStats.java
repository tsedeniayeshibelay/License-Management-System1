package com.licensemanagement.backend.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStats {
    private long totalLicenses;
    private long activeLicenses;
    private long expiredLicenses;
    private long notActivatedLicenses;
    private long revokedLicenses;
    private long totalUsers;
    private long totalCustomers;
    private long totalCompanies;
    private java.util.Map<com.licensemanagement.backend.enums.LicenseType, Long> licenseTypeDistribution;
    private List<RecentActivation> recentActivations;
    private String generatedAt;
    
    private Map<String, Long> topCountries;
    private Map<String, Long> activationsLast30Days;
    
    @Data
    @AllArgsConstructor
    public static class RecentActivation {
        private String licenseKey;
        private String customerName;
        private String productName;
        private String activatedAt;
    }
}