package com.licensemanagement.backend.service;
import com.licensemanagement.backend.dto.DashboardStats;
import com.licensemanagement.backend.entity.Activation;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
@Service
@RequiredArgsConstructor
public class DashboardService {
    private final LicenseRepository licenseRepository;
    private final UserRepository userRepository;
    private final ActivationRepository activationRepository;
    private final ProductRepository productRepository;
    private final CompanyRepository companyRepository;
    private final ActivationAttemptRepository activationAttemptRepository;
    
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    public DashboardStats getDashboardStats() {
        DashboardStats stats = new DashboardStats();
        List<License> allLicenses = licenseRepository.findAll();
        stats.setTotalLicenses(allLicenses.size());
        stats.setActiveLicenses(licenseRepository.findByStatus("ACTIVE").size());
        stats.setNotActivatedLicenses(licenseRepository.findByStatus("NOT_ACTIVATED").size());
        stats.setRevokedLicenses(licenseRepository.findByStatus("REVOKED").size());
        stats.setExpiredLicenses(licenseRepository.findByExpiryDateBefore(LocalDate.now()).size());
        List<User> allUsers = userRepository.findAll();
        stats.setTotalUsers(allUsers.size());
        stats.setTotalCustomers((int) allUsers.stream().filter(u -> "CUSTOMER".equals(u.getRole())).count());
        stats.setTotalCompanies((int) allUsers.stream().filter(u -> "COMPANY".equals(u.getRole())).count());
        java.util.Map<com.licensemanagement.backend.enums.LicenseType, Long> typeDistribution = allLicenses.stream()
                .collect(Collectors.groupingBy(License::getLicenseType, Collectors.counting()));
        stats.setLicenseTypeDistribution(typeDistribution);
        List<DashboardStats.RecentActivation> recentActivations = new ArrayList<>();
        List<Activation> recentActivationsList = activationRepository.findAll().stream()
                .sorted((a1, a2) -> a2.getActivatedAt().compareTo(a1.getActivatedAt()))
                .limit(10)
                .toList();
        for (Activation activation : recentActivationsList) {
            License license = licenseRepository.findById(activation.getLicenseId()).orElse(null);
            if (license == null) continue;
            User customer = userRepository.findById(license.getUserId()).orElse(null);
            if (customer == null) continue;
            Product product = productRepository.findById(license.getProductId()).orElse(null);
            if (product == null) continue;
            DashboardStats.RecentActivation recent = new DashboardStats.RecentActivation(
                    license.getLicenseKey(),
                    customer.getFullName(),
                    product.getName(),
                    activation.getActivatedAt().format(DATE_FORMATTER)
            );
            recentActivations.add(recent);
        }
        stats.setRecentActivations(recentActivations);
        
        // Populate Top Countries
        Map<String, Long> topCountriesMap = new LinkedHashMap<>();
        List<Object[]> topCountriesData = activationAttemptRepository.findTop5CountriesBySuccessfulTrue();
        for (Object[] row : topCountriesData) {
            topCountriesMap.put((String) row[0], ((Number) row[1]).longValue());
        }
        stats.setTopCountries(topCountriesMap);
        
        // Populate Time-Series Data (Last 30 Days)
        Map<String, Long> timeSeriesMap = new LinkedHashMap<>();
        java.time.LocalDateTime thirtyDaysAgo = LocalDate.now().minusDays(30).atStartOfDay();
        List<Object[]> timeSeriesData = activationRepository.countActivationsByDateAfter(thirtyDaysAgo);
        for (Object[] row : timeSeriesData) {
            timeSeriesMap.put(row[0].toString(), ((Number) row[1]).longValue());
        }
        stats.setActivationsLast30Days(timeSeriesMap);
        
        stats.setGeneratedAt(LocalDate.now().toString());
        return stats;
    }
    public Map<String, Object> getLicenseOverview() {
        Map<String, Object> overview = new HashMap<>();
        List<License> allLicenses = licenseRepository.findAll();
        overview.put("totalLicenses", allLicenses.size());
        overview.put("active", licenseRepository.findByStatus("ACTIVE").size());
        overview.put("pending", licenseRepository.findByStatus("NOT_ACTIVATED").size());
        overview.put("expired", licenseRepository.findByExpiryDateBefore(LocalDate.now()).size());
        overview.put("revoked", licenseRepository.findByStatus("REVOKED").size());
        return overview;
    }
    public Map<String, Long> getActivitySummary() {
        Map<String, Long> activity = new HashMap<>();
        long last7Days = activationRepository.findAll().stream()
                .filter(a -> a.getActivatedAt().isAfter(LocalDate.now().minusDays(7).atStartOfDay()))
                .count();
        long last30Days = activationRepository.findAll().stream()
                .filter(a -> a.getActivatedAt().isAfter(LocalDate.now().minusDays(30).atStartOfDay()))
                .count();
        activity.put("last7Days", last7Days);
        activity.put("last30Days", last30Days);
        return activity;
    }
}