package com.licensemanagement.backend.config;

import com.licensemanagement.backend.entity.Activation;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.UsageLog;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.repository.ActivationRepository;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.UserRepository;
import com.licensemanagement.backend.repository.UsageLogRepository;
import com.licensemanagement.backend.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataMigrationRunner implements CommandLineRunner {
    private final ActivationRepository activationRepository;
    private final LicenseRepository licenseRepository;
    private final UserRepository userRepository;
    private final UsageLogRepository usageLogRepository;
    private final ActivityLogRepository activityLogRepository;
    private final com.licensemanagement.backend.repository.ProductRepository productRepository;
    private final com.licensemanagement.backend.repository.DeviceRepository deviceRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final com.licensemanagement.backend.repository.AdminLogRepository adminLogRepository;
    private final com.licensemanagement.backend.repository.KnownDeviceRepository knownDeviceRepository;
    private final com.licensemanagement.backend.repository.NotificationRepository notificationRepository;

    @Override
    public void run(String... args) {
        log.info("Running DataMigrationRunner: Enforcing single admin (admin12@example.com) & backfilling telemetry...");

        // 0. Ensure admin12@example.com is the ONLY administrator in the system
        User admin12 = userRepository.findByEmail("admin12@example.com").orElse(null);
        if (admin12 == null) {
            admin12 = new User();
            admin12.setEmail("admin12@example.com");
            admin12.setUsername("admin12");
            admin12.setFullName("System Administrator");
            admin12.setRole("ADMIN");
            admin12.setStatus("ACTIVE");
            admin12.setPassword(passwordEncoder.encode("Password123!"));
            admin12 = userRepository.save(admin12);
            log.info("Initialized sole system administrator: admin12@example.com");
        } else {
            admin12.setRole("ADMIN");
            admin12.setStatus("ACTIVE");
            userRepository.save(admin12);
        }

        Long primaryAdminId = admin12.getId();
        List<User> otherAdmins = userRepository.findAll().stream()
                .filter(u -> "ADMIN".equalsIgnoreCase(u.getRole()) && !primaryAdminId.equals(u.getId()))
                .toList();

        for (User extra : otherAdmins) {
            log.info("Purging non-primary admin account: id={}, email={}", extra.getId(), extra.getEmail());
            var logs = adminLogRepository.findByAdminId(extra.getId());
            if (logs != null && !logs.isEmpty()) {
                adminLogRepository.deleteAll(logs);
            }
            knownDeviceRepository.deleteByUserId(extra.getId());
            notificationRepository.deleteByUserId(extra.getId());
            userRepository.delete(extra);
        }

        // Ensure canonical demo products exist with proper SKUs
        seedCanonicalProducts();

        // 1. Backfill products
        for (com.licensemanagement.backend.entity.Product product : productRepository.findAll()) {
            if (product.getCompanyId() != null) {
                boolean exists = activityLogRepository.findByCompanyIdOrderByCreatedAtDesc(product.getCompanyId()).stream()
                        .anyMatch(l -> "PRODUCT_REGISTERED".equals(l.getAction()) && l.getDescription() != null && l.getDescription().contains(product.getName()));
                if (!exists) {
                    com.licensemanagement.backend.entity.ActivityLog logEntry = new com.licensemanagement.backend.entity.ActivityLog();
                    logEntry.setCompanyId(product.getCompanyId());
                    logEntry.setAction("PRODUCT_REGISTERED");
                    logEntry.setDescription("Product registered: " + product.getName() + " (" + (product.getVersion() != null ? product.getVersion() : "1.0.0") + ")");
                    logEntry.setCreatedAt(product.getCreatedAt() != null ? product.getCreatedAt() : java.time.LocalDateTime.now().minusDays(30));
                    activityLogRepository.save(logEntry);
                }
            }
        }

        // 2. Backfill licenses
        for (License lic : licenseRepository.findAll()) {
            if (lic.getCompanyId() != null) {
                boolean exists = activityLogRepository.findByCompanyIdOrderByCreatedAtDesc(lic.getCompanyId()).stream()
                        .anyMatch(l -> "LICENSE_ISSUED".equals(l.getAction()) && lic.getId().equals(l.getLicenseId()));
                if (!exists) {
                    String pName = lic.getProductId() != null ? productRepository.findById(lic.getProductId()).map(com.licensemanagement.backend.entity.Product::getName).orElse("Software Product") : "Software Product";
                    com.licensemanagement.backend.entity.ActivityLog logEntry = new com.licensemanagement.backend.entity.ActivityLog();
                    logEntry.setCompanyId(lic.getCompanyId());
                    logEntry.setUserId(lic.getUserId());
                    logEntry.setLicenseId(lic.getId());
                    logEntry.setAction("LICENSE_ISSUED");
                    logEntry.setDescription("Issued license LIC-" + lic.getId() + " for " + pName + " (" + lic.getLicenseType() + ")");
                    logEntry.setCreatedAt(lic.getIssuedDate() != null ? lic.getIssuedDate().atStartOfDay() : java.time.LocalDateTime.now().minusDays(15));
                    activityLogRepository.save(logEntry);
                }
            }
        }

        // 3. Backfill activations
        List<Activation> activations = activationRepository.findAll();
        int count = 0;
        
        for (Activation act : activations) {
            try {
                License lic = act.getLicense();
                if (lic == null && act.getLicenseId() != null) {
                    lic = licenseRepository.findById(act.getLicenseId()).orElse(null);
                }
                
                if (lic == null) {
                    continue;
                }
                
                // Check if a log already exists for this device & license activation
                boolean exists = usageLogRepository.findByLicenseId(act.getLicenseId()).stream()
                        .anyMatch(l -> l.getDeviceId() != null 
                                && l.getDeviceId().equals(act.getDeviceId()) 
                                && (l.getFeaturesUsed() != null && l.getFeaturesUsed().contains("Activated")));
                
                if (!exists) {
                    UsageLog usageLog = new UsageLog();
                    usageLog.setLicenseId(act.getLicenseId());
                    usageLog.setDeviceId(act.getDeviceId());
                    usageLog.setUserId(lic.getUserId());
                    usageLog.setFeaturesUsed("Device Activated");
                    usageLog.setActivationMethod("Online");
                    usageLog.setSessionStart(act.getActivatedAt() != null ? act.getActivatedAt() : java.time.LocalDateTime.now());
                    usageLog.setCreatedAt(act.getActivatedAt() != null ? act.getActivatedAt() : java.time.LocalDateTime.now());
                    usageLog.setIpAddress(null);
                    usageLogRepository.save(usageLog);
                    count++;
                }

                // Also backfill ActivityLog for the company that owns the license
                if (lic.getCompanyId() != null) {
                    final License finalLic = lic;
                    boolean actLogExists = activityLogRepository.findByCompanyIdOrderByCreatedAtDesc(lic.getCompanyId()).stream()
                            .anyMatch(l -> "LICENSE_ACTIVATED".equals(l.getAction()) && finalLic.getId().equals(l.getLicenseId()));
                    if (!actLogExists) {
                        com.licensemanagement.backend.entity.Device dev = deviceRepository.findById(act.getDeviceId()).orElse(null);
                        String devName = dev != null ? dev.getDeviceName() : "Device";
                        String pName = lic.getProductId() != null ? productRepository.findById(lic.getProductId()).map(com.licensemanagement.backend.entity.Product::getName).orElse("Software Product") : "Software Product";

                        com.licensemanagement.backend.entity.ActivityLog activityLog = new com.licensemanagement.backend.entity.ActivityLog();
                        activityLog.setCompanyId(lic.getCompanyId());
                        activityLog.setUserId(lic.getUserId());
                        activityLog.setLicenseId(act.getLicenseId());
                        activityLog.setAction("LICENSE_ACTIVATED");
                        activityLog.setDescription("License activated on device '" + devName + "' for product " + pName);
                        activityLog.setCreatedAt(act.getActivatedAt() != null ? act.getActivatedAt() : java.time.LocalDateTime.now());
                        activityLogRepository.save(activityLog);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to backfill activation ID: {}", act.getId(), e);
            }
        }
        log.info("Backfilled {} historical activations.", count);
    }

    private void seedCanonicalProducts() {
        Long companyId = productRepository.findAll().stream()
                .map(com.licensemanagement.backend.entity.Product::getCompanyId)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(1L);

        seedProductIfMissing("NX-ACC-001", "Nexora Accounting", "2.4.1", "Enterprise Financial and Accounting Suite", companyId);
        seedProductIfMissing("NX-INV-002", "Nexora Inventory", "1.5.0", "Enterprise Warehouse and Inventory System", companyId);
        seedProductIfMissing("NX-PAY-003", "Nexora Payroll", "1.2.0", "Automated Payroll Management System", companyId);
        seedProductIfMissing("CS-AUTO-01", "CloudSync Auto", "2.1.0", "Automated Cloud Storage Synchronization Client", companyId);
    }

    private void seedProductIfMissing(String sku, String name, String version, String desc, Long companyId) {
        if (productRepository.findByProductIdSkuIgnoreCase(sku).isEmpty()) {
            com.licensemanagement.backend.entity.Product prod = productRepository.findAll().stream()
                    .filter(p -> name.equalsIgnoreCase(p.getName()) && (p.getProductIdSku() == null || p.getProductIdSku().isBlank()))
                    .findFirst()
                    .orElse(new com.licensemanagement.backend.entity.Product());
            prod.setName(name);
            prod.setProductIdSku(sku);
            prod.setVersion(version);
            prod.setDescription(desc);
            prod.setStatus("PUBLISHED");
            prod.setLicenseType("SUBSCRIPTION");
            prod.setPrice(199.0);
            prod.setCustomerPrice(new java.math.BigDecimal("199.00"));
            prod.setBulkBuyerPrice(new java.math.BigDecimal("149.00"));
            prod.setMinBulkQuantity(1);
            prod.setAvailableToCustomers(true);
            prod.setAvailableToBulkBuyers(true);
            prod.setMaxActivations(5);
            prod.setCompanyId(companyId);
            productRepository.save(prod);
            log.info("Seeded canonical product: {} [{}]", name, sku);
        }
    }
}
